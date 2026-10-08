import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { outbox } from '../src/services/mailer.js';
import Appointment from '../src/models/Appointment.js';
import AppointmentType from '../src/models/AppointmentType.js';
import User from '../src/models/User.js';

let mongo;
export const app = createApp();
export const api = () => request(app);
export { outbox };

export const startDb = async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([User.init(), Appointment.init(), AppointmentType.init()]);
};
export const stopDb = async () => { await mongoose.disconnect(); await mongo.stop(); };
export const resetDb = async () => {
    await Promise.all([User, Appointment, AppointmentType].map((model) => model.deleteMany({})));
    outbox.length = 0;
};

export const PASSWORD = 'Password123!';
export const makeUser = async (role, name = role, extra = {}) => User.create({
    name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`, role,
    passwordHash: await User.hashPassword(PASSWORD), ...extra,
});
export const loginAs = async (user) => {
    const { body } = await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    return body.token;
};
export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
export const makeType = (extra = {}) => AppointmentType.create({ name: 'Consultation', durationMinutes: 30, ...extra });

/** The first `count` free slots (ISO strings) on the soonest bookable day, as the portal API reports them. */
export const freeSlots = async (token, typeId, count = 1) => {
    for (let ahead = 1; ahead < 10; ahead += 1) {
        const date = new Date(Date.now() + ahead * 86400000).toISOString().slice(0, 10);
        // eslint-disable-next-line no-await-in-loop
        const { body } = await api().get('/api/portal/availability').query({ date, type: String(typeId) }).set(bearer(token));
        if (body.slots?.length >= count) return body.slots.slice(0, count);
    }
    throw new Error('no free slots found');
};
