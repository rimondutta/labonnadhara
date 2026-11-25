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

    const order = await Order.findById(id).select('customPhoto customPhotos invoiceNumber');
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const fileId = req.nextUrl.searchParams.get('fileId');
    const targetDriveFileId =
      fileId ||
      order.customPhoto?.driveFileId ||
      order.customPhotos?.find((p: any) => p.driveFileId && p.uploadStatus === 'uploaded')?.driveFileId;

    if (!targetDriveFileId) {
      return NextResponse.json({ error: 'No uploaded customer photo for this order' }, { status: 404 });
    }

    const matchedPhoto =
      order.customPhotos?.find((p: any) => p.driveFileId === targetDriveFileId) || order.customPhoto;

    const { stream, name: driveFileName, mimeType: driveMimeType } =
      await getDriveFileStream(targetDriveFileId);

    const isDownload = req.nextUrl.searchParams.get('download') === 'true';
    const filename =
      matchedPhoto?.fileName || driveFileName || `order-${order.invoiceNumber || id}-photo.jpg`;
    const mimeType = matchedPhoto?.mimeType || driveMimeType || 'image/jpeg';

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin role required' }, { status: 403 });
    }

    const { id } = await params;
    const fileId = req.nextUrl.searchParams.get('fileId');
    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (fileId) {
      // Delete single photo from Drive
      try {
        await deleteDriveFile(fileId);
      } catch (driveErr) {
        console.warn('[Admin Photo DELETE] Failed to delete specific file from Drive:', driveErr);
      }

      // Filter out from customPhotos
      const remaining = (order.customPhotos || []).filter((p: any) => p.driveFileId !== fileId);
      order.customPhotos = remaining;
      if (remaining.length > 0) {
        order.customPhoto = remaining[0];
      } else {
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
      }
      await order.save();
      return NextResponse.json({ success: true, message: 'Photo deleted successfully' });
    }

    // Delete all photos
    const filesToDelete = new Set<string>();
    if (order.customPhoto?.driveFileId) filesToDelete.add(order.customPhoto.driveFileId);
    (order.customPhotos || []).forEach((p: any) => {
      if (p.driveFileId) filesToDelete.add(p.driveFileId);
    });

    for (const dId of filesToDelete) {
      try {
        await deleteDriveFile(dId);
      } catch (driveErr) {
        console.warn('[Admin Photo DELETE] Failed to delete file from Drive:', driveErr);
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
    order.customPhotos = [];
    await order.save();

    return NextResponse.json({ success: true, message: 'All photos deleted successfully' });
  } catch (error: unknown) {
    console.error('[Admin Photo DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
