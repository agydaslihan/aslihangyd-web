import { withPayload } from '@payloadcms/next/withPayload'

import type { NextConfig } from 'next'

/**
 * Geliştirme sunucusuna hangi kaynaklardan erişilebileceği.
 *
 * ⚠️ Yerel ağdan (telefon, tablet, başka makine) `pnpm dev`e bağlanınca
 * Next istemci paketlerini reddeder: sunucu 200 döner ama sayfa BEYAZ
 * kalır. Sebep, Next 16'nın çapraz kaynak geliştirme isteklerini
 * varsayılan olarak engellemesi.
 *
 * Adres KODA GÖMÜLMÜYOR: her geliştiricinin yerel ağ adresi farklı ve
 * birinin IP'sini depoya yazmak diğerlerini kırar. `.env` içinde virgülle
 * ayrılmış liste tutulur:
 *
 *   DEV_IZINLI_KAYNAKLAR=192.168.1.113,192.168.1.50
 *
 * Yalnızca geliştirmede etkilidir; üretim derlemesinde okunmaz.
 */
function izinliGelistirmeKaynaklari(): string[] {
  const kaynaklar = (process.env.DEV_IZINLI_KAYNAKLAR ?? '')
    .split(',')
    .map((parca) => parca.trim())
    .filter((parca) => parca !== '')

  /**
   * ⚠️ Sessiz başarısızlık uyarısı.
   *
   * Liste boşken yerel ağ istekleri yine reddedilir ve sayfa beyaz açılır —
   * sunucu 200 döndüğü için hata da görünmez. Teşhisi en zor arıza türü.
   * Değişkeni ayarlamayı unutan kişi en azından terminalde sebebini görsün.
   */
  if (process.env.NODE_ENV === 'development' && kaynaklar.length === 0) {
    console.warn(
      '\n⚠️  DEV_IZINLI_KAYNAKLAR tanımlı değil.\n' +
        '   Yerel ağdan bağlanırsan (telefon, tablet) sayfa BEYAZ açılır.\n' +
        '   Çözüm: .env dosyasına ekle →  DEV_IZINLI_KAYNAKLAR=192.168.1.113\n',
    )
  }

  return kaynaklar
}

const nextConfig: NextConfig = {
  allowedDevOrigins: izinliGelistirmeKaynaklari(),
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
