#!/usr/bin/env node
/**
 * Alan adı sağlığını elle sorgular — teşhis ve doğrulama için.
 *
 *   pnpm payload run scripts/alan-denetim.mjs
 *
 * Bakım görevinin yaptığı işin aynısını yapar ama hiçbir şey YAZMAZ.
 */
import { alaniDegerlendir } from '../src/lib/alan/degerlendirme.ts'
import { alaniSorgula } from '../src/lib/alan/sorgu.ts'

const sorgu = await alaniSorgula()
if (sorgu === null) {
  console.error('SITE_ADRESI okunamadı; alan adı belirlenemiyor.')
  process.exit(1)
}

const sonuc = alaniDegerlendir(sorgu)

console.log(`\nAlan adı   : ${sorgu.alan}`)
console.log(`Sağlık     : ${sonuc.saglik.toUpperCase()}`)
console.log(`Özet       : ${sonuc.ozet}`)
console.log(`Ne yapmalı : ${sonuc.eylem}`)
console.log(`Durumlar   : ${(sorgu.durumlar ?? []).join(', ') || '(okunamadı)'}`)
console.log(`Bitiş      : ${sorgu.bitisTarihi ?? '(okunamadı)'}  → ${sonuc.kalanGun ?? '?'} gün`)
console.log(
  `Dış DNS    : ${
    sorgu.cozumleme === null
      ? '(hiçbir çözümleyiciye ulaşılamadı)'
      : Object.entries(sorgu.cozumleme)
          .map(([ad, bulundu]) => `${ad}=${bulundu ? 'çözülüyor' : 'ÇÖZÜLMÜYOR'}`)
          .join('  ')
  }`,
)
if (sorgu.hata) console.log(`RDAP hatası: ${sorgu.hata}`)
process.exit(0)
