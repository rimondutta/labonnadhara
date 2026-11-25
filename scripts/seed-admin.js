const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'customer'], default: 'customer' },
  image: { type: String },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.argv[2] || process.env.ADMIN_EMAIL;
const ADMIN_PASS = process.argv[3] || process.env.ADMIN_PASS;

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASS) {
  console.log("Usage: node scripts/seed-admin.js <email> <password>");
  console.log("Or define ADMIN_EMAIL and ADMIN_PASS in your .env file.");
  process.exit(1);
}

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(ADMIN_PASS, 12);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      existing.password = hashedPassword;
      existing.role = 'admin';
      await existing.save();
      console.log(`Updated existing user to admin with new password: ${normalizedEmail}`);
      process.exit(0);
    }

    await User.create({
      name: 'Admin',
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
    });

    console.log(`Admin user created successfully!`);
    console.log(`  Email: ${normalizedEmail}`);
    console.log(`  Role:  admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
