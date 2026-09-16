import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    customerEmail: { type: String },
    customerName: { type: String },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        variantId: { type: mongoose.Schema.Types.ObjectId },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        title: { type: String },
        variantOptions: { type: Map, of: String },
      },
    ],
    totalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'cod', 'bkash'],
      default: 'cod',
    },
    shippingZone: {
      type: String,
      enum: ['inside_chattogram', 'outside_chattogram'],
    },
    notes: {
      type: String,
    },
    fulfillmentStatus: {
      type: String,
      enum: ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'unfulfilled',
    },
    shippingAddress: {
      addressLine1: String,
      city: String,
      postcode: String,
      country: { type: String, default: 'Bangladesh' },
      phone: String,
    },
    // ── Courier & Live Tracking System ──
    courier: {
      name: { type: String }, // e.g. "Steadfast", "Pathao", "Paperfly", "RedX", "Custom Courier"
      code: { type: String }, // e.g. "steadfast", "pathao"
      trackingId: { type: String }, // Consignment ID / Tracking Code
      trackingUrl: { type: String }, // Direct link to courier live tracking page
    },
    courierStatus: {
      type: String,
      enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'failed'],
      default: 'pending',
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    trackingTimeline: [
      {
        status: { type: String },
        title: { type: String },
        description: { type: String },
        location: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    // ── Invoice fields (added for PDF invoice system) ──
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    invoiceGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// High Performance: Indexes for customer order history and queries
OrderSchema.index({ customerEmail: 1, createdAt: -1 });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
