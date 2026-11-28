import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getDriveFileStream, deleteDriveFile } from '@/lib/google-drive';
import { getSafeErrorMessage } from '@/lib/api-error';
import {
  isValidObjectId,
  requireAdmin,
  requireAdminOrManager,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';

const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{10,128}$/;

interface OrderPhotoEntry {
  uploadStatus?: string;
  driveFileId?: string | null;
  driveFolderId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedAt?: Date | null;
  uploadError?: string | null;
}

function collectOrderDriveFileIds(order: {
  customPhoto?: OrderPhotoEntry | null;
  customPhotos?: OrderPhotoEntry[] | null;
}): Set<string> {
  const allowedIds = new Set<string>();
  if (order.customPhoto?.driveFileId) {
    allowedIds.add(order.customPhoto.driveFileId);
  }
  if (Array.isArray(order.customPhotos)) {
    for (const entry of order.customPhotos) {
      if (entry?.driveFileId) {
        allowedIds.add(entry.driveFileId);
      }
    }
  }
  return allowedIds;
}

export async function GET(
  req: NextRequest,
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

    const requestedFileId = req.nextUrl.searchParams.get('fileId');
    if (requestedFileId !== null && !DRIVE_FILE_ID_REGEX.test(requestedFileId)) {
      return NextResponse.json(
        { error: 'Invalid Google Drive file ID format' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const order = await Order.findById(id)
      .select('customPhoto customPhotos invoiceNumber')
      .lean() as {
      invoiceNumber?: string;
      customPhoto?: OrderPhotoEntry | null;
      customPhotos?: OrderPhotoEntry[] | null;
    } | null;

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const authorizedFileIds = collectOrderDriveFileIds(order);

    let targetDriveFileId: string | null = null;
    if (requestedFileId) {
      if (!authorizedFileIds.has(requestedFileId)) {
        return NextResponse.json(
          { error: 'Forbidden: Requested file does not belong to this order' },
          { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }
      targetDriveFileId = requestedFileId;
    } else {
      targetDriveFileId =
        order.customPhoto?.driveFileId ||
        order.customPhotos?.find((p) => p.driveFileId && p.uploadStatus === 'uploaded')?.driveFileId ||
        null;
    }

    if (!targetDriveFileId) {
      return NextResponse.json(
        { error: 'No uploaded customer photo for this order' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const matchedPhoto =
      order.customPhotos?.find((p) => p.driveFileId === targetDriveFileId) ||
      (order.customPhoto?.driveFileId === targetDriveFileId ? order.customPhoto : undefined);

    const { stream, name: driveFileName, mimeType: driveMimeType } =
      await getDriveFileStream(targetDriveFileId);

    const isDownload = req.nextUrl.searchParams.get('download') === 'true';
    const rawFilename =
      matchedPhoto?.fileName || driveFileName || `order-${order.invoiceNumber || id}-photo.jpg`;
    const safeFilename = rawFilename.replace(/[\r\n"\\\/]/g, '_');

    const safeMimeType = ['image/jpeg', 'image/png', 'image/webp'].includes(
      matchedPhoto?.mimeType || driveMimeType
    )
      ? matchedPhoto?.mimeType || driveMimeType
      : 'application/octet-stream';

    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': safeMimeType,
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${safeFilename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('[Admin Photo GET] Error streaming file:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to retrieve customer photo' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const requestedFileId = req.nextUrl.searchParams.get('fileId');
    if (requestedFileId !== null && !DRIVE_FILE_ID_REGEX.test(requestedFileId)) {
      return NextResponse.json(
        { error: 'Invalid Google Drive file ID format' },
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

    const authorizedFileIds = collectOrderDriveFileIds(order);

    if (requestedFileId) {
      if (!authorizedFileIds.has(requestedFileId)) {
        return NextResponse.json(
          { error: 'Forbidden: Requested file does not belong to this order' },
          { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }

      try {
        await deleteDriveFile(requestedFileId);
      } catch (driveErr) {
        console.warn(
          '[Admin Photo DELETE] Failed to delete specific file from Drive:',
          getSafeErrorMessage(driveErr)
        );
      }

      const remaining = (order.customPhotos || []).filter(
        (p: OrderPhotoEntry) => p.driveFileId !== requestedFileId
      );
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
      return NextResponse.json(
        { success: true, message: 'Customer photo deleted successfully' },
        { headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const filesToDelete = Array.from(authorizedFileIds);
    for (const dId of filesToDelete) {
      try {
        await deleteDriveFile(dId);
      } catch (driveErr) {
        console.warn(
          '[Admin Photo DELETE] Failed to delete file from Drive:',
          getSafeErrorMessage(driveErr)
        );
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

    return NextResponse.json(
      { success: true, message: 'All customer photos deleted successfully' },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin Photo DELETE] Error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to delete customer photo' },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
