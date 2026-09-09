/**
 * push.ts — Expo Push Notification helper
 *
 * Sends order status push notifications to all of a user's registered devices.
 * Also creates a Notification record in MongoDB so the in-app notification
 * center shows history even if push delivery fails.
 *
 * Called from the admin order status update route whenever fulfillmentStatus changes.
 */

import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Notification from '@/models/Notification';

// ── Status → content map ──────────────────────────────────────

type OrderStatus =
  | 'unfulfilled'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

const STATUS_CONTENT: Record<
  string,
  { title: string; body: (orderNum: string) => string; type: string }
> = {
  processing: {
    title: '📦 Order Being Processed',
    body: (n) => `We've started preparing order #${n}.`,
    type: 'order_processing',
  },
  confirmed: {
    title: '✅ Order Confirmed!',
    body: (n) => `Order #${n} has been confirmed and is being prepared.`,
    type: 'order_confirmed',
  },
  shipped: {
    title: '🚚 Your Order Has Shipped',
    body: (n) => `Order #${n} is on its way to you!`,
    type: 'order_shipped',
  },
  out_for_delivery: {
    title: '🛵 Out for Delivery',
    body: (n) => `Order #${n} will arrive today. Stay home!`,
    type: 'order_out_for_delivery',
  },
  delivered: {
    title: '🎉 Delivered!',
    body: (n) => `Order #${n} has been delivered. Enjoy!`,
    type: 'order_delivered',
  },
  cancelled: {
    title: '❌ Order Cancelled',
    body: (n) => `Order #${n} has been cancelled. Contact us if this was a mistake.`,
    type: 'order_cancelled',
  },
};

// ── Main helper ───────────────────────────────────────────────

export async function sendOrderStatusNotification(
  order: any,
  newStatus: string
): Promise<void> {
  try {
    await connectToDatabase();

    const content = STATUS_CONTENT[newStatus];
    if (!content) return; // No content for this status — skip silently

    const orderNum = order._id?.toString().slice(-8).toUpperCase() ?? 'UNKNOWN';
    const title = content.title;
    const body = content.body(orderNum);

    // Find the customer
    const user = await User.findOne({ email: order.customerEmail }).lean() as any;
    if (!user) return;

    // 1. Save Notification record in DB (always, even if push fails)
    try {
      await Notification.create({
        user: user._id,
        order: order._id,
        title,
        body,
        type: content.type,
      });
    } catch (dbErr) {
      console.error('[push] Failed to save Notification record:', dbErr);
    }

    // 2. Collect push tokens (support both legacy single token and new array)
    const tokens: string[] = [];
    if (user.expoPushTokens?.length) {
      tokens.push(...user.expoPushTokens);
    } else if (user.pushToken) {
      tokens.push(user.pushToken);
    }

    if (tokens.length === 0) return; // No tokens registered

    // 3. Send via Expo Push API
    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) return;

    const messages = validTokens.map((token) => ({
      to: token,
      sound: 'default' as const,
      title,
      body,
      data: { orderId: order._id?.toString(), type: content.type },
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const deadTokens: string[] = [];

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        // Check for DeviceNotRegistered errors and collect dead tokens
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'error') {
            if (ticket.details?.error === 'DeviceNotRegistered') {
              deadTokens.push(chunk[i].to as string);
            }
            console.error('[push] Ticket error:', ticket.message);
          }
        }
      } catch (err) {
        console.error('[push] Failed to send chunk:', err);
      }
    }

    // 4. Remove dead tokens from user
    if (deadTokens.length > 0) {
      await User.updateOne(
        { _id: user._id },
        {
          $pull: { expoPushTokens: { $in: deadTokens } },
          // Also clear legacy field if it's dead
          ...(deadTokens.includes(user.pushToken) ? { $unset: { pushToken: '' } } : {}),
        }
      );
      console.log(`[push] Removed ${deadTokens.length} dead token(s) for user ${user._id}`);
    }
  } catch (err) {
    // Never crash the order update route due to push failures
    console.error('[push] sendOrderStatusNotification error:', err);
  }
}
