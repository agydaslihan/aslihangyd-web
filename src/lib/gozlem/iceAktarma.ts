import { sayiyaCevir, tariheCevir } from '@/lib/csv/ayristir'
import {
  eslenmemisSutunlarGenel,
  hucre,
  mahalleyiCozGenel,
  sadelestir,
  sutunlariEslestirGenel,
} from '@/lib/csv/sutun'
import {
  GOZLEM_KAYNAKLARI,
  GOZLEM_TIPLERI,
  GUVEN_SEVIYELERI,
  ODA_TIPLERI,
  type GozlemKaynagi,
  type GozlemTipi,
  type GuvenSeviyesi,
  type OdaTipi,
} from '@/lib/endeks/tipler'
import { m2FiyatiHesapla } from '@/lib/endeks/kalite'

/**
 * Gözlem CSV içe aktarma — eşleme ve doğrulama.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SABİT SÜTUN DÜZENİ DAYATILMIYOR
 *
 * ENDEKS-VERI-YONETIMI.md §6 bir şablon öneriyor, ama Aslıhan'ın tablosu
 * aylardır kullanımda ve muhtemelen o şablona birebir uymuyor. "Önce
 * tablonuzu şu düzene çevirin" demek, içe aktarmayı hiç kullanılmayacak
 * bir özelliğe dönüştürürdü.
 *
 * Bunun yerine: sütunlar başlıklarından **tahmin edilir**, tahmin
 * kullanıcıya gösterilir ve elle düzeltilebilir. Eşlenemeyen sütun sessizce
 * atılmaz — "bu sütun kullanılmadı" diye bildirilir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HİÇBİR SATIR SESSİZCE DÜZELTİLMEZ VE SESSİZCE ATLANMAZ
 *
 * Endeksin değeri, içindeki her rakamın arkasında durabilmekten geliyor.
 * "Anlamadığım satırı atlarım" davranışı, 500 satırlık bir dosyadan 430
 * satır aktarıp kimseye söylememek demektir. Her satır üç durumdan birinde
 * olur: **hazır**, **uyarılı** (aktarılır, işaretlenir) veya **hatalı**
 * (aktarılmaz, sebebi yazılır).
 * ─────────────────────────────────────────────────────────────────────────
 */

/** İçe aktarılabilir alanlar. Sıra, eşleme ekranındaki sıradır. */
export const ALAN_TANIMLARI = [
  {
    anahtar: 'gozlemTarihi',
    etiket: 'Gözlem tarihi',
    zorunlu: true,
    ipucu: 'GG.AA.YYYY veya YYYY-AA-GG',
    esanlamlilar: ['tarih', 'gozlemtarihi', 'date', 'gun'],
  },
  {
    anahtar: 'mahalle',
    etiket: 'Mahalle',
    zorunlu: true,
    ipucu: 'Sistemdeki mahalle adıyla eşleşmeli',
    esanlamlilar: ['mahalle', 'mahalleadi', 'semt', 'bolge', 'neighborhood'],
  },
  {
    anahtar: 'tip',
    etiket: 'Tip',
    zorunlu: true,
    ipucu: 'Satılık / Kiralık',
    esanlamlilar: ['tip', 'ilantipi', 'islemtipi', 'tur', 'type'],
  },
  {
    anahtar: 'odaTipi',
    etiket: 'Oda tipi',
    zorunlu: true,
    ipucu: ODA_TIPLERI.join(' · '),
    esanlamlilar: ['oda', 'odatipi', 'odasayisi', 'odasayısı', 'rooms'],
  },
  {
    anahtar: 'm2',
    etiket: 'Brüt m²',
    zorunlu: true,
    ipucu: 'Yalnızca sayı',
    esanlamlilar: ['m2', 'm²', 'metrekare', 'brutm2', 'alan', 'size'],
  },
  {
    anahtar: 'fiyat',
    etiket: 'Fiyat',
    zorunlu: true,
    ipucu: 'Kiralıkta aylık kira',
    esanlamlilar: ['fiyat', 'ucret', 'bedel', 'kira', 'tutar', 'price'],
  },
  {
    anahtar: 'kaynak',
    etiket: 'Kaynak',
    zorunlu: false,
    ipucu: 'Boşsa aşağıdaki varsayılan kullanılır',
    esanlamlilar: ['kaynak', 'veri kaynagi', 'verikaynagi', 'source'],
  },
  {
    anahtar: 'guvenSeviyesi',
    etiket: 'Güven seviyesi',
    zorunlu: false,
    ipucu: 'Boşsa aşağıdaki varsayılan kullanılır',
    esanlamlilar: ['guven', 'guvenseviyesi', 'guvenilirlik', 'confidence'],
  },
  {
    anahtar: 'binaYasi',
    etiket: 'Bina yaşı',
    zorunlu: false,
    ipucu: 'İsteğe bağlı',
    esanlamlilar: ['binayasi', 'yas', 'yapiyili', 'age'],
  },
  {
    anahtar: 'kat',
    etiket: 'Kat',
    zorunlu: false,
    ipucu: 'İsteğe bağlı',
    esanlamlilar: ['kat', 'bulundugukat', 'floor'],
  },
  {
    anahtar: 'notlar',
    etiket: 'Not',
    zorunlu: false,
    ipucu: 'İsteğe bağlı',
    esanlamlilar: ['not', 'notlar', 'aciklama', 'note', 'notes'],
  },
] as const

export type AlanAnahtari = (typeof ALAN_TANIMLARI)[number]['anahtar']

/** Sütun eşlemesi: alan → CSV sütun sırası (`null` = eşlenmedi). */
export type SutunEslemesi = Partial<Record<AlanAnahtari, number | null>>

/**
 * ⚠️ Sütun eşleştirmesinin kendisi `@/lib/csv/sutun` içinde ve rayiç bedel
 * içe aktarmasıyla ORTAK. İki ayrı kopya olsaydı biri "Brüt m2 (net değil)"
 * başlığını tanırken diğeri tanımazdı ve fark hiçbir yerde görünmezdi.
 *
 * Buradaki ince sarmalayıcılar duruyor çünkü bu modülün alan tanımları
 * (`ALAN_TANIMLARI`) sabittir; çağıranın her seferinde geçirmesi gereksiz.
 */
export { sadelestir } from '@/lib/csv/sutun'

export function sutunlariEslestir(basliklar: readonly string[]): SutunEslemesi {
  return sutunlariEslestirGenel(basliklar, ALAN_TANIMLARI)
}

/** Eşlemede kullanılmayan sütunların sırası — kullanıcıya bildirilir. */
export function eslenmemisSutunlar(
  basliklar: readonly string[],
  eslesme: SutunEslemesi,
): { sira: number; baslik: string }[] {
  return eslenmemisSutunlarGenel(basliklar, eslesme)
}

/* ==========================================================================
   Değer normalleştiriciler
   ========================================================================== */

export function tipiCoz(ham: string): GozlemTipi | null {
  const sade = sadelestir(ham)
  if (sade === '') return null
  if (sade.startsWith('satil') || sade.startsWith('satis') || sade === 'satik') return 'satilik'
  if (sade.startsWith('kiral') || sade.startsWith('kira')) return 'kiralik'
  const dogrudan = GOZLEM_TIPLERI.find((t) => sadelestir(t.value) === sade)
  return dogrudan ? dogrudan.value : null
}

export function odaTipiniCoz(ham: string): OdaTipi | null {
  // "3 + 1", "3+1 daire", "3+1" → "3+1"
  const eslesme = ham.match(/(\d+)\s*\+\s*(\d+)/)
  if (!eslesme) return null
  const aday = `${eslesme[1]}+${eslesme[2]}`
  // ⚠️ Katman dışı bir oda tipi (örn. 5+2) en yakın katmana YUVARLANMAZ.
  // Endeks katmanları mahalle × oda tipi; yanlış katmana yazılan bir gözlem
  // o katmanın medyanını sessizce bozar.
  return ODA_TIPLERI.find((oda) => oda === aday) ?? null
}

/**
 * Metni sadeleştirilmiş kelimelere böler.
 *
 * ⚠️ Kaynak sezgisinde alt dize araması KULLANILMAZ. "falan filan" metni
 * `ilan` alt dizesini içerir ve alt dize aramasıyla sessizce "portal ilan
 * gözlemi"ne bağlanırdı — tanınmadığı hâlde tanınmış sayılan bir değer,
 * uyarı bile üretmeden veriye girerdi. Bu tuzağı testi yazarken yakaladık.
 */
function kelimeler(metin: string): string[] {
  return metin
    .split(/[\s/,;()._-]+/)
    .map(sadelestir)
    .filter((kelime) => kelime !== '')
}

export function kaynagiCoz(ham: string): GozlemKaynagi | null {
  const sade = sadelestir(ham)
  if (sade === '') return null

  const dogrudan = GOZLEM_KAYNAKLARI.find(
    (k) => sadelestir(k.value) === sade || sadelestir(k.label) === sade,
  )
  if (dogrudan) return dogrudan.value

  const parcalar = kelimeler(ham)
  const varMi = (...adaylar: string[]): boolean =>
    parcalar.some((kelime) => adaylar.some((aday) => kelime.startsWith(aday)))

  if (varMi('portal', 'ilan')) return 'portal_ilan'
  if (varMi('kendi', 'islem')) return 'kendi_islem'
  if (varMi('meslek')) return 'meslektas'
  if (varMi('resmi')) return 'resmi'
  return null
}

export function guveniCoz(ham: string): GuvenSeviyesi | null {
  const sade = sadelestir(ham)
  if (sade === '') return null
  const dogrudan = GUVEN_SEVIYELERI.find(
    (g) => sadelestir(g.value) === sade || sadelestir(g.label).startsWith(sade),
  )
  if (dogrudan) return dogrudan.value
  if (sade.startsWith('yuksek') || sade.startsWith('high')) return 'yuksek'
  if (sade.startsWith('orta') || sade.startsWith('mid')) return 'orta'
  if (sade.startsWith('dusuk') || sade.startsWith('low')) return 'dusuk'
  return null
}

/**
 * Mahalle adını sistemdeki kayda bağlar.
 *
 * "Muhittin", "Muhittin Mah.", "MUHİTTİN MAHALLESİ" hepsi aynı kayda
 * gitmeli. Bulunamazsa **tahmin edilmez** — hatalı satır olarak işaretlenir.
 * Yanlış mahalleye yazılan bir gözlem, o katmanın medyanını sessizce bozar.
 */
export function mahalleyiCoz(
  ham: string,
  mahalleler: readonly { id: number; ad: string; slug: string }[],
): { id: number; ad: string; slug: string } | null {
  return mahalleyiCozGenel(ham, mahalleler)
}

/* ==========================================================================
   Satır çözümleme
   ========================================================================== */

export interface CozulmusSatir {
  /** CSV'deki satır numarası (başlık 1 sayılır) — hata mesajlarında kullanılır. */
  satirNo: number
  /** Ham hücreler — önizlemede gösterilir. */
  ham: string[]
  /** Aktarmaya hazır veri. Hata varsa `null`. */
  veri: GozlemGirdisi | null
  /** Aktarmayı ENGELLEYEN sorunlar. */
  hatalar: string[]
  /** Aktarmayı engellemeyen, dikkat isteyen durumlar. */
  uyarilar: string[]
}

export interface GozlemGirdisi {
  mahalleId: number
  mahalleAdi: string
  mahalleSlug: string
  tip: GozlemTipi
  odaTipi: OdaTipi
  m2: number
  fiyat: number
  m2Fiyati: number
  /** ISO tarih — 'YYYY-MM-DD'. */
  gozlemTarihi: string
  kaynak: GozlemKaynagi
  guvenSeviyesi: GuvenSeviyesi
  binaYasi: number | null
  kat: string | null
  notlar: string | null
}

export interface CozumlemeBaglami {
  mahalleler: readonly { id: number; ad: string; slug: string }[]
  /** CSV'de kaynak sütunu yoksa veya hücre boşsa kullanılır. */
  varsayilanKaynak: GozlemKaynagi
  /** CSV'de güven sütunu yoksa veya hücre boşsa kullanılır. */
  varsayilanGuven: GuvenSeviyesi
}

export interface CozumlemeSonucu {
  satirlar: CozulmusSatir[]
  hazirSayisi: number
  uyariliSayisi: number
  hataliSayisi: number
}

/**
 * Tüm satırları çözümler.
 *
 * ⚠️ Dosya içi mükerrer kontrolü burada yapılır; veritabanına karşı
 * mükerrer kontrolü sunucu eyleminde (`mukerrerKontrol`) yapılır. İkisi
 * ayrı: aynı dosyada iki kez yazılmış bir satır, veritabanında henüz yok.
 */
export function satirlariCozumle(
  satirlar: readonly string[][],
  eslesme: SutunEslemesi,
  baglam: CozumlemeBaglami,
): CozumlemeSonucu {
  const gorulen = new Map<string, number>()
  const sonuc: CozulmusSatir[] = []

  satirlar.forEach((satir, sira) => {
    // +2: başlık satırı 1, veri 2'den başlar. Kullanıcı dosyada arayacak.
    const satirNo = sira + 2
    const hatalar: string[] = []
    const uyarilar: string[] = []

    const tarih = tariheCevir(hucre(satir, eslesme.gozlemTarihi))
    if (tarih === null) {
      hatalar.push('Tarih okunamadı. Beklenen: GG.AA.YYYY veya YYYY-AA-GG.')
    }

    const mahalleHam = hucre(satir, eslesme.mahalle)
    const mahalle = mahalleyiCoz(mahalleHam, baglam.mahalleler)
    if (!mahalle) {
      hatalar.push(
        mahalleHam === ''
          ? 'Mahalle boş.'
          : `"${mahalleHam}" sistemdeki hiçbir mahalleyle eşleşmedi. ` +
              'Mahalleyi önce Mahalleler koleksiyonuna ekleyin.',
      )
    }

    const tip = tipiCoz(hucre(satir, eslesme.tip))
    if (tip === null) {
      hatalar.push('Tip okunamadı. Beklenen: Satılık veya Kiralık.')
    }

    const odaHam = hucre(satir, eslesme.odaTipi)
    const odaTipi = odaTipiniCoz(odaHam)
    if (odaTipi === null) {
      hatalar.push(
        odaHam === ''
          ? 'Oda tipi boş.'
          : `"${odaHam}" tanınmadı. Endeks katmanları şu tiplerle çalışıyor: ${ODA_TIPLERI.join(', ')}.`,
      )
    }

    const m2 = sayiyaCevir(hucre(satir, eslesme.m2))
    if (m2 === null || m2 <= 0) {
      hatalar.push('m² okunamadı veya sıfır.')
    }

    const fiyat = sayiyaCevir(hucre(satir, eslesme.fiyat))
    if (fiyat === null || fiyat <= 0) {
      hatalar.push('Fiyat okunamadı veya sıfır.')
    }

    // ── Akla yatkınlık uyarıları (engellemez) ──
    if (m2 !== null && (m2 < 20 || m2 > 2000)) {
      uyarilar.push(`${m2} m² olağandışı. Rakamı kontrol edin.`)
    }

    const m2Fiyati = m2 !== null && fiyat !== null ? m2FiyatiHesapla(fiyat, m2) : null
    if (m2Fiyati !== null && tip === 'satilik' && m2Fiyati < 1_000) {
      uyarilar.push(
        `m² fiyatı ${Math.round(m2Fiyati).toLocaleString('tr-TR')} ₺ çıkıyor. ` +
          'Fiyat eksik girilmiş olabilir.',
      )
    }

    // ── İsteğe bağlı alanlar ──
    const kaynakHam = hucre(satir, eslesme.kaynak)
    const kaynak = kaynagiCoz(kaynakHam) ?? baglam.varsayilanKaynak
    if (kaynakHam !== '' && kaynagiCoz(kaynakHam) === null) {
      uyarilar.push(`Kaynak "${kaynakHam}" tanınmadı; varsayılan kullanıldı.`)
    }

    const guvenHam = hucre(satir, eslesme.guvenSeviyesi)
    const guven = guveniCoz(guvenHam) ?? baglam.varsayilanGuven
    if (guvenHam !== '' && guveniCoz(guvenHam) === null) {
      uyarilar.push(`Güven seviyesi "${guvenHam}" tanınmadı; varsayılan kullanıldı.`)
    }

    const binaYasi = sayiyaCevir(hucre(satir, eslesme.binaYasi))
    const kat = hucre(satir, eslesme.kat)
    const notlar = hucre(satir, eslesme.notlar)

    // ── Dosya içi mükerrer ──
    if (mahalle && tip && odaTipi && m2 !== null && fiyat !== null && tarih) {
      const anahtar = [mahalle.slug, tip, odaTipi, m2, fiyat, tarih].join('|')
      const oncekiSatir = gorulen.get(anahtar)
      if (oncekiSatir !== undefined) {
        uyarilar.push(
          `Bu satırın aynısı ${oncekiSatir}. satırda da var. ` +
            'Aynı ilanı iki kez saymak katmanın medyanını o ilana çeker.',
        )
      } else {
        gorulen.set(anahtar, satirNo)
      }
    }

    const gecerli =
      hatalar.length === 0 &&
      mahalle !== null &&
      tip !== null &&
      odaTipi !== null &&
      m2 !== null &&
      fiyat !== null &&
      tarih !== null &&
      m2Fiyati !== null

    sonuc.push({
      satirNo,
      ham: [...satir],
      hatalar,
      uyarilar,
      veri: gecerli
        ? {
            mahalleId: mahalle.id,
            mahalleAdi: mahalle.ad,
            mahalleSlug: mahalle.slug,
            tip,
            odaTipi,
            m2,
            fiyat,
            m2Fiyati,
            gozlemTarihi: tarih,
            kaynak,
            guvenSeviyesi: guven,
            binaYasi: binaYasi !== null && binaYasi >= 0 ? binaYasi : null,
            kat: kat === '' ? null : kat,
            notlar: notlar === '' ? null : notlar,
          }
        : null,
    })
  })

  return {
    satirlar: sonuc,
    hazirSayisi: sonuc.filter((s) => s.veri !== null && s.uyarilar.length === 0).length,
    uyariliSayisi: sonuc.filter((s) => s.veri !== null && s.uyarilar.length > 0).length,
    hataliSayisi: sonuc.filter((s) => s.veri === null).length,
  }
}

/** Zorunlu alanlardan eşlenmemiş olanlar — içe aktarmayı engeller. */
export function eksikZorunluAlanlar(eslesme: SutunEslemesi): string[] {
  return ALAN_TANIMLARI.filter(
    (tanim) =>
      tanim.zorunlu && (eslesme[tanim.anahtar] === null || eslesme[tanim.anahtar] === undefined),
  ).map((tanim) => tanim.etiket)
}
