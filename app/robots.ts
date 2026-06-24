import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy', '/terms', '/intake/', '/order/'],
        disallow: [
          '/dashboard',
          '/customers',
          '/projects',
          '/messages',
          '/notifications',
          '/settings',
          '/billing',
          '/team',
          '/templates',
          '/api/',
          '/onboarding',
          '/invite/',
          '/p/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
