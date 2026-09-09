import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  fullName: { type: String, required: true },
  streetAddress: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, default: '' },
  zipCode: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'customer'],
      default: 'customer',
    },
    image: {
      type: String,
    },
    // Legacy single-token field (kept for backward compat)
    pushToken: {
      type: String,
    },
    // Multi-device push token array (deduped on save)
    expoPushTokens: {
      type: [String],
      default: [],
    },
    // ── Password Reset OTP fields ──────────────────────────
    resetOtpHash: { type: String, select: false },
    resetOtpExpiresAt: { type: Date, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
    resetOtpRequestedAt: { type: Date, select: false },
    // ──────────────────────────────────────────────────────
    addresses: {
      type: [AddressSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);

