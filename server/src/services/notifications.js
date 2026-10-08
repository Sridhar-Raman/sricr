import { booking } from '../config/booking.js';
import { renderEmail, siteUrl } from './emailTemplate.js';
import { sendMail } from './mailer.js';

const fmt = (date, options) => new Intl.DateTimeFormat('en-GB', { timeZone: booking.timezone, ...options }).format(new Date(date));
const dayOf = (date) => fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeOf = (date) => fmt(date, { hour: 'numeric', minute: '2-digit', hour12: true });
const service = (a) => a.appointmentType?.name || 'Appointment';

const detailsFor = (a) => [
    ['Service', service(a)],
    ['Date', dayOf(a.startsAt)],
    ['Time', `${timeOf(a.startsAt)} – ${timeOf(a.endsAt)} (${booking.timezone})`],
    ['Meeting', a.meetingMode === 'online' ? 'Online meeting' : 'One to one'],
    ...(a.assignedTo?.name ? [['With', a.assignedTo.name]] : []),
];

const joinButton = (a) => (a.meetingMode === 'online' && a.meetingUrl ? { label: 'Join meeting', url: a.meetingUrl } : null);
const manageButton = { label: 'View my appointments', url: `${siteUrl()}/app/my-appointments` };
const joinNote = (a) => (joinButton(a) ? ['Please use the button above at the start time to join your online meeting.'] : []);

const appointmentMail = (a, { subject, title, intro, outro = [], reason }) => sendMail({
    to: a.clientEmail,
    subject,
    ...renderEmail({
        name: a.clientName,
        title,
        intro,
        details: detailsFor(a),
        button: joinButton(a) || manageButton,
        outro: [...joinNote(a), ...outro],
        reason,
    }),
});

const BOOKED_REASON = 'an appointment was booked with SRI.CR using this email address. If this was not you, please ignore this email or contact us so we can remove the booking.';

// Each helper is fire-and-forget safe: sendMail swallows its own errors.
export const sendBookingConfirmation = (a) => appointmentMail(a, {
    subject: `Appointment confirmed: ${service(a)} on ${dayOf(a.startsAt)}`,
    title: 'Your appointment is confirmed',
    intro: ['Thank you for booking with SRI.CR. Your appointment is confirmed, and the details are below.'],
    outro: ['Need to change the time or cancel? You can do it any time from your account.'],
    reason: BOOKED_REASON,
});

export const sendRescheduleNotice = (a) => appointmentMail(a, {
    subject: `Appointment rescheduled: ${service(a)} on ${dayOf(a.startsAt)}`,
    title: 'Your appointment has been rescheduled',
    intro: ['Your appointment has been moved to a new time. Please note the updated details below.'],
    reason: BOOKED_REASON,
});

/** Staff edited a booking: say what changed, then show the full current details. */
export const sendUpdateNotice = (a, changed) => appointmentMail(a, {
    subject: `Appointment updated: ${service(a)} on ${dayOf(a.startsAt)}`,
    title: 'Your appointment has been updated',
    intro: [`Your appointment has been updated. What changed: ${changed.join(', ')}. The current details are below.`],
    reason: BOOKED_REASON,
});

export const sendCancellationNotice = (a) => sendMail({
    to: a.clientEmail,
    subject: `Appointment cancelled: ${service(a)} on ${dayOf(a.startsAt)}`,
    ...renderEmail({
        name: a.clientName,
        title: 'Your appointment has been cancelled',
        intro: ['This is to confirm that the appointment below has been cancelled.'],
        details: [...detailsFor(a).slice(0, 3), ...(a.cancelReason ? [['Reason', a.cancelReason]] : [])],
        button: { label: 'Book a new appointment', url: `${siteUrl()}/app/book` },
        outro: ['We hope to see you again soon.'],
        reason: BOOKED_REASON,
    }),
});

/** kind: 'day' (about 24 hours ahead) or 'hour' (about an hour ahead). */
export const sendReminder = (a, kind = 'day') => appointmentMail(a, kind === 'hour' ? {
    subject: `Starting soon: ${service(a)} today at ${timeOf(a.startsAt)}`,
    title: 'Your appointment starts in about an hour',
    intro: [`This is a quick reminder that your appointment begins at ${timeOf(a.startsAt)} today.`],
    reason: 'you have an appointment with SRI.CR starting soon, booked using this email address. If this was not you, please ignore this email.',
} : {
    subject: `Reminder: ${service(a)} on ${dayOf(a.startsAt)} at ${timeOf(a.startsAt)}`,
    title: 'A reminder of your upcoming appointment',
    intro: ['This is a friendly reminder of your appointment coming up within the next day.'],
    outro: ['If you can no longer make it, please cancel or reschedule from your account so the time can be offered to someone else.'],
    reason: 'you have an upcoming appointment with SRI.CR booked using this email address. If this was not you, please ignore this email.',
});

export const sendPasswordReset = ({ email, name }, token) => sendMail({
    to: email,
    subject: 'Reset your SRI.CR password',
    ...renderEmail({
        name,
        title: 'Reset your password',
        intro: ['We received a request to reset the password for your SRI.CR account. Use the button below to choose a new one. The link works once and expires in 1 hour.'],
        button: { label: 'Reset password', url: `${siteUrl()}/reset-password?token=${token}` },
        outro: ['If you did not make this request, you can safely ignore this email; your password will not change.'],
        reason: 'a password reset was requested for the SRI.CR account linked to this email address.',
    }),
});
