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
 */
export const ANASAYFA_BOLUMLERI: readonly AnaSayfaBolumu[] = [
  {
    anahtar: 'guven_kartlari',
    ad: 'Güven kartları',
    aciklama: 'Vitrinin hemen altındaki üç kısa güven kartı.',
  },
  {
    anahtar: 'arama',
    ad: 'Arama kutusu',
    aciklama: 'Mahalle, tür ve fiyat seçimiyle portföye giriş.',
  },
  {
    anahtar: 'guven_seridi',
    ad: 'Güven şeridi',
    aciklama: 'Portföy sayısı, mahalle sayısı, yetki belgesi.',
  },
  {
    anahtar: 'aslihan',
    ad: 'Kurucu bölümü',
    aciklama: 'Portre (yoksa tipografik blok) ve yetki belgesi numarası.',
  },
  {
    anahtar: 'corlu_deneyimi',
    ad: 'İnteraktif Çorlu deneyimi',
    aciklama: 'Mahalle haritası ve portföy dağılımı.',
  },
  {
    anahtar: 'one_cikan_portfoy',
    ad: 'Öne çıkan portföy',
    aciklama: 'Üç ilan kartı ve portföye giden çağrı.',
  },
  {
    anahtar: 'gizli_portfoy',
    ad: 'Gizli portföy tanıtımı',
    aciklama: 'Site Bölümleri’nden kapalıysa bu satır ne olursa olsun çizilmez.',
  },
  {
    anahtar: 'anlati',
    ad: 'Yatay anlatı',
    aciklama: 'Dört adımlık çalışma biçimi anlatısı.',
  },
  {
    anahtar: 'endeks',
    ad: 'Çorlu Konut Endeksi şeridi',
    aciklama: 'Veri eşikleri sağlanmadıysa kendiliğinden çizilmez.',
  },
  {
    anahtar: 'slayt',
    ad: 'Hero slaytları',
    aciklama:
      'İlk slayt vitrinin zeminidir; kalan slaytlar bu bölümde gösterilir. ' +
      'Tek slayt varsa bölüm çizilmez.',
  },
  {
    anahtar: 'mahalleler',
    ad: 'Mahalle kartları',
    aciklama: 'Mahalle ızgarası ve karşılaştırma çağrısı.',
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

export interface DuzenSatiri {
  bolum: string
  acik: boolean
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
