import { NextResponse } from 'next/server';
import { z } from 'zod';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import {
  MAX_ADMIN_MEDIA_SIZE_BYTES,
  isAllowedMutationOrigin,
  isRequestContentLengthOverLimit,
  validateImageBuffer,
} from '@/lib/upload-security';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';

const deleteImageSchema = z
  .object({
    url: z
      .string()
      .trim()
      .url('Valid URL required')
      .refine((u) => {
        try {
          const parsed = new URL(u);
          if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com') {
            return false;
          }
          const lowerPath = parsed.pathname.toLowerCase();
          if (
            lowerPath.endsWith('.pdf') ||
            /\/(invoices|invoice|orders|order-photos|private|documents|receipts)\//.test(lowerPath)
          ) {
            return false;
          }
          return lowerPath.includes('/image/upload/');
        } catch {
          return false;
        }
      }, 'Only authorized storefront Cloudinary HTTPS image URLs can be deleted'),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    if (!isAllowedMutationOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-origin upload rejected' },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const rateLimit = await checkRateLimit(getClientIp(req), 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Please wait a moment.' },
        { status: 429, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    // Reject oversized multipart requests before buffering into memory
    if (isRequestContentLengthOverLimit(req, MAX_ADMIN_MEDIA_SIZE_BYTES + 256 * 1024)) {
      return NextResponse.json(
        { error: 'File size exceeds the 5 MB upload limit' },
        { status: 413, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (file.size > MAX_ADMIN_MEDIA_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size cannot exceed 5 MB' },
        { status: 413, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const validation = validateImageBuffer(buffer, {
      declaredMime: file.type,
      fileName: file instanceof File ? file.name : undefined,
      maxBytes: MAX_ADMIN_MEDIA_SIZE_BYTES,
    });

    if (!validation.valid || !validation.detectedMime) {
      return NextResponse.json(
        { error: validation.error || 'Unsupported or corrupted image file' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const base64Data = buffer.toString('base64');
    const dataUri = `data:${validation.detectedMime};base64,${base64Data}`;

    const secureUrl = await uploadImage(dataUri, 'products');

    return NextResponse.json(
      { url: secureUrl },
      { status: 200, headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Cloudinary upload route error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    if (!isAllowedMutationOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-origin request rejected' },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = deleteImageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Valid Cloudinary URL required' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await deleteImage(parsed.data.url);

    return NextResponse.json(
      { success: true, message: 'Image deleted from Cloudinary' },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Cloudinary delete route error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
