import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';

import { isRateLimited } from '@/lib/ratelimit';


export async function POST(req: Request) {
  try {
    // ── Distributed Rate Limiting ──
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    
    // Uses Upstash Redis (or bypasses if local config missing)
    const rateLimited = await isRateLimited(ip);
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { customerEmail, customerName, items, totalAmount, shippingAddress, paymentMethod, shippingCost, shippingZone, notes } = body;

    if (!items || items.length === 0 || !totalAmount) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
    }

    // Basic email format validation if email is provided
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
    }

    await connectToDatabase();

    // Create the order
    const orderData: any = {
      customerName: String(customerName || '').trim(),
      items,
      totalAmount,
      shippingCost: shippingCost || 0,
      shippingZone,
      notes,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
    };
    if (customerEmail) {
      orderData.customerEmail = String(customerEmail).toLowerCase().trim();
    }
    const order = await Order.create(orderData);


    // Performance: Replace N sequential inventory writes with a single bulkWrite.
    // Before: for (item of items) { await findByIdAndUpdate() } — N serial DB round-trips.
    // After: one bulkWrite — 1 DB round-trip regardless of cart size.
    const inventoryOps = items
      .filter((item: any) => item.productId)
      .map((item: any) => {
        if (item.variantId) {
          // Decrement specific variant's stock
          return {
            updateOne: {
              filter: { _id: item.productId, 'variants._id': item.variantId },
              update: { $inc: { 'variants.$.stock': -item.quantity } },
            },
          };
        } else {
          // Decrement legacy product inventory
          return {
            updateOne: {
              filter: { _id: item.productId },
              update: { $inc: { inventory: -item.quantity } },
            },
          };
        }
      });

    if (inventoryOps.length > 0) {
      await Product.bulkWrite(inventoryOps).catch((err: any) =>
        console.error('Failed to update inventory via bulkWrite:', err)
      );
    }

    // ── Background Tasks (Invoice, Email, Telegram, Google Sheets) ──
    // MUST await in serverless environments, otherwise Vercel kills the process before they finish
    const notificationPayload = {
      orderId: order._id.toString(),
      customerName,
      customerEmail,
      totalAmount,
      items,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      shippingCost: shippingCost || 0
    };

    await Promise.allSettled([
      import('@/lib/invoice/generateInvoicePdf').then(({ generateInvoiceForOrder }) => generateInvoiceForOrder(order._id.toString())),
      customerEmail ? import('@/lib/nodemailer').then(({ sendOrderConfirmationEmail }) => sendOrderConfirmationEmail(notificationPayload)) : Promise.resolve(),
      import('@/lib/telegram').then(({ sendTelegramNotification }) => sendTelegramNotification(notificationPayload)),
      import('@/lib/googleSheets').then(({ appendOrderToSheet }) =>
        appendOrderToSheet({
          orderId: order._id.toString(),
          customerName,
          customerEmail,
          phone: shippingAddress?.phone,
          addressLine1: shippingAddress?.addressLine1,
          city: shippingAddress?.city,
          paymentMethod: paymentMethod || 'cod',
          items: (items || []).map((i: any) => ({ title: i.title || '', quantity: i.quantity || 1, price: i.price || 0 })),
          shippingCost: shippingCost || 0,
          totalAmount,
          fulfillmentStatus: 'unfulfilled',
        })
      )
    ]).catch(err => console.error('Background tasks error:', err));

    return NextResponse.json({ 
      success: true, 
      orderId: order._id,
      message: 'Order created successfully' 
    });
  } catch (error: any) {
    console.error('Order Creation error:', error);
    // Don't leak internal error details in production
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}
