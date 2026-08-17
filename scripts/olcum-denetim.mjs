#!/usr/bin/env node
/**
 * Gözlem kaydını okur — doğrulama ve teşhis için.
 *
 * Panelin gösterdiği sayıların gerçekten yazıldığını görmenin en kısa yolu.
 * Kişisel veri içermez: çıktı yalnızca gün bazında toplulaştırılmış
 * sayaçlardır.
 *
 *   pnpm payload run scripts/gozlem-denetim.mjs
 */

import config from '@payload-config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

const sonuc = await payload.find({
  collection: 'gozlem-gunluk',
  sort: '-gun',
  limit: 7,
  overrideAccess: true,
})

if (sonuc.docs.length === 0) {
  console.log('Henüz kayıt yok.')
  process.exit(0)
}

for (const gun of sonuc.docs) {
  console.log(`\n── ${gun.gun} ────────────────────────────────`)
  console.log(`  toplam istek : ${gun.toplamIstek}`)
  console.log(`  onaylı istek : ${gun.onayliIstek}`)

  const yaz = (baslik, dizi, anahtar, adet = 'adet') => {
    if (!Array.isArray(dizi) || dizi.length === 0) return
    console.log(`  ${baslik}:`)
    for (const satir of dizi.slice(0, 12)) {
      console.log(`     ${String(satir[anahtar]).padEnd(28)} ${satir[adet]}`)
    }
  }

  yaz('sayfalar', gun.sayfalar, 'rota', 'goruntuleme')
  yaz('kaynaklar', gun.kaynaklar, 'alan')
  yaz('utm', gun.utmKaynaklar, 'kaynak')
  yaz('ülkeler', gun.ulkeler, 'kod')
  yaz('cihazlar', gun.cihazlar, 'sinif')
  yaz('olaylar', gun.olaylar, 'ad')
}

process.exit(0)
