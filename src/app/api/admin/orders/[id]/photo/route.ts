import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getDriveFileStream, deleteDriveFile } from '@/lib/google-drive';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const order = await Order.findById(id).select('customPhoto invoiceNumber');
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const customPhoto = order.customPhoto;
    if (!customPhoto || !customPhoto.driveFileId || customPhoto.uploadStatus !== 'uploaded') {
      return NextResponse.json({ error: 'No uploaded customer photo for this order' }, { status: 404 });
    }

    const { stream, name: driveFileName, mimeType: driveMimeType } = await getDriveFileStream(customPhoto.driveFileId);

    const isDownload = req.nextUrl.searchParams.get('download') === 'true';
    const filename = customPhoto.fileName || driveFileName || `order-${order.invoiceNumber || id}-photo.jpg`;
    const mimeType = customPhoto.mimeType || driveMimeType || 'image/jpeg';

    const webStream = Readable.toWeb(stream as unknown as Readable) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Photo GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve photo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.customPhoto?.driveFileId) {
      try {
        await deleteDriveFile(order.customPhoto.driveFileId);
      } catch (driveErr) {
        console.warn('[Admin Photo DELETE] Failed to delete from Drive:', driveErr);
      }
    }

    order.customPhoto = {
      uploadStatus: 'not_required',
      driveFileId: null,
      driveFolderId: null,
      fileName: null,
      mimeType: null,
      fileSize: null,
      uploadedAt: null,
      uploadError: null,
    };
    await order.save();

    return NextResponse.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error: unknown) {
    console.error('[Admin Photo DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
