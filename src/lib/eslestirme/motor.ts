import {
  OLCUT_ACIKLAMALARI,
  OLCUT_ETIKETLERI,
  type EslestirmeSonucu,
  type MahalleEslesmesi,
  type MahalleProfili,
  type OlcutAdi,
  type OlcutKirilimi,
  type TestCevaplari,
} from './tipler'

/**
 * Mahalle eşleştirme motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KARA KUTU YOK
 *
 * Bu araç bir ziyaretçiye "size Şeyhsinan uygun" diyor. Gerekçesi
 * gösterilmezse bu, en iyi ihtimalle boş bir iddia, en kötü ihtimalle
 * portföyümüzü öne çıkarmanın örtülü bir yolu olur.
 *
 * Bu yüzden motor üç şeyi birden döndürür:
 *  1. Uyum yüzdesi
 *  2. Hangi ölçütün kaç puan aldığı
 *  3. **O testte hangi ölçüte kaç ağırlık verildiği** — cevaplara göre
 *     değişen ağırlıklar dahil
 *
 * Ayrıca eşleştirme, mahallelerin portföyümüzdeki ilan sayısından
 * TAMAMEN bağımsızdır. Skorlamaya portföy girmez.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Amaca göre temel ağırlıklar.
 *
 * Toplamları 100 olmak zorunda değil; cevap düzeltmelerinden sonra
 * normalize ediliyor. Buradaki rakamlar Çorlu'ya özgü bir ölçüm değil,
 * aracın ilan ettiği metodolojidir ve yayınlanır.
 */
const TEMEL_AGIRLIKLAR: Record<'oturmak' | 'yatirim', Record<OlcutAdi, number>> = {
  oturmak: {
    yatirimPotansiyeli: 5,
    sanayiYakinligi: 5,
    ulasim: 15,
    topluTasima: 5,
    sosyalDonati: 25,
    okulErisimi: 5,
    sessizlik: 15,
    merkezeYakinlik: 10,
    erisilebilirlik: 15,
  },
  yatirim: {
    yatirimPotansiyeli: 30,
    sanayiYakinligi: 20,
    ulasim: 15,
    topluTasima: 5,
    sosyalDonati: 10,
    okulErisimi: 0,
    sessizlik: 0,
    merkezeYakinlik: 5,
    erisilebilirlik: 15,
  },
}

/** Cevaplara göre uygulanan ağırlık düzeltmeleri. Toplamsaldır. */
const DUZELTMELER = {
  /** Hanede çocuk varsa okul erişimi belirleyici hale gelir. */
  cocukVar: { okulErisimi: 15, sosyalDonati: 5 },
  /** Araç kullanmıyorsa toplu taşıma ve merkeze yakınlık öne çıkar. */
  aracYok: { topluTasima: 15, merkezeYakinlik: 5 },
  /** Araç kullanıyorsa toplu taşımanın önemi düşer, ana artere erişim artar. */
  aracVar: { topluTasima: -5, ulasim: 5 },
  sessizlikOnceligi: { sessizlik: 15, merkezeYakinlik: -5 },
  merkezOnceligi: { merkezeYakinlik: 15, sessizlik: -5 },
} as const

/**
 * Eşleşme üretmek için gereken asgari ölçüt kapsamı.
 *
 * Yatırım skorundaki %70 eşiğiyle aynı mantık: yarım veriyle "%89 uyum"
 * demek, uyum yüzdesini değersizleştirir.
 */
export const ASGARI_KAPSAM = 0.6

/** Sonuçta gösterilen mahalle sayısı. */
export const ONERI_SAYISI = 3

/** Hedef noktaya yakınlıkta tam puan alınan ve puanın sıfırlandığı mesafeler. */
const HEDEF_IDEAL_METRE = 1_500
const HEDEF_AZAMI_METRE = 12_000

export function mahalleEslestir(
  cevaplar: TestCevaplari,
  mahalleler: readonly MahalleProfili[],
): EslestirmeSonucu {
  const eksikCevaplar: string[] = []
  if (cevaplar.amac === null || cevaplar.amac === undefined) {
    eksikCevaplar.push('Aradığınız şey (oturmak / yatırım)')
  }
  if (eksikCevaplar.length > 0) return { durum: 'cevap_eksik', eksikler: eksikCevaplar }

  if (mahalleler.length === 0) {
    return { durum: 'yetersiz_veri', degerlendirilenMahalle: 0, eksikOlcutler: [] }
  }

  const agirliklar = agirliklariHesapla(cevaplar)
  const erisilebilirlikPuanlari = erisilebilirlikHesapla(cevaplar.butce, mahalleler)
  const hedefYakinlikPuanlari = hedefYakinligiHesapla(mahalleler)

  const eslesmeler: MahalleEslesmesi[] = []
  const tumEksikler = new Set<string>()

  for (const mahalle of mahalleler) {
    const kirilim: OlcutKirilimi[] = []
    const eksikOlcutler: string[] = []
    let mevcutAgirlik = 0
    let agirlikliToplam = 0

    for (const olcut of Object.keys(agirliklar) as OlcutAdi[]) {
      const agirlik = agirliklar[olcut]
      // Ağırlığı sıfırlanmış ölçüt kırılımda gösterilmez; kullanıcıya
      // "bu testte bunun önemi yoktu" demek yeterli, satır kalabalığı değil.
      if (agirlik <= 0) continue

      const puan = olcutPuani(olcut, mahalle, erisilebilirlikPuanlari, hedefYakinlikPuanlari)

      if (puan === null) {
        eksikOlcutler.push(OLCUT_ETIKETLERI[olcut])
        tumEksikler.add(OLCUT_ETIKETLERI[olcut])
      } else {
        mevcutAgirlik += agirlik
        agirlikliToplam += puan * agirlik
      }

      kirilim.push({
        olcut,
        etiket: OLCUT_ETIKETLERI[olcut],
        aciklama: OLCUT_ACIKLAMALARI[olcut],
        agirlik,
        puan,
        katki: puan === null ? 0 : Math.round(((puan * agirlik) / 100) * 10) / 10,
      })
    }

    const toplamAgirlik = kirilim.reduce((t, k) => t + k.agirlik, 0)
    const kapsam = toplamAgirlik > 0 ? mevcutAgirlik / toplamAgirlik : 0

    // ⚠️ Yetersiz veriyle uyum yüzdesi üretilmiyor. Eksik ölçütü sıfır
    // saymak mahalleyi haksız cezalandırır; ortalama saymak veri uydurmaktır.
    if (kapsam < ASGARI_KAPSAM) continue

    eslesmeler.push({
      slug: mahalle.slug,
      ad: mahalle.ad,
      // Mevcut ölçütler kendi içinde normalize edilir; eksik ölçüt uyumu
      // orantısız düşürmez ama kapsam kullanıcıya gösterilir.
      uyum: Math.round(agirlikliToplam / mevcutAgirlik),
      kirilim,
      kapsam,
      eksikOlcutler,
      butceyleAlinabilirM2: butceyleAlinabilirM2(cevaplar.butce, mahalle.ortalamaM2Satis),
    })
  }

  if (eslesmeler.length === 0) {
    return {
      durum: 'yetersiz_veri',
      degerlendirilenMahalle: mahalleler.length,
      eksikOlcutler: [...tumEksikler],
    }
  }

  eslesmeler.sort((a, b) => b.uyum - a.uyum || a.ad.localeCompare(b.ad, 'tr'))

  return {
    durum: 'eslesti',
    eslesmeler: eslesmeler.slice(0, ONERI_SAYISI),
    agirliklar: agirliklariKirilimaCevir(agirliklar),
  }
}

/**
 * Cevaplara göre nihai ağırlıklar.
 *
 * Sonuç ekranında aynen gösterilir — kullanıcı hangi ölçüte neden ağırlık
 * verildiğini görebilmeli.
 */
export function agirliklariHesapla(cevaplar: TestCevaplari): Record<OlcutAdi, number> {
  const amac = cevaplar.amac ?? 'ikisi'

  // "İkisi" seçildiğinde iki profilin ortalaması alınır; ayrı bir üçüncü
  // ağırlık tablosu uydurmak, ilan edilen metodolojiyi karmaşıklaştırırdı.
  const temel: Record<OlcutAdi, number> =
    amac === 'ikisi'
      ? (Object.fromEntries(
          (Object.keys(TEMEL_AGIRLIKLAR.oturmak) as OlcutAdi[]).map((olcut) => [
            olcut,
            (TEMEL_AGIRLIKLAR.oturmak[olcut] + TEMEL_AGIRLIKLAR.yatirim[olcut]) / 2,
          ]),
        ) as Record<OlcutAdi, number>)
      : { ...TEMEL_AGIRLIKLAR[amac] }

  const uygula = (duzeltme: Partial<Record<OlcutAdi, number>>): void => {
    for (const [olcut, fark] of Object.entries(duzeltme) as [OlcutAdi, number][]) {
      temel[olcut] = Math.max(temel[olcut] + fark, 0)
    }
  }

  if (cevaplar.cocukVar === true) uygula(DUZELTMELER.cocukVar)
  if (cevaplar.aracKullaniyor === false) uygula(DUZELTMELER.aracYok)
  if (cevaplar.aracKullaniyor === true) uygula(DUZELTMELER.aracVar)
  if (cevaplar.oncelik === 'sessizlik') uygula(DUZELTMELER.sessizlikOnceligi)
  if (cevaplar.oncelik === 'merkez') uygula(DUZELTMELER.merkezOnceligi)

  // Bütçe girilmediyse bütçe uygunluğu ölçütü hiç hesaba katılmaz.
  if (typeof cevaplar.butce !== 'number' || !Number.isFinite(cevaplar.butce)) {
    temel.erisilebilirlik = 0
  }

  // Toplam 100'e normalize edilir; yüzdeler kullanıcıya böyle gösterilir.
  const toplam = Object.values(temel).reduce((t, a) => t + a, 0)
  if (toplam <= 0) return temel

  for (const olcut of Object.keys(temel) as OlcutAdi[]) {
    temel[olcut] = Math.round((temel[olcut] / toplam) * 1000) / 10
  }

  return temel
}

function agirliklariKirilimaCevir(agirliklar: Record<OlcutAdi, number>): OlcutKirilimi[] {
  return (Object.keys(agirliklar) as OlcutAdi[])
    .filter((olcut) => agirliklar[olcut] > 0)
    .sort((a, b) => agirliklar[b] - agirliklar[a])
    .map((olcut) => ({
      olcut,
      etiket: OLCUT_ETIKETLERI[olcut],
      aciklama: OLCUT_ACIKLAMALARI[olcut],
      agirlik: agirliklar[olcut],
      puan: null,
      katki: 0,
    }))
}

function olcutPuani(
  olcut: OlcutAdi,
  mahalle: MahalleProfili,
  erisilebilirlik: Map<string, number>,
  hedefYakinlik: Map<string, number>,
): number | null {
  if (olcut === 'erisilebilirlik') return erisilebilirlik.get(mahalle.slug) ?? null

  const ham = mahalle.ozellikler[olcut]
  if (typeof ham !== 'number' || !Number.isFinite(ham)) return null

  const puan = Math.min(Math.max(ham, 0), 100)

  // Hedef nokta seçildiyse ulaşım puanı o noktaya olan gerçek mesafeyle
  // harmanlanır: "ulaşım iyi" genel bir yargı, "işinize yakın" kişiseldir.
  const yakinlik = hedefYakinlik.get(mahalle.slug)
  if (olcut === 'ulasim' && yakinlik !== undefined) {
    return Math.round(puan * 0.4 + yakinlik * 0.6)
  }

  return puan
}

/**
 * Bütçe uygunluğu puanı.
 *
 * ⚠️ Mutlak bir eşik ("70 m² altı yetersizdir") KULLANILMIYOR: böyle bir
 * eşik bizim uydurduğumuz bir yaşam standardı olurdu. Bunun yerine
 * karşılaştırmalı puanlama yapılıyor — bütçeyle en çok m² alınabilen
 * mahalle 100 puan, diğerleri ona oranla puanlanır. Kullanılan tek veri
 * mahallelerin gerçek m² fiyatları.
 */
function erisilebilirlikHesapla(
  butce: number | null | undefined,
  mahalleler: readonly MahalleProfili[],
): Map<string, number> {
  const puanlar = new Map<string, number>()
  if (typeof butce !== 'number' || !Number.isFinite(butce) || butce <= 0) return puanlar

  const alinabilir = new Map<string, number>()
  for (const mahalle of mahalleler) {
    const m2Fiyat = mahalle.ortalamaM2Satis
    if (typeof m2Fiyat === 'number' && Number.isFinite(m2Fiyat) && m2Fiyat > 0) {
      alinabilir.set(mahalle.slug, butce / m2Fiyat)
    }
  }

  const enYuksek = Math.max(...alinabilir.values())
  if (!Number.isFinite(enYuksek) || enYuksek <= 0) return puanlar

  for (const [slug, m2] of alinabilir) {
    puanlar.set(slug, Math.round((m2 / enYuksek) * 100))
  }

  return puanlar
}

/** Hedef noktaya mesafeden 0–100 yakınlık puanı. */
function hedefYakinligiHesapla(mahalleler: readonly MahalleProfili[]): Map<string, number> {
  const puanlar = new Map<string, number>()

  for (const mahalle of mahalleler) {
    const metre = mahalle.hedefeMesafe
    if (typeof metre !== 'number' || !Number.isFinite(metre) || metre < 0) continue

    if (metre <= HEDEF_IDEAL_METRE) {
      puanlar.set(mahalle.slug, 100)
    } else if (metre >= HEDEF_AZAMI_METRE) {
      puanlar.set(mahalle.slug, 0)
    } else {
      puanlar.set(
        mahalle.slug,
        Math.round(((HEDEF_AZAMI_METRE - metre) / (HEDEF_AZAMI_METRE - HEDEF_IDEAL_METRE)) * 100),
      )
    }
  }

  return puanlar
}

function butceyleAlinabilirM2(
  butce: number | null | undefined,
  m2Fiyat: number | null | undefined,
): number | null {
  if (typeof butce !== 'number' || !Number.isFinite(butce) || butce <= 0) return null
  if (typeof m2Fiyat !== 'number' || !Number.isFinite(m2Fiyat) || m2Fiyat <= 0) return null
  return Math.round(butce / m2Fiyat)
}

/**
 * İki nokta arasındaki kuş uçuşu mesafe (metre) — haversine.
 *
 * ⚠️ Kuş uçuşu, sürüş mesafesi değildir; arayüzde böyle etiketlenir.
 * Gerçek sürüş süresi için yol ağı verisi gerekir ve elimizde yok.
 * "12 dakika" demek, bilmediğimiz bir şeyi iddia etmek olurdu.
 */
export function kusUcusuMesafe(
  a: { boylam: number; enlem: number },
  b: { boylam: number; enlem: number },
): number {
  const DUNYA_YARICAPI = 6_371_000
  const radyan = (derece: number): number => (derece * Math.PI) / 180

  const dEnlem = radyan(b.enlem - a.enlem)
  const dBoylam = radyan(b.boylam - a.boylam)

  const h =
    Math.sin(dEnlem / 2) ** 2 +
    Math.cos(radyan(a.enlem)) * Math.cos(radyan(b.enlem)) * Math.sin(dBoylam / 2) ** 2

  return Math.round(2 * DUNYA_YARICAPI * Math.asin(Math.min(Math.sqrt(h), 1)))
}
