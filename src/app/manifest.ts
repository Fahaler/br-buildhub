import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BR BuildHub · пульт заказов',
    short_name: 'BuildHub',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0e0c',
    theme_color: '#0f0e0c',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
