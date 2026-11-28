import type { v2 as CloudinaryV2 } from "cloudinary";

let configuredClient: typeof CloudinaryV2 | null = null;

function getCloudinaryClient(): typeof CloudinaryV2 {
  if (configuredClient) return configuredClient;

  const url = process.env.CLOUDINARY_URL?.trim();
  const isValidUrl = Boolean(url && url.startsWith("cloudinary://"));
  if (url && !isValidUrl) {
    // Avoid crashing build-time route collection when local .env uses a placeholder string
    delete process.env.CLOUDINARY_URL;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { v2 } = require("cloudinary") as { v2: typeof CloudinaryV2 };

  v2.config({
    cloud_name: isValidUrl && url ? url.split("@")[1] ?? "" : "",
    api_key: process.env.CLOUDINARY_API_KEY ?? "",
    api_secret: isValidUrl && url ? url.split(":")[2]?.split("@")[0] ?? "" : "",
    secure: true,
  });

  configuredClient = v2;
  return v2;
}

const cloudinary = new Proxy({} as typeof CloudinaryV2, {
  get(_target, prop) {
    const client = getCloudinaryClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default cloudinary;

/**
 * Returns an optimized Cloudinary URL with automatic format (f_auto) and quality
 * (q_auto) transformations applied. Also supports optional width resizing.
 *
 * Why this matters for scale:
 *   - f_auto  → Cloudinary serves WebP/AVIF to supported browsers (~30-50% smaller)
 *   - q_auto  → Cloudinary automatically computes the optimal quality compression
 *   - w_{n}   → Resizes to a sensible display width to avoid downloading 3000px originals
 *
 * Usage:
 *   import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';
 *   const src = getOptimizedCloudinaryUrl(product.images[0].url, { width: 800 });
 *
 * Falls back gracefully for non-Cloudinary URLs (returns the original URL unchanged).
 *
 * @param url    - Raw Cloudinary secure_url (or any URL)
 * @param opts   - { width?: number }  — optional pixel width to resize to
 */
export function getOptimizedCloudinaryUrl(
  url: string | null | undefined,
  opts: { width?: number } = {}
): string {
  if (!url || !url.includes('res.cloudinary.com')) return url || '';

  // Build the transformation string
  const transforms = ['f_auto', 'q_auto'];
  if (opts.width) transforms.push(`w_${opts.width}`);
  const transformStr = transforms.join(',');

  // If the URL already has transformations injected (contains '/upload/f_auto'), skip
  if (url.includes(`/upload/${transformStr}`) || url.includes('/upload/f_auto')) {
    return url;
  }

  // Insert transforms right after '/upload/' in the URL
  return url.replace('/upload/', `/upload/${transformStr}/`);
}

/**
 * Uploads a base64 or buffer image to Cloudinary.
 * @param file  - base64 data URI or file path
 * @param folder - cloudinary folder (e.g. "products")
 */
export async function uploadImage(
  file: string,
  folder = "products"
): Promise<string> {
  const result = await getCloudinaryClient().uploader.upload(file, {
    folder,
    resource_type: "image",
  });
  return result.secure_url;
}

/**
 * Deletes an image from Cloudinary by its public ID or full URL.
 * @param identifier - public_id or Cloudinary secure_url
 */
export async function deleteImage(identifier: string) {
  let publicId = identifier;

  // If it's a URL, extract the public_id
  if (identifier.startsWith('http')) {

    const parts = identifier.split('/');
    const lastPart = parts.pop() || ""; // sample.jpg
    const folderPart = parts.pop() || ""; // products
    const fileName = lastPart.split('.')[0]; // sample

    if (folderPart !== 'upload' && folderPart !== 'image') {
      publicId = `${folderPart}/${fileName}`;
    } else {
      publicId = fileName;
    }
  }

  console.log(`Deleting Cloudinary image: ${publicId}`);
  return getCloudinaryClient().uploader.destroy(publicId);
}
