import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/privacidad', '/terminos'],
        disallow: ['/admin', '/dashboard', '/cuenta', '/api'],
      },
    ],
    sitemap: 'https://www.sercoprev.cl/sitemap.xml',
  }
}
