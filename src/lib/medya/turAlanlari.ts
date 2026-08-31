import type { Field } from 'payload'

/**
 * 360° tur alanları — Mahalleler ve İlanlar'da ortak.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ YOL VAR VE İKİSİ DE GEREKLİ.
 *
 * 1. **Panorama görseli** — kendi oynatıcımızda (Pannellum) açılıyor.
 *    Dosya bizde, sayfadan çıkılmıyor, üçüncü tarafa hiçbir istek gitmiyor.
 * 2. **Dış servis adresi** — Kuula, Matterport, Google Street View gömme.
 *    Çok noktalı profesyonel turlar bu servislerde üretiliyor ve onları
 *    kendi oynatıcımıza taşımak mümkün değil.
 *
 * ⚠️ İKİSİ BİRDEN DOLUYSA PANORAMA KAZANIR. Sıralamayı belirsiz bırakmak,
 * "hangisi görünüyor?" sorusunun cevabı olmayan bir ekran üretirdi.
 * Gerekçe: panorama bizim dosyamız, dış servis üçüncü tarafa istek
 * demek — eşitlikte kendi barındırdığımız içerik tercih edilir.
 *
 * ⚠️ İKİSİ DE BOŞSA BÖLÜM HİÇ ÇİZİLMEZ. "360° tur yakında" yazan bir kutu,
 * her mahalle sayfasında duran ve hiç dolmayan bir vaat olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Panelde görünen çekim yardımı.
 *
 * ⚠️ BU METİN BİR SÜS DEĞİL. Equirectangular panorama, sıradan bir
 * fotoğraf değil: yanlış en-boy oranıyla yüklenen bir görsel oynatıcıda
 * eğri bir dünya üretiyor ve sebebi hiçbir yerde yazmıyor.
 */
const CEKIM_YARDIMI = [
  'Equirectangular (küresel) panorama gerekiyor — sıradan geniş açı fotoğraf DEĞİL.',
  'En-boy oranı tam 2:1 olmalı (örn. 6000×3000). Farklı oran, oynatıcıda eğri bir dünya üretir.',
  'Önerilen çözünürlük 6000×3000 ile 8000×4000 arası; altı bulanık, üstü mobilde ağır olur.',
  'Biçim: JPEG ya da WebP. Telefonda "Panorama" kipi YETMEZ — 360° kamera ya da',
  'Google Street View uygulamasının "Fotoğraf küresi" özelliği kullanılmalı.',
].join(' ')

export function turAlanlari(baglam: 'mahalle' | 'ilan'): Field[] {
  const konu = baglam === 'mahalle' ? 'Mahallenin ana caddesinden' : 'Taşınmazın içinden'

  return [
    {
      name: 'sanalTurPanoramasi',
      type: 'upload',
      relationTo: 'medya',
      label: '360° panorama görseli',
      admin: {
        description:
          `${konu} çekilmiş küresel panorama. Yüklenirse tur kendi oynatıcımızda açılır ve ` +
          `üçüncü bir servise hiçbir istek gitmez. ${CEKIM_YARDIMI}`,
      },
    },
    {
      name: 'sanalTurUrl',
      type: 'text',
      label: '360° tur adresi (dış servis)',
      admin: {
        description:
          'Kuula, Matterport ya da Google Street View gömme adresi. Tam adres (https://...). ' +
          '⚠️ Yukarıya panorama yüklendiyse O kullanılır; bu alan yedek kalır. ' +
          'İkisi de boşsa tur bölümü hiç gösterilmez.',
      },
    },
  ]
}
