/**
 * Script to create an admin user
 * Usage: node backend/scripts/createAdmin.js <email> <password>
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

const createAdmin = async () => {
  try {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error('Usage: node createAdmin.js <email> <password>');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists with this email');
      process.exit(0);
    }

    // Check if user exists (non-admin)
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      // Update to admin
      existingUser.role = 'admin';
      existingUser.password = password; // Will be hashed by pre-save hook
      await existingUser.save();
      console.log('User updated to admin successfully!');
      console.log(`Email: ${email}`);
      console.log(`Role: admin`);
    } else {
      // Create new admin
      const admin = new User({
        email: email.toLowerCase().trim(),
        password: password,
        role: 'admin',
        name: 'Admin'
      });
      await admin.save();
      console.log('Admin user created successfully!');
      console.log(`Email: ${email}`);
      console.log(`Role: admin`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();

