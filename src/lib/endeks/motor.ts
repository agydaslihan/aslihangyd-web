/**
 * Endeks hesaplama motoru — tabakalı medyan, sabit ağırlık.
 *
 * Yöntem (ENDEKS-VERI-YONETIMI.md §3):
 *
 *   1. Her katman (mahalle × oda tipi) için o ayın m² fiyat MEDYANI
 *   2. Katmanda 8'den az gözlem varsa önceki ayın değeri TAŞINIR
 *   3. Endeks = Σ(ağırlık × medyan_bu_ay) / Σ(ağırlık × medyan_baz_ay) × 100
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Neden medyan, ortalama değil: medyan aykırı değerlere dirençlidir. Tek bir
 * 71.000 TL/m² gözlemi ortalamayı uçurur, medyanı etkilemez.
 *
 * Neden sabit ağırlık: bileşim yanlılığını öldüren adım budur
 * (ENDEKS-VERI-YONETIMI.md §1, Tuzak 1). Bu ay tesadüfen daha çok lüks daire
 * gözlemlendiyse, ağırlıklar sabit olduğu için endeks fırlamaz. Ağırlıklar
 * gözlem sayısını değil KONUT STOKUNU temsil eder.
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  ASGARI_AGIRLIK_KAPSAMI,
  ASGARI_AY_SAYISI,
  ASGARI_TOPLAM_GOZLEM,
  BAZ_ENDEKS,
  GERCEKLESEN_KAYNAKLAR,
  KATMAN_MINIMUM_GOZLEM,
  type AylikEndeks,
  type EndeksSerisi,
  type Gozlem,
  type KatmanAgirligi,
  type KatmanSonucu,
  type YayinKontrolu,
} from './tipler'

/** Medyan — aykırı değerlere dirençli merkezî eğilim ölçüsü. */
export function medyan(degerler: readonly number[]): number | null {
  const gecerli = degerler.filter((deger) => Number.isFinite(deger)).sort((a, b) => a - b)
  if (gecerli.length === 0) return null

  const orta = Math.floor(gecerli.length / 2)
  return gecerli.length % 2 === 1 ? gecerli[orta]! : (gecerli[orta - 1]! + gecerli[orta]!) / 2
}

function katmanAnahtari(mahalleSlug: string, odaTipi: string): string {
  return `${mahalleSlug}|${odaTipi}`
}

/**
 * Bir seriyi hesaplar.
 *
 * @param gozlemler  Tüm gözlemler (her aya ait).
 * @param agirliklar Sabit sepet ağırlıkları.
 * @param seriTipi   'istenen_fiyat' portal gözlemlerini, 'gerceklesen_fiyat'
 *                   kendi işlem ve meslektaş bilgilerini kullanır. İkisi
 *                   ASLA karıştırılmaz.
 */
export function endeksHesapla(
  gozlemler: readonly Gozlem[],
  agirliklar: readonly KatmanAgirligi[],
  seriTipi: EndeksSerisi['seriTipi'] = 'istenen_fiyat',
): EndeksSerisi | null {
  const ilgili = gozlemler.filter((gozlem) => {
    const gerceklesen = GERCEKLESEN_KAYNAKLAR.includes(gozlem.kaynak)
    return seriTipi === 'gerceklesen_fiyat' ? gerceklesen : !gerceklesen
  })

  const aylar = [...new Set(ilgili.map((gozlem) => gozlem.ay))].sort()
  if (aylar.length === 0 || agirliklar.length === 0) return null

  const bazAy = aylar[0]!

  // Katman → ay → medyan. Taşıma için önceki ayın değerine ihtiyaç var.
  const oncekiMedyanlar = new Map<string, number>()
  const sonuclar: AylikEndeks[] = []

  for (const ay of aylar) {
    const ayinGozlemleri = ilgili.filter((gozlem) => gozlem.ay === ay)
    const katmanlar: KatmanSonucu[] = []
    let tasinanSayisi = 0

    for (const agirlik of agirliklar) {
      const anahtar = katmanAnahtari(agirlik.mahalleSlug, agirlik.odaTipi)

      const katmanGozlemleri = ayinGozlemleri.filter(
        (gozlem) =>
          gozlem.mahalleSlug === agirlik.mahalleSlug && gozlem.odaTipi === agirlik.odaTipi,
      )

      let medyanDeger: number | null
      let tasindi = false

      if (katmanGozlemleri.length >= KATMAN_MINIMUM_GOZLEM) {
        medyanDeger = medyan(katmanGozlemleri.map((gozlem) => gozlem.m2Fiyati))
        if (medyanDeger !== null) oncekiMedyanlar.set(anahtar, medyanDeger)
      } else {
        // ⚠️ Eşik tutmadı: UYDURMA YAPILMAZ, önceki ayın değeri taşınır ve
        // bu açıkça işaretlenir. (ENDEKS-VERI-YONETIMI.md §3.3, Adım 2)
        medyanDeger = oncekiMedyanlar.get(anahtar) ?? null
        tasindi = medyanDeger !== null
        if (tasindi) tasinanSayisi += 1
      }

      katmanlar.push({
        mahalleSlug: agirlik.mahalleSlug,
        odaTipi: agirlik.odaTipi,
        agirlik: agirlik.agirlik,
        medyan: medyanDeger,
        gozlemSayisi: katmanGozlemleri.length,
        tasindi,
      })
    }

    const kapsananAgirlik = katmanlar
      .filter((katman) => katman.medyan !== null)
      .reduce((toplam, katman) => toplam + katman.agirlik, 0)

    sonuclar.push({
      ay,
      endeks: null, // Baz ay hesaplandıktan sonra doldurulur.
      toplamGozlem: ayinGozlemleri.length,
      katmanlar,
      tasinanKatmanSayisi: tasinanSayisi,
      kapsananAgirlik,
    })
  }

  // ── Endeks değerleri ──
  const bazAyKaydi = sonuclar[0]!
  const bazPaydasi = agirlikliToplam(bazAyKaydi.katmanlar)

  if (bazPaydasi === null || bazPaydasi === 0) return null

  for (const aylik of sonuclar) {
    const pay = agirlikliToplam(aylik.katmanlar)
    aylik.endeks = pay === null ? null : yuvarla((pay / bazPaydasi) * BAZ_ENDEKS)
  }

  return { bazAy, aylar: sonuclar, seriTipi }
}

/**
 * Ağırlıklı toplam.
 *
 * Medyanı olmayan katmanlar hem paydan hem ağırlık toplamından çıkarılır ve
 * kalan ağırlıklar yeniden normalize edilir. Aksi halde bir katmanın veri
 * kaybı, endeksi olduğundan düşük gösterirdi.
 */
function agirlikliToplam(katmanlar: readonly KatmanSonucu[]): number | null {
  const gecerli = katmanlar.filter((katman) => katman.medyan !== null)
  if (gecerli.length === 0) return null

  const agirlikToplami = gecerli.reduce((toplam, katman) => toplam + katman.agirlik, 0)
  if (agirlikToplami === 0) return null

  const pay = gecerli.reduce(
    (toplam, katman) => toplam + katman.agirlik * (katman.medyan as number),
    0,
  )

  return pay / agirlikToplami
}

function yuvarla(deger: number): number {
  return Math.round(deger * 100) / 100
}

/**
 * Reel (enflasyondan arındırılmış) endeks.
 *
 * Reel_t = (Nominal_t / TÜFE_t) × TÜFE_baz
 *
 * ⚠️ TÜFE değerleri dışarıdan verilir; sistemde tutulmaz. Aylık yayınlanan
 * resmî bir seridir ve eskimiş bir değer yanlış reel getiri üretir.
 */
export function reelEndeksHesapla(
  nominalEndeks: number,
  tufeCari: number,
  tufeBaz: number,
): number | null {
  if (!Number.isFinite(tufeCari) || !Number.isFinite(tufeBaz)) return null
  if (tufeCari <= 0 || tufeBaz <= 0) return null

  return yuvarla((nominalEndeks / tufeCari) * tufeBaz)
}

/**
 * Kira çarpanı serisi = ortalama fiyat / (ortalama aylık kira × 12)
 *
 * ENDEKS-VERI-YONETIMI.md §3.4: yatırımcı için en değerli ve en kolay
 * anlaşılan seri budur.
 */
export function kiraCarpaniSerisi(
  satilikSeri: EndeksSerisi | null,
  kiralikSeri: EndeksSerisi | null,
  gozlemler: readonly Gozlem[],
): { ay: string; carpan: number | null; gozlemSayisi: number }[] {
  if (!satilikSeri || !kiralikSeri) return []

  const aylar = [...new Set(satilikSeri.aylar.map((aylik) => aylik.ay))].sort()

  return aylar.map((ay) => {
    const satislar = gozlemler.filter((gozlem) => gozlem.ay === ay && gozlem.tip === 'satilik')
    const kiralar = gozlemler.filter((gozlem) => gozlem.ay === ay && gozlem.tip === 'kiralik')

    const satisMedyani = medyan(satislar.map((gozlem) => gozlem.m2Fiyati))
    const kiraMedyani = medyan(kiralar.map((gozlem) => gozlem.m2Fiyati))

    const carpan =
      satisMedyani !== null && kiraMedyani !== null && kiraMedyani > 0
        ? yuvarla(satisMedyani / (kiraMedyani * 12))
        : null

    return { ay, carpan, gozlemSayisi: satislar.length + kiralar.length }
  })
}

/**
 * Yayın kontrolü — /endeks sayfası açılabilir mi?
 *
 * ⚠️ Bu kontrol KODA GÖMÜLÜDÜR ve "bir ay erken açalım" cazibesine karşı
 * duran tek şeydir (ENDEKS-VERI-YONETIMI.md §5). Gevşetilmemelidir.
 */
export function yayinKontrolu(
  gozlemler: readonly Gozlem[],
  agirliklar: readonly KatmanAgirligi[],
  metodolojiYayinda: boolean,
): YayinKontrolu {
  const engeller: string[] = []
  const saglananlar: string[] = []

  const aylar = [...new Set(gozlemler.map((gozlem) => gozlem.ay))]
  if (aylar.length < ASGARI_AY_SAYISI) {
    engeller.push(`En az ${ASGARI_AY_SAYISI} tam ay veri gerekiyor (şu an ${aylar.length} ay).`)
  } else {
    saglananlar.push(`${aylar.length} ay veri toplandı.`)
  }

  if (gozlemler.length < ASGARI_TOPLAM_GOZLEM) {
    engeller.push(
      `Toplam en az ${ASGARI_TOPLAM_GOZLEM} gözlem gerekiyor (şu an ${gozlemler.length}).`,
    )
  } else {
    saglananlar.push(`${gozlemler.length} gözlem kaydedildi.`)
  }

  // Ağırlığı %70'i kapsayan katmanlarda ay başına ≥8 gözlem şartı.
  const kapsam = agirlikKapsamiHesapla(gozlemler, agirliklar, aylar)
  if (kapsam < ASGARI_AGIRLIK_KAPSAMI) {
    engeller.push(
      `Sepet ağırlığının en az %${Math.round(ASGARI_AGIRLIK_KAPSAMI * 100)}'ini kapsayan ` +
        `katmanlarda her ay ${KATMAN_MINIMUM_GOZLEM} gözlem olmalı ` +
        `(şu an %${Math.round(kapsam * 100)}).`,
    )
  } else {
    saglananlar.push(`Ağırlık kapsamı %${Math.round(kapsam * 100)}.`)
  }

  if (!metodolojiYayinda) {
    engeller.push('Metodoloji sayfası henüz yayınlanmadı.')
  } else {
    saglananlar.push('Metodoloji sayfası yayında.')
  }

  return { yayinlanabilir: engeller.length === 0, engeller, saglananlar }
}

/**
 * Eşiği TÜM aylarda tutturan katmanların ağırlık toplamı.
 *
 * "Her ay" şartı bilinçli: bir katman yalnızca son ay eşiği tutturuyorsa
 * seri boyunca taşınan değerlerle dolu olur ve endeks anlamını yitirir.
 */
function agirlikKapsamiHesapla(
  gozlemler: readonly Gozlem[],
  agirliklar: readonly KatmanAgirligi[],
  aylar: readonly string[],
): number {
  if (aylar.length === 0 || agirliklar.length === 0) return 0

  let kapsanan = 0

  for (const agirlik of agirliklar) {
    const hepsindeYeterli = aylar.every((ay) => {
      const sayi = gozlemler.filter(
        (gozlem) =>
          gozlem.ay === ay &&
          gozlem.mahalleSlug === agirlik.mahalleSlug &&
          gozlem.odaTipi === agirlik.odaTipi,
      ).length
      return sayi >= KATMAN_MINIMUM_GOZLEM
    })

    if (hepsindeYeterli) kapsanan += agirlik.agirlik
  }

  const toplamAgirlik = agirliklar.reduce((toplam, agirlik) => toplam + agirlik.agirlik, 0)
  return toplamAgirlik === 0 ? 0 : kapsanan / toplamAgirlik
}
