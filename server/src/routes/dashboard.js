import { Router } from 'express';
import { booking } from '../config/booking.js';
import Appointment from '../models/Appointment.js';
import AppointmentType from '../models/AppointmentType.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/validate.js';
import { zonedParts, zonedTimeToUtc } from '../utils/time.js';

const router = Router();
router.use(requireAuth);

const DAYS_BACK = 6; // the daily chart shows 6 days back, today, and 7 days ahead
const DAYS_AHEAD = 7;

router.get('/summary', asyncHandler(async (req, res) => {
    const tz = booking.timezone;
    const isAdmin = req.user.role === 'admin';
    // A client's numbers are scoped to their own bookings.
    const scope = req.user.role === 'client' ? { client: req.user._id } : {};
    const live = { ...scope, status: { $ne: 'cancelled' } };

    // "Today" and the chart window are calendar days in the business time zone, not the server's.
    const now = zonedParts(new Date(), tz);
    const dayStart = (offset) => zonedTimeToUtc(now.year, now.month, now.day + offset, 0, 0, tz);
    const startOfDay = dayStart(0);
    const endOfDay = dayStart(1);
    const windowStart = dayStart(-DAYS_BACK);
    const windowEnd = dayStart(DAYS_AHEAD + 1);

    const [
        todayCount, upcomingCount, byStatus, activeTypes, activeUsers, upcoming, dailyRows, typeRows, hourRows,
    ] = await Promise.all([
        Appointment.countDocuments({ ...live, startsAt: { $gte: startOfDay, $lt: endOfDay } }),
        Appointment.countDocuments({ ...scope, startsAt: { $gte: endOfDay }, status: 'scheduled' }),
        Appointment.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        AppointmentType.countDocuments({ active: true }),
        isAdmin ? User.countDocuments({ active: true, role: { $in: ['admin', 'staff'] } }) : null,
        Appointment.find({ ...scope, startsAt: { $gte: new Date() }, status: 'scheduled' })
            .sort({ startsAt: 1 }).limit(5).populate('appointmentType', 'name color'),
        // bookings per calendar day (business time zone)
        Appointment.aggregate([
            { $match: { ...live, startsAt: { $gte: windowStart, $lt: windowEnd } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startsAt', timezone: tz } }, count: { $sum: 1 } } },
        ]),
        // bookings per appointment type
        Appointment.aggregate([
            { $match: live },
            { $group: { _id: '$appointmentType', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 },
            { $lookup: { from: AppointmentType.collection.name, localField: '_id', foreignField: '_id', as: 'type' } },
            { $unwind: '$type' },
            { $project: { _id: 0, name: '$type.name', color: '$type.color', count: 1 } },
        ]),
        // bookings per hour of the day (business time zone)
        Appointment.aggregate([
            { $match: live },
            { $group: { _id: { $hour: { date: '$startsAt', timezone: tz } }, count: { $sum: 1 } } },
        ]),
    ]);

    const perDay = new Map(dailyRows.map((row) => [row._id, row.count]));
    const daily = [];
    for (let offset = -DAYS_BACK; offset <= DAYS_AHEAD; offset += 1) {
        const date = new Date(Date.UTC(now.year, now.month - 1, now.day + offset)).toISOString().slice(0, 10);
        daily.push({ date, offset, count: perDay.get(date) || 0 });
    }

    const perHour = new Map(hourRows.map((row) => [row._id, row.count]));
    const hours = [];
    for (let hour = booking.openHour; hour < booking.closeHour; hour += 1) hours.push({ hour, count: perHour.get(hour) || 0 });

    res.json({
        today: todayCount,
        upcoming: upcomingCount,
        byStatus: Object.fromEntries(byStatus.map((row) => [row._id, row.count])),
        activeAppointmentTypes: activeTypes,
        activeUsers, // null for non-admins
        nextAppointments: upcoming,
        timezone: tz,
        daily,
        byType: typeRows,
        hours,
    });
}));

export default router;
