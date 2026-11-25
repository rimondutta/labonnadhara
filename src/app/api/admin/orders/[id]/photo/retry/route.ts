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
        { error: 'Please provide a replacement photo using multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const photoFile = formData.get('photo');
    if (!photoFile || !(photoFile instanceof Blob)) {
      return NextResponse.json({ error: 'No photo file provided.' }, { status: 400 });
    }

    const arrBuffer = await photoFile.arrayBuffer();
    const photoBuffer = Buffer.from(arrBuffer);
    const originalFileName = (photoFile as File).name || 'customer-photo.jpg';
    const photoMimeType = photoFile.type || 'image/jpeg';
    const photoFileSize = photoBuffer.length;

    const validation = validateCustomerPhoto(photoFileSize, photoMimeType, originalFileName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const sanitizedName = sanitizePhotoFileName(originalFileName);

    // Update status to uploading
    order.customPhoto = {
      ...(order.customPhoto || {}),
      uploadStatus: 'uploading',
      fileName: sanitizedName,
      mimeType: photoMimeType,
      fileSize: photoFileSize,
      uploadError: null,
    };
    await order.save();

    try {
      const uploadResult = await uploadCustomerPhotoToDrive({
        orderId: order._id.toString(),
        orderNumber: order.invoiceNumber || order._id.toString().slice(-8).toUpperCase(),
        fileBuffer: photoBuffer,
        fileName: sanitizedName,
        mimeType: photoMimeType,
      });

      order.customPhoto = {
        driveFileId: uploadResult.driveFileId,
        driveFolderId: uploadResult.driveFolderId,
        fileName: uploadResult.fileName,
        mimeType: photoMimeType,
        fileSize: photoFileSize,
        uploadStatus: 'uploaded',
        uploadedAt: new Date(),
        uploadError: null,
      };
      await order.save();

      return NextResponse.json({
        success: true,
        message: 'Photo uploaded successfully to Google Drive',
        customPhoto: order.customPhoto,
      });
    } catch (uploadErr: unknown) {
      const errorMessage = uploadErr instanceof Error ? uploadErr.message : 'Upload failed';
      order.customPhoto.uploadStatus = 'failed';
      order.customPhoto.uploadError = errorMessage.slice(0, 500);
      await order.save();

      return NextResponse.json(
        { error: `Google Drive upload failed: ${errorMessage}` },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    console.error('[Admin Photo Retry POST] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error during photo retry' },
      { status: 500 }
    );
  }
}
