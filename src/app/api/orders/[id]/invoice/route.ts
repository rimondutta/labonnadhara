import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getInvoiceBufferForOrder } from '@/lib/invoice/generateInvoicePdf';
import { getBearerSession } from '@/lib/mobile-auth';
import { verifyInvoiceToken } from '@/lib/invoice-token';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const order = await Order.findById(id).select('+guestAccessTokenHash').lean() as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // ── Authentication & Authorization Verification ──
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    const userRole = (session?.user as any)?.role;
    const isAdmin = userRole === 'admin' || userRole === 'manager';

    let isAuthorized = false;

    if (session && isAdmin) {
      isAuthorized = true;
    } else if (session && session.user?.email && order.customerEmail) {
      const sessionEmail = session.user.email.toLowerCase().trim();
      const orderEmail = order.customerEmail.toLowerCase().trim();
      if (sessionEmail === orderEmail) {
        isAuthorized = true;
      }
    } else {
      // Guest Verification via HMAC Token or stored guestAccessTokenHash
      const token = req.nextUrl.searchParams.get('t') || req.nextUrl.searchParams.get('token');
      if (token) {
        if (verifyInvoiceToken(id, token)) {
          isAuthorized = true;
        } else if (order.guestAccessTokenHash) {
          const submittedHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
          if (
            submittedHash.length === order.guestAccessTokenHash.length &&
            crypto.timingSafeEqual(Buffer.from(submittedHash, 'utf-8'), Buffer.from(order.guestAccessTokenHash, 'utf-8'))
          ) {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid session or signed access token required to view invoice' },
        { status: 401 }
      );
    }

    // ── PDF Generation ──
    const { buffer, filename } = await getInvoiceBufferForOrder(order);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: unknown) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
