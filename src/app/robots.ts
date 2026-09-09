import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://toyhourse.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout/success', '/account'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
