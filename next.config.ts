import { withPayload } from '@payloadcms/next/withPayload'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next 16'nın varsayılan derleyicisi Turbopack'tir; bilinçli olarak
  // webpack'e sabitlemiyoruz.
  reactStrictMode: true,

  // Üretim imajı için: yalnızca gerçekten kullanılan modülleri içeren
  // bağımsız bir çıktı üretir. node_modules'ün tamamını taşımak, 3.2 GB
  // RAM'li sunucuda imaj boyutu ve disk açısından savunulamaz.
  output: 'standalone',

  // Görseller: CLAUDE.md kod standardı gereği AVIF/WebP.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default withPayload(nextConfig)
