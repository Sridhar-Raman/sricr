import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import User from './models/User.js';

const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in server/.env first.');
    process.exit(1);
}

await connectDb();
const email = SEED_ADMIN_EMAIL.toLowerCase();
if (await User.exists({ email })) {
    console.log(`Admin ${email} already exists; nothing to do.`);
}
else {
    await User.create({
        name: SEED_ADMIN_NAME || 'Administrator', email, role: 'admin',
        passwordHash: await User.hashPassword(SEED_ADMIN_PASSWORD),
    });
    console.log(`Admin ${email} created. Sign in, then change the password.`);
}
await mongoose.disconnect();
