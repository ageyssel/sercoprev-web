import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.sercoprev.cl'
  return [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/privacidad`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
