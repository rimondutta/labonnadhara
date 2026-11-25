import { google } from 'googleapis';
import { Readable } from 'node:stream';
import path from 'node:path';

// Allowed MIME types and extensions for customer photos
export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const MAX_PHOTO_SIZE_BYTES = 15 * 1024 * 1024; // 15 Megabytes

export const ROOT_FOLDER_NAME = 'Photo Frame Orders';

/**
 * Sanitizes a customer-submitted file name to prevent directory traversal
 * and invalid characters.
 */
export function sanitizePhotoFileName(rawFileName: string): string {
  const base = path.basename(rawFileName || 'customer-photo.jpg');
  const ext = path.extname(base).toLowerCase();
  const safeExt = ALLOWED_PHOTO_EXTENSIONS.includes(ext) ? ext : '.jpg';
  const nameWithoutExt = path.basename(base, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50);
  return `${nameWithoutExt || 'customer-photo'}${safeExt}`;
}

/**
 * Validates a photo's MIME type and size.
 */
export function validateCustomerPhoto(
  fileSize: number,
  mimeType: string,
  fileName: string
): { valid: boolean; error?: string } {
  if (fileSize <= 0) {
    return { valid: false, error: 'Uploaded photo file is empty.' };
  }

  if (fileSize > MAX_PHOTO_SIZE_BYTES) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Photo file size (${sizeMB} MB) exceeds maximum allowed limit of 15 MB.`,
    };
  }

  const normalizedMime = mimeType?.toLowerCase()?.trim();
  if (!ALLOWED_PHOTO_MIME_TYPES.includes(normalizedMime)) {
    return {
      valid: false,
      error: `Unsupported image format (${normalizedMime || 'unknown'}). Please upload a JPG, PNG, or WebP image.`,
    };
  }

  const ext = path.extname(fileName || '').toLowerCase();
  if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file extension (${ext || 'none'}). Only .jpg, .jpeg, .png, and .webp are accepted.`,
    };
  }

  return { valid: true };
}

/**
 * Creates and configures the Google OAuth2 client using the business owner's credentials.
 */
export function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/google-drive/callback`;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are missing.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

/**
 * Returns an authenticated Google Drive client instance.
 */
export function getGoogleDriveClient() {
  const auth = getGoogleOAuth2Client();
  return google.drive({ version: 'v3', auth });
}

/**
 * Finds or creates the root "Photo Frame Orders" folder in the business owner's Google Drive.
 * If GOOGLE_DRIVE_ROOT_FOLDER_ID is provided in .env, that folder is used directly.
 */
export async function getOrCreateRootFolder(drive: ReturnType<typeof google.drive>): Promise<string> {
  const envFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  if (envFolderId && envFolderId.length > 5) {
    try {
      const existing = await drive.files.get({
        fileId: envFolderId,
        fields: 'id, name, trashed',
      });
      if (existing.data && !existing.data.trashed) {
        return envFolderId;
      }
    } catch (err) {
      console.warn('[google-drive] Specified GOOGLE_DRIVE_ROOT_FOLDER_ID not found or inaccessible; resolving by name:', err);
    }
  }

  // Search by folder name
  const query = `name = '${ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create the root folder if not exists
  const created = await drive.files.create({
    requestBody: {
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Labonnadhara Customer Photo Frame Orders',
    },
    fields: 'id',
  });

  return created.data.id!;
}

/**
 * Finds or creates an order-specific folder inside the root folder:
 * e.g. "Order-1001" or "Order-66a93f..."
 */
export async function getOrCreateOrderFolder(
  drive: ReturnType<typeof google.drive>,
  rootFolderId: string,
  orderIdentifier: string
): Promise<string> {
  const folderName = `Order-${orderIdentifier}`;
  const query = `name = '${folderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  });

  return created.data.id!;
}

export interface UploadPhotoParams {
  orderId: string;
  orderNumber?: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface UploadPhotoResult {
  driveFileId: string;
  driveFolderId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Uploads a customer's photo into the business owner's Google Drive inside:
 * Photo Frame Orders / Order-[orderNumber] / [sanitizedFileName]
 *
 * Keeps file private (no public sharing permissions created).
 */
export async function uploadCustomerPhotoToDrive(params: UploadPhotoParams): Promise<UploadPhotoResult> {
  const { orderId, orderNumber, fileBuffer, fileName, mimeType } = params;

  const validation = validateCustomerPhoto(fileBuffer.length, mimeType, fileName);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid photo file');
  }

  const drive = getGoogleDriveClient();
  const rootFolderId = await getOrCreateRootFolder(drive);
  const orderIdentifier = orderNumber || orderId;
  const orderFolderId = await getOrCreateOrderFolder(drive, rootFolderId, orderIdentifier);

  const safeFileName = sanitizePhotoFileName(fileName);

  const fileStream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    requestBody: {
      name: safeFileName,
      parents: [orderFolderId],
      description: `Customer photo for Order #${orderIdentifier}`,
    },
    media: {
      mimeType,
      body: fileStream,
    },
    fields: 'id, name, mimeType, size',
  });

  if (!response.data.id) {
    throw new Error('Google Drive API succeeded but returned no file ID.');
  }

  return {
    driveFileId: response.data.id,
    driveFolderId: orderFolderId,
    fileName: safeFileName,
    mimeType,
    fileSize: fileBuffer.length,
  };
}

/**
 * Downloads a photo file from Google Drive as a readable binary stream.
 * Used by authorized admin photo endpoints.
 */
export async function getDriveFileStream(driveFileId: string) {
  const drive = getGoogleDriveClient();

  // Get file metadata first
  const meta = await drive.files.get({
    fileId: driveFileId,
    fields: 'id, name, mimeType, size, trashed',
  });

  if (!meta.data || meta.data.trashed) {
    throw new Error('Google Drive file not found or is trashed.');
  }

  // Get media content stream
  const response = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: response.data as unknown as NodeJS.ReadableStream,
    name: meta.data.name || 'customer-photo.jpg',
    mimeType: meta.data.mimeType || 'image/jpeg',
    size: meta.data.size ? Number(meta.data.size) : undefined,
  };
}

/**
 * Deletes a customer photo from Google Drive (used for retention policy / order cancellation).
 */
export async function deleteDriveFile(driveFileId: string): Promise<boolean> {
  try {
    const drive = getGoogleDriveClient();
    await drive.files.delete({ fileId: driveFileId });
    return true;
  } catch (err) {
    console.error(`[google-drive] Error deleting file ${driveFileId}:`, err);
    throw err;
  }
}

/**
 * Tests connection to Google Drive and returns status information.
 */
export async function testGoogleDriveConnection(): Promise<{
  connected: boolean;
  userEmail?: string;
  displayName?: string;
  rootFolderId?: string;
  error?: string;
}> {
  try {
    const drive = getGoogleDriveClient();
    const about = await drive.about.get({
      fields: 'user(displayName, emailAddress), storageQuota',
    });

    const rootFolderId = await getOrCreateRootFolder(drive).catch(() => undefined);

    return {
      connected: true,
      userEmail: about.data.user?.emailAddress || undefined,
      displayName: about.data.user?.displayName || undefined,
      rootFolderId,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Failed to connect to Google Drive',
    };
  }
}
