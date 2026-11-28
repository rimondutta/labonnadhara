import { z } from 'zod';
import mongoose from 'mongoose';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export function isMongoObjectId(val: unknown): val is string {
  return typeof val === 'string' && OBJECT_ID_REGEX.test(val) && mongoose.Types.ObjectId.isValid(val);
}

/**
 * Recursively detects MongoDB operator injection (`$inc`, `$set`, `$unset`, etc.),
 * dotted paths, or prototype pollution keys (`__proto__`, `constructor`, `prototype`).
 */
export function hasUnsafeObjectKeys(input: unknown, depth = 0): boolean {
  if (depth > 10 || input === null || typeof input !== 'object') {
    return false;
  }
  if (Array.isArray(input)) {
    return input.some((item) => hasUnsafeObjectKeys(item, depth + 1));
  }
  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      return true;
    }
    if (hasUnsafeObjectKeys((input as Record<string, unknown>)[key], depth + 1)) {
      return true;
    }
  }
  return false;
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSafeImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  return isSafeHttpUrl(url);
}

// ─── Review Schemas (V-05) ───
export const productReviewInputSchema = z
  .object({
    rating: z.number().int('Rating must be a whole number between 1 and 5').min(1).max(5),
    title: z.string().trim().min(1, 'Review title is required').max(120, 'Title must be 120 characters or less'),
    text: z.string().trim().min(1, 'Review text is required').max(2000, 'Review text must be 2000 characters or less'),
    name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or less'),
  })
  .strict();

export const storeReviewInputSchema = z
  .object({
    rating: z.number().int('Rating must be an integer between 1 and 5').min(1).max(5),
    comment: z.string().trim().min(5, 'Comment must be at least 5 characters').max(2000, 'Comment must be 2000 characters or less'),
    title: z.string().trim().max(120).optional(),
  })
  .strict();

// ─── Product Schemas (V-08) ───
const productImageSchema = z.object({
  url: z.string().trim().max(1000).refine(isSafeImageUrl, 'Invalid image URL'),
  alt: z.string().trim().max(200).optional(),
});

const productAttributeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(300),
});

const variantCombinationItemSchema = z.object({
  variationType: z.string().refine(isMongoObjectId, 'Invalid variationType ID'),
  variationValue: z.string().refine(isMongoObjectId, 'Invalid variationValue ID'),
});

const productVariantSchema = z.object({
  sku: z.string().trim().max(100).optional().default(''),
  combinationLabel: z.string().trim().max(200).optional(),
  combination: z.array(variantCombinationItemSchema).max(20).optional().default([]),
  price: z.number().finite().min(0).max(100_000_000),
  comparePrice: z.number().finite().min(0).max(100_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  images: z.array(z.string().trim().max(1000).refine(isSafeImageUrl, 'Invalid variant image URL')).max(20).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const productWritableBase = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9-]+$/i, 'Slug can only contain letters, numbers, and hyphens')
    .transform((s) => s.toLowerCase()),
  description: z.string().trim().max(5000).optional(),
  longDescription: z.string().trim().max(25000).optional(),
  price: z.number().finite().min(0).max(100_000_000),
  compareAtPrice: z.number().finite().min(0).max(100_000_000).nullable().optional(),
  category: z
    .union([z.string().refine(isMongoObjectId, 'Invalid category ID'), z.literal(''), z.null()])
    .optional(),
  attributes: z.array(productAttributeSchema).max(50).optional(),
  tags: z.array(z.string().trim().max(60)).max(50).optional(),
  images: z.array(productImageSchema).max(30).optional(),
  badge: z.string().trim().max(60).optional().nullable(),
  ageRange: z.string().trim().max(60).optional().nullable(),
  requiresCustomPhoto: z.boolean().optional(),
  inventory: z.number().int().min(0).max(1_000_000).optional(),
  isPublished: z.boolean().optional(),
  hasVariations: z.boolean().optional(),
  variationTypes: z.array(z.string().refine(isMongoObjectId, 'Invalid variationType ID')).max(20).optional(),
  variants: z.array(productVariantSchema).max(200).optional(),
});

export function buildProductCreatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || hasUnsafeObjectKeys(raw)) {
    return { success: false as const, error: 'Invalid product payload structure' };
  }
  const source = raw as Record<string, unknown>;
  const picked = {
    title: source.title,
    slug: source.slug,
    description: source.description,
    longDescription: source.longDescription,
    price: typeof source.price === 'string' ? Number(source.price) : source.price,
    compareAtPrice:
      source.compareAtPrice === '' || source.compareAtPrice === undefined
        ? undefined
        : source.compareAtPrice === null
          ? null
          : Number(source.compareAtPrice),
    category: source.category,
    attributes: source.attributes,
    tags: source.tags,
    images: Array.isArray(source.images)
      ? source.images.filter((img: unknown) => {
          if (!img || typeof img !== 'object') return false;
          const u = (img as { url?: unknown }).url;
          return typeof u === 'string' && isSafeImageUrl(u.trim());
        })
      : source.images,
    badge: source.badge,
    ageRange: source.ageRange,
    requiresCustomPhoto: source.requiresCustomPhoto,
    inventory:
      source.inventory === undefined ? undefined : Number(source.inventory),
    isPublished: source.isPublished,
    hasVariations: source.hasVariations,
    variationTypes: source.variationTypes,
    variants: source.variants,
  };

  const parsed = productWritableBase.safeParse(picked);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid product fields',
    };
  }

  const clean = { ...parsed.data } as Record<string, unknown>;
  if (!clean.category) {
    delete clean.category;
  }
  // Explicitly preserve internal fields only on server defaults (never trust client rating/reviews/reviewCount)
  return { success: true as const, data: clean };
}

export function buildProductUpdatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || hasUnsafeObjectKeys(raw)) {
    return { success: false as const, error: 'Invalid product update payload' };
  }
  const source = raw as Record<string, unknown>;
  const candidate: Record<string, unknown> = {};
  const allowedKeys = [
    'title',
    'slug',
    'description',
    'longDescription',
    'price',
    'compareAtPrice',
    'category',
    'attributes',
    'tags',
    'images',
    'badge',
    'ageRange',
    'requiresCustomPhoto',
    'inventory',
    'isPublished',
    'hasVariations',
    'variationTypes',
    'variants',
  ] as const;

  for (const key of allowedKeys) {
    if (key in source && source[key] !== undefined) {
      if (key === 'price' && typeof source[key] === 'string') {
        candidate[key] = Number(source[key]);
      } else if (key === 'compareAtPrice') {
        candidate[key] = source[key] === '' || source[key] === null ? null : Number(source[key]);
      } else if (key === 'inventory') {
        candidate[key] = Number(source[key]);
      } else if (key === 'images' && Array.isArray(source[key])) {
        candidate[key] = (source[key] as unknown[]).filter((img) => {
          if (!img || typeof img !== 'object') return false;
          const u = (img as { url?: unknown }).url;
          return typeof u === 'string' && isSafeImageUrl(u.trim());
        });
      } else {
        candidate[key] = source[key];
      }
    }
  }

  const partialSchema = productWritableBase.partial();
  const parsed = partialSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid product update fields',
    };
  }

  const clean = { ...parsed.data } as Record<string, unknown>;
  if ('category' in clean && !clean.category) {
    clean.category = undefined;
  }
  return { success: true as const, data: clean };
}

// ─── Category Schemas (V-08) ───
export const categoryWriteSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Category slug is required')
    .max(150)
    .regex(/^[a-z0-9-]+$/i, 'Slug can only contain letters, numbers, and hyphens')
    .transform((s) => s.toLowerCase()),
  description: z.string().trim().max(2000).optional(),
  image: z
    .union([
      z.string().trim().max(1000).refine(isSafeImageUrl, 'Invalid category image URL'),
      z.literal(''),
      z.null(),
    ])
    .optional(),
  isActive: z.boolean().optional(),
});

export function buildCategoryPayload(raw: unknown, partial = false) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || hasUnsafeObjectKeys(raw)) {
    return { success: false as const, error: 'Invalid category payload' };
  }
  const source = raw as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of ['name', 'slug', 'description', 'image', 'isActive'] as const) {
    if (key in source && source[key] !== undefined) {
      picked[key] = source[key];
    }
  }
  const schema = partial ? categoryWriteSchema.partial() : categoryWriteSchema;
  const parsed = schema.safeParse(picked);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || 'Invalid category data',
    };
  }
  return { success: true as const, data: parsed.data };
}

// ─── Coupon Schemas (V-08) ───
const couponCreateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, 'Coupon code is required')
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, 'Coupon code can only contain letters, numbers, - and _')
      .transform((c) => c.toUpperCase()),
    discountType: z.enum(['percentage', 'fixed']).default('percentage'),
    discountValue: z.number().finite().positive('Discount value must be greater than 0').max(1_000_000),
    minOrderAmount: z.number().finite().min(0).max(10_000_000).default(0),
    maxUses: z.number().int().min(0).max(1_000_000).default(0),
    isActive: z.boolean().default(true),
    expiresAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).nullable().optional(),
  })
  .refine(
    (data) => !(data.discountType === 'percentage' && data.discountValue > 100),
    { message: 'Percentage discount cannot exceed 100%' }
  );

const couponPatchSchema = z.object({
  id: z.string().refine(isMongoObjectId, 'Invalid coupon ID'),
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .transform((c) => c.toUpperCase())
    .optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().finite().positive().max(1_000_000).optional(),
  minOrderAmount: z.number().finite().min(0).max(10_000_000).optional(),
  maxUses: z.number().int().min(0).max(1_000_000).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

export function buildCouponCreatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || hasUnsafeObjectKeys(raw)) {
    return { success: false as const, error: 'Invalid coupon payload' };
  }
  const s = raw as Record<string, unknown>;
  const picked = {
    code: s.code,
    discountType: s.discountType ?? 'percentage',
    discountValue: typeof s.discountValue === 'string' ? Number(s.discountValue) : s.discountValue,
    minOrderAmount: s.minOrderAmount === '' || s.minOrderAmount === undefined ? 0 : Number(s.minOrderAmount),
    maxUses: s.maxUses === '' || s.maxUses === undefined ? 0 : Number(s.maxUses),
    isActive: s.isActive !== false,
    expiresAt: s.expiresAt ? String(s.expiresAt) : null,
  };

  const parsed = couponCreateSchema.safeParse(picked);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || 'Invalid coupon data' };
  }

  let parsedExpiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    const dt = new Date(parsed.data.expiresAt);
    if (Number.isNaN(dt.getTime())) {
      return { success: false as const, error: 'Invalid expiration date' };
    }
    parsedExpiresAt = dt;
  }

  return {
    success: true as const,
    data: {
      code: parsed.data.code,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      minOrderAmount: parsed.data.minOrderAmount,
      maxUses: parsed.data.maxUses,
      isActive: parsed.data.isActive,
      expiresAt: parsedExpiresAt,
    },
  };
}

export function buildCouponPatchPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || hasUnsafeObjectKeys(raw)) {
    return { success: false as const, error: 'Invalid coupon update payload' };
  }
  const s = raw as Record<string, unknown>;
  const picked: Record<string, unknown> = { id: s.id };
  const allowed = ['code', 'discountType', 'discountValue', 'minOrderAmount', 'maxUses', 'isActive', 'expiresAt'] as const;
  for (const key of allowed) {
    if (key in s && s[key] !== undefined) {
      picked[key] = ['discountValue', 'minOrderAmount', 'maxUses'].includes(key) && typeof s[key] === 'string'
        ? Number(s[key])
        : s[key];
    }
  }

  const parsed = couponPatchSchema.safeParse(picked);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || 'Invalid coupon update data' };
  }

  if (parsed.data.discountType === 'percentage' && (parsed.data.discountValue ?? 0) > 100) {
    return { success: false as const, error: 'Percentage discount cannot exceed 100%' };
  }

  const { id, ...updates } = parsed.data;
  const safeUpdates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) {
      if (k === 'expiresAt') {
        if (v === null || v === '') {
          safeUpdates.expiresAt = null;
        } else {
          const dt = new Date(String(v));
          if (Number.isNaN(dt.getTime())) {
            return { success: false as const, error: 'Invalid expiration date' };
          }
          safeUpdates.expiresAt = dt;
        }
      } else {
        safeUpdates[k] = v;
      }
    }
  }

  return { success: true as const, id, updates: safeUpdates };
}

// ─── Address Schemas (V-08) ───
export const addressCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(40).default('Home'),
    fullName: z.string().trim().min(1, 'Full name is required').max(100),
    streetAddress: z.string().trim().min(1, 'Street address is required').max(250),
    city: z.string().trim().min(1, 'City is required').max(100),
    state: z.string().trim().max(100).default(''),
    zipCode: z.string().trim().max(30).default(''),
    phoneNumber: z.string().trim().max(30).default(''),
    isDefault: z.boolean().default(false),
  })
  .strict();

export const addressPatchSchema = addressCreateSchema.partial().strict();
