import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sendDueReminders } from '../src/jobs/reminders.js';
import Appointment from '../src/models/Appointment.js';
import { api, bearer, freeSlots, loginAs, makeType, makeUser, outbox, resetDb, startDb, stopDb } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

const book = (token, type, startsAt) => api().post('/api/portal/appointments').set(bearer(token)).send({ appointmentType: String(type._id), startsAt });

const setup = async () => {
    await makeUser('staff', 'Solo Staff'); // capacity = 1
    const type = await makeType();
    const alice = await makeUser('client', 'Alice');
    const bob = await makeUser('client', 'Bob');
    return { type, aliceToken: await loginAs(alice), bobToken: await loginAs(bob) };
};

describe('portal booking', () => {
    it('books a free slot, emails a confirmation and removes the slot from availability', async () => {
        const { type, aliceToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        const res = await book(aliceToken, type, slot);
        expect(res.status).toBe(201);
        expect(res.body.appointment.appointmentType.name).toBe('Consultation');
        expect(outbox).toHaveLength(1);
        expect(outbox[0].to).toBe('alice@example.com');
        expect(outbox[0].subject).toContain('confirmed');

        const after = await api().get('/api/portal/availability').query({ date: slot.slice(0, 10), type: String(type._id) }).set(bearer(aliceToken));
        expect(after.body.slots).not.toContain(slot);
    });

    it('refuses a start time that is not an offered slot', async () => {
        const { type, aliceToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        const odd = new Date(new Date(slot).getTime() + 7 * 60000).toISOString();
        expect((await book(aliceToken, type, odd)).status).toBe(409);
    });

    it('lets only one of two simultaneous bookings take the last slot', async () => {
        const { type, aliceToken, bobToken } = await setup();
        const slots = await freeSlots(aliceToken, type._id, 6);
        // several rounds: a single run might not interleave
        for (const slot of slots) {
            // eslint-disable-next-line no-await-in-loop
            const [a, b] = await Promise.all([book(aliceToken, type, slot), book(bobToken, type, slot)]);
            expect([a.status, b.status].sort()).toEqual([201, 409]);
            // eslint-disable-next-line no-await-in-loop
            expect(await Appointment.countDocuments({ startsAt: new Date(slot), status: 'scheduled' })).toBe(1);
        }
    });

    it('lets a client reschedule, rolls back onto a taken slot, and notifies', async () => {
        const { type, aliceToken, bobToken } = await setup();
        const [first, second, third] = await freeSlots(aliceToken, type._id, 3);
        const mine = (await book(aliceToken, type, first)).body.appointment;
        await book(bobToken, type, second);
        outbox.length = 0;

        const clash = await api().patch(`/api/portal/appointments/${mine._id}/reschedule`).set(bearer(aliceToken)).send({ startsAt: second });
        expect(clash.status).toBe(409);
        expect((await Appointment.findById(mine._id)).startsAt.toISOString()).toBe(first);

        const moved = await api().patch(`/api/portal/appointments/${mine._id}/reschedule`).set(bearer(aliceToken)).send({ startsAt: third });
        expect(moved.status).toBe(200);
        expect(outbox.at(-1).subject).toContain('rescheduled');
    });

    it("never lets a client touch someone else's booking", async () => {
        const { type, aliceToken, bobToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        const theirs = (await book(aliceToken, type, slot)).body.appointment;
        const res = await api().post(`/api/portal/appointments/${theirs._id}/cancel`).set(bearer(bobToken)).send({});
        expect(res.status).toBe(404);
        expect((await Appointment.findById(theirs._id)).status).toBe('scheduled');
    });

    it('cancels, frees the slot and emails the client', async () => {
        const { type, aliceToken, bobToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        const mine = (await book(aliceToken, type, slot)).body.appointment;
        outbox.length = 0;
        const res = await api().post(`/api/portal/appointments/${mine._id}/cancel`).set(bearer(aliceToken)).send({ reason: 'Plans changed' });
        expect(res.status).toBe(200);
        expect(outbox.at(-1).subject).toContain('cancelled');
        expect((await book(bobToken, type, slot)).status).toBe(201);
    });
});

describe('email content', () => {
    it('is a greeted, branded message that says why the recipient got it', async () => {
        const { type, aliceToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        await api().post('/api/portal/appointments').set(bearer(aliceToken))
            .send({ appointmentType: String(type._id), startsAt: slot, meetingMode: 'online' });
        const mail = outbox[0];
        expect(mail.text).toMatch(/^Good (morning|afternoon|evening), Alice,/);
        expect(mail.text).toContain('Service: Consultation');
        expect(mail.text).toContain('Join meeting: https://meet.jit.si/');
        expect(mail.text).toContain('Kind regards,');
        expect(mail.text).toContain('You are receiving this email because an appointment was booked');
        expect(mail.text).toContain('please ignore this email');
        expect(mail.html).toContain('<a href="https://meet.jit.si/');
        expect(mail.html).toContain('You are receiving this email because');
    });

    it('emails the client when staff change the booking, listing what changed, but not for notes', async () => {
        const staff = await makeUser('staff', 'Host');
        const other = await makeUser('staff', 'Second Host');
        const token = await loginAs(staff);
        const type = await makeType();
        const startsAt = new Date(Date.now() + 3 * 86400000);
        const created = (await api().post('/api/appointments').set(bearer(token)).send({
            appointmentType: String(type._id), clientName: 'Carol', clientEmail: 'carol@example.com', startsAt: startsAt.toISOString(),
        })).body.appointment;
        outbox.length = 0;
        const patch = (body) => api().patch(`/api/appointments/${created._id}`).set(bearer(token)).send(body);

        await patch({ notes: 'bring documents' });
        expect(outbox).toHaveLength(0);

        await patch({ startsAt: new Date(startsAt.getTime() + 3600000).toISOString() });
        expect(outbox).toHaveLength(1);
        expect(outbox[0]).toMatchObject({ to: 'carol@example.com' });
        expect(outbox[0].subject).toContain('Appointment updated');
        expect(outbox[0].text).toContain('What changed: Date and time');

        await patch({ assignedTo: String(other._id), meetingMode: 'online' });
        expect(outbox).toHaveLength(2);
        expect(outbox[1].text).toContain('What changed: Assigned to, Meeting type, Meeting link');
        expect(outbox[1].text).toContain('With: Second Host');
        expect(outbox[1].text).toContain('Join meeting: https://meet.jit.si/');

        // re-saving the same values changes nothing, so no mail
        await patch({ assignedTo: String(other._id), notes: 'again' });
        expect(outbox).toHaveLength(2);
    });

    it('escapes user-supplied text in the HTML part', async () => {
        const staff = await makeUser('staff', 'Host');
        const token = await loginAs(staff);
        const type = await makeType();
        await api().post('/api/appointments').set(bearer(token)).send({
            appointmentType: String(type._id), clientName: '<script>alert(1)</script>', clientEmail: 'x@example.com',
            startsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
        });
        expect(outbox[0].html).not.toContain('<script>');
        expect(outbox[0].html).toContain('&lt;script&gt;');
    });
});

describe('meeting mode', () => {
    it('defaults to one-to-one with no link', async () => {
        const { type, aliceToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        const res = await book(aliceToken, type, slot);
        expect(res.body.appointment).toMatchObject({ meetingMode: 'one-to-one', meetingUrl: '' });
        expect(outbox[0].text).not.toContain('Join online');
    });

    it('creates a unique join link for an online booking and puts it in the email', async () => {
        const { type, aliceToken, bobToken } = await setup();
        const [first, second] = await freeSlots(aliceToken, type._id, 2);
        const post = (token, startsAt) => api().post('/api/portal/appointments').set(bearer(token))
            .send({ appointmentType: String(type._id), startsAt, meetingMode: 'online' });
        const a = (await post(aliceToken, first)).body.appointment;
        const b = (await post(bobToken, second)).body.appointment;
        expect(a.meetingMode).toBe('online');
        expect(a.meetingUrl).toMatch(/^https:\/\/meet\.jit\.si\/SRI-CR-[0-9a-f]{18}$/);
        expect(b.meetingUrl).not.toBe(a.meetingUrl);
        expect(outbox[0].text).toContain(a.meetingUrl);

        // the link survives a reschedule
        const [, , third] = await freeSlots(aliceToken, type._id, 3);
        const moved = await api().patch(`/api/portal/appointments/${a._id}/reschedule`).set(bearer(aliceToken)).send({ startsAt: third });
        expect(moved.body.appointment.meetingUrl).toBe(a.meetingUrl);
    });

    it('lets staff use their own https link, rejects other schemes, and clears it when switched to one-to-one', async () => {
        const staff = await makeUser('staff', 'Host');
        const token = await loginAs(staff);
        const type = await makeType();
        const startsAt = new Date(Date.now() + 3 * 86400000).toISOString();
        const base = { appointmentType: String(type._id), clientName: 'Walk In', startsAt };
        const post = (extra) => api().post('/api/appointments').set(bearer(token)).send({ ...base, ...extra });

        expect((await post({ meetingMode: 'online', meetingUrl: 'javascript:alert(1)' })).status).toBe(400);
        expect((await post({ meetingMode: 'online', meetingUrl: 'http://insecure.example.com/x' })).status).toBe(400);

        const ok = await post({ meetingMode: 'online', meetingUrl: 'https://zoom.us/j/123456' });
        expect(ok.status).toBe(201);
        expect(ok.body.appointment.meetingUrl).toBe('https://zoom.us/j/123456');

        const back = await api().patch(`/api/appointments/${ok.body.appointment._id}`).set(bearer(token)).send({ meetingMode: 'one-to-one' });
        expect(back.body.appointment).toMatchObject({ meetingMode: 'one-to-one', meetingUrl: '' });
    });
});



describe('reminders (a day before and an hour before, once each)', () => {
    const HOUR = 3600000;
    /** Books one appointment, then moves it so it starts `startsInMs` from now and was booked `bookedAgoMs` ago. */
    const bookAt = async (startsInMs, bookedAgoMs = 3 * 24 * HOUR) => {
        const { type, aliceToken } = await setup();
        const [slot] = await freeSlots(aliceToken, type._id);
        await book(aliceToken, type, slot);
        const move = async (inMs) => {
            const start = new Date(Date.now() + inMs);
            const end = new Date(start.getTime() + 1800000);
            await Appointment.updateOne({}, { startsAt: start, endsAt: end, blockedUntil: end });
        };
        await move(startsInMs);
        await Appointment.updateOne({}, { claimedAt: new Date(Date.now() - bookedAgoMs) });
        outbox.length = 0;
        return { move };
    };

    it('sends the day-before reminder once', async () => {
        await bookAt(20 * HOUR);
        expect(await sendDueReminders()).toBe(1);
        expect(outbox[0].subject).toContain('Reminder');
        expect(outbox[0].text).toContain('Kind regards,');
        expect(await sendDueReminders()).toBe(0);
    });

    it('sends the hour-before reminder once, and then no second one', async () => {
        await bookAt(30 * 60000);
        expect(await sendDueReminders()).toBe(1); // only the hour reminder, not both
        expect(outbox[0].subject).toContain('Starting soon');
        expect(await sendDueReminders()).toBe(0);
    });

    it('sends both over time: the day reminder first, the hour reminder later', async () => {
        const { move } = await bookAt(20 * HOUR);
        await sendDueReminders();
        await move(30 * 60000); // time passes
        expect(await sendDueReminders()).toBe(1);
        expect(outbox.map((m) => m.subject.split(':')[0])).toEqual(['Reminder', 'Starting soon']);
    });

    it('sends nothing too early, for cancelled bookings, or for the day reminder on a late booking', async () => {
        const { move } = await bookAt(72 * HOUR);
        expect(await sendDueReminders()).toBe(0);
        await move(20 * HOUR);
        await Appointment.updateOne({}, { status: 'cancelled' });
        expect(await sendDueReminders()).toBe(0);
        await Appointment.updateOne({}, { status: 'scheduled', claimedAt: new Date() }); // booked just now for tomorrow-ish
        expect(await sendDueReminders()).toBe(0);
    });

    it('sends fresh reminders after a reschedule', async () => {
        const { type, aliceToken } = await setup();
        const [slot, later] = await freeSlots(aliceToken, type._id, 2);
        const mine = (await book(aliceToken, type, slot)).body.appointment;
        const soon = new Date(Date.now() + 20 * HOUR);
        await Appointment.updateOne({}, { startsAt: soon, endsAt: new Date(soon.getTime() + 1800000), blockedUntil: new Date(soon.getTime() + 1800000), claimedAt: new Date(Date.now() - 3 * 24 * HOUR) });
        await sendDueReminders();
        await api().patch(`/api/portal/appointments/${mine._id}/reschedule`).set(bearer(aliceToken)).send({ startsAt: later });
        const after = await Appointment.findById(mine._id);
        expect(after.reminderSentAt).toBeNull();
        expect(after.hourReminderSentAt).toBeNull();
    });
});
