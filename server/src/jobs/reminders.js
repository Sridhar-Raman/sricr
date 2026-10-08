import { booking } from '../config/booking.js';
import Appointment from '../models/Appointment.js';
import { sendReminder } from '../services/notifications.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Two reminders per appointment, each sent once:
 *  - "day":  REMINDER_HOURS_BEFORE (default 24) hours ahead
 *  - "hour": REMINDER_MINUTES_BEFORE (default 60) minutes ahead
 * A reminder is skipped when the booking was made after its moment had already passed (for example a booking made
 * for tomorrow morning in the afternoon gets no 24-hour reminder), and the day reminder is never sent once the
 * hour reminder is due, so nobody gets both at once.
 */
const KINDS = () => [
    {
        kind: 'day', field: 'reminderSentAt', lead: booking.reminderHours * HOUR, enabled: booking.reminderHours > 0,
        // not yet inside the hour window, which the hour reminder owns
        earliest: (now) => now.getTime() + booking.reminderMinutes * MINUTE,
    },
    {
        kind: 'hour', field: 'hourReminderSentAt', lead: booking.reminderMinutes * MINUTE, enabled: booking.reminderMinutes > 0,
        earliest: (now) => now.getTime(),
    },
];

/** Sends every reminder that is due at `now`. Returns how many emails were sent. */
export const sendDueReminders = async (now = new Date()) => {
    let sent = 0;
    for (const { kind, field, lead, enabled, earliest } of KINDS()) {
        if (!enabled) continue; // eslint-disable-line no-continue
        for (;;) {
            // Claiming the row atomically keeps two API instances from both sending the same reminder.
            // eslint-disable-next-line no-await-in-loop
            const appointment = await Appointment.findOneAndUpdate(
                {
                    status: 'scheduled', [field]: null, clientEmail: { $ne: '' },
                    startsAt: { $gt: new Date(earliest(now)), $lte: new Date(now.getTime() + lead) },
                    // booked early enough for this reminder to have been meaningful
                    $expr: { $lte: [{ $ifNull: ['$claimedAt', new Date(0)] }, { $subtract: ['$startsAt', lead] }] },
                },
                { [field]: now },
                { new: true },
            ).populate('appointmentType', 'name').populate('assignedTo', 'name');
            if (!appointment) break;
            // eslint-disable-next-line no-await-in-loop
            await sendReminder(appointment, kind);
            sent += 1;
        }
    }
    return sent;
};

export const startReminderJob = () => {
    if (booking.reminderHours <= 0 && booking.reminderMinutes <= 0) return;
    const run = () => sendDueReminders().catch((error) => console.error('Reminder job failed:', error.message));
    run();
    // Frequent enough that the 1-hour reminder lands close to the hour mark.
    setInterval(run, 5 * MINUTE).unref();
};
