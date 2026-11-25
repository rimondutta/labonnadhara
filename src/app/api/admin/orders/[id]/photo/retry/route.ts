import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import {
  validateCustomerPhoto,
  uploadCustomerPhotoToDrive,
  sanitizePhotoFileName,
} from '@/lib/google-drive';

export async function POST(
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

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Please provide photos using multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const rawFiles = formData.getAll('photos').concat(formData.getAll('photo'));
    const photoFiles = rawFiles.filter((f) => f instanceof Blob) as (Blob & { name?: string })[];

    if (photoFiles.length === 0) {
      return NextResponse.json({ error: 'No photo files provided.' }, { status: 400 });
    }

    const orderNumber = order.invoiceNumber || order._id.toString().slice(-8).toUpperCase();
    const uploadedResults: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const arrBuffer = await file.arrayBuffer();
      const photoBuffer = Buffer.from(arrBuffer);
      const originalFileName = file.name || `photo-${i + 1}.jpg`;
      const photoMimeType = file.type || 'image/jpeg';
      const photoFileSize = photoBuffer.length;

      const validation = validateCustomerPhoto(photoFileSize, photoMimeType, originalFileName);
      if (!validation.valid) {
        errors.push(`${originalFileName}: ${validation.error}`);
        continue;
      }

      const sanitizedName = sanitizePhotoFileName(originalFileName);

      try {
        const uploadResult = await uploadCustomerPhotoToDrive({
          orderId: order._id.toString(),
          orderNumber,
          fileBuffer: photoBuffer,
          fileName: sanitizedName,
          mimeType: photoMimeType,
        });

        uploadedResults.push({
          driveFileId: uploadResult.driveFileId,
          driveFolderId: uploadResult.driveFolderId,
          fileName: uploadResult.fileName,
          mimeType: photoMimeType,
          fileSize: photoFileSize,
          uploadStatus: 'uploaded',
          uploadedAt: new Date(),
          uploadError: null,
        });
      } catch (uploadErr: unknown) {
        const msg = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
        errors.push(`${sanitizedName}: ${msg}`);
      }
    }

    if (uploadedResults.length > 0) {
      const existingPhotos = order.customPhotos || [];
      const updatedPhotos = [...existingPhotos, ...uploadedResults];
      order.customPhotos = updatedPhotos;
      order.customPhoto = updatedPhotos[0];
      await order.save();

      return NextResponse.json({
        success: true,
        message: `${uploadedResults.length} photo(s) uploaded successfully to Google Drive`,
        customPhotos: order.customPhotos,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json(
      { error: `Google Drive upload failed: ${errors.join(', ')}` },
      { status: 502 }
    );
  } catch (error: unknown) {
    console.error('[Admin Photo Retry POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error during photo upload' },
      { status: 500 }
    );
  }
}
