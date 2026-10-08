import { randomBytes } from 'node:crypto';

export const MEETING_MODES = ['one-to-one', 'online'];

/** A unique, unguessable video room. Jitsi needs no account or API key; staff can paste their own link instead. */
export const generateMeetingUrl = () => `${process.env.MEETING_BASE_URL || 'https://meet.jit.si'}/SRI-CR-${randomBytes(9).toString('hex')}`;

/** Fields to store for a mode: online keeps (or gets) a link, one-to-one never has one. */
export const meetingFields = (mode, url) => (mode === 'online'
    ? { meetingMode: 'online', meetingUrl: url || generateMeetingUrl() }
    : { meetingMode: 'one-to-one', meetingUrl: '' });
