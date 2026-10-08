import { Router } from 'express';
import { z } from 'zod';
import Appointment from '../models/Appointment.js';
import AppointmentType from '../models/AppointmentType.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

const typeSchema = z.object({
    name: z.string().trim().min(1),
    description: z.string().trim().max(500).default(''),
    durationMinutes: z.number().int().min(5).max(480),
    bufferMinutes: z.number().int().min(0).max(120).default(0),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #703a4b').default('#703a4b'),
    active: z.boolean().default(true),
});

// Anyone signed in can read the types (booking screens need them); only admins configure them.
router.get('/', asyncHandler(async (req, res) => {
    // Clients only ever see the types they can actually book.
    const filter = req.query.active === 'true' || req.user.role === 'client' ? { active: true } : {};
    res.json({ appointmentTypes: await AppointmentType.find(filter).sort({ name: 1 }) });
}));

router.post('/', requireRole('admin'), validate(typeSchema), asyncHandler(async (req, res) => {
    if (await AppointmentType.exists({ name: req.body.name })) {
        return res.status(409).json({ message: 'An appointment type with this name already exists' });
    }
    return res.status(201).json({ appointmentType: await AppointmentType.create(req.body) });
}));

router.put('/:id', requireRole('admin'), validate(typeSchema), asyncHandler(async (req, res) => {
    if (await AppointmentType.exists({ name: req.body.name, _id: { $ne: req.params.id } })) {
        return res.status(409).json({ message: 'An appointment type with this name already exists' });
    }
    const appointmentType = await AppointmentType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!appointmentType) return res.status(404).json({ message: 'Appointment type not found' });
    return res.json({ appointmentType });
}));

router.delete('/:id', requireRole('admin'), asyncHandler(async (req, res) => {
    // Types that appointments point at are deactivated rather than deleted, so history keeps its type.
    if (await Appointment.exists({ appointmentType: req.params.id })) {
        const appointmentType = await AppointmentType.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
        if (!appointmentType) return res.status(404).json({ message: 'Appointment type not found' });
        return res.json({ appointmentType, deactivated: true });
    }
    const removed = await AppointmentType.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: 'Appointment type not found' });
    return res.json({ deleted: true });
}));

export default router;
