import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const order = await Order.findById(id).lean() as any;
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Enrich each order item with its product's first image
    if (order.items?.length) {
      const productIds = order.items
        .map((item: any) => item.product)
        .filter(Boolean);

      if (productIds.length) {
        const products = await Product.find(
          { _id: { $in: productIds } },
          { images: 1 }
        ).lean() as any[];

        const productMap: Record<string, string> = {};
        for (const p of products) {
          productMap[p._id.toString()] = p.images?.[0]?.url || '';
        }

        order.items = order.items.map((item: any) => ({
          ...item,
          image: item.image || productMap[item.product?.toString()] || '',
        }));
      }
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    await connectToDatabase();
    // Only allow updating statuses explicitly
    const { id } = await params;
    const oldOrder = await Order.findById(id);
    
    if (!oldOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updatePayload: any = {
      fulfillmentStatus: data.fulfillmentStatus || oldOrder.fulfillmentStatus,
      paymentStatus: data.paymentStatus || oldOrder.paymentStatus,
    };

    // Update Courier Info if provided
    if (data.courier || data.courierName || data.trackingId) {
      const courierName = data.courierName || data.courier?.name || oldOrder.courier?.name || 'Steadfast';
      const trackingId = data.trackingId || data.courier?.trackingId || oldOrder.courier?.trackingId || '';
      const { getCourierTrackingUrl } = await import('@/lib/courier');
      const trackingUrl = data.trackingUrl || data.courier?.trackingUrl || getCourierTrackingUrl(courierName, trackingId);

      updatePayload.courier = {
        name: courierName,
        code: courierName.toLowerCase().replace(/\s+/g, '-'),
        trackingId,
        trackingUrl,
      };
    }

    if (data.courierStatus && data.courierStatus !== oldOrder.courierStatus) {
      updatePayload.courierStatus = data.courierStatus;
    }

    if (data.estimatedDeliveryDate) {
      updatePayload.estimatedDeliveryDate = new Date(data.estimatedDeliveryDate);
    }

    // Append new checkpoint to tracking timeline if custom note or status change occurs
    if (data.timelineNote || (data.courierStatus && data.courierStatus !== oldOrder.courierStatus)) {
      const { getTrackingSteps } = await import('@/lib/courier');
      const steps = getTrackingSteps(
        data.fulfillmentStatus || oldOrder.fulfillmentStatus,
        data.courierStatus || oldOrder.courierStatus
      );
      const activeStep = steps.find(s => s.active) || steps[0];

      const newTimelineItem = {
        status: data.courierStatus || oldOrder.courierStatus || 'in_transit',
        title: data.timelineTitle || activeStep.title || 'Tracking Update',
        description: data.timelineNote || activeStep.description || 'Order status updated by delivery network.',
        location: data.timelineLocation || 'Dhaka Hub',
        timestamp: new Date(),
      };

      updatePayload.$push = { trackingTimeline: newTimelineItem };
    }

    const order = await Order.findByIdAndUpdate(id, updatePayload, {
      returnDocument: 'after',
      runValidators: true,
    });

    // Send Email Notification if status changed
    if (data.fulfillmentStatus && data.fulfillmentStatus !== oldOrder.fulfillmentStatus) {
      const { sendOrderStatusUpdateEmail } = await import('@/lib/nodemailer');
      await sendOrderStatusUpdateEmail(order, 'fulfillment', data.fulfillmentStatus).catch(err => console.error('Status email error:', err));
    } else if (data.paymentStatus && data.paymentStatus !== oldOrder.paymentStatus) {
      const { sendOrderStatusUpdateEmail } = await import('@/lib/nodemailer');
      await sendOrderStatusUpdateEmail(order, 'payment', data.paymentStatus).catch(err => console.error('Status email error:', err));
    }

    // Send Push Notification + save Notification record via centralized helper
    if (data.fulfillmentStatus && data.fulfillmentStatus !== oldOrder.fulfillmentStatus) {
      const { sendOrderStatusNotification } = await import('@/lib/push');
      sendOrderStatusNotification(order, data.fulfillmentStatus).catch(err =>
        console.error('Push notification error:', err)
      );
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const deletedOrder = await Order.findByIdAndDelete(id);
    
    if (!deletedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
