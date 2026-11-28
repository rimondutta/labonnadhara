import nodemailer from 'nodemailer';
import { escapeHtml } from '@/lib/sanitize';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const DEFAULT_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
  variantOptions?: Record<string, string>;
}

interface OrderData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: {
    addressLine1: string;
    city: string;
    postcode: string;
    country: string;
  };
  paymentMethod?: string;
  shippingCost?: number;
}

export async function sendOrderConfirmationEmail(order: OrderData) {
  const safeOrderShortId = escapeHtml(order.orderId.slice(-8).toUpperCase());
  const safeCustomerName = escapeHtml(order.customerName || 'Explorer');
  const safeCustomerEmail = escapeHtml(order.customerEmail);
  const safeBaseUrl = escapeHtml(process.env.NEXTAUTH_URL || '');

  const itemsHtml = order.items
    .map((item) => {
      const variantLabel = item.variantOptions
        ? Object.entries(item.variantOptions)
            .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`)
            .join(' | ')
        : [
            item.color && item.color !== 'Default' ? `Color: ${escapeHtml(item.color)}` : null,
            item.size && item.size !== 'Default' ? `Size: ${escapeHtml(item.size)}` : null,
          ]
            .filter(Boolean)
            .join(' | ');

      return `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eeeeee;">
        <div style="font-weight: bold; color: #000000;">${escapeHtml(item.title)}</div>
        <div style="font-size: 12px; color: #666666;">${variantLabel}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: center;">${Number(item.quantity)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eeeeee; text-align: right;">৳${Number(item.price).toLocaleString()}</td>
    </tr>
  `;
    })
    .join('');

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="padding: 40px 20px; text-align: center; background-color: #000000; color: #ffffff;">
        <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 4px; font-size: 24px;">LABONNADHARA</h1>
        <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.7; letter-spacing: 2px;">ORDER CONFIRMED</p>
      </div>

      <div style="padding: 40px 20px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center;">Thank You for Your Order!</h2>
        <p>Hi ${safeCustomerName},</p>
        <p>We've received your order <strong>#${safeOrderShortId}</strong> and we're getting it ready for shipment.</p>
        
        <div style="margin: 40px 0;">
          <h3 style="font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 10px; margin-bottom: 20px;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 1px solid #eeeeee;">
                <th style="text-align: left; padding: 10px; font-weight: bold; color: #000000;">Product</th>
                <th style="text-align: center; padding: 10px; font-weight: bold; color: #000000;">Qty</th>
                <th style="text-align: right; padding: 10px; font-weight: bold; color: #000000;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 20px 12px 5px; font-weight: normal; text-align: right; font-size: 14px; color: #444444;">Subtotal</td>
                <td style="padding: 20px 12px 5px; font-weight: bold; text-align: right; font-size: 14px; color: #000000;">৳${(Number(order.totalAmount) - Number(order.shippingCost || 0)).toLocaleString()}</td>
              </tr>
              ${order.shippingCost ? `
              <tr>
                <td colspan="2" style="padding: 5px 12px 10px; font-weight: normal; text-align: right; font-size: 14px; color: #444444;">Shipping</td>
                <td style="padding: 5px 12px 10px; font-weight: bold; text-align: right; font-size: 14px; color: #000000;">৳${Number(order.shippingCost).toLocaleString()}</td>
              </tr>
              ` : ''}
              <tr>
                <td colspan="2" style="padding: 10px 12px 12px; font-weight: bold; text-align: right; font-size: 16px; border-top: 1px solid #eeeeee;">Total Amount</td>
                <td style="padding: 10px 12px 12px; font-weight: bold; text-align: right; font-size: 20px; color: #000000; border-top: 1px solid #eeeeee;">৳${Number(order.totalAmount).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="margin: 40px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
          <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 15px; font-weight: bold; color: #000000;">Shipping Destination</h3>
          <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.6;">
            <strong>${safeCustomerName}</strong><br>
            ${escapeHtml(order.shippingAddress.addressLine1)}<br>
            ${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.postcode)}<br>
            ${escapeHtml(order.shippingAddress.country)}
          </p>
        </div>

        <div style="margin: 40px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
          <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 15px;">Payment Method</h3>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #000000;">
            ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Credit Card'}
          </p>
        </div>

        <div style="text-align: center; margin-top: 40px;">
          <a href="${safeBaseUrl}/account" style="display: inline-block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Track Your Order</a>
        </div>
      </div>

      <div style="padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
        <p>&copy; ${new Date().getFullYear()} Labonnadhara. All rights reserved.</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: order.customerEmail,
      subject: `Order Confirmed: #${order.orderId.slice(-8).toUpperCase()}`,
      html: html,
    });
    console.log('Order confirmation email sent:', info.messageId);

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">New Order Alert!</h2>
        </div>
        <div style="padding: 30px 20px; background-color: #fff;">
          <p style="font-size: 16px; margin-top: 0;">You have received a new order on <strong>Labonnadhara</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Order ID:</strong> #${safeOrderShortId}</p>
            <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${safeCustomerName} (${safeCustomerEmail})</p>
            <p style="margin: 0;"><strong>Total Amount:</strong> ৳${Number(order.totalAmount).toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${safeBaseUrl}/admin/orders" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">View Order Details</a>
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: DEFAULT_FROM,
      to: adminEmail,
      subject: `New Order Alert: #${order.orderId.slice(-8).toUpperCase()} - ৳${order.totalAmount}`,
      html: adminHtml,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

export async function sendOrderStatusUpdateEmail(
  order: { _id: { toString(): string }; customerName?: string; customerEmail?: string },
  _statusType: 'payment' | 'fulfillment',
  newStatus: string
) {
  const statusLabels: Record<string, string> = {
    paid: 'Payment Received',
    processing: 'Order Confirmed & Processing',
    shipped: 'Order Shipped',
    delivered: 'Order Delivered',
    cancelled: 'Order Cancelled',
  };

  const rawLabel = statusLabels[newStatus] || newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
  const statusLabel = escapeHtml(rawLabel);
  const safeCustomerName = escapeHtml(order.customerName || 'Explorer');
  const safeOrderShortId = escapeHtml(order._id.toString().slice(-8).toUpperCase());
  const safeBaseUrl = escapeHtml(process.env.NEXTAUTH_URL || '');

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="padding: 40px 20px; text-align: center; background-color: #000000; color: #ffffff;">
        <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 4px; font-size: 24px;">LABONNADHARA</h1>
        <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.7; letter-spacing: 2px;">STATUS UPDATE</p>
      </div>

      <div style="padding: 40px 20px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center;">Your Order Status has been Updated</h2>
        <p>Hi ${safeCustomerName},</p>
        <p>The status of your order <strong>#${safeOrderShortId}</strong> has been updated to:</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #000000; text-align: center;">
          <span style="font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${statusLabel}</span>
        </div>

        <p>You can track your order details and history in your account dashboard.</p>

        <div style="text-align: center; margin-top: 40px;">
          <a href="${safeBaseUrl}/account" style="display: inline-block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">View Order in Account</a>
        </div>
      </div>

      <div style="padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
        <p>&copy; ${new Date().getFullYear()} Labonnadhara. All rights reserved.</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: order.customerEmail,
      subject: `Order Update: #${order._id.toString().slice(-8).toUpperCase()} is now ${rawLabel}`,
      html: html,
    });
    console.log('Status update email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Status update email failed:', error);
    return { success: false, error };
  }
}

export async function sendPasswordResetOtpEmail(
  toEmail: string,
  toName: string,
  otp: string
) {
  const safeName = escapeHtml(toName || 'there');
  const safeOtp = escapeHtml(otp);

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="padding: 40px 20px; text-align: center; background-color: #000000; color: #ffffff;">
        <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 4px; font-size: 24px;">LABONNADHARA</h1>
        <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.7; letter-spacing: 2px;">PASSWORD RESET</p>
      </div>

      <div style="padding: 40px 20px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; text-align: center;">Reset Your Password</h2>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset the password for your Labonnadhara account. Use the code below to proceed:</p>

        <div style="margin: 36px 0; text-align: center;">
          <div style="display: inline-block; background-color: #f3f4f6; border-radius: 16px; padding: 24px 48px;">
            <span style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #1a1a1a; font-family: monospace;">${safeOtp}</span>
          </div>
          <p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">This code expires in <strong>10 minutes</strong>.</p>
        </div>

        <p style="font-size: 13px; color: #6b7280; background-color: #fef3c7; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>

      <div style="padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
        <p>&copy; ${new Date().getFullYear()} Labonnadhara. All rights reserved.</p>
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: toEmail,
      subject: 'Your Labonnadhara password reset code',
      html,
    });
    console.log('Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Password reset email failed:', error);
    return { success: false, error };
  }
}
