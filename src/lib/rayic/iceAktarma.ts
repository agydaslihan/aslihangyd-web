import { sayiyaCevir, tariheCevir } from '@/lib/csv/ayristir'
import {
  eslenmemisSutunlarGenel,
  hucre,
  mahalleyiCozGenel,
  sadelestir,
  sutunlariEslestirGenel,
  type SutunEslemesiGenel,
  type SutunTanimi,
} from '@/lib/csv/sutun'

import { RAYIC_KAYNAKLARI, type RayicKaynagi } from './tipler'

/**
 * Rayiç bedel CSV içe aktarma — eşleme ve doğrulama.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN CSV İÇE AKTARMA ŞART
 *
 * Belediyeler rayiç bedel tablolarını PDF ya da Excel olarak yayınlıyor ve
 * bir mahallede yüzlerce sokak olabiliyor. Bunları panele tek tek girmek
 * günler sürer ve o yüzden hiç girilmez. Girilmeyen veri, olmayan veridir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HİÇBİR SATIR SESSİZCE DÜZELTİLMEZ VE SESSİZCE ATLANMAZ. Her satır üç
 * durumdan birinde: **hazır**, **uyarılı** (aktarılır, işaretlenir) veya
 * **hatalı** (aktarılmaz, sebebi yazılır). Gözlem içe aktarmasındaki
 * ilkenin aynısı.
 */

export const ALAN_TANIMLARI: readonly SutunTanimi<
  'mahalle' | 'sokak' | 'yil' | 'metrekareRayicBedel' | 'arsaRayicBedel' | 'kaynak' | 'notlar'
>[] = [
  {
    anahtar: 'mahalle',
    etiket: 'Mahalle',
    zorunlu: true,
    ipucu: 'Sistemdeki mahalle adıyla eşleşmeli',
    esanlamlilar: ['mahalle', 'mahalleadi', 'semt', 'bolge'],
  },
  {
    anahtar: 'sokak',
    etiket: 'Sokak / cadde',
    zorunlu: false,
    ipucu: 'Boşsa değer mahallenin geneli sayılır',
    esanlamlilar: ['sokak', 'cadde', 'caddesokak', 'yol', 'street'],
  },
  {
    anahtar: 'yil',
    etiket: 'Yıl',
    zorunlu: false,
    ipucu: 'Boşsa aşağıdaki varsayılan yıl kullanılır',
    esanlamlilar: ['yil', 'vergiyili', 'donem', 'year'],
  },
  {
    anahtar: 'metrekareRayicBedel',
    etiket: 'Bina m² rayiç bedeli',
    zorunlu: false,
    ipucu: 'Konut/bina metrekare değeri',
    esanlamlilar: [
      'binarayic',
      'binam2',
      'metrekarerayic',
      'rayic',
      'rayicbedel',
      'birimdeger',
      'metrekaredegeri',
    ],
  },
  {
    anahtar: 'arsaRayicBedel',
    etiket: 'Arsa m² rayiç bedeli',
    zorunlu: false,
    ipucu: 'Arsa metrekare değeri',
    esanlamlilar: ['arsarayic', 'arsam2', 'arsadegeri', 'arsabirimdeger'],
  },
  {
    anahtar: 'kaynak',
    etiket: 'Kaynak',
    zorunlu: false,
    ipucu: 'Boşsa aşağıdaki varsayılan kullanılır',
    esanlamlilar: ['kaynak', 'verikaynagi', 'source'],
  },
  {
    anahtar: 'notlar',
    etiket: 'Not',
    zorunlu: false,
    ipucu: 'İsteğe bağlı',
    esanlamlilar: ['not', 'notlar', 'aciklama'],
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

/** Eşlenmemiş zorunlu alanların etiketleri. */
export function eksikZorunluAlanlar(eslesme: SutunEslemesi): string[] {
  return ALAN_TANIMLARI.filter(
    (tanim) => tanim.zorunlu && (eslesme[tanim.anahtar] ?? null) === null,
  ).map((tanim) => tanim.etiket)
}

/** Kaynak metnini tanınan değere çevirir. */
export function kaynagiCoz(ham: string): RayicKaynagi | null {
  const sade = sadelestir(ham)
  if (sade === '') return null

  const dogrudan = RAYIC_KAYNAKLARI.find(
    (kaynak) => sadelestir(kaynak.value) === sade || sadelestir(kaynak.label) === sade,
  )
  if (dogrudan) return dogrudan.value

  if (sade.startsWith('beled')) return 'belediye'
  if (sade.startsWith('tkgm') || sade.startsWith('tapu')) return 'tkgm'
  if (sade.startsWith('elle') || sade.startsWith('manuel')) return 'elle'
  return null
}

export interface RayicGirdisi {
  mahalleId: number
  mahalleAdi: string
  sokak: string | null
  yil: number
  metrekareRayicBedel: number | null
  arsaRayicBedel: number | null
  kaynak: RayicKaynagi
  notlar: string | null
  guncellemeTarihi: string | null
}

export interface CozulmusSatir {
  /** CSV'deki satır numarası (başlık 1 sayılır) — hata mesajlarında kullanılır. */
  satirNo: number
  ham: string[]
  veri: RayicGirdisi | null
  hatalar: string[]
  uyarilar: string[]
}

export interface CozumlemeBaglami {
  mahalleler: readonly { id: number; ad: string; slug: string }[]
  /** CSV'de yıl sütunu yoksa ya da hücre boşsa kullanılır. */
  varsayilanYil: number
  /** CSV'de kaynak sütunu yoksa ya da hücre boşsa kullanılır. */
  varsayilanKaynak: RayicKaynagi
  /** Tablonun alındığı tarih — tüm satırlara aynı yazılır. */
  guncellemeTarihi?: string | null
}

export interface CozumlemeSonucu {
  satirlar: CozulmusSatir[]
  hazirSayisi: number
  uyariliSayisi: number
  hataliSayisi: number
}

/**
 * ⚠️ MAKUL ARALIK — SESSİZ SIFIR KAYMASINA KARŞI
 *
 * Belediye tablolarında rakam bazen "12.500" bazen "12,500" yazılır ve
 * ayrıştırıcı belirsizliği tamamen çözemez. Aralık dışındaki değer
 * ENGELLENMİYOR ama uyarı üretiyor: bir sıfır fazlası ya da eksiği,
 * rayiç/piyasa oranını on kat saptırır ve fark edilmesi aylar sürer.
 */
const MAKUL_ALT = 100
const MAKUL_UST = 500_000

export function satirlariCozumle(
  satirlar: readonly string[][],
  eslesme: SutunEslemesi,
  baglam: CozumlemeBaglami,
): CozumlemeSonucu {
  /** Dosya içi mükerrer: aynı mahalle + sokak + yıl iki kez yazılmış. */
  const gorulen = new Map<string, number>()
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

    const yilHam = hucre(satir, eslesme.yil)
    let yil = baglam.varsayilanYil
    if (yilHam !== '') {
      const cozulen = sayiyaCevir(yilHam)
      if (cozulen === null || !Number.isInteger(cozulen) || cozulen < 1990 || cozulen > 2100) {
        hatalar.push(`Yıl okunamadı: "${yilHam}".`)
      } else {
        yil = cozulen
      }
    }

    const binaHam = hucre(satir, eslesme.metrekareRayicBedel)
    const arsaHam = hucre(satir, eslesme.arsaRayicBedel)
    const bina = binaHam === '' ? null : sayiyaCevir(binaHam)
    const arsa = arsaHam === '' ? null : sayiyaCevir(arsaHam)

    if (binaHam !== '' && bina === null) hatalar.push(`Bina rayiç bedeli okunamadı: "${binaHam}".`)
    if (arsaHam !== '' && arsa === null) hatalar.push(`Arsa rayiç bedeli okunamadı: "${arsaHam}".`)

    if (bina === null && arsa === null && hatalar.length === 0) {
      hatalar.push('Satırda ne bina ne arsa rayiç bedeli var — yazılacak bir rakam yok.')
    }

    for (const [etiket, deger] of [
      ['Bina', bina],
      ['Arsa', arsa],
    ] as const) {
      if (deger === null) continue
      if (deger <= 0) {
        hatalar.push(`${etiket} rayiç bedeli sıfır ya da negatif.`)
      } else if (deger < MAKUL_ALT || deger > MAKUL_UST) {
        uyarilar.push(
          `${etiket} rayiç bedeli olağandışı (${deger.toLocaleString('tr-TR')} ₺/m²). ` +
            'Binlik ayırıcı yanlış okunmuş olabilir — rakamı gözle doğrulayın.',
        )
      }
    }

    const kaynakHam = hucre(satir, eslesme.kaynak)
    let kaynak = baglam.varsayilanKaynak
    if (kaynakHam !== '') {
      const cozulen = kaynagiCoz(kaynakHam)
      if (cozulen === null) {
        uyarilar.push(`Kaynak tanınmadı ("${kaynakHam}"); varsayılan kullanıldı.`)
      } else {
        kaynak = cozulen
      }
    }

    const sokakHam = hucre(satir, eslesme.sokak)
    const sokak = sokakHam === '' ? null : sokakHam
    const notlarHam = hucre(satir, eslesme.notlar)

    if (mahalle) {
      const anahtar = `${mahalle.id}|${sadelestir(sokak ?? '')}|${yil}`
      const oncekiSatir = gorulen.get(anahtar)
      if (oncekiSatir !== undefined) {
        uyarilar.push(`Bu mahalle/sokak/yıl birleşimi ${oncekiSatir}. satırda da var.`)
      } else {
        gorulen.set(anahtar, satirNo)
      }
    }

    const veri: RayicGirdisi | null =
      hatalar.length > 0 || !mahalle
        ? null
        : {
            mahalleId: mahalle.id,
            mahalleAdi: mahalle.ad,
            sokak,
            yil,
            metrekareRayicBedel: bina,
            arsaRayicBedel: arsa,
            kaynak,
            notlar: notlarHam === '' ? null : notlarHam,
            guncellemeTarihi: baglam.guncellemeTarihi ?? null,
          }

    sonuc.push({ satirNo, ham: [...satir], veri, hatalar, uyarilar })
  })

  return {
    satirlar: sonuc,
    hazirSayisi: sonuc.filter((s) => s.veri !== null && s.uyarilar.length === 0).length,
    uyariliSayisi: sonuc.filter((s) => s.veri !== null && s.uyarilar.length > 0).length,
    hataliSayisi: sonuc.filter((s) => s.veri === null).length,
  }
}

/** Kullanıcının girdiği tablo tarihini ISO'ya çevirir. */
export function tabloTarihiniCoz(ham: string): string | null {
  return tariheCevir(ham)
}
