/**
 * Script to create default admin user (admin@gmail.com / admin123)
 * This will be run automatically or can be run manually
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-encryption';

const createDefaultAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin123';

    // Check if admin already exists
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      // Update existing user to admin
      admin.role = 'admin';
      admin.password = adminPassword; // Will be hashed by pre-save hook
      await admin.save();
      console.log('✅ Default admin user updated successfully!');
    } else {
      // Create new admin
      admin = new User({
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        name: 'Admin'
      });
      await admin.save();
      console.log('✅ Default admin user created successfully!');
    }

    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Role: admin`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    process.exit(1);
  }
};

createDefaultAdmin();

