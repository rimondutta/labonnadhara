/**
 * POST /api/admin/orders/[id]/invoice/regenerate
 *
 * Admin-only endpoint to force-regenerate the PDF invoice for an order.
 * Useful when order details change after the invoice was first generated.
 *
 * Clears invoiceUrl on the order first, then calls generateInvoiceForOrder
 * which will re-upload a fresh PDF to Cloudinary and return the new URL.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { generateInvoiceForOrder } from '@/lib/invoice/generateInvoicePdf';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Admin auth guard ──
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Clear cached URL so generateInvoiceForOrder skips the early-return check
    order.invoiceUrl = null;
    order.invoiceGeneratedAt = null;
    await order.save();

    const invoiceUrl = await generateInvoiceForOrder(id);

    return NextResponse.json({ success: true, invoiceUrl });
  } catch (error: any) {
    console.error('[invoice] regenerate error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate invoice' },
      { status: 500 }
    );
  }
}
