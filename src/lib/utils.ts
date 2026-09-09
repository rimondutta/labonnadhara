import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Injects Cloudinary's f_auto and q_auto transformations into a URL so that
 * Cloudinary automatically serves the best format (WebP/AVIF) and compresses
 * the image optimally. Safe to call in both server and client components.
 *
 * - f_auto  → delivers WebP/AVIF to supported browsers (~30-50% savings)
 * - q_auto  → auto-compresses without perceptible quality loss
 * - w_{n}   → optional resize to a target display width
 *
 * @param url   Raw Cloudinary secure_url or any other URL
 * @param opts  { width?: number } — optional pixel width
 */
export function getOptimizedCloudinaryUrl(
  url: string | null | undefined,
  opts: { width?: number } = {}
): string {
  if (!url || !url.includes("res.cloudinary.com")) return url || "";

  const transforms = ["f_auto", "q_auto"];
  if (opts.width) transforms.push(`w_${opts.width}`);
  const transformStr = transforms.join(",");

  // Skip if already optimised
  if (url.includes("/upload/f_auto")) return url;

  return url.replace("/upload/", `/upload/${transformStr}/`);
}
