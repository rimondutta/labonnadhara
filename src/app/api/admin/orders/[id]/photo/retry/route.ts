import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { uploadCustomerPhotoToDrive, validateCustomerPhoto } from '@/lib/google-drive';
import {
  requireAdminOrManager,
  isValidObjectId,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import {
  MAX_ORDER_PHOTOS_COUNT,
  MAX_ORDER_REQUEST_BODY_BYTES,
  isAllowedMutationOrigin,
  isRequestContentLengthOverLimit,
} from '@/lib/upload-security';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    if (!isAllowedMutationOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-origin upload rejected' },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Please provide photos using multipart/form-data.' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (isRequestContentLengthOverLimit(req, MAX_ORDER_REQUEST_BODY_BYTES)) {
      return NextResponse.json(
        { error: 'Uploaded payload exceeds maximum cumulative limit.' },
        { status: 413, headers: PRIVATE_NO_STORE_HEADERS }
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

    const formData = await req.formData();
    const multiFiles: Array<Blob & { name?: string }> = [];
    for (const f of formData.getAll('photos')) {
      if (f instanceof Blob) {
        multiFiles.push(f as Blob & { name?: string });
      }
    }
    const singleFiles: Array<Blob & { name?: string }> = [];
    if (multiFiles.length === 0) {
      for (const f of formData.getAll('photo')) {
        if (f instanceof Blob) {
          singleFiles.push(f as Blob & { name?: string });
        }
      }
    }
    const photoFiles = multiFiles.length > 0 ? multiFiles : singleFiles;

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'No photo files provided.' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const existingPhotos = Array.isArray(order.customPhotos) ? order.customPhotos : [];
    if (existingPhotos.length + photoFiles.length > MAX_ORDER_PHOTOS_COUNT) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_ORDER_PHOTOS_COUNT} customer photos per order allowed (currently ${existingPhotos.length}).`,
        },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const orderNumber = order.invoiceNumber || order._id.toString().slice(-8).toUpperCase();
    const uploadedResults: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const arrBuffer = await file.arrayBuffer();
      const photoBuffer = Buffer.from(arrBuffer);
      const originalFileName = file.name || `photo-${i + 1}.jpg`;
      const photoMimeType = file.type || 'image/jpeg';
      const photoFileSize = photoBuffer.length;

      const validation = validateCustomerPhoto(photoFileSize, photoMimeType, originalFileName, photoBuffer);
      if (!validation.valid || !validation.detectedMime) {
        errors.push(`${originalFileName}: ${validation.error || 'Invalid image'}`);
        continue;
      }

      try {
        const uploadResult = await uploadCustomerPhotoToDrive({
          orderId: order._id.toString(),
          orderNumber,
          fileBuffer: photoBuffer,
          fileName: originalFileName,
          mimeType: validation.detectedMime,
        });

        uploadedResults.push({
          driveFileId: uploadResult.driveFileId,
          driveFolderId: uploadResult.driveFolderId,
          fileName: uploadResult.fileName,
          mimeType: validation.detectedMime,
          fileSize: photoFileSize,
          uploadStatus: 'uploaded',
          uploadedAt: new Date(),
          uploadError: null,
        });
      } catch (uploadErr: unknown) {
        const errMsg = getSafeErrorMessage(uploadErr);
        errors.push(`${originalFileName}: ${errMsg}`);
        uploadedResults.push({
          fileName: originalFileName,
          mimeType: validation.detectedMime,
          fileSize: photoFileSize,
          uploadStatus: 'failed',
          uploadError: errMsg,
        });
      }
    }

    if (uploadedResults.length > 0) {
      const updatedPhotos = [...existingPhotos, ...uploadedResults];
      order.customPhotos = updatedPhotos;
      order.customPhoto = updatedPhotos[0];
      await order.save();

      return NextResponse.json(
        {
          success: true,
          message: `${uploadedResults.length} photo(s) processed for Google Drive`,
          customPhoto: order.customPhoto,
          customPhotos: order.customPhotos,
          errors: errors.length > 0 ? errors : undefined,
        },
        { headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { error: errors.join('; ') || 'All photo uploads failed validation.' },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin Photo Retry POST]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
