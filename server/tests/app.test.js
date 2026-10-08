import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { clientOrigins, createApp } from '../src/app.js';

const original = process.env.CLIENT_ORIGIN;
afterEach(() => { process.env.CLIENT_ORIGIN = original; });

describe('CORS / client origins', () => {
    it('accepts several comma-separated origins and rejects others', async () => {
        process.env.CLIENT_ORIGIN = 'https://sricr.com, https://sricr.vercel.app/';
        expect(clientOrigins()).toEqual(['https://sricr.com', 'https://sricr.vercel.app']);
        const app = createApp();
        const ok = await request(app).get('/api/health').set('Origin', 'https://sricr.vercel.app');
        expect(ok.headers['access-control-allow-origin']).toBe('https://sricr.vercel.app');
        const other = await request(app).get('/api/health').set('Origin', 'https://evil.example');
        expect(other.headers['access-control-allow-origin']).toBeUndefined();
    });
});
