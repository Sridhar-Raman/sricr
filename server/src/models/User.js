import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

/** admin/staff run the back office; client is a self-registered customer limited to the portal. */
export const ROLES = ['admin', 'staff', 'client'];
export const STAFF_ROLES = ['admin', 'staff'];

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'staff' },
    active: { type: Boolean, default: true },
    // Tokens issued before this moment are rejected (set on every password change/reset).
    passwordChangedAt: { type: Date },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.statics.hashPassword = (password) => bcrypt.hash(password, 12);
userSchema.methods.verifyPassword = function verifyPassword(password) {
    return bcrypt.compare(password, this.passwordHash);
};
userSchema.set('toJSON', {
    transform: (_doc, ret) => { delete ret.passwordHash; delete ret.resetTokenHash; delete ret.resetTokenExpires; delete ret.__v; return ret; },
});

export default mongoose.model('User', userSchema);
