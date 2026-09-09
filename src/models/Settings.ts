import mongoose from 'mongoose';

const FacebookPixelSchema = new mongoose.Schema({
  pixelId: { type: String, default: '' },
  enabled: { type: Boolean, default: false },
  testEventCode: { type: String, default: '' },
});

const ShippingSchema = new mongoose.Schema({
  insideDhakaRate: { type: Number, default: 120 },
  outsideDhakaRate: { type: Number, default: 150 },
  freeShippingEnabled: { type: Boolean, default: false },
  freeShippingMinOrder: { type: Number, default: 0 },   // 0 = always free when enabled
  freeShippingZone: {
    type: String,
    enum: ['all', 'inside_dhaka', 'outside_dhaka'],
    default: 'all',
  },
});

/**
 * Courier integration config — one entry per courier service.
 * Sensitive credentials (apiKey, apiSecret) are stored server-side only.
 */
const CourierConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },          // e.g. "Steadfast"
  code: { type: String, required: true },          // e.g. "steadfast" (slug)
  apiKey: { type: String, default: '' },           // API key / token
  apiSecret: { type: String, default: '' },        // API secret (if applicable)
  webhookSecret: { type: String, default: '' },    // Webhook verification secret
  trackingUrlPattern: { type: String, default: '' }, // e.g. https://steadfast.com.bd/tracking/{trackingId}
  enabled: { type: Boolean, default: false },
  notes: { type: String, default: '' },
});

const SettingsSchema = new mongoose.Schema(
  {
    // Singleton key — always "global"
    key: { type: String, default: 'global', unique: true },
    facebookPixel: { type: FacebookPixelSchema, default: () => ({}) },
    shipping: { type: ShippingSchema, default: () => ({}) },
    couriers: { type: [CourierConfigSchema], default: () => [] },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
