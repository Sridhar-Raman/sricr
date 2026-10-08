import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const signToken = (user) => jwt.sign(
    { sub: String(user._id), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
);

/** Requires a valid Bearer token and an active user; sets req.user. */
export const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload.sub);
        if (!user || !user.active) return res.status(401).json({ message: 'Account is not active' });
        // A password change/reset signs out every older session.
        if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
            return res.status(401).json({ message: 'Session expired, please sign in again' });
        }
        req.user = user;
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const requireRole = (...roles) => (req, res, next) => (
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You do not have permission to do this' })
);
