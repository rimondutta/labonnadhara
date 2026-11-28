import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { generateInvoiceForOrder } from '@/lib/invoice/generateInvoicePdf';
import {
  isValidObjectId,
  requireAdminOrManager,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    order.invoiceUrl = null;
    order.invoiceGeneratedAt = null;
    await order.save();

    const invoiceUrl = await generateInvoiceForOrder(id);

    return NextResponse.json(
      { success: true, invoiceUrl },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[invoice] regenerate error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to regenerate invoice' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
