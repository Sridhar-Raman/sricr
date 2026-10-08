import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import appointmentRoutes from './routes/appointments.js';
import appointmentTypeRoutes from './routes/appointmentTypes.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import portalRoutes from './routes/portal.js';
import userRoutes from './routes/users.js';

export const clientOrigins = () => (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);

export const createApp = () => {
    const app = express();
    // Behind a reverse proxy / load balancer, req.ip (used by the rate limiters) must be the real client address.
    if (process.env.TRUST_PROXY) app.set('trust proxy', Number.isNaN(Number(process.env.TRUST_PROXY)) ? process.env.TRUST_PROXY : Number(process.env.TRUST_PROXY));
    app.use(helmet());
    // CLIENT_ORIGIN may list several sites separated by commas (e.g. the .com, its www form and the free *.vercel.app address).
    app.use(cors({ origin: clientOrigins() }));
    app.use(express.json({ limit: '100kb' }));

    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    app.use('/api/auth', authRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/appointment-types', appointmentTypeRoutes);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/portal', portalRoutes);

    app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));
    // eslint-disable-next-line no-unused-vars
    app.use((error, _req, res, _next) => {
        if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
        if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });
        if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
        console.error(error);
        return res.status(500).json({ message: 'Something went wrong' });
    });
    return app;
};
