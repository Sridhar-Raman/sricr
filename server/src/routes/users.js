import { Router } from 'express';
import { z } from 'zod';
import User, { ROLES, STAFF_ROLES } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const createSchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(STAFF_ROLES).default('staff'),
});

const updateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    role: z.enum(ROLES).optional(),
    active: z.boolean().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

router.get('/', asyncHandler(async (_req, res) => {
    res.json({ users: await User.find().sort({ createdAt: -1 }) });
}));

router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
    const { password, ...rest } = req.body;
    if (await User.exists({ email: rest.email.toLowerCase() })) {
        return res.status(409).json({ message: 'A user with this email already exists' });
    }
    const user = await User.create({ ...rest, passwordHash: await User.hashPassword(password) });
    return res.status(201).json({ user });
}));

router.patch('/:id', validate(updateSchema), asyncHandler(async (req, res) => {
    const { password, ...changes } = req.body;
    // An admin must not lock themselves out by demoting or deactivating their own account.
    if (String(req.user._id) === req.params.id && (changes.active === false || (changes.role && changes.role !== 'admin'))) {
        return res.status(400).json({ message: 'You cannot deactivate or demote your own account' });
    }
    if (password) { changes.passwordHash = await User.hashPassword(password); changes.passwordChangedAt = new Date(); }
    const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
}));

export default router;
