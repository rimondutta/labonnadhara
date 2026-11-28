import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { getSafeErrorMessage } from '@/lib/api-error';
import {
  isValidObjectId,
  requireAdminOrManager,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { hasUnsafeObjectKeys, isSafeHttpUrl } from '@/lib/validation/schemas';

const orderUpdateSchema = z
  .object({
    fulfillmentStatus: z.enum(['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    courierName: z.string().trim().max(100).optional(),
    trackingId: z.string().trim().max(120).optional(),
    trackingUrl: z
      .string()
      .trim()
      .max(1000)
      .refine((v) => v === '' || isSafeHttpUrl(v), 'Tracking URL must start with http:// or https://')
      .optional(),
    courier: z
      .object({
        name: z.string().trim().max(100).optional(),
        trackingId: z.string().trim().max(120).optional(),
        trackingUrl: z
          .string()
          .trim()
          .max(1000)
          .refine((v) => v === '' || isSafeHttpUrl(v), 'Tracking URL must start with http:// or https://')
          .optional(),
      })
      .optional(),
    courierStatus: z
      .enum(['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned'])
      .optional(),
    estimatedDeliveryDate: z.string().max(64).optional().nullable(),
    timelineNote: z.string().trim().max(500).optional(),
    timelineTitle: z.string().trim().max(120).optional(),
    timelineLocation: z.string().trim().max(120).optional(),
  })
  .strict();

export async function GET(
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
    const order = (await Order.findById(id).select('-guestAccessTokenHash').lean()) as Record<string, unknown> & {
      items?: Array<{ product?: unknown; image?: string }>;
    } | null;

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (order.items?.length) {
      const productIds = order.items.map((item) => item.product).filter(Boolean);
      const products = (await Product.find({ _id: { $in: productIds } })
        .select('images')
        .lean()) as Array<{ _id: { toString(): string }; images?: Array<{ url?: string }> }>;
      const imageMap = new Map<string, string>();
      for (const p of products) {
        if (p.images?.[0]?.url) {
          imageMap.set(p._id.toString(), p.images[0].url);
        }
      }
      order.items = order.items.map((item) => ({
        ...item,
        image: item.image || (item.product ? imageMap.get(String(item.product)) : undefined),
      }));
    }

    return NextResponse.json({ order }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin GET order error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function PUT(
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

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json(
        { error: 'Invalid order update payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const parsed = orderUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid order update fields' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const data = parsed.data;

    await connectToDatabase();
    const oldOrder = await Order.findById(id);
    if (!oldOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const setFields: Record<string, unknown> = {
      fulfillmentStatus: data.fulfillmentStatus || oldOrder.fulfillmentStatus,
      paymentStatus: data.paymentStatus || oldOrder.paymentStatus,
    };

    if (data.courier || data.courierName || data.trackingId || data.trackingUrl !== undefined) {
      const courierName = data.courierName || data.courier?.name || oldOrder.courier?.name || 'Steadfast';
      const trackingId = data.trackingId ?? data.courier?.trackingId ?? oldOrder.courier?.trackingId ?? '';
      const { getCourierTrackingUrl } = await import('@/lib/courier');
      const rawTrackingUrl =
        data.trackingUrl ?? data.courier?.trackingUrl ?? getCourierTrackingUrl(courierName, trackingId);

      if (rawTrackingUrl && !isSafeHttpUrl(rawTrackingUrl)) {
        return NextResponse.json(
          { error: 'Tracking URL must use http:// or https://' },
          { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }

      setFields.courier = {
        name: courierName,
        code: courierName.toLowerCase().replace(/\s+/g, '-'),
        trackingId,
        trackingUrl: rawTrackingUrl,
      };
    }

    if (data.courierStatus && data.courierStatus !== oldOrder.courierStatus) {
      setFields.courierStatus = data.courierStatus;
    }

    if (data.estimatedDeliveryDate) {
      const parsedDate = new Date(data.estimatedDeliveryDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid estimatedDeliveryDate' },
          { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }
      setFields.estimatedDeliveryDate = parsedDate;
    }

    const updateDoc: Record<string, unknown> = { $set: setFields };

    if (data.timelineNote || (data.courierStatus && data.courierStatus !== oldOrder.courierStatus)) {
      const { getTrackingSteps } = await import('@/lib/courier');
      const steps = getTrackingSteps(
        data.fulfillmentStatus || oldOrder.fulfillmentStatus,
        data.courierStatus || oldOrder.courierStatus
      );
      const activeStep = steps.find((s) => s.active) || steps[0];

      updateDoc.$push = {
        trackingTimeline: {
          status: data.courierStatus || oldOrder.courierStatus || 'in_transit',
          title: data.timelineTitle || activeStep.title || 'Tracking Update',
          description: data.timelineNote || activeStep.description || 'Order status updated by delivery network.',
          location: data.timelineLocation || 'Chattogram Hub',
          timestamp: new Date(),
        },
      };
    }

    const order = await Order.findByIdAndUpdate(id, updateDoc, {
      returnDocument: 'after',
      runValidators: true,
    }).select('-guestAccessTokenHash');

    if (data.fulfillmentStatus && data.fulfillmentStatus !== oldOrder.fulfillmentStatus && order) {
      const { sendOrderStatusUpdateEmail } = await import('@/lib/nodemailer');
      await sendOrderStatusUpdateEmail(order, 'fulfillment', data.fulfillmentStatus).catch((err) =>
        console.error('Failed to send fulfillment update email:', err)
      );
    } else if (data.paymentStatus && data.paymentStatus !== oldOrder.paymentStatus && order) {
      const { sendOrderStatusUpdateEmail } = await import('@/lib/nodemailer');
      await sendOrderStatusUpdateEmail(order, 'payment', data.paymentStatus).catch((err) =>
        console.error('Failed to send payment update email:', err)
      );
    }

    return NextResponse.json({ order }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin PUT order error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(
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
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Order deleted successfully' },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Admin DELETE order error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
