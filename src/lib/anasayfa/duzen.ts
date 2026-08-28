/**
 * Ana sayfa bölüm düzeni — SIRA ve AÇIK/KAPALI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜÇ AYRI KARAR, ÜÇ AYRI YER. Menü düzeninde verilen ayrımın aynısı.
 *
 *   · İÇERİK   → kodda. Hangi bölümler var, ne çiziyorlar.
 *   · GÖRÜNME  → Site Bölümleri (site geneli) + buradaki `acik` anahtarı
 *                (yalnızca ana sayfa).
 *   · SIRA     → burası. Aslıhan'ın editoryal tercihi.
 *
 * Serbest bir "sayfa kurucusu" (blok ekle/çıkar) üçünü tek yerde toplardı
 * ve ilk yanlış yapılandırmada ana sayfa sessizce yarım çizilirdi. Sıra
 * bir liste, içerik değil.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ VİTRİN (`hero`) SIRALANMIYOR VE BU BİR EKSİKLİK DEĞİL.
 *
 * Sinematik vitrin sayfanın LCP öğesi. Aşağı alınırsa LCP öğesi değişir,
 * ön yüklenen hero görseli boşa iner ve mobil performans hedefi (≥75)
 * ölçülebilir biçimde düşer. "İlk ekran" bir sıralama tercihi değil, bir
 * performans sözleşmesi.
 *
 * ⚠️ KAPATMAK SİLMEK DEĞİL. Buradan kapatılan bölüm YALNIZCA ana sayfadan
 * kalkar; kendi sayfası varsa açık kalır. Bir sayfayı tamamen kaldırmak
 * için Site Bölümleri kullanılır — orası menüyü, altbilgiyi ve site
 * haritasını da birlikte kapatır.
 *
 * ⚠️ Listede olmayan bir bölüm KAYBOLMAZ, varsayılan sırasındaki yerinde
 * çizilir. Kayıt eksik kalırsa ana sayfa yarım görünmesin diye.
 */

export interface AnaSayfaBolumu {
  anahtar: string
  ad: string
  /** Panelde satırın altında görünen kısa açıklama. */
  aciklama: string
}

/**
 * Sıralanabilir bölümler — KOD SIRASI VARSAYILANDIR.
 *
 * ⚠️ Buraya bir anahtar eklemek yetmez: `page.tsx` içinde aynı anahtarla
 * bir bölüm çizilmelidir. İkisinin eşitliği `duzen.test.ts` ile
 * denetleniyor — panelde seçilebilen ama hiçbir şey çizmeyen bir satır,
 * en kötü panel deneyimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SIRA 28 AĞUSTOS 2026'DA DEĞİŞTİ — Aslıhan'ın verdiği akış.
 *
 * İstenen sıra on başlık saydı: güven şeridi → portföy → mahalleler →
 * slayt → kurucu → Çorlu deneyimi → uzmanlık → araçlar → CTA. Sayfada ise
 * on dört sıralanabilir bölüm var; adı geçmeyen dördü sessizce sona
 * atılmadı, en yakın akrabalarının yanına yerleştirildi:
 *
 *   · `guven_kartlari` → güven şeridinin hemen ardında (ikisi de güven)
 *   · `arama`          → vitrinin altındaki birincil eylem, yukarıda kaldı
 *   · `endeks`         → veri bloklarının arasında
 *   · `gizli_portfoy`  → portföy anlatısının devamı
 *   · `uc_yol`         → kapanış çağrısının hemen öncesi
 *
 * ⚠️ "Uzmanlık" başlığının karşılığı `anlati` sayıldı: sayfada uzmanlığı
 * anlatan bölüm dört adımlık çalışma biçimi anlatısı. Kastedilen başka bir
 * şeyse sıra panelden değiştirilebilir — kodda bir daha dokunmaya gerek yok.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const ANASAYFA_BOLUMLERI: readonly AnaSayfaBolumu[] = [
  {
    anahtar: 'guven_seridi',
    ad: 'Güven şeridi',
    aciklama: 'Portföy sayısı, mahalle sayısı, yetki belgesi.',
  },
  {
    anahtar: 'guven_kartlari',
    ad: 'Güven kartları',
    aciklama: 'Üç kısa güven kartı — güven şeridinin görsel karşılığı.',
  },
  {
    anahtar: 'arama',
    ad: 'Arama kutusu',
    aciklama: 'Mahalle, tür ve fiyat seçimiyle portföye giriş.',
  },
  {
    anahtar: 'one_cikan_portfoy',
    ad: 'Öne çıkan portföy',
    aciklama: 'Üç ilan kartı ve portföye giden çağrı.',
  },
  {
    anahtar: 'mahalleler',
    ad: 'Mahalle kartları',
    aciklama: 'Mahalle ızgarası ve karşılaştırma çağrısı.',
  },
  {
    anahtar: 'slayt',
    ad: 'Hero slaytları',
    aciklama:
      'İlk slayt vitrinin zeminidir; kalan slaytlar bu bölümde gösterilir. ' +
      'Tek slayt varsa bölüm çizilmez.',
  },
  {
    anahtar: 'aslihan',
    ad: 'Kim danışmanlık veriyor',
    aciklama: 'Portre (yoksa tipografik blok) ve yetki belgesi numarası.',
  },
  {
    anahtar: 'corlu_deneyimi',
    ad: 'İnteraktif Çorlu deneyimi',
    aciklama: 'Mahalle haritası ve portföy dağılımı.',
  },
  {
    anahtar: 'anlati',
    ad: 'Uzmanlık — çalışma biçimi',
    aciklama: 'Dört adımlık yatay anlatı: ilk temastan pazarlamaya.',
  },
  {
    anahtar: 'endeks',
    ad: 'Çorlu Konut Endeksi şeridi',
    aciklama: 'Veri eşikleri sağlanmadıysa kendiliğinden çizilmez.',
  },
  {
    anahtar: 'gizli_portfoy',
    ad: 'Gizli portföy tanıtımı',
    aciklama: 'Site Bölümleri’nden kapalıysa bu satır ne olursa olsun çizilmez.',
  },
  {
    anahtar: 'araclar',
    ad: 'Yatırımcı araçları',
    aciklama: 'Hesaplayıcı kartları.',
  },
  {
    anahtar: 'uc_yol',
    ad: 'Üç yol ayrımı',
    aciklama: 'Alıcı / satıcı / yatırımcı yönlendirmesi.',
  },
  {
    anahtar: 'cagri',
    ad: 'Kapanış çağrı bandı',
    aciklama: 'WhatsApp ve değerleme çağrısı.',
  },
]

/** Panelde seçenek listesi — koddan türetiliyor, elle yazılmıyor. */
export const ANASAYFA_SIRA_SECENEKLERI = ANASAYFA_BOLUMLERI.map((bolum) => ({
  value: bolum.anahtar,
  label: bolum.ad,
}))

/** Panel hiç ayarlanmamışsa geçerli olan sıra. */
export const VARSAYILAN_ANASAYFA_SIRASI: readonly string[] = ANASAYFA_BOLUMLERI.map(
  (bolum) => bolum.anahtar,
)

/**
 * Bölüm başına görünüm ayarları — SINIRLI SEÇENEK, SERBEST CSS DEĞİL.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜÇ AYARIN DA DEĞER KÜMESİ KAPALI. Serbest bir renk ya da piksel
 * girişi, tasarım sisteminin dışına çıkan tek bir sayfa üretmeye yeter;
 * sonra o sayfa "neden farklı görünüyor" sorusunun cevapsız kaldığı yer
 * olur. Kapalı küme, panelin yanlış yapılandırılamamasını garanti ediyor.
 *
 * ⚠️ `zemin` seçenekleri `Bolum` bileşeninin zaten tanıdığı bantlar. Yeni
 * bir bant adı buraya eklenirse orada da karşılığı olmalı; ikisinin
 * eşitliği `duzen.test.ts` ile denetleniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const BOLUM_ZEMINLERI = ['varsayilan', 'kagit', 'bej', 'koyu'] as const
export const BOLUM_BOSLUKLARI = ['dar', 'normal', 'genis'] as const
export const BOLUM_HIZALAMALARI = ['sol', 'orta'] as const

export type BolumZemini = (typeof BOLUM_ZEMINLERI)[number]
export type BolumBoslugu = (typeof BOLUM_BOSLUKLARI)[number]
export type BolumHizalamasi = (typeof BOLUM_HIZALAMALARI)[number]

export interface BolumGorunumu {
  zemin: BolumZemini
  bosluk: BolumBoslugu
  hizalama: BolumHizalamasi
}

export const VARSAYILAN_GORUNUM: BolumGorunumu = {
  /**
   * ⚠️ `varsayilan` "beyaz" DEĞİL: bölümün kendi tasarlanmış zeminini
   * koru demek. Çorlu deneyimi ve çağrı bandı kendi bantlarını taşıyor;
   * hepsini kâğıda çevirmek onları tanınmaz hâle getirirdi. Panelden
   * bilinçli olarak değiştirilebilir, ama varsayılan müdahale etmemek.
   */
  zemin: 'varsayilan',
  bosluk: 'normal',
  hizalama: 'sol',
}

export interface DuzenSatiri extends Partial<BolumGorunumu> {
  bolum: string
  acik: boolean
}

/** Kayıttan görünüm ayarlarını güvenle çıkarır. */
export function gorunumuCoz(satir: Partial<BolumGorunumu> | null | undefined): BolumGorunumu {
  const secim = <T extends string>(deger: unknown, kume: readonly T[], varsayilan: T): T =>
    typeof deger === 'string' && (kume as readonly string[]).includes(deger)
      ? (deger as T)
      : varsayilan

  return {
    zemin: secim(satir?.zemin, BOLUM_ZEMINLERI, VARSAYILAN_GORUNUM.zemin),
    bosluk: secim(satir?.bosluk, BOLUM_BOSLUKLARI, VARSAYILAN_GORUNUM.bosluk),
    hizalama: secim(satir?.hizalama, BOLUM_HIZALAMALARI, VARSAYILAN_GORUNUM.hizalama),
  }
}

/**
 * Kayıtlı düzeni çizim sırasına çevirir.
 *
 * ⚠️ ÜÇ KURAL, ÜÇÜ DE VERİ KAYBINA KARŞI:
 *
 *   1. Tanınmayan anahtar atlanır — bölüm koddan kaldırıldığında panel
 *      kaydı ana sayfayı kırmasın.
 *   2. Tekrar eden anahtar bir kez çizilir — aynı bölüm iki kez basılamaz.
 *   3. Kayıtta HİÇ GEÇMEYEN bölüm kaybolmaz; varsayılan sırasındaki
 *      yerinde, açık olarak eklenir. Yeni bir bölüm eklendiğinde Aslıhan
 *      panele girip onu elle eklemek zorunda kalmasın diye.
 */
export interface CizilecekBolum extends BolumGorunumu {
  anahtar: string
}

/**
 * Kayıtlı düzeni, görünüm ayarlarıyla birlikte çizim listesine çevirir.
 *
 * ⚠️ Sıra ile GÖRÜNÜM aynı satırda tutuluyor: ayrı bir tabloda olsalardı
 * bir bölüm silindiğinde görünüm kaydı öksüz kalırdı.
 */
export function anaSayfaBolumleri(
  kayit: readonly DuzenSatiri[] | null | undefined,
): CizilecekBolum[] {
  const gorunumler = new Map<string, BolumGorunumu>()
  for (const satir of kayit ?? []) {
    if (typeof satir?.bolum === 'string' && !gorunumler.has(satir.bolum)) {
      gorunumler.set(satir.bolum, gorunumuCoz(satir))
    }
  }

  return anaSayfaSirasi(kayit).map((anahtar) => ({
    anahtar,
    ...(gorunumler.get(anahtar) ?? VARSAYILAN_GORUNUM),
  }))
}

export function anaSayfaSirasi(kayit: readonly DuzenSatiri[] | null | undefined): string[] {
  const kayitli = new Map<string, boolean>()

  for (const satir of kayit ?? []) {
    if (typeof satir?.bolum !== 'string') continue
    if (!VARSAYILAN_ANASAYFA_SIRASI.includes(satir.bolum)) continue
    if (kayitli.has(satir.bolum)) continue
    kayitli.set(satir.bolum, satir.acik !== false)
  }

  /**
   * Kayıtta hiç geçmeyen bölümler — yeni eklenmiş demektir.
   *
   * ⚠️ Sona atmak kolay olurdu ama yanlış: yeni bir bölüm sayfanın en
   * altında, kapanış çağrı bandının bile altında belirirdi. Bunun yerine
   * VARSAYILAN KOMŞULUĞUNA yerleştiriliyor.
   */
  const yeni = VARSAYILAN_ANASAYFA_SIRASI.filter((anahtar) => !kayitli.has(anahtar))
  const varsayilanSira = (anahtar: string) => VARSAYILAN_ANASAYFA_SIRASI.indexOf(anahtar)

  const sonuc: string[] = []
  const basildi = new Set<string>()

  for (const [anahtar, acik] of kayitli) {
    for (const eklenecek of yeni) {
      if (basildi.has(eklenecek)) continue
      if (varsayilanSira(eklenecek) > varsayilanSira(anahtar)) continue
      basildi.add(eklenecek)
      sonuc.push(eklenecek)
    }
    if (acik) sonuc.push(anahtar)
  }

  for (const eklenecek of yeni) {
    if (basildi.has(eklenecek)) continue
    sonuc.push(eklenecek)
  }

  return sonuc
}
