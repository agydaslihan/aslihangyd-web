/**
 * Ölçek hatası tespiti — binlik ayırıcı tuzağı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KÖK NEDEN: PAYLOAD'IN SAYI ALANI BİR `<input type="number">`.
 *
 * Tarayıcı bu alanda noktayı ONDALIK ayırıcı sayar. Türkçe yazan biri
 * "39.704" yazdığında niyeti otuz dokuz bin yedi yüz dört; alanın
 * anladığı otuz dokuz tam yedi yüz dört binde. Hata sessiz: alan kabul
 * eder, kayıt oluşur, hiçbir uyarı çıkmaz.
 *
 * 31 Ağustos 2026'da üretimde ölçüldü — Alipaşa'nın üç rakamı da bindebir:
 *
 *     ortalamaM2Satis  39,704   (olması gereken ~39 704)
 *     ortalamaKira     21,302   (olması gereken ~21 302)
 *     nufus            10,918   (olması gereken ~10 918)
 *     ilan #2 aidat     2,55    (olması gereken ~2 550)
 *
 * ⚠️ CSV İÇE AKTARMA BU HATAYI YAPMIYOR. `lib/csv/ayristir.ts` "39.704"ü
 * doğru okuyor (son grup üç haneli → binlik ayırıcı). Sorun yalnızca
 * panelin sayı alanında; kayıtların tarihi de bunu doğruluyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type OlcekAlani =
  'ortalamaM2Satis' | 'ortalamaKira' | 'nufus' | 'fiyat' | 'tahminiKira' | 'aidat'

export interface OlcekKurali {
  alan: OlcekAlani
  etiket: string
  /** Bu değerin altı şüpheli. */
  asgari: number
  birim: string
  /** Alan tam sayı olmak zorunda mı? */
  tamsayi: boolean
}

/**
 * Eşikler — talimattan.
 *
 * ⚠️ BUNLAR "GEÇERSİZ" SINIRI DEĞİL, "ŞÜPHELİ" SINIRI. Çorlu'da 900 ₺/m²
 * bir arsa gerçekten olabilir; kırsal bir mahallenin nüfusu 90 olabilir.
 * Hiçbiri engellenmiyor.
 */
export const OLCEK_KURALLARI: readonly OlcekKurali[] = [
  {
    alan: 'ortalamaM2Satis',
    etiket: 'Ortalama m² satış',
    asgari: 1_000,
    birim: '₺/m²',
    tamsayi: false,
  },
  {
    alan: 'ortalamaKira',
    etiket: 'Ortalama aylık kira',
    asgari: 1_000,
    birim: '₺',
    tamsayi: false,
  },
  { alan: 'nufus', etiket: 'Nüfus', asgari: 100, birim: 'kişi', tamsayi: true },
  { alan: 'fiyat', etiket: 'Fiyat', asgari: 1_000, birim: '₺', tamsayi: false },
  { alan: 'tahminiKira', etiket: 'Tahmini aylık kira', asgari: 1_000, birim: '₺', tamsayi: false },
  { alan: 'aidat', etiket: 'Aidat', asgari: 100, birim: '₺/ay', tamsayi: false },
]

export type OlcekIsareti = 'ondalik_izi' | 'cok_kucuk'

export interface OlcekSuphesi {
  alan: OlcekAlani
  etiket: string
  deger: number
  /** 1000 ile çarpılmış hâli — önerilen düzeltme. */
  onerilen: number
  isaretler: OlcekIsareti[]
  mesaj: string
}

/**
 * Değer, yenmiş bir binlik ayırıcının izini taşıyor mu?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU, EŞİKTEN DAHA KESİN BİR İŞARET.
 *
 * "39.704" yazıldığında geriye 39,704 kalıyor: ondalık kısmı TAM ÜÇ
 * HANELİ. Üç haneli bir kesir, bir binlik grubunun ta kendisi. Eşik
 * ("1000'in altı") bunu da yakalıyor ama tek başına yanlış pozitif
 * üretebilir; ondalık izi neredeyse hiç üretmiyor.
 *
 * ⚠️ Kayan nokta karşılaştırması yapılmıyor: `deger * 1000`ün tam sayı
 * olup olmadığına yuvarlama toleransıyla bakılıyor. `2.55 * 1000` kayan
 * noktada 2549.9999… çıkabiliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function ondalikIziVarMi(deger: number): boolean {
  if (!Number.isFinite(deger)) return false
  if (Number.isInteger(deger)) return false
  const binKat = deger * 1000
  return Math.abs(binKat - Math.round(binKat)) < 1e-6
}

/**
 * Tek bir değer için ölçek şüphesi. Şüphe yoksa `null`.
 *
 * ⚠️ UYARIR, ENGELLEMEZ. Doğru değeri bilen tek kişi Aslıhan; sistem
 * yalnızca "bu rakam bindebir görünüyor" diyor.
 */
export function olcekSuphesi(alan: OlcekAlani, deger: unknown): OlcekSuphesi | null {
  const kural = OLCEK_KURALLARI.find((k) => k.alan === alan)
  if (kural === undefined) return null
  if (typeof deger !== 'number' || !Number.isFinite(deger)) return null
  // Sıfır bir ölçek hatası değil, "yok" demenin bir yolu olabilir.
  if (deger <= 0) return null

  const isaretler: OlcekIsareti[] = []
  if (ondalikIziVarMi(deger)) isaretler.push('ondalik_izi')
  if (deger < kural.asgari) isaretler.push('cok_kucuk')
  // Tam sayı olması gereken alanda kesir, tek başına da işaret.
  if (kural.tamsayi && !Number.isInteger(deger) && !isaretler.includes('ondalik_izi')) {
    isaretler.push('ondalik_izi')
  }

  if (isaretler.length === 0) return null

  const onerilen = Math.round(deger * 1000)
  const parcalar: string[] = []

  if (isaretler.includes('ondalik_izi')) {
    parcalar.push(
      `Değerin ondalık kısmı bir binlik grubuna benziyor. Panelin sayı alanı noktayı ` +
        `ONDALIK ayırıcı sayar: “${String(deger).replace('.', '.')}” yazıldığında niyet ` +
        `${onerilen.toLocaleString('tr-TR')} olabilir.`,
    )
  }
  if (isaretler.includes('cok_kucuk')) {
    parcalar.push(
      `${kural.etiket} ${deger.toLocaleString('tr-TR')} ${kural.birim}; beklenen en az ` +
        `${kural.asgari.toLocaleString('tr-TR')} ${kural.birim}.`,
    )
  }

  return {
    alan,
    etiket: kural.etiket,
    deger,
    onerilen,
    isaretler,
    mesaj: parcalar.join(' '),
  }
}

/** Bir kaydın tüm ölçek şüpheleri. */
export function kayitOlcekSupheleri(kayit: Partial<Record<OlcekAlani, unknown>>): OlcekSuphesi[] {
  const sonuc: OlcekSuphesi[] = []
  for (const kural of OLCEK_KURALLARI) {
    if (!(kural.alan in kayit)) continue
    const suphe = olcekSuphesi(kural.alan, kayit[kural.alan])
    if (suphe !== null) sonuc.push(suphe)
  }
  return sonuc
}
