/**
 * generateInvoicePdf.ts
 * Orchestrates invoice number generation, PDF rendering,
 * Cloudinary upload, and persisting the result on the Order document.
 *
 * This function is idempotent: calling it on an order that already has
 * an invoiceUrl returns the cached URL immediately.
 */
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { InvoiceDocument } from './InvoiceDocument';
import type { InvoiceDocumentProps } from './InvoiceDocument';
import cloudinary from '@/lib/cloudinary';
import { generateInvoiceNumber } from './generateInvoiceNumber';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';

const COMPANY = {
  name: process.env.COMPANY_NAME || 'Toy Hourse',
  address: process.env.COMPANY_ADDRESS || 'Dhaka, Bangladesh',
  email: process.env.COMPANY_EMAIL || 'support@toyhourse.com',
  phone: process.env.COMPANY_PHONE || '+880 000 000 0000',
};

/**
 * Generates (or returns cached) invoice PDF for an order.
 * @param orderId  MongoDB _id string of the order
 * @returns        Cloudinary secure_url of the stored PDF
 */
export async function generateInvoiceForOrder(orderId: string): Promise<string> {
  await connectToDatabase();

  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);

  // ── Return cached URL if already generated (and not a broken raw URL) ──
  if (order.invoiceUrl && !(order.invoiceUrl as string).includes('/raw/upload/')) {
    return order.invoiceUrl as string;
  }

  // ── Generate sequential invoice number ──
  const invoiceNumber = await generateInvoiceNumber();

  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shippingCost = (order.shippingCost as number) || 0;
  const subtotal = (order.totalAmount as number) - shippingCost;

  const props: InvoiceDocumentProps = {
    invoiceNumber,
    invoiceDate,
    orderId: order._id.toString(),
    orderDate,
    paymentMethod: order.paymentMethod as string,
    paymentStatus: order.paymentStatus as string,
    fulfillmentStatus: order.fulfillmentStatus as string,
    customer: {
      name: (order.customerName as string) || 'Customer',
      email: order.customerEmail as string | undefined,
      phone: (order.shippingAddress as any)?.phone,
    },
    shippingAddress: order.shippingAddress as any,
    items: (order.items as any[]).map((item) => ({
      title: (item.title as string) || 'Product',
      quantity: item.quantity as number,
      price: item.price as number,
      color: item.color as string | undefined,
      size: item.size as string | undefined,
      variantOptions: item.variantOptions as Record<string, string> | undefined,
    })),
    subtotal,
    shippingCost,
    totalAmount: order.totalAmount as number,
    company: COMPANY,
  };

  // ── Render PDF to buffer ──
  const pdfBuffer = await renderToBuffer(
    React.createElement(InvoiceDocument, props) as any
  );

  // ── Upload to Cloudinary ──
  const uploadResult = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: 'image', // PDFs must be 'image' to support transformations and avoid raw strict delivery blocks
          folder: 'invoices',
          public_id: invoiceNumber,
          format: 'pdf',
          overwrite: true,
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(pdfBuffer);
  });

  // ── Persist invoice metadata on the order ──
  order.invoiceNumber = invoiceNumber;
  order.invoiceUrl = uploadResult.secure_url;
  order.invoiceGeneratedAt = new Date();
  await order.save();

  console.log(`[invoice] Generated ${invoiceNumber} for order ${orderId}`);
  return order.invoiceUrl as string;
}

/**
 * Generates the invoice PDF buffer directly on the fly.
 * Bypasses Cloudinary to allow direct downloading without 401/WAF blocks.
 */
export async function getInvoiceBufferForOrder(orderId: string): Promise<{ buffer: Buffer; filename: string }> {
  await connectToDatabase();
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);

  let invoiceNumber = order.invoiceNumber;
  if (!invoiceNumber) {
    invoiceNumber = await generateInvoiceNumber();
    order.invoiceNumber = invoiceNumber;
    await order.save();
  }

  const invoiceDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shippingCost = (order.shippingCost as number) || 0;
  const subtotal = (order.totalAmount as number) - shippingCost;

  const props = {
    invoiceNumber,
    invoiceDate,
    orderId: order._id.toString(),
    orderDate,
    paymentMethod: order.paymentMethod as string,
    paymentStatus: order.paymentStatus as string,
    fulfillmentStatus: order.fulfillmentStatus as string,
    customer: {
      name: (order.customerName as string) || 'Customer',
      email: order.customerEmail as string | undefined,
      phone: (order.shippingAddress as any)?.phone,
    },
    shippingAddress: order.shippingAddress as any,
    items: (order.items as any[]).map((item) => ({
      title: (item.title as string) || 'Product',
      quantity: item.quantity as number,
      price: item.price as number,
      color: item.color as string | undefined,
      size: item.size as string | undefined,
      variantOptions: item.variantOptions as Record<string, string> | undefined,
    })),
    subtotal,
    shippingCost,
    totalAmount: order.totalAmount as number,
    company: COMPANY,
  };

  const pdfBuffer = await renderToBuffer(
    React.createElement(InvoiceDocument, props) as any
  );

  return { buffer: Buffer.from(pdfBuffer), filename: `Invoice-${invoiceNumber}.pdf` };
}