import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { startReminderJob } from './jobs/reminders.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');

const app = createApp();
const port = Number(process.env.PORT) || 5000;
connectDb()
    .then(() => {
        const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
        // Node closes idle keep-alive sockets after 5s; a dev proxy (or load balancer) reusing one at that
        // moment gets ECONNRESET. Keep them open longer than any proxy's own idle timeout.
        server.keepAliveTimeout = 65_000;
        server.headersTimeout = 66_000;
        startReminderJob();
    })
    .catch((error) => { console.error('Failed to start:', error.message); process.exit(1); });
