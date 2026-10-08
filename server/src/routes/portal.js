import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { booking } from '../config/booking.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import Appointment from '../models/Appointment.js';
import AppointmentType from '../models/AppointmentType.js';
import User, { STAFF_ROLES } from '../models/User.js';
import { sendBookingConfirmation, sendCancellationNotice, sendRescheduleNotice } from '../services/notifications.js';
import { MEETING_MODES, meetingFields } from '../utils/meeting.js';
import { zonedDateString, zonedTimeToUtc } from '../utils/time.js';

/**
 * Client self-service. Every route is limited to role 'client' and every appointment query is scoped to
 * `client: req.user._id`, so a client can never read or change anyone else's booking.
 */
const router = Router();
router.use(requireAuth, requireRole('client'));

const MINUTE = 60 * 1000;
const POPULATE = { path: 'appointmentType', select: 'name color durationMinutes description' };
const objectId = z.string().refine((value) => mongoose.isValidObjectId(value), 'Invalid id');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const parseDate = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
    return { year, month, day, weekday: probe.getUTCDay() };
};

/** How many appointments can run at once: one per active team member (at least one). */
const capacity = async () => Math.max(1, await User.countDocuments({ active: true, role: { $in: STAFF_ROLES } }));

/**
 * Free start times for a business-day, for a type. A slot is free when fewer overlapping live appointments
 * than the team's capacity occupy it. `excludeId` lets a reschedule ignore the appointment being moved.
 */
const freeSlots = async ({ date, type, excludeId = null }) => {
    const parsed = parseDate(date);
    if (!parsed || !booking.openDays.includes(parsed.weekday)) return [];

    const tz = booking.timezone;
    const now = Date.now();
    const today = parseDate(zonedDateString(new Date(now), tz));
    const dayDiff = Math.round((Date.UTC(parsed.year, parsed.month - 1, parsed.day) - Date.UTC(today.year, today.month - 1, today.day)) / 86400000);
    if (dayDiff < 0 || dayDiff > booking.maxDaysAhead) return [];

    const open = zonedTimeToUtc(parsed.year, parsed.month, parsed.day, booking.openHour, 0, tz);
    const close = zonedTimeToUtc(parsed.year, parsed.month, parsed.day, booking.closeHour, 0, tz);
    const duration = type.durationMinutes * MINUTE;
    const buffer = (type.bufferMinutes || 0) * MINUTE;

    const [busy, slots] = await Promise.all([
        Appointment.find({
            status: 'scheduled', startsAt: { $lt: new Date(close.getTime() + buffer) }, blockedUntil: { $gt: open },
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        }).select('startsAt blockedUntil'),
        capacity(),
    ]);

    const free = [];
    for (let start = open.getTime(); start + duration <= close.getTime(); start += booking.slotMinutes * MINUTE) {
        if (start < now + booking.minNoticeMinutes * MINUTE) continue;
        const blockedUntil = start + duration + buffer;
        const overlapping = busy.filter((a) => a.startsAt.getTime() < blockedUntil && a.blockedUntil.getTime() > start).length;
        if (overlapping < slots) free.push(new Date(start));
    }
    return free;
};

/** True when `startsAt` is one of the bookable slots of its business day. */
const isBookable = async ({ startsAt, type, excludeId }) => {
    const slots = await freeSlots({ date: zonedDateString(startsAt, booking.timezone), type, excludeId });
    return slots.some((slot) => slot.getTime() === startsAt.getTime());
};

/**
 * Run AFTER writing an appointment. The availability check and the write are separate steps, so two clients can
 * both pass the check for the last slot. This re-counts the overlapping bookings that claimed the time before
 * this one (by claimedAt, then _id, so every racer sees the same order); if they already fill the team's
 * capacity, this booking lost the race and must back out. The earlier booking always wins, so at most
 * 'capacity' bookings survive and a loser is never told it succeeded.
 */
const lostRace = async (appointment) => {
    const earlier = await Appointment.countDocuments({
        _id: { $ne: appointment._id },
        status: 'scheduled',
        startsAt: { $lt: appointment.blockedUntil },
        blockedUntil: { $gt: appointment.startsAt },
        $or: [
            { claimedAt: { $exists: false } },
            { claimedAt: { $lt: appointment.claimedAt } },
            { claimedAt: appointment.claimedAt, _id: { $lt: appointment._id } },
        ],
    });
    return earlier >= await capacity();
};

const SLOT_TAKEN = 'That time is no longer available. Please pick another slot.';

router.get('/config', (_req, res) => {
    const { timezone, openHour, closeHour, slotMinutes, maxDaysAhead, openDays } = booking;
    res.json({ timezone, openHour, closeHour, slotMinutes, maxDaysAhead, openDays });
});

router.get('/types', asyncHandler(async (_req, res) => {
    res.json({ appointmentTypes: await AppointmentType.find({ active: true }).select('name description durationMinutes color').sort({ name: 1 }) });
}));

router.get('/availability', asyncHandler(async (req, res) => {
    const query = z.object({ date: dateString, type: objectId, excludeId: objectId.optional() }).safeParse(req.query);
    if (!query.success) return res.status(400).json({ message: query.error.issues[0].message });
    const type = await AppointmentType.findById(query.data.type);
    if (!type || !type.active) return res.status(404).json({ message: 'Appointment type not found' });
    let excludeId = null;
    if (query.data.excludeId) {
        // Only the client's own appointment may be excluded (a reschedule).
        excludeId = (await Appointment.exists({ _id: query.data.excludeId, client: req.user._id })) ? query.data.excludeId : null;
    }
    const slots = await freeSlots({ date: query.data.date, type, excludeId });
    return res.json({ timezone: booking.timezone, slots: slots.map((slot) => slot.toISOString()) });
}));

router.get('/appointments', asyncHandler(async (req, res) => {
    res.json({ appointments: await Appointment.find({ client: req.user._id }).sort({ startsAt: -1 }).limit(200).populate(POPULATE) });
}));

const bookSchema = z.object({
    appointmentType: objectId,
    startsAt: z.coerce.date(),
    notes: z.string().trim().max(1000).default(''),
    meetingMode: z.enum(MEETING_MODES).default('one-to-one'),
});

router.post('/appointments', validate(bookSchema), asyncHandler(async (req, res) => {
    const type = await AppointmentType.findById(req.body.appointmentType);
    if (!type || !type.active) return res.status(400).json({ message: 'Choose an available appointment type' });
    if (!(await isBookable({ startsAt: req.body.startsAt, type }))) return res.status(409).json({ message: SLOT_TAKEN });

    const endsAt = new Date(req.body.startsAt.getTime() + type.durationMinutes * MINUTE);
    const created = await Appointment.create({
        appointmentType: type._id, startsAt: req.body.startsAt, endsAt,
        blockedUntil: new Date(endsAt.getTime() + (type.bufferMinutes || 0) * MINUTE),
        client: req.user._id, clientName: req.user.name, clientEmail: req.user.email, clientPhone: req.user.phone,
        notes: req.body.notes, ...meetingFields(req.body.meetingMode),
    });
    if (await lostRace(created)) {
        await created.deleteOne();
        return res.status(409).json({ message: SLOT_TAKEN });
    }
    await created.populate(POPULATE);
    void sendBookingConfirmation(created);
    return res.status(201).json({ appointment: created });
}));

const findOwnScheduled = async (req, res) => {
    const appointment = await Appointment.findOne({ _id: req.params.id, client: req.user._id });
    if (!appointment) { res.status(404).json({ message: 'Appointment not found' }); return null; }
    if (appointment.status !== 'scheduled') { res.status(400).json({ message: 'Only scheduled appointments can be changed' }); return null; }
    return appointment;
};

router.patch('/appointments/:id/reschedule', validate(z.object({ startsAt: z.coerce.date() })), asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const appointment = await findOwnScheduled(req, res);
    if (!appointment) return null;
    const type = await AppointmentType.findById(appointment.appointmentType);
    if (!type) return res.status(400).json({ message: 'Appointment type no longer exists' });
    if (!(await isBookable({ startsAt: req.body.startsAt, type, excludeId: appointment._id }))) return res.status(409).json({ message: SLOT_TAKEN });

    const previous = appointment.toObject();
    appointment.startsAt = req.body.startsAt;
    appointment.claimedAt = new Date();
    appointment.reminderSentAt = null;
    appointment.hourReminderSentAt = null;
    appointment.endsAt = new Date(req.body.startsAt.getTime() + type.durationMinutes * MINUTE);
    appointment.blockedUntil = new Date(appointment.endsAt.getTime() + (type.bufferMinutes || 0) * MINUTE);
    await appointment.save();
    if (await lostRace(appointment)) {
        const { startsAt, endsAt, blockedUntil, claimedAt, reminderSentAt, hourReminderSentAt } = previous;
        Object.assign(appointment, { startsAt, endsAt, blockedUntil, claimedAt, reminderSentAt, hourReminderSentAt });
        await appointment.save();
        return res.status(409).json({ message: SLOT_TAKEN });
    }
    await appointment.populate(POPULATE);
    void sendRescheduleNotice(appointment);
    return res.json({ appointment });
}));

router.post('/appointments/:id/cancel', validate(z.object({ reason: z.string().trim().max(1000).default('') })), asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const appointment = await findOwnScheduled(req, res);
    if (!appointment) return null;
    Object.assign(appointment, {
        status: 'cancelled', cancelReason: req.body.reason || 'Cancelled by client', cancelledAt: new Date(), cancelledBy: req.user._id,
    });
    await appointment.save();
    await appointment.populate(POPULATE);
    void sendCancellationNotice(appointment);
    return res.json({ appointment });
}));

export default router;
