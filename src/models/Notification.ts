import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'order_processing',
        'order_confirmed',
        'order_shipped',
        'order_out_for_delivery',
        'order_delivered',
        'order_cancelled',
        'general',
      ],
      default: 'general',
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index so listing notifications for a user is fast
NotificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model('Notification', NotificationSchema);
