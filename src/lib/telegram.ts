/**
 * TELEGRAM NOTIFICATION UTILITY
 * Sends real-time alerts to the store admin when new orders are placed.
 */

export interface TelegramOrderData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{
    title: string;
    quantity: number;
    price: number;
    color?: string;
    size?: string;
  }>;
  shippingAddress: {
    city: string;
    addressLine1: string;
    phone?: string;
  };
  paymentMethod: string;
}

export async function sendTelegramNotification(order: TelegramOrderData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram credentials missing. Notification skipped.');
    return;
  }

  const escapeHtml = (text: string) =>
    (text || '').replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });

  const itemsList = order.items
    .map(item => `• ${escapeHtml(item.title)} x${item.quantity} (৳${item.price})`)
    .join('\n');

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://toyhourse.com';
  const message = `
📌 <b>New Order Received!</b>
--------------------------------
🆔 <b>Order ID:</b> #${order.orderId.slice(-8).toUpperCase()}
👤 <b>Customer:</b> ${escapeHtml(order.customerName)}
📞 <b>Phone:</b> ${escapeHtml(order.shippingAddress.phone || '')}
📧 <b>Email:</b> ${escapeHtml(order.customerEmail)}
💰 <b>Total:</b> ৳${order.totalAmount.toLocaleString()}
💳 <b>Payment:</b> ${order.paymentMethod.toUpperCase()}

📦 <b>Items:</b>
${itemsList}

📍 <b>Shipping to:</b>
${escapeHtml(order.shippingAddress.addressLine1)}, ${escapeHtml(order.shippingAddress.city)}

🔗 <a href="${baseUrl}/admin/orders">View Order Details</a>
  `;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const chatIds = chatId.split(',').map(id => id.trim()).filter(Boolean);

  try {
    await Promise.allSettled(
      chatIds.map(async (id) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: id,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`Telegram API Error for chat ${id}:`, errorData);
        }
      })
    );
    console.log('Telegram admin notification(s) sent successfully.');
  } catch (error: any) {
    console.warn('Telegram notification skipped (Network issue):', error.message || 'Unknown error');
  }
}
