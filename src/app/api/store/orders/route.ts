import { NextResponse, after } from 'next/server';
import crypto from 'crypto';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Coupon from '@/models/Coupon';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { redis, hasRedis } from '@/lib/redis';
import { calculateOrderTotals, type OrderItemInput } from '@/lib/order-pricing';
import {
  InsufficientStockError,
  InventoryUpdateOp,
  releaseOrderInventory,
  reserveOrderInventory,
} from '@/lib/inventory';
import {
  MAX_ORDER_PHOTOS_COUNT,
  MAX_ORDER_REQUEST_BODY_BYTES,
  isAllowedMutationOrigin,
  isRequestContentLengthOverLimit,
  validateImageBuffer,
} from '@/lib/upload-security';
import { MAX_ORDER_PHOTO_SIZE_BYTES } from '@/lib/upload-security';
import { hasUnsafeObjectKeys } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';
import { mobileCorsHeaders } from '@/lib/cors';

const IDEMPOTENCY_TTL_SECONDS = 600;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildScopedIdempotencyKey(rawKey: string, clientIp: string): string {
  const scope = crypto
    .createHash('sha256')
    .update(`${clientIp}:${rawKey.toLowerCase()}`)
    .digest('hex')
    .slice(0, 32);
  return `idempotency:order:${scope}`;
}

async function claimIdempotencyKey(
  redisKey: string
): Promise<{ claimed: true } | { claimed: false; orderId: string } | null> {
  if (!hasRedis || !redis) return null;
  try {
    const result = await redis.set(redisKey, 'pending', {
      nx: true,
      ex: IDEMPOTENCY_TTL_SECONDS,
    });
    if (result === 'OK') {
      return { claimed: true };
    }
    const stored = await redis.get<string>(redisKey);
    if (stored && stored !== 'pending') {
      return { claimed: false, orderId: stored };
    }
    return { claimed: false, orderId: '' };
  } catch (err) {
    console.error('[idempotency] Redis error, falling through:', getSafeErrorMessage(err));
    return null;
  }
}

async function resolveIdempotencyKey(redisKey: string, orderId: string): Promise<void> {
  if (!hasRedis || !redis) return;
  try {
    await redis.set(redisKey, orderId, { ex: IDEMPOTENCY_TTL_SECONDS });
  } catch (err) {
    console.error('[idempotency] Failed to resolve key:', getSafeErrorMessage(err));
  }
}

async function releaseIdempotencyKey(redisKey: string): Promise<void> {
  if (!hasRedis || !redis) return;
  try {
    await redis.del(redisKey);
  } catch (err) {
    console.error('[idempotency] Failed to release key:', getSafeErrorMessage(err));
  }
}

function isReplicaSetUnsupportedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    msg.includes('transaction numbers are only allowed on a replica set member') ||
    msg.includes('sessions are not supported')
  );
}

export async function POST(req: Request) {
  let scopedIdempotencyRedisKey: string | null = null;
  let completedOrder = false;

  try {
    // 1. Distributed Rate Limiting
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    // 2. Origin / CSRF verification on multipart uploads & cookie sessions
    if (!isAllowedMutationOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid request origin.' },
        { status: 403 }
      );
    }

    // 3. Enforce request size cap BEFORE buffering multipart/JSON into memory
    const contentType = req.headers.get('content-type') || '';
    const maxBodyBytes = contentType.includes('multipart/form-data')
      ? MAX_ORDER_REQUEST_BODY_BYTES
      : 512 * 1024;

    if (isRequestContentLengthOverLimit(req, maxBodyBytes)) {
      return NextResponse.json(
        { error: 'Order request payload exceeds maximum allowed size.' },
        { status: 413 }
      );
    }

    let body: Record<string, unknown>;
    interface PreparedPhoto {
      buffer: Buffer;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }
    const preparedPhotos: PreparedPhoto[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const dataField = formData.get('data');
      if (!dataField || typeof dataField !== 'string') {
        return NextResponse.json({ error: 'Invalid request format.' }, { status: 400 });
      }
      try {
        body = JSON.parse(dataField);
      } catch {
        return NextResponse.json({ error: 'Invalid JSON in form data.' }, { status: 400 });
      }

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

      if (photoFiles.length > MAX_ORDER_PHOTOS_COUNT) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ORDER_PHOTOS_COUNT} customer photos allowed per order.` },
          { status: 400 }
        );
      }

      let cumulativePhotoBytes = 0;
      for (const file of photoFiles) {
        if (file.size > MAX_ORDER_PHOTO_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'Each customer photo must be 5 MB or smaller.' },
            { status: 413 }
          );
        }
        cumulativePhotoBytes += file.size;
        if (cumulativePhotoBytes > MAX_ORDER_PHOTOS_COUNT * MAX_ORDER_PHOTO_SIZE_BYTES) {
          return NextResponse.json(
            { error: 'Total uploaded photo size exceeds the order limit.' },
            { status: 413 }
          );
        }

        const arrBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrBuffer);
        const fileName = file.name || 'customer-photo.jpg';
        const validation = validateImageBuffer(buffer, {
          declaredMime: file.type || 'image/jpeg',
          fileName,
          maxBytes: MAX_ORDER_PHOTO_SIZE_BYTES,
        });

        if (!validation.valid || !validation.detectedMime) {
          return NextResponse.json(
            { error: validation.error || 'Invalid customer photo.' },
            { status: 400 }
          );
        }

        preparedPhotos.push({
          buffer,
          fileName,
          mimeType: validation.detectedMime,
          fileSize: buffer.length,
        });
      }
    } else {
      body = (await req.json().catch(() => null)) as Record<string, unknown>;
    }

    if (!body || typeof body !== 'object' || Array.isArray(body) || hasUnsafeObjectKeys(body)) {
      return NextResponse.json({ error: 'Invalid order payload.' }, { status: 400 });
    }

    const {
      customerName,
      customerEmail,
      items,
      shippingAddress,
      paymentMethod,
      shippingZone,
      notes,
      idempotencyKey,
      couponCode,
    } = body as {
      customerName?: unknown;
      customerEmail?: unknown;
      items?: Array<{
        productId?: unknown;
        id?: unknown;
        variantId?: unknown;
        quantity?: unknown;
        title?: unknown;
        image?: unknown;
        variantOptions?: unknown;
      }>;
      shippingAddress?: Record<string, unknown>;
      paymentMethod?: unknown;
      shippingZone?: string;
      notes?: unknown;
      idempotencyKey?: unknown;
      couponCode?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
      return NextResponse.json({ error: 'Order must include between 1 and 100 items.' }, { status: 400 });
    }

    const normalizedItems: OrderItemInput[] = [];
    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        return NextResponse.json({ error: 'Invalid order item entry.' }, { status: 400 });
      }
      const productId =
        typeof rawItem.productId === 'string'
          ? rawItem.productId.trim()
          : typeof rawItem.id === 'string'
            ? rawItem.id.trim()
            : '';
      const quantity = Number(rawItem.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return NextResponse.json(
          { error: 'Each order item must specify a valid productId and integer quantity (1-99).' },
          { status: 400 }
        );
      }

      let safeVariantOptions: Record<string, string> | undefined;
      if (
        rawItem.variantOptions &&
        typeof rawItem.variantOptions === 'object' &&
        !Array.isArray(rawItem.variantOptions)
      ) {
        safeVariantOptions = {};
        for (const [k, v] of Object.entries(rawItem.variantOptions)) {
          if (typeof k === 'string' && (typeof v === 'string' || typeof v === 'number')) {
            safeVariantOptions[k.slice(0, 60)] = String(v).slice(0, 120);
          }
        }
      }

      normalizedItems.push({
        productId,
        variantId: typeof rawItem.variantId === 'string' ? rawItem.variantId.trim() : undefined,
        quantity,
        title: typeof rawItem.title === 'string' ? rawItem.title.slice(0, 200) : undefined,
        image: typeof rawItem.image === 'string' ? rawItem.image.slice(0, 1000) : undefined,
        variantOptions: safeVariantOptions,
      });
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '' || customerName.trim().length > 120) {
      return NextResponse.json({ error: 'Valid customer name is required.' }, { status: 400 });
    }

    if (
      !shippingAddress ||
      typeof shippingAddress !== 'object' ||
      !shippingAddress.addressLine1 ||
      !shippingAddress.city ||
      !shippingAddress.phone
    ) {
      return NextResponse.json(
        { error: 'Valid shipping address (address line, city, and phone number) is required.' },
        { status: 400 }
      );
    }

    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(customerEmail).trim()) || String(customerEmail).length > 160) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
      }
    }

    // Validate UUID v4 idempotency key if supplied
    if (idempotencyKey !== undefined && idempotencyKey !== null && idempotencyKey !== '') {
      if (typeof idempotencyKey !== 'string' || !UUID_V4_REGEX.test(idempotencyKey.trim())) {
        return NextResponse.json({ error: 'Invalid idempotencyKey format (UUID v4 required).' }, { status: 400 });
      }
      scopedIdempotencyRedisKey = buildScopedIdempotencyKey(idempotencyKey.trim(), ip);
      const idempotencyResult = await claimIdempotencyKey(scopedIdempotencyRedisKey);

      if (idempotencyResult !== null && !idempotencyResult.claimed) {
        if (idempotencyResult.orderId) {
          return NextResponse.json({
            success: true,
            orderId: idempotencyResult.orderId,
            message: 'Order already exists',
            deduplicated: true,
          });
        }
        return NextResponse.json(
          { error: 'Order is already being processed. Please wait a moment.' },
          { status: 409 }
        );
      }
    }

    await connectToDatabase();

    // 4. Authoritative Server-Side Pricing & Catalog Check
    let pricingResult;
    try {
      pricingResult = await calculateOrderTotals({
        items: normalizedItems,
        couponCode: typeof couponCode === 'string' ? couponCode : null,
        shippingZone,
        checkStock: true,
      });
    } catch (pricingError: unknown) {
      if (scopedIdempotencyRedisKey) await releaseIdempotencyKey(scopedIdempotencyRedisKey);
      return NextResponse.json(
        { error: (pricingError as Error).message || 'Invalid order data.' },
        { status: 400 }
      );
    }

    const {
      verifiedItems,
      shippingCost,
      totalAmount,
      appliedCoupon,
      inventoryOperations,
    } = pricingResult;

    const guestAccessToken = crypto.randomBytes(32).toString('hex');
    const guestAccessTokenHash = crypto.createHash('sha256').update(guestAccessToken).digest('hex');

    const isInside = shippingZone === 'inside_chattogram';
    const orderData: Record<string, unknown> = {
      customerName: customerName.trim(),
      items: verifiedItems,
      totalAmount,
      shippingCost,
      shippingZone: isInside ? 'inside_chattogram' : 'outside_chattogram',
      notes: notes ? String(notes).slice(0, 500) : undefined,
      shippingAddress: {
        addressLine1: String(shippingAddress.addressLine1).trim().slice(0, 300),
        city: String(shippingAddress.city).trim().slice(0, 100),
        postcode: shippingAddress.postcode ? String(shippingAddress.postcode).trim().slice(0, 30) : '',
        country: shippingAddress.country ? String(shippingAddress.country).trim().slice(0, 80) : 'Bangladesh',
        phone: String(shippingAddress.phone).trim().slice(0, 30),
      },
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod.slice(0, 40) : 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      guestAccessTokenHash,
      customPhoto:
        preparedPhotos.length > 0
          ? {
              uploadStatus: 'pending',
              fileName: preparedPhotos[0].fileName,
              mimeType: preparedPhotos[0].mimeType,
              fileSize: preparedPhotos[0].fileSize,
            }
          : { uploadStatus: 'not_required' },
      customPhotos: preparedPhotos.map((p) => ({
        uploadStatus: 'pending',
        fileName: p.fileName,
        mimeType: p.mimeType,
        fileSize: p.fileSize,
      })),
    };

    if (customerEmail) {
      orderData.customerEmail = String(customerEmail).toLowerCase().trim();
    }

    // 5. Atomic Inventory Reservation + Order Creation + Coupon Usage Guard (V-10)
    const executeOrderWrite = async (session?: mongoose.ClientSession) => {
      let reservedOps: InventoryUpdateOp[] = [];
      try {
        reservedOps = await reserveOrderInventory(inventoryOperations, session);

        if (appliedCoupon) {
          const couponUpdate = await Coupon.updateOne(
            {
              _id: appliedCoupon._id,
              isActive: true,
              $or: [
                { maxUses: { $lte: 0 } },
                { maxUses: null },
                { $expr: { $lt: ['$usedCount', '$maxUses'] } },
              ],
            },
            { $inc: { usedCount: 1 } },
            session ? { session } : undefined
          );
          if (!couponUpdate || couponUpdate.modifiedCount !== 1) {
            throw new InsufficientStockError('Coupon redemption limit has been reached.');
          }
        }

        const created = session
          ? (await Order.create([orderData], { session }))[0]
          : await Order.create(orderData);
        return created;
      } catch (err) {
        if (!session && reservedOps.length > 0) {
          await releaseOrderInventory(reservedOps).catch((rbErr) => {
            console.error('[Inventory] Failed fallback rollback:', rbErr);
          });
        }
        throw err;
      }
    };

    let order;
    const mongoSession = await mongoose.startSession();
    try {
      let txOrder: InstanceType<typeof Order> | null = null;
      await mongoSession.withTransaction(async () => {
        txOrder = await executeOrderWrite(mongoSession);
      });
      order = txOrder;
    } catch (txError: unknown) {
      if (isReplicaSetUnsupportedError(txError)) {
        order = await executeOrderWrite();
      } else if (txError instanceof InsufficientStockError) {
        if (scopedIdempotencyRedisKey) await releaseIdempotencyKey(scopedIdempotencyRedisKey);
        return NextResponse.json({ error: txError.message }, { status: 409 });
      } else {
        throw txError;
      }
    } finally {
      await mongoSession.endSession();
    }

    if (!order) {
      if (scopedIdempotencyRedisKey) await releaseIdempotencyKey(scopedIdempotencyRedisKey);
      return NextResponse.json({ error: 'Failed to place order.' }, { status: 500 });
    }

    completedOrder = true;

    if (scopedIdempotencyRedisKey) {
      await resolveIdempotencyKey(scopedIdempotencyRedisKey, order._id.toString());
    }

    // 6. Reliable Post-Response Processing (P-11): Customer photo Drive upload & side effects via Next.js after()
    if (preparedPhotos.length > 0) {
      const orderIdStr = order._id.toString();
      const orderNumber = order.invoiceNumber || orderIdStr.slice(-8).toUpperCase();

      after(async () => {
        try {
          const { uploadCustomerPhotoToDrive, sanitizePhotoFileName } = await import('@/lib/google-drive');
          await Order.findByIdAndUpdate(orderIdStr, {
            'customPhoto.uploadStatus': 'uploading',
            'customPhotos.$[].uploadStatus': 'uploading',
          });

          const uploadedPhotosData: Array<Record<string, unknown>> = [];

          for (let i = 0; i < preparedPhotos.length; i++) {
            const p = preparedPhotos[i];
            const sanitized = sanitizePhotoFileName(p.fileName);
            try {
              const uploadResult = await uploadCustomerPhotoToDrive({
                orderId: orderIdStr,
                orderNumber,
                fileBuffer: p.buffer,
                fileName: sanitized,
                mimeType: p.mimeType,
              });
              uploadedPhotosData.push({
                driveFileId: uploadResult.driveFileId,
                driveFolderId: uploadResult.driveFolderId,
                fileName: uploadResult.fileName,
                mimeType: p.mimeType,
                fileSize: p.fileSize,
                uploadStatus: 'uploaded',
                uploadedAt: new Date(),
                uploadError: null,
              });
            } catch (singleErr: unknown) {
              console.error(`[order] Drive upload failed for photo #${i + 1}:`, getSafeErrorMessage(singleErr));
              uploadedPhotosData.push({
                fileName: sanitized,
                mimeType: p.mimeType,
                fileSize: p.fileSize,
                uploadStatus: 'failed',
                uploadError: getSafeErrorMessage(singleErr),
              });
            }
          }

          const primaryPhoto =
            uploadedPhotosData.find((up) => up.uploadStatus === 'uploaded') || uploadedPhotosData[0];

          await Order.findByIdAndUpdate(orderIdStr, {
            customPhotos: uploadedPhotosData,
            customPhoto: primaryPhoto,
          });
        } catch (uploadErr: unknown) {
          console.error('[order] Google Drive background upload failed:', getSafeErrorMessage(uploadErr));
          await Order.findByIdAndUpdate(orderIdStr, {
            'customPhoto.uploadStatus': 'failed',
            'customPhoto.uploadError': getSafeErrorMessage(uploadErr),
          }).catch(() => {});
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        guestAccessToken,
        message: 'Order created successfully',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (scopedIdempotencyRedisKey && !completedOrder) {
      await releaseIdempotencyKey(scopedIdempotencyRedisKey);
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Failed to create order:', getSafeErrorMessage(error));
    return NextResponse.json({ error: 'Failed to place order.' }, { status: 500 });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
