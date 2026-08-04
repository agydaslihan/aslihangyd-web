#!/usr/bin/env node
/**
 * Lighthouse JSON raporlarını okunabilir bir Markdown tablosuna çevirir.
 *
 * CI iş özetinde (GITHUB_STEP_SUMMARY) görünür — böylece skorları görmek
 * için rapor dosyasını indirmek gerekmez.
 *
 * Hedefler CLAUDE.md'den: Performans ≥90, SEO ≥95, Erişilebilirlik ≥95,
 * LCP < 2.5s, CLS < 0.1, INP < 200ms.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const HEDEFLER = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 95,
}

const dizin = process.argv[2]
if (!dizin) {
  console.error('Kullanım: lighthouse-ozet.mjs <rapor-dizini>')
  process.exit(1)
}

let dosyalar = []
try {
  dosyalar = readdirSync(dizin).filter((ad) => ad.endsWith('.report.json'))
} catch {
  console.log('## Lighthouse\n\nRapor dizini okunamadı.')
  process.exit(0)
}

if (dosyalar.length === 0) {
  console.log('## Lighthouse\n\nRapor üretilemedi.')
  process.exit(0)
}

console.log('## Lighthouse ölçümü\n')
console.log('| Sayfa | Performans | Erişilebilirlik | En iyi uygulamalar | SEO |')
console.log('| --- | --- | --- | --- | --- |')

const ayrintilar = []

for (const dosya of dosyalar.sort()) {
  let rapor
  try {
    rapor = JSON.parse(readFileSync(join(dizin, dosya), 'utf8'))
  } catch {
    continue
  }

  const sayfa = dosya.replace('.report.json', '')
  const hucreler = Object.keys(HEDEFLER).map((anahtar) => {
    const puan = rapor.categories?.[anahtar]?.score
    if (typeof puan !== 'number') return '—'
    const yuzde = Math.round(puan * 100)
    return `${yuzde >= HEDEFLER[anahtar] ? '✅' : '⚠️'} ${yuzde}`
  })

  console.log(`| \`${sayfa}\` | ${hucreler.join(' | ')} |`)

  const olcumler = rapor.audits ?? {}
  ayrintilar.push({
    sayfa,
    lcp: olcumler['largest-contentful-paint']?.displayValue ?? '—',
    cls: olcumler['cumulative-layout-shift']?.displayValue ?? '—',
    tbt: olcumler['total-blocking-time']?.displayValue ?? '—',
  })
}

console.log('\n### Core Web Vitals\n')
console.log('| Sayfa | LCP (hedef < 2,5 sn) | CLS (hedef < 0,1) | TBT |')
console.log('| --- | --- | --- | --- |')
for (const kayit of ayrintilar) {
  console.log(`| \`${kayit.sayfa}\` | ${kayit.lcp} | ${kayit.cls} | ${kayit.tbt} |`)
}

console.log(
  '\n> Ölçüm demo veriyle ve gerçek görseller olmadan yapıldı; ' +
    'yayına girecek halin skorları farklı olacaktır.',
)
