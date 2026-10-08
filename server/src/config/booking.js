/** Self-service booking rules, all overridable from server/.env. Hours are wall-clock time in BUSINESS_TIMEZONE. */
const int = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const timezone = process.env.BUSINESS_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); }
catch { throw new Error(`BUSINESS_TIMEZONE "${timezone}" is not a valid IANA time zone (e.g. Asia/Kolkata)`); }

export const booking = {
    timezone,
    openHour: int(process.env.BOOKING_OPEN_HOUR, 9),
    closeHour: int(process.env.BOOKING_CLOSE_HOUR, 17),
    slotMinutes: int(process.env.BOOKING_SLOT_MINUTES, 30),
    maxDaysAhead: int(process.env.BOOKING_MAX_DAYS_AHEAD, 60),
    minNoticeMinutes: int(process.env.BOOKING_MIN_NOTICE_MINUTES, 60),
    // Email a reminder this many hours before an appointment; 0 turns reminders off.
    reminderHours: int(process.env.REMINDER_HOURS_BEFORE, 24),
    // And a second, short-notice reminder this many minutes before; 0 turns it off.
    reminderMinutes: int(process.env.REMINDER_MINUTES_BEFORE, 60),
    // 0 = Sunday … 6 = Saturday
    openDays: (process.env.BOOKING_OPEN_DAYS || '1,2,3,4,5').split(',').map((d) => int(d, -1)).filter((d) => d >= 0 && d <= 6),
};
