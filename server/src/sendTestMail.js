import 'dotenv/config';
import { renderEmail } from './services/emailTemplate.js';
import { sendMail } from './services/mailer.js';

const to = process.argv[2];
if (!to) {
    console.error('Usage: npm run test:mail -- you@example.com');
    process.exit(1);
}
if (!process.env.SMTP_HOST) {
    console.error('SMTP_HOST is not set in server/.env, so nothing can be sent. The message below is only printed:\n');
}
const ok = await sendMail({
    to,
    subject: 'SRI.CR test email',
    ...renderEmail({
        name: 'there',
        title: 'Your email settings work',
        intro: ['If you can read this, your SMTP settings are correct and booking emails will be delivered.'],
        reason: 'a test email was requested from the SRI.CR server.',
    }),
});
if (!process.env.SMTP_HOST) process.exit(1);
console.log(ok ? `Sent to ${to}. Check the inbox (and spam folder).` : 'Sending failed; see the error above.');
process.exit(ok ? 0 : 1);
