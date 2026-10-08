import mongoose from 'mongoose';

export const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'no-show'];

const appointmentSchema = new mongoose.Schema({
    appointmentType: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentType', required: true },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, trim: true, lowercase: true, default: '' },
    clientPhone: { type: String, trim: true, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Set when the booking was made by a client through the portal; clients only ever see their own.
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    // endsAt plus the type's buffer: the time the assignee is actually unavailable until.
    blockedUntil: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, default: 'scheduled', index: true },
    notes: { type: String, default: '' },
    // 'one-to-one' = in person / direct; 'online' = video meeting joined through meetingUrl.
    meetingMode: { type: String, enum: ['one-to-one', 'online'], default: 'one-to-one' },
    meetingUrl: { type: String, default: '' },
    // When this booking last claimed its time. Orders racing bookings for the last free slot (see portal.js).
    claimedAt: { type: Date, default: Date.now },
    // The two reminder emails (day before / hour before); each is sent once.
    reminderSentAt: { type: Date, default: null },
    hourReminderSentAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

appointmentSchema.index({ assignedTo: 1, startsAt: 1 });
appointmentSchema.set('toJSON', { transform: (_doc, ret) => { delete ret.__v; return ret; } });

export default mongoose.model('Appointment', appointmentSchema);
