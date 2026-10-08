import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Appointment, { APPOINTMENT_STATUSES } from '../models/Appointment.js';
import AppointmentType from '../models/AppointmentType.js';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { MEETING_MODES, meetingFields } from '../utils/meeting.js';
import { asyncHandler, validate } from '../middleware/validate.js';
import { sendBookingConfirmation, sendCancellationNotice, sendUpdateNotice } from '../services/notifications.js';

const router = Router();
router.use(requireAuth);
/** Everything that changes a booking, and the staff-only helpers, stay limited to admin/staff. */
const staffOnly = requireRole('admin', 'staff');

const POPULATE = [
    { path: 'appointmentType', select: 'name color durationMinutes bufferMinutes' },
    { path: 'assignedTo', select: 'name' },
];
const MINUTE = 60 * 1000;

const objectId = z.string().refine((value) => mongoose.isValidObjectId(value), 'Invalid id');
const optionalId = z.union([objectId, z.literal(''), z.null()]).optional()
    .transform((value) => value || null);

const meetingUrl = z.union([z.string().trim().url().max(500).refine((v) => /^https:\/\//i.test(v), 'Meeting link must start with https://'), z.literal('')]);

const createSchema = z.object({
    meetingMode: z.enum(MEETING_MODES).default('one-to-one'),
    meetingUrl: meetingUrl.default(''),
    appointmentType: objectId,
    clientName: z.string().trim().min(1, 'Client name is required').max(120),
    clientEmail: z.union([z.string().trim().email(), z.literal('')]).default(''),
    clientPhone: z.string().trim().max(30).default(''),
    assignedTo: optionalId,
    startsAt: z.coerce.date(),
    notes: z.string().trim().max(2000).default(''),
});

const updateSchema = z.object({
    meetingMode: z.enum(MEETING_MODES).optional(),
    meetingUrl: meetingUrl.optional(),
    appointmentType: objectId.optional(),
    clientName: z.string().trim().min(1).max(120).optional(),
    clientEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
    clientPhone: z.string().trim().max(30).optional(),
    assignedTo: optionalId,
    startsAt: z.coerce.date().optional(),
    status: z.enum(['scheduled', 'completed', 'no-show']).optional(),
    notes: z.string().trim().max(2000).optional(),
});

const cancelSchema = z.object({
    reason: z.string().trim().min(2, 'Minimum 2 characters').max(5000),
});

/** Free/busy window for an appointment starting at `startsAt` of the given type. */
const windowFor = (type, startsAt) => {
    const endsAt = new Date(startsAt.getTime() + type.durationMinutes * MINUTE);
    return { endsAt, blockedUntil: new Date(endsAt.getTime() + (type.bufferMinutes || 0) * MINUTE) };
};

/** Another live appointment for the same assignee overlapping [startsAt, blockedUntil). */
const findConflict = ({ assignedTo, startsAt, blockedUntil, excludeId }) => {
    if (!assignedTo) return null;
    return Appointment.findOne({
        assignedTo,
        status: { $in: ['scheduled', 'completed'] },
        startsAt: { $lt: blockedUntil },
        blockedUntil: { $gt: startsAt },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
};

const assertAssignable = async (assignedTo) => {
    if (!assignedTo) return true;
    const user = await User.findById(assignedTo);
    return !!user?.active && user.role !== 'client';
};

// Users that can be picked as the assignee (the full Users list is admin-only).
router.get('/assignees', staffOnly, asyncHandler(async (_req, res) => {
    res.json({ assignees: await User.find({ active: true, role: { $in: ['admin', 'staff'] } }).select('name').sort({ name: 1 }) });
}));

// Calendar feed: appointments overlapping [from, to). Cancelled ones only show when asked for.
// Staff see everything. A client sees their OWN bookings in full, and everyone else's scheduled bookings only as
// anonymous "Booked" blocks (time only: no name, contact details, notes, type or assignee).
router.get('/', asyncHandler(async (req, res) => {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({ message: 'from and to must be valid dates' });
    }
    const window = { startsAt: { $lt: to }, endsAt: { $gt: from } };
    const filter = { ...window };
    if (req.query.status) {
        if (!APPOINTMENT_STATUSES.includes(req.query.status)) return res.status(400).json({ message: 'Invalid status' });
        filter.status = req.query.status;
    }
    else filter.status = { $ne: 'cancelled' };
    for (const key of ['appointmentType', 'assignedTo']) {
        if (req.query[key]) {
            if (!mongoose.isValidObjectId(req.query[key])) return res.status(400).json({ message: `Invalid ${key}` });
            filter[key] = req.query[key];
        }
    }

    if (req.user.role !== 'client') {
        return res.json({ appointments: await Appointment.find(filter).sort({ startsAt: 1 }).populate(POPULATE) });
    }

    // Client: filters narrow only their own bookings; the assignee filter is ignored so it cannot be used to probe staff.
    delete filter.assignedTo;
    const own = await Appointment.find({ ...filter, client: req.user._id }).sort({ startsAt: 1 }).populate(POPULATE);
    const showOthers = !req.query.status || req.query.status === 'scheduled';
    const others = showOthers
        ? await Appointment.find({ ...window, status: 'scheduled', client: { $ne: req.user._id } }).select('startsAt endsAt').sort({ startsAt: 1 })
        : [];
    const masked = others.map((a) => ({ _id: a._id, startsAt: a.startsAt, endsAt: a.endsAt, status: 'scheduled', masked: true, clientName: 'Booked' }));
    return res.json({ appointments: [...own, ...masked].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)) });
}));

router.post('/', staffOnly, validate(createSchema), asyncHandler(async (req, res) => {
    const body = req.body;
    // Legacy rule: appointments cannot be booked for past times (a minute of grace for a slot just clicked).
    if (body.startsAt.getTime() < Date.now() - MINUTE) {
        return res.status(400).json({ message: 'Appointments cannot be booked for past dates.' });
    }
    const type = await AppointmentType.findById(body.appointmentType);
    if (!type || !type.active) return res.status(400).json({ message: 'Choose an active appointment type' });
    if (!(await assertAssignable(body.assignedTo))) return res.status(400).json({ message: 'Choose an active user to assign' });

    const slot = windowFor(type, body.startsAt);
    if (await findConflict({ assignedTo: body.assignedTo, startsAt: body.startsAt, blockedUntil: slot.blockedUntil })) {
        return res.status(409).json({ message: 'That user already has an appointment at this time.' });
    }
    const created = await Appointment.create({ ...body, ...slot, ...meetingFields(body.meetingMode, body.meetingUrl) });
    await created.populate(POPULATE);
    void sendBookingConfirmation(created);
    return res.status(201).json({ appointment: created });
}));

router.patch('/:id', staffOnly, validate(updateSchema), asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.status === 'cancelled') return res.status(400).json({ message: 'A cancelled appointment cannot be changed' });
    const changes = req.body;

    if (changes.status === 'completed') {
        // Legacy rule: Completed is only selectable once the appointment time has been reached.
        const start = changes.startsAt || appointment.startsAt;
        if (start.getTime() > Date.now()) return res.status(400).json({ message: 'An appointment can be completed only after its start time.' });
    }

    // What the client could notice, captured before the edit so the update email can say what changed.
    const before = {
        time: appointment.startsAt.getTime(), type: String(appointment.appointmentType), assignee: String(appointment.assignedTo || ''),
        mode: appointment.meetingMode, url: appointment.meetingUrl,
    };
    let movedTime = false;
    const rescheduling = changes.startsAt || changes.appointmentType || 'assignedTo' in changes;
    if (rescheduling) {
        if (appointment.status !== 'scheduled') {
            return res.status(400).json({ message: 'Only scheduled appointments can be rescheduled' });
        }
        const startsAt = changes.startsAt || appointment.startsAt;
        if (changes.startsAt && startsAt.getTime() < Date.now() - MINUTE) {
            return res.status(400).json({ message: 'Appointments cannot be moved to a past time.' });
        }
        const type = await AppointmentType.findById(changes.appointmentType || appointment.appointmentType);
        if (!type) return res.status(400).json({ message: 'Appointment type not found' });
        if (changes.appointmentType && !type.active) return res.status(400).json({ message: 'Choose an active appointment type' });
        const assignedTo = 'assignedTo' in changes ? changes.assignedTo : appointment.assignedTo;
        if ('assignedTo' in changes && !(await assertAssignable(assignedTo))) {
            return res.status(400).json({ message: 'Choose an active user to assign' });
        }
        const slot = windowFor(type, startsAt);
        if (await findConflict({ assignedTo, startsAt, blockedUntil: slot.blockedUntil, excludeId: appointment._id })) {
            return res.status(409).json({ message: 'That user already has an appointment at this time.' });
        }
        movedTime = !!changes.startsAt && changes.startsAt.getTime() !== appointment.startsAt.getTime();
        Object.assign(appointment, { startsAt, assignedTo, ...slot });
        if (movedTime) { appointment.reminderSentAt = null; appointment.hourReminderSentAt = null; appointment.claimedAt = new Date(); }
        if (changes.appointmentType) appointment.appointmentType = changes.appointmentType;
    }

    if (changes.meetingMode || changes.meetingUrl !== undefined) {
        const mode = changes.meetingMode || appointment.meetingMode;
        // Same mode keeps the existing link unless a new one was typed; a mode switch starts fresh.
        const keep = mode === appointment.meetingMode ? appointment.meetingUrl : '';
        Object.assign(appointment, meetingFields(mode, changes.meetingUrl || keep));
    }

    for (const key of ['clientName', 'clientEmail', 'clientPhone', 'notes', 'status']) {
        if (changes[key] !== undefined) appointment[key] = changes[key];
    }
    await appointment.save();
    await appointment.populate(POPULATE);
    const changed = [];
    if (appointment.startsAt.getTime() !== before.time) changed.push('Date and time');
    if (String(appointment.appointmentType?._id || appointment.appointmentType) !== before.type) changed.push('Service');
    if (String(appointment.assignedTo?._id || appointment.assignedTo || '') !== before.assignee) changed.push('Assigned to');
    if (appointment.meetingMode !== before.mode) changed.push('Meeting type');
    if (appointment.meetingUrl !== before.url) changed.push('Meeting link');
    // A completed / no-show appointment is history, so only live bookings trigger "updated" emails.
    if (changed.length && appointment.status === 'scheduled') void sendUpdateNotice(appointment, changed);
    return res.json({ appointment });
}));

router.post('/:id/cancel', staffOnly, validate(cancelSchema), asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.status !== 'scheduled') return res.status(400).json({ message: 'Only scheduled appointments can be cancelled' });
    Object.assign(appointment, {
        status: 'cancelled', cancelReason: req.body.reason, cancelledAt: new Date(), cancelledBy: req.user._id,
    });
    await appointment.save();
    await appointment.populate(POPULATE);
    void sendCancellationNotice(appointment);
    return res.json({ appointment });
}));

export default router;
