/** Time-zone helpers built on Intl, so no date library is needed. */
const formatters = new Map();

const formatterFor = (timeZone) => {
    if (!formatters.has(timeZone)) {
        formatters.set(timeZone, new Intl.DateTimeFormat('en-US', {
            timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }));
    }
    return formatters.get(timeZone);
};

/** Wall-clock parts of an instant in the given zone. */
export const zonedParts = (date, timeZone) => {
    const parts = {};
    for (const { type, value } of formatterFor(timeZone).formatToParts(date)) parts[type] = Number(value);
    return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
};

const offsetMs = (utcMs, timeZone) => {
    const p = zonedParts(new Date(utcMs), timeZone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
};

/** The UTC instant at which the wall clock in `timeZone` reads y-m-d h:min (handles DST by re-checking the offset). */
export const zonedTimeToUtc = (year, month, day, hour, minute, timeZone) => {
    const guess = Date.UTC(year, month - 1, day, hour, minute);
    const first = offsetMs(guess, timeZone);
    let result = guess - first;
    const second = offsetMs(result, timeZone);
    if (second !== first) result = guess - second;
    return new Date(result);
};

export const pad = (n) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of an instant in the given zone. */
export const zonedDateString = (date, timeZone) => {
    const p = zonedParts(date, timeZone);
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};
