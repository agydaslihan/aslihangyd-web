import { girdiEksik, hesaplandi, kurusaYuvarla, pozitifMi, type HesapSonucu } from './tipler'

/**
 * Konut kredisi hesaplayıcı — eşit taksitli (anüite) ödeme planı.
 *
 * Formül:
 *   taksit = anapara × (i × (1+i)^n) / ((1+i)^n − 1)
 * i: aylık faiz oranı (ondalık), n: vade (ay)
 *
 * Faiz oranı KULLANICIDAN alınır, parametre koleksiyonundan değil: konut
 * kredisi faizi bankadan bankaya ve haftadan haftaya değişir. CMS'te tek bir
 * "güncel faiz" tutmak, ziyaretçiye eskimiş bir rakamla hesap yaptırmak olur.
 *
 * ⚠️ Bankaların uyguladığı KKDF/BSMV, dosya masrafı ve sigorta bu hesaba
 * DAHİL DEĞİLDİR. Arayüz bunu açıkça yazar — "gerçek maliyet" izlenimi
 * vermek yanıltıcı olurdu.
 */

export interface KrediGirdisi {
  /** Kredi anaparası. */
  tutar?: number | null
  /** Aylık faiz oranı, yüzde olarak (örn. 2,89 → %2,89). */
  aylikFaizYuzdesi?: number | null
  /** Vade, ay cinsinden. */
  vadeAy?: number | null
}

export interface OdemePlaniSatiri {
  ay: number
  taksit: number
  anapara: number
  faiz: number
  kalanAnapara: number
}

export interface KrediSonucu {
  aylikTaksit: number
  toplamGeriOdeme: number
  toplamFaiz: number
  /** Toplam geri ödemenin anaparaya oranı — "1 TL borç, kaç TL ödeme". */
  maliyetKatsayisi: number
  odemePlani: OdemePlaniSatiri[]
}

/** Ödeme planı en fazla bu kadar satır üretir (30 yıl). */
const AZAMI_VADE_AY = 360

/**
 * Eşit taksitli (anüite) aylık ödeme.
 *
 * Kredi hesaplayıcı dışında yatırım simülatörü ve kira/satın alma
 * karşılaştırıcısı da aynı formülü kullanıyor. Üç ayrı kopya, birinde
 * yapılan bir düzeltmenin diğerlerine geçmemesi demek olurdu.
 *
 * `anapara` sıfır veya negatifse 0 döner (kredisiz senaryo).
 * Hesaplanamayan birleşimlerde `null` döner.
 */
export function anuiteTaksiti(
  anapara: number,
  aylikFaizOrani: number,
  vadeAy: number,
): number | null {
  if (anapara <= 0) return 0
  if (vadeAy <= 0) return null

  // Faizsiz kredi matematiksel olarak geçerli bir durum; anüite formülü
  // burada sıfıra bölme üretir, bu yüzden ayrı ele alınıyor.
  const taksit =
    aylikFaizOrani === 0
      ? anapara / vadeAy
      : (anapara * (aylikFaizOrani * (1 + aylikFaizOrani) ** vadeAy)) /
        ((1 + aylikFaizOrani) ** vadeAy - 1)

  return Number.isFinite(taksit) && taksit > 0 ? taksit : null
}

export function krediHesapla(girdi: KrediGirdisi): HesapSonucu<KrediSonucu> {
  const eksikler: { anahtar: string; etiket: string }[] = []
  if (!pozitifMi(girdi.tutar)) eksikler.push({ anahtar: 'tutar', etiket: 'Kredi tutarı' })
  if (!pozitifMi(girdi.vadeAy)) eksikler.push({ anahtar: 'vadeAy', etiket: 'Vade (ay)' })
  if (typeof girdi.aylikFaizYuzdesi !== 'number' || !Number.isFinite(girdi.aylikFaizYuzdesi)) {
    eksikler.push({ anahtar: 'aylikFaizYuzdesi', etiket: 'Aylık faiz oranı' })
  }
  if (eksikler.length > 0) return girdiEksik(eksikler)

  const anapara = girdi.tutar as number
  const vade = Math.min(Math.round(girdi.vadeAy as number), AZAMI_VADE_AY)
  const aylikFaiz = (girdi.aylikFaizYuzdesi as number) / 100

  const aylikTaksit = anuiteTaksiti(anapara, aylikFaiz, vade)

  if (aylikTaksit === null || aylikTaksit === 0) {
    return girdiEksik([
      { anahtar: 'aylikFaizYuzdesi', etiket: 'Faiz oranı bu vade için hesaplanamıyor' },
    ])
  }

  const odemePlani: OdemePlaniSatiri[] = []
  let kalan = anapara

  for (let ay = 1; ay <= vade; ay += 1) {
    const faizTutari = kurusaYuvarla(kalan * aylikFaiz)
    // Son taksitte yuvarlama artıkları kalanı sıfırlamalı; aksi halde
    // planın sonunda birkaç kuruş borç görünür.
    const anaparaTutari =
      ay === vade ? kurusaYuvarla(kalan) : kurusaYuvarla(aylikTaksit - faizTutari)

    kalan = kurusaYuvarla(kalan - anaparaTutari)

    odemePlani.push({
      ay,
      taksit: kurusaYuvarla(anaparaTutari + faizTutari),
      anapara: anaparaTutari,
      faiz: faizTutari,
      kalanAnapara: Math.max(kalan, 0),
    })
  }

  const toplamGeriOdeme = kurusaYuvarla(
    odemePlani.reduce((toplam, satir) => toplam + satir.taksit, 0),
  )

  return hesaplandi({
    aylikTaksit: kurusaYuvarla(aylikTaksit),
    toplamGeriOdeme,
    toplamFaiz: kurusaYuvarla(toplamGeriOdeme - anapara),
    maliyetKatsayisi: kurusaYuvarla(toplamGeriOdeme / anapara),
    odemePlani,
  })
}
