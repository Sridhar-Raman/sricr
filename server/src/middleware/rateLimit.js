/**
 * Tiny in-memory fixed-window limiter for the public endpoints (signup / login). It is per-process, so behind
 * several instances use a shared store (e.g. Redis) instead.
 */
export const rateLimit = ({ windowMs, max, message = 'Too many attempts. Please try again later.' }) => {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }, windowMs).unref();

    return (req, res, next) => {
        const now = Date.now();
        const key = req.ip;
        const entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        entry.count += 1;
        if (entry.count > max) {
            res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({ message });
        }
        return next();
    };
};
