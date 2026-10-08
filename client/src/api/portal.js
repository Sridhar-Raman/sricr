import { useEffect, useState } from 'react';
import api from './client';

export const fetchPortalConfig = () => api.get('/portal/config').then((r) => r.data);
export const fetchPortalTypes = () => api.get('/portal/types').then((r) => r.data.appointmentTypes);
export const fetchAvailability = (params) => api.get('/portal/availability', { params }).then((r) => r.data);
export const fetchMyAppointments = () => api.get('/portal/appointments').then((r) => r.data.appointments);
export const bookAppointment = (body) => api.post('/portal/appointments', body).then((r) => r.data.appointment);
export const rescheduleAppointment = (id, startsAt) => api.patch(`/portal/appointments/${id}/reschedule`, { startsAt }).then((r) => r.data.appointment);
export const cancelMyAppointment = (id, reason) => api.post(`/portal/appointments/${id}/cancel`, { reason }).then((r) => r.data.appointment);

let configPromise = null;
/** Booking rules (business time zone, hours, open days), fetched once per page load. */
export const usePortalConfig = () => {
    const [config, setConfig] = useState(null);
    useEffect(() => {
        configPromise ??= fetchPortalConfig();
        let alive = true;
        configPromise.then((value) => { if (alive) setConfig(value); }).catch(() => { configPromise = null; });
        return () => { alive = false; };
    }, []);
    return config;
};

/* ---- business-day helpers: dates are "YYYY-MM-DD" strings in the business time zone ---- */
const pad = (n) => String(n).padStart(2, '0');

export const todayIn = (timeZone) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date()).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const addDays = (dateString, days) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + days));
    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
};

export const weekdayOf = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const dayLabel = (dateString, options = { weekday: 'short', month: 'short', day: 'numeric' }) => {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Intl.DateTimeFormat([], { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
};

export const formatSlot = (iso, timeZone) => new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
export const formatDateTime = (iso, timeZone) => new Intl.DateTimeFormat([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
export const dateOf = (iso, timeZone) => todayInstant(iso, timeZone);

function todayInstant(iso, timeZone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}
