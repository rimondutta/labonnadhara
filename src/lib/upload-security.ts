import path from 'path';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_ADMIN_MEDIA_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ORDER_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ORDER_PHOTOS_COUNT = 5;
export const MAX_ORDER_REQUEST_BODY_BYTES = 26 * 1024 * 1024; // 5 * 5MB + multipart overhead

export interface ImageValidationResult {
  valid: boolean;
  detectedMime?: AllowedImageMime;
  error?: string;
}

export function normalizeDeclaredImageMime(mimeType: string | null | undefined): string {
  const normalized = (mimeType || '').toLowerCase().trim();
  if (normalized === 'image/jpg') return 'image/jpeg';
  return normalized;
}

/**
 * Inspects actual file header magic bytes to determine real image type.
 * Prevents extension/MIME spoofing (e.g., SVG, HTML, or executables labeled image/jpeg).
 */
export function detectImageMimeFromMagicBytes(buffer: Buffer): AllowedImageMime | null {
  if (!buffer || buffer.length < 12) return null;

  // Quickly reject XML/SVG/HTML/script signatures masquerading cleanly even before deep match
  const headAscii = buffer.subarray(0, Math.min(256, buffer.length)).toString('utf8').trimStart().toLowerCase();
  if (
    headAscii.startsWith('<svg') ||
    headAscii.startsWith('<?xml') ||
    headAscii.startsWith('<!doctype') ||
    headAscii.startsWith('<html') ||
    headAscii.startsWith('<script')
  ) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Checks declared MIME, file extension (when provided), byte length, and actual magic bytes.
 */
export function validateImageBuffer(
  buffer: Buffer,
  options: {
    declaredMime?: string | null;
    fileName?: string | null;
    maxBytes: number;
  }
): ImageValidationResult {
  if (!buffer || buffer.length <= 0) {
    return { valid: false, error: 'Uploaded image file is empty.' };
  }

  if (buffer.length > options.maxBytes) {
    const actualMB = (buffer.length / (1024 * 1024)).toFixed(2);
    const maxMB = (options.maxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Image size (${actualMB} MB) exceeds the ${maxMB} MB limit.`,
    };
  }

  if (options.fileName) {
    const ext = path.extname(options.fileName).toLowerCase();
    if (ext && !ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
      return {
        valid: false,
        error: `Unsupported file extension (${ext}). Only JPG, PNG, and WebP images are allowed.`,
      };
    }
  }

  const normalizedMime = normalizeDeclaredImageMime(options.declaredMime);
  if (
    normalizedMime &&
    !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime as AllowedImageMime)
  ) {
    return {
      valid: false,
      error: `Unsupported image type (${normalizedMime}). Only JPEG, PNG, and WebP are allowed.`,
    };
  }

  const detectedMime = detectImageMimeFromMagicBytes(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'Invalid or corrupted image content. Only authentic JPEG, PNG, and WebP files are accepted.',
    };
  }

  return { valid: true, detectedMime };
}

/**
 * Strictly validates a base64 Data URL image string without buffering excessive strings into memory.
 */
export function validateBase64ImageDataUrl(
  dataUrl: unknown,
  maxBytes: number
): ImageValidationResult & { buffer?: Buffer; normalizedDataUrl?: string } {
  if (typeof dataUrl !== 'string' || !dataUrl.trim()) {
    return { valid: false, error: 'Image data is required.' };
  }

  const trimmed = dataUrl.trim();
  // Base64 expands binary data by ~4/3; check encoded string size BEFORE decoding
  const maxEncodedChars = Math.ceil((maxBytes * 4) / 3) + 128;
  if (trimmed.length > maxEncodedChars) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `Encoded image exceeds the ${maxMB} MB limit.` };
  }

  const match = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) {
    return {
      valid: false,
      error: 'Invalid image format. Only base64-encoded JPEG, PNG, or WebP Data URLs are accepted.',
    };
  }

  const declaredMime = normalizeDeclaredImageMime(match[1]);
  const cleanBase64 = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const check = validateImageBuffer(buffer, { declaredMime, maxBytes });
  if (!check.valid || !check.detectedMime) {
    return check;
  }

  return {
    valid: true,
    detectedMime: check.detectedMime,
    buffer,
    normalizedDataUrl: `data:${check.detectedMime};base64,${cleanBase64}`,
  };
}

/**
 * Enforces Content-Length limit prior to buffering request bodies (multipart or JSON).
 */
export function isRequestContentLengthOverLimit(req: Request, maxBytes: number): boolean {
  const raw = req.headers.get('content-length');
  if (!raw) return false;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > maxBytes;
}

/**
 * Checks Origin / Referer on cookie-authenticated multipart/upload mutations against allowed hosts (V-20).
 * Requests using verified Bearer authentication bypass cookie CSRF origin checks.
 */
export function isAllowedMutationOrigin(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return true;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const sourceHeader = origin || referer;

  // Non-browser API clients without cookies may omit Origin; when Origin/Referer IS sent, enforce strict match
  const hasCookie = Boolean(req.headers.get('cookie'));
  if (!sourceHeader) {
    // Reject browser-like cookie mutations missing both Origin and Referer when sec-fetch-site disagrees
    const fetchSite = (req.headers.get('sec-fetch-site') || '').toLowerCase();
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
      return false;
    }
    return !hasCookie || fetchSite === 'same-origin' || fetchSite === '';
  }

  try {
    const sourceHost = new URL(sourceHeader).host.toLowerCase();
    const requestHost = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toLowerCase();
    if (requestHost && sourceHost === requestHost) {
      return true;
    }

    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl && new URL(nextAuthUrl).host.toLowerCase() === sourceHost) {
      return true;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && new URL(siteUrl).host.toLowerCase() === sourceHost) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const ALLOWED_MEDIA_FOLDER_PREFIXES = [
  'products/',
  'categories/',
  'blogs/',
  'banners/',
  'media/',
  'labonnadhara/',
] as const;

const PROTECTED_FOLDER_PREFIXES = [
  'invoices/',
  'invoice/',
  'orders/',
  'order-photos/',
  'users/',
  'private/',
  'documents/',
  'receipts/',
] as const;

const PUBLIC_ID_REGEX = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9._-]+)+$/;

/**
 * Validates that a Cloudinary publicId resides strictly inside an allowed
 * storefront media folder and is never inside protected invoice/order folders.
 */
export function isAllowedMediaPublicId(publicId: unknown): publicId is string {
  if (typeof publicId !== 'string') return false;
  const trimmed = publicId.trim();
  if (!trimmed || trimmed.length > 200) return false;
  if (trimmed.includes('..') || trimmed.startsWith('/') || trimmed.includes('\\')) return false;
  if (!PUBLIC_ID_REGEX.test(trimmed)) return false;

  const normalized = trimmed.toLowerCase();
  if (PROTECTED_FOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return false;
  }

  return ALLOWED_MEDIA_FOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
