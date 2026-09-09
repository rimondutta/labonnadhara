/**
 * GET /api/orders/[id]/invoice
 *
 * Returns a redirect to the stored Cloudinary PDF URL.
 * Generates the invoice on-demand if it hasn't been generated yet.
 *
 * Auth:
 *  - Authenticated users: may only access their own order's invoice
 *    (session email must match order.customerEmail).
 *  - Unauthenticated / guest orders: accessible by order ID, consistent
 *    with the existing HTML invoice page at /invoice/[id] which has no auth.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getInvoiceBufferForOrder } from '@/lib/invoice/generateInvoicePdf';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const order = await Order.findById(id).lean() as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ── Auth check ──
    // If a session exists, ensure the user owns this order.
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole === 'admin' || userRole === 'manager';

    if (session && !isAdmin) {
      const sessionEmail = session.user?.email?.toLowerCase();
      const orderEmail = (order.customerEmail as string | undefined)?.toLowerCase();
      // If the order has an email and it doesn't match the session, deny.
      if (orderEmail && sessionEmail && sessionEmail !== orderEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // ── Generate the invoice PDF buffer on the fly ──
    // Bypassing Cloudinary entirely for downloads to avoid CDN strict delivery 401s, 
    // WAF blocks, and fl_attachment parsing errors.
    const { buffer, filename } = await getInvoiceBufferForOrder(id);

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('[invoice] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}
