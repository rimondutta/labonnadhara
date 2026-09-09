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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASS = process.env.ADMIN_PASS;

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASS) {
  console.error("Missing MONGODB_URI, ADMIN_EMAIL, or ADMIN_PASS in .env");
  process.exit(1);
}

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
      process.exit(0);
    }



    const hashedPassword = await bcrypt.hash(ADMIN_PASS, 12);

    await User.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
    });

    console.log(`Admin user created successfully!`);
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Role:  admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
