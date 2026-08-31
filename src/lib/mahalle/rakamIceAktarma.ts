import { sayiyaCevir, tariheCevir } from '@/lib/csv/ayristir'
import {
  eslenmemisSutunlarGenel,
  hucre,
  mahalleyiCozGenel,
  sutunlariEslestirGenel,
  type SutunEslemesiGenel,
  type SutunTanimi,
} from '@/lib/csv/sutun'

import { guvenUyarilari, type MahalleRakamlari } from './guven'

/**
 * Mahalle rakamları CSV içe aktarma — eşleme ve doğrulama.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU ARAÇ VAR, VERİ YOK — VE BU BİLİNÇLİ.
 *
 * 26 mahallenin m², kira, çarpan, değişim ve nüfus rakamlarını buraya
 * Aslıhan girecek. Rakamları koda ya da seed'e yazmak CLAUDE.md kural 2'nin
 * ihlali olurdu; üstelik bu veri her ay değişiyor ve her değişimde bir
 * geliştirici beklemek onu pratikte dondurur.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HİÇBİR SATIR SESSİZCE DÜZELTİLMEZ VE SESSİZCE ATLANMAZ. Her satır üç
 * durumdan birinde: **hazır**, **uyarılı** (aktarılır, işaretlenir) veya
 * **hatalı** (aktarılmaz, sebebi yazılır). Rayiç ve gözlem içe
 * aktarmalarındaki ilkenin aynısı.
 *
 * ⚠️ UYARI ENGEL DEĞİL. Gözlem sayısı eşiğin altındaki bir mahalle
 * aktarılır — ama sitede "tahmini" olarak işaretlenir ve endekse girmez.
 * Aslıhan bilerek girebilir; görmeden giremez.
 */

export const ALAN_TANIMLARI: readonly SutunTanimi<
  | 'mahalle'
  | 'ortalamaM2Satis'
  | 'ortalamaKira'
  | 'kiraCarpani'
  | 'degisim12Ay'
  | 'nufus'
  | 'gozlemSayisi'
  | 'verilerinTarihi'
  | 'veriKaynagi'
>[] = [
  {
    anahtar: 'mahalle',
    etiket: 'Mahalle',
    zorunlu: true,
    ipucu: 'Sistemdeki mahalle adıyla eşleşmeli',
    esanlamlilar: ['mahalle', 'mahalleadi', 'semt', 'bolge', 'ad'],
  },
  {
    anahtar: 'ortalamaM2Satis',
    etiket: 'Ortalama m² satış (₺/m²)',
    zorunlu: false,
    ipucu: 'Metrekare başına satış fiyatı',
    esanlamlilar: [
      'm2satis',
      'ortalamam2satis',
      'metrekaresatis',
      'm2fiyat',
      'satism2',
      'm2',
      'satisfiyati',
    ],
  },
  {
    anahtar: 'ortalamaKira',
    etiket: 'Ortalama aylık kira (₺)',
    zorunlu: false,
    ipucu: 'AYLIK kira — m² başına değil',
    esanlamlilar: ['kira', 'ortalamakira', 'aylikkira', 'kirabedeli'],
  },
  {
    anahtar: 'kiraCarpani',
    etiket: 'Kira çarpanı (yıl)',
    zorunlu: false,
    ipucu: 'Kaç yıllık kira satış fiyatına eşit',
    esanlamlilar: ['carpan', 'kiracarpani', 'amortisman', 'amortismanyili'],
  },
  {
    anahtar: 'degisim12Ay',
    etiket: '12 aylık değişim (%)',
    zorunlu: false,
    ipucu: 'Yüzde olarak; eksi değer düşüş',
    esanlamlilar: ['degisim', 'degisim12ay', 'yillikdegisim', 'artis', 'degisimorani'],
  },
  {
    anahtar: 'nufus',
    etiket: 'Nüfus',
    zorunlu: false,
    ipucu: 'Resmî kaynaktan (TÜİK/belediye)',
    esanlamlilar: ['nufus', 'nufusu', 'population'],
  },
  {
    anahtar: 'gozlemSayisi',
    etiket: 'Gözlem sayısı (n)',
    zorunlu: false,
    ipucu: 'Rakamlar kaç gözleme dayanıyor',
    esanlamlilar: ['gozlem', 'gozlemsayisi', 'n', 'adet', 'ornek'],
  },
  {
    anahtar: 'verilerinTarihi',
    etiket: 'Veriler hangi tarih itibarıyla',
    zorunlu: false,
    ipucu: 'Boşsa aşağıdaki varsayılan kullanılır',
    esanlamlilar: ['tarih', 'verilerintarihi', 'donem', 'guncelleme'],
  },
  {
    anahtar: 'veriKaynagi',
    etiket: 'Veri kaynağı',
    zorunlu: false,
    ipucu: 'İsteğe bağlı',
    esanlamlilar: ['kaynak', 'verikaynagi', 'source'],
  },
]

export type AlanAnahtari = (typeof ALAN_TANIMLARI)[number]['anahtar']
export type SutunEslemesi = SutunEslemesiGenel<AlanAnahtari>

export function sutunlariEslestir(basliklar: readonly string[]): SutunEslemesi {
  return sutunlariEslestirGenel(basliklar, ALAN_TANIMLARI)
}

export function eslenmemisSutunlar(
  basliklar: readonly string[],
  eslesme: SutunEslemesi,
): { sira: number; baslik: string }[] {
  return eslenmemisSutunlarGenel(basliklar, eslesme)
}

export function eksikZorunluAlanlar(eslesme: SutunEslemesi): string[] {
  return ALAN_TANIMLARI.filter(
    (tanim) => tanim.zorunlu && (eslesme[tanim.anahtar] ?? null) === null,
  ).map((tanim) => tanim.etiket)
}

export interface RakamGirdisi extends MahalleRakamlari {
  mahalleId: number
  mahalleAdi: string
  nufus: number | null
  verilerinTarihi: string | null
  veriKaynagi: string | null
}

export interface CozulmusSatir {
  /** CSV'deki satır numarası (başlık 1 sayılır) — hata mesajlarında kullanılır. */
  satirNo: number
  ham: string[]
  veri: RakamGirdisi | null
  hatalar: string[]
  uyarilar: string[]
}

export interface CozumlemeBaglami {
  mahalleler: readonly { id: number; ad: string; slug: string }[]
  /** CSV'de tarih sütunu yoksa ya da hücre boşsa kullanılır. */
  varsayilanTarih?: string | null
  /** CSV'de kaynak sütunu yoksa ya da hücre boşsa kullanılır. */
  varsayilanKaynak?: string | null
}

export interface CozumlemeSonucu {
  satirlar: CozulmusSatir[]
  hazirSayisi: number
  uyariliSayisi: number
  hataliSayisi: number
}

/**
 * Sayı hücresini çözer.
 *
 * ⚠️ AYRIŞTIRICI TÜRKÇE VE İNGİLİZCE BİÇİMİ BİRDEN TANIYOR
 * (`lib/csv/ayristir.ts`): `1.234,56` da `1,234.56` da doğru okunuyor.
 * Belediye ve emlak tabloları ikisini de kullanıyor ve hangi biçimde
 * geldiğini dosyayı açmadan bilmek mümkün değil.
 */
function sayiOku(
  ham: string,
  etiket: string,
  hatalar: string[],
  { negatifSerbest = false, tamsayi = false } = {},
): number | null {
  if (ham === '') return null
  const deger = sayiyaCevir(ham)
  if (deger === null) {
    hatalar.push(`${etiket} okunamadı: "${ham}".`)
    return null
  }
  if (!negatifSerbest && deger < 0) {
    hatalar.push(`${etiket} negatif olamaz (${ham}).`)
    return null
  }
  if (tamsayi && !Number.isInteger(deger)) {
    hatalar.push(`${etiket} tam sayı olmalı (${ham}).`)
    return null
  }
  return deger
}

export function satirlariCozumle(
  satirlar: readonly string[][],
  eslesme: SutunEslemesi,
  baglam: CozumlemeBaglami,
): CozumlemeSonucu {
  /** Dosya içi mükerrer: aynı mahalle iki kez yazılmış. */
  const gorulen = new Map<number, number>()
  const sonuc: CozulmusSatir[] = []

  satirlar.forEach((satir, sira) => {
    // +2: başlık satırı 1, veri 2'den başlar. Kullanıcı dosyada arayacak.
    const satirNo = sira + 2
    const hatalar: string[] = []
    const uyarilar: string[] = []

    const mahalleHam = hucre(satir, eslesme.mahalle)
    const mahalle = mahalleyiCozGenel(mahalleHam, baglam.mahalleler)
    if (!mahalle) {
      hatalar.push(
        mahalleHam === ''
          ? 'Mahalle boş.'
          : `"${mahalleHam}" sistemdeki hiçbir mahalleyle eşleşmedi. ` +
              'Mahalleyi önce Mahalleler koleksiyonuna ekleyin.',
      )
    }

    const m2Satis = sayiOku(hucre(satir, eslesme.ortalamaM2Satis), 'Ortalama m² satış', hatalar)
    const kira = sayiOku(hucre(satir, eslesme.ortalamaKira), 'Ortalama kira', hatalar)
    const carpan = sayiOku(hucre(satir, eslesme.kiraCarpani), 'Kira çarpanı', hatalar)
    const degisim = sayiOku(hucre(satir, eslesme.degisim12Ay), '12 aylık değişim', hatalar, {
      negatifSerbest: true,
    })
    const nufus = sayiOku(hucre(satir, eslesme.nufus), 'Nüfus', hatalar, { tamsayi: true })
    const gozlem = sayiOku(hucre(satir, eslesme.gozlemSayisi), 'Gözlem sayısı', hatalar, {
      tamsayi: true,
    })

    const tarihHam = hucre(satir, eslesme.verilerinTarihi)
    let tarih = baglam.varsayilanTarih ?? null
    if (tarihHam !== '') {
      const cozulen = tariheCevir(tarihHam)
      if (cozulen === null) hatalar.push(`Tarih okunamadı: "${tarihHam}".`)
      else tarih = cozulen
    }

    const kaynakHam = hucre(satir, eslesme.veriKaynagi)
    const kaynak = kaynakHam === '' ? (baglam.varsayilanKaynak ?? null) : kaynakHam

    const rakamlar: MahalleRakamlari = {
      ortalamaM2Satis: m2Satis,
      ortalamaKira: kira,
      kiraCarpani: carpan,
      degisim12Ay: degisim,
      gozlemSayisi: gozlem,
    }

    /**
     * ⚠️ YAZILACAK HİÇBİR ŞEY YOKSA SATIR HATALI. Yalnızca mahalle adı olan
     * bir satır, var olan rakamları silmeye çalışırdı — içe aktarma
     * "güncelleme"dir, "sıfırlama" değil.
     */
    const yazilacakVar =
      m2Satis !== null ||
      kira !== null ||
      carpan !== null ||
      degisim !== null ||
      nufus !== null ||
      gozlem !== null
    if (!yazilacakVar && hatalar.length === 0) {
      hatalar.push('Satırda yazılacak hiçbir rakam yok — yalnızca mahalle adı var.')
    }

    // ⚠️ Güven uyarıları PAYLAŞILAN modülden: sitedeki "tahmini" etiketiyle
    // aynı eşikler. İki ayrı yerde iki ayrı eşik, panelde "düşük güven"
    // diyen bir rakamın sitede güvenilir görünmesi demekti.
    for (const uyari of guvenUyarilari(rakamlar)) uyarilar.push(uyari.mesaj)

    if (mahalle) {
      const oncekiSatir = gorulen.get(mahalle.id)
      if (oncekiSatir !== undefined) {
        uyarilar.push(`${mahalle.ad} ${oncekiSatir}. satırda da var; sonraki satır öncekini ezer.`)
      } else {
        gorulen.set(mahalle.id, satirNo)
      }
    }

    const veri: RakamGirdisi | null =
      hatalar.length > 0 || !mahalle
        ? null
        : {
            mahalleId: mahalle.id,
            mahalleAdi: mahalle.ad,
            ortalamaM2Satis: m2Satis,
            ortalamaKira: kira,
            kiraCarpani: carpan,
            degisim12Ay: degisim,
            nufus,
            gozlemSayisi: gozlem,
            verilerinTarihi: tarih,
            veriKaynagi: kaynak,
          }

    sonuc.push({ satirNo, ham: satir, veri, hatalar, uyarilar })
  })

  return {
    satirlar: sonuc,
    hazirSayisi: sonuc.filter((s) => s.veri !== null && s.uyarilar.length === 0).length,
    uyariliSayisi: sonuc.filter((s) => s.veri !== null && s.uyarilar.length > 0).length,
    hataliSayisi: sonuc.filter((s) => s.veri === null).length,
  }
}

/**
 * Örnek CSV — panelden indirilir.
 *
 * ⚠️ ÖRNEK DOSYA BİR SÜS DEĞİL. "Sütun adları farklı geldi" hatasının en
 * ucuz çözümü, doğru sütun adlarını içeren bir dosyayı kullanıcının eline
 * vermek. Rakamlar bilinçli olarak AÇIKÇA ÖRNEK: gerçek Çorlu verisi
 * değil (CLAUDE.md kural 2) ve dosyanın ilk satırı bunu yazıyor.
 */
export function ornekCsv(): string {
  return [
    '# ÖRNEK VERİ — YAYINLANMAYACAK. Rakamlar gerçek değildir, biçimi gösterir.',
    '# Bu satırlar (#) içe aktarmada yok sayılır.',
    'Mahalle;Ortalama m² satış;Ortalama aylık kira;Kira çarpanı;12 aylık değişim;Nüfus;Gözlem sayısı;Tarih;Kaynak',
    'Muhittin;32.500,00;12.400;19,5;18,2;14200;24;2026-08-01;Örnek',
    'Alipaşa;28.750,50;10.900;20,1;12,4;9800;11;2026-08-01;Örnek',
  ].join('\n')
}
