import nodemailer from 'nodemailer';

/**
 * Outgoing mail. With SMTP_HOST set it sends through SMTP; without it (local development) the message is printed
 * to the console so flows like password reset can still be exercised. Under test it is collected in `outbox`.
 * sendMail never throws: a mail problem must not fail the booking or reset request that triggered it.
 */
export const outbox = [];

let transport;
const getTransport = () => {
    if (transport === undefined) {
        transport = process.env.SMTP_HOST
            ? nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
            })
            : null;
    }
    return transport;
};

export const sendMail = async ({ to, subject, text, html }) => {
    if (!to) return false;
    const from = process.env.MAIL_FROM || 'SRI.CR <no-reply@sricr.local>';
    if (process.env.NODE_ENV === 'test') { outbox.push({ to, subject, text, html }); return true; }
    const smtp = getTransport();
    if (!smtp) {
        console.log(`\n--- [mail not configured: printing instead] ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----------------------------------------------\n`);
        return true;
    }
    try {
        await smtp.sendMail({ from, to, subject, text, html });
        return true;
    }
    catch (error) {
        console.error(`Failed to send "${subject}" to ${to}:`, error.message);
        return false;
    }
};
