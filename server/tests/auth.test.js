import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import User from '../src/models/User.js';
import { api, bearer, loginAs, makeUser, outbox, PASSWORD, resetDb, startDb, stopDb } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const tokenFromMail = () => outbox.at(-1).text.match(/token=([0-9a-f]+)/)[1];
// JWT iat has one-second resolution; wait so a password change lands in a later second than the old token.
const nextSecond = () => new Promise((resolve) => { setTimeout(resolve, 1100); });

describe('signup and login', () => {
    it('signup only ever creates a client', async () => {
        const res = await api().post('/api/auth/signup').send({
            name: 'New Person', email: 'new@example.com', password: PASSWORD, acceptTerms: true, role: 'admin',
        });
        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('client');
        expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('answers a wrong password and a deactivated account identically', async () => {
        const user = await makeUser('client', 'Dana');
        const wrong = await api().post('/api/auth/login').send({ email: user.email, password: 'nope' });
        await User.updateOne({ _id: user._id }, { active: false });
        const inactive = await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD });
        expect(wrong.status).toBe(401);
        expect(inactive.body.message).toBe(wrong.body.message);
    });
});

describe('password reset', () => {
    it('answers the same for unknown emails and sends no mail', async () => {
        const known = await makeUser('client', 'Known');
        const a = await api().post('/api/auth/forgot-password').send({ email: known.email });
        outbox.length = 0;
        const b = await api().post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
        expect(a.status).toBe(200);
        expect(b.status).toBe(200);
        expect(b.body).toEqual(a.body);
        expect(outbox).toHaveLength(0);
    });

    it('resets the password once, stores only a hash, and signs out older sessions', async () => {
        const user = await makeUser('client', 'Resetter');
        const oldToken = await loginAs(user);
        await api().post('/api/auth/forgot-password').send({ email: user.email });
        const token = tokenFromMail();

        const stored = await User.findById(user._id).select('+resetTokenHash');
        expect(stored.resetTokenHash).toBe(createHash('sha256').update(token).digest('hex'));
        expect(stored.resetTokenHash).not.toBe(token);

        expect((await api().get('/api/auth/me').set(bearer(oldToken))).status).toBe(200);
        await nextSecond();

        const reset = await api().post('/api/auth/reset-password').send({ token, password: 'BrandNew#2024' });
        expect(reset.status).toBe(200);
        expect((await api().post('/api/auth/login').send({ email: user.email, password: 'BrandNew#2024' })).status).toBe(200);
        expect((await api().post('/api/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(401);
        expect((await api().get('/api/auth/me').set(bearer(oldToken))).status).toBe(401);

        const again = await api().post('/api/auth/reset-password').send({ token, password: 'Another#2024' });
        expect(again.status).toBe(400);
    });

    it('rejects an expired or made-up token', async () => {
        const user = await makeUser('client', 'Expired');
        await api().post('/api/auth/forgot-password').send({ email: user.email });
        const token = tokenFromMail();
        await User.updateOne({ _id: user._id }, { resetTokenExpires: new Date(Date.now() - 1000) });
        expect((await api().post('/api/auth/reset-password').send({ token, password: 'BrandNew#2024' })).status).toBe(400);
        expect((await api().post('/api/auth/reset-password').send({ token: 'f'.repeat(64), password: 'BrandNew#2024' })).status).toBe(400);
    });

    it('enforces the password rules on reset', async () => {
        const res = await api().post('/api/auth/reset-password').send({ token: 'f'.repeat(64), password: 'short' });
        expect(res.status).toBe(400);
    });
});

describe('profile and change password', () => {
    it('updates name and phone but never role or email', async () => {
        const user = await makeUser('client', 'Profile');
        const token = await loginAs(user);
        const res = await api().patch('/api/auth/me').set(bearer(token))
            .send({ name: 'Renamed Person', phone: '+91 98765 43210', role: 'admin', email: 'x@y.com' });
        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ name: 'Renamed Person', phone: '+91 98765 43210', role: 'client', email: user.email });
    });

    it('requires the current password and returns a working fresh token', async () => {
        const user = await makeUser('client', 'Changer');
        const token = await loginAs(user);
        const bad = await api().post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'wrong', newPassword: 'BrandNew#2024' });
        expect(bad.status).toBe(400);

        await nextSecond();
        const ok = await api().post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: PASSWORD, newPassword: 'BrandNew#2024' });
        expect(ok.status).toBe(200);
        expect((await api().get('/api/auth/me').set(bearer(ok.body.token))).status).toBe(200);
        expect((await api().get('/api/auth/me').set(bearer(token))).status).toBe(401);
    });
});
