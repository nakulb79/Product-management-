import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const createUser = async () => {
  const name = 'Admin';
  const email = 'admin@example.com';
  const password = 'password123';

  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      console.error(
        'Refusing to run: NODE_ENV=production. This script creates a well-known demo admin account ' +
          '(admin@example.com / password123). Set ALLOW_SEED=true if you really intend to run this against production.'
      );
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI not found in .env');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await connectDb(mongoUri);

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log(`User with email ${email} already exists.`);
    } else {
      const hashedPassword = await hashPassword(password);
      await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'owner',
        isActive: true
      });
      console.log('-----------------------------------');
      console.log('User created successfully!');
      console.log(`Name:     ${name}`);
      console.log(`Email:    ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Role:     owner`);
      console.log('-----------------------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createUser();
