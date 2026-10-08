import mongoose from 'mongoose';

const appointmentTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '', trim: true },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    bufferMinutes: { type: Number, default: 0, min: 0, max: 120 },
    color: { type: String, default: '#703a4b' },
    active: { type: Boolean, default: true },
}, { timestamps: true });

appointmentTypeSchema.set('toJSON', { transform: (_doc, ret) => { delete ret.__v; return ret; } });

export default mongoose.model('AppointmentType', appointmentTypeSchema);
