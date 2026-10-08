import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import { sendPasswordReset } from '../services/notifications.js';

const router = Router();

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

const signupSchema = z.object({
    name: z.string().trim().min(2, 'Please enter your full name').max(120),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().max(20).regex(/^[0-9+()\-\s]*$/, 'Phone can contain digits, spaces, + ( ) -').default(''),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms to create an account' }) }),
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many sign-in attempts. Try again in a few minutes.' });
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many sign-ups from this address. Try again later.' });

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
    // One message for unknown email and wrong password so the response doesn't reveal which accounts exist.
    if (!user || !user.active || !(await user.verifyPassword(req.body.password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }
    return res.json({ token: signToken(user), user });
}));

// Public self-registration. It can only ever create a 'client'; staff and admins are created by an admin.
router.post('/signup', signupLimiter, validate(signupSchema), asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (await User.exists({ email: email.toLowerCase() })) {
        return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
    }
    const user = await User.create({
        name, email, phone, role: 'client', passwordHash: await User.hashPassword(password),
    });
    return res.status(201).json({ token: signToken(user), user });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

const passwordRule = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');
const phoneRule = z.string().trim().max(20).regex(/^[0-9+()\-\s]*$/, 'Phone can contain digits, spaces, + ( ) -');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const RESET_TTL_MS = 60 * 60 * 1000;
const forgotLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many reset requests. Try again later.' });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many attempts. Try again in a few minutes.' });

// Same answer whether or not the account exists, so this can't be used to discover who is registered.
router.post('/forgot-password', forgotLimiter, validate(z.object({ email: z.string().trim().email() })), asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase(), active: true });
    if (user) {
        const token = randomBytes(32).toString('hex');
        // Only a hash is stored: a database leak must not hand out working reset links.
        user.resetTokenHash = sha256(token);
        user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
        await user.save();
        await sendPasswordReset(user, token);
    }
    return res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
}));

router.post('/reset-password', resetLimiter, validate(z.object({ token: z.string().min(16).max(200), password: passwordRule })), asyncHandler(async (req, res) => {
    const user = await User.findOne({ resetTokenHash: sha256(req.body.token), resetTokenExpires: { $gt: new Date() }, active: true });
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
    user.passwordHash = await User.hashPassword(req.body.password);
    user.passwordChangedAt = new Date();
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    return res.json({ message: 'Password updated. You can now sign in.' });
}));

// Own profile: name and phone only. Email and role are never self-editable.
router.patch('/me', requireAuth, validate(z.object({ name: z.string().trim().min(2).max(120).optional(), phone: phoneRule.optional() })), asyncHandler(async (req, res) => {
    Object.assign(req.user, req.body);
    await req.user.save();
    return res.json({ user: req.user });
}));

router.post('/change-password', requireAuth, resetLimiter, validate(z.object({ currentPassword: z.string().min(1), newPassword: passwordRule })), asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.verifyPassword(req.body.currentPassword))) return res.status(400).json({ message: 'Current password is incorrect' });
    user.passwordHash = await User.hashPassword(req.body.newPassword);
    user.passwordChangedAt = new Date();
    await user.save();
    // Other sessions are now invalid; hand this one a fresh token.
    return res.json({ token: signToken(user), user });
}));

export default router;
