import { withPayload } from '@payloadcms/next/withPayload'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next 16'nın varsayılan derleyicisi Turbopack'tir; bilinçli olarak
  // webpack'e sabitlemiyoruz.
  reactStrictMode: true,

  // Görseller: CLAUDE.md kod standardı gereği AVIF/WebP.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default withPayload(nextConfig)
