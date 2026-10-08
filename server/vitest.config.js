import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        // Serial files: the first run downloads the mongod binary and parallel downloads clobber each other.
        fileParallelism: false,
        // Each file boots its own in-memory MongoDB; the first run downloads the mongod binary.
        testTimeout: 30_000,
        hookTimeout: 180_000,
        env: {
            NODE_ENV: 'test',
            JWT_SECRET: 'test-secret',
            CLIENT_ORIGIN: 'http://localhost:5173',
            BUSINESS_TIMEZONE: 'UTC',
            BOOKING_OPEN_DAYS: '0,1,2,3,4,5,6',
            BOOKING_OPEN_HOUR: '9',
            BOOKING_CLOSE_HOUR: '17',
            BOOKING_SLOT_MINUTES: '30',
            BOOKING_MIN_NOTICE_MINUTES: '60',
            REMINDER_HOURS_BEFORE: '24',
            REMINDER_MINUTES_BEFORE: '60',
        },
    },
});
