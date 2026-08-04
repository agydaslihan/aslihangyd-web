import type { VergiDilimi } from '@/lib/vergi/parametreler'

import { kurusaYuvarla } from './tipler'

/**
 * Artan oranlı gelir vergisi hesabı.
 *
 * Hem kira geliri hem değer artış kazancı hesaplayıcısı bunu kullanır;
 * tarife tek yerde uygulansın diye ayrıldı.
 *
 * Dilimler **kümülatif** uygulanır: matrahın ilk diliminin üst sınırına
 * kadarki kısmı o dilimin oranıyla, sonraki kısmı bir sonraki oranla
 * vergilendirilir. "Matrah 800 bini geçtiği için tamamı %40" şeklindeki
 * yaygın yanlış anlama burada yapılmaz.
 */

export interface DilimHesabi {
  /** Bu dilimde vergilendirilen matrah kısmı. */
  matrahKismi: number
  oran: number
  vergi: number
  altSinir: number
  ustSinir: number | null
}

export interface GelirVergisiSonucu {
  toplamVergi: number
  dilimler: DilimHesabi[]
  /** Toplam verginin matraha oranı — "etkin vergi oranı", yüzde. */
  etkinOran: number
}

export function gelirVergisiHesapla(
  matrah: number,
  dilimler: readonly VergiDilimi[],
): GelirVergisiSonucu {
  if (matrah <= 0 || dilimler.length === 0) {
    return { toplamVergi: 0, dilimler: [], etkinOran: 0 }
  }

  // Dilimlerin sıralı olduğuna güvenmiyoruz; CMS'te elle girilecekler.
  // `null` üst sınır ("ve üzeri") her zaman sona gider.
  const sirali = [...dilimler].sort((a, b) => {
    if (a.ustSinir === null) return 1
    if (b.ustSinir === null) return -1
    return a.ustSinir - b.ustSinir
  })

  const hesaplar: DilimHesabi[] = []
  let toplamVergi = 0
  let altSinir = 0

  for (const dilim of sirali) {
    if (altSinir >= matrah) break

    const ustSinir = dilim.ustSinir ?? Number.POSITIVE_INFINITY
    const dilimTavani = Math.min(ustSinir, matrah)
    const matrahKismi = dilimTavani - altSinir

    if (matrahKismi > 0) {
      const vergi = kurusaYuvarla(matrahKismi * dilim.oran)
      toplamVergi += vergi

      hesaplar.push({
        matrahKismi: kurusaYuvarla(matrahKismi),
        oran: dilim.oran,
        vergi,
        altSinir,
        ustSinir: dilim.ustSinir,
      })
    }

    altSinir = ustSinir
  }

  const yuvarlanmisToplam = kurusaYuvarla(toplamVergi)

  return {
    toplamVergi: yuvarlanmisToplam,
    dilimler: hesaplar,
    etkinOran: kurusaYuvarla((yuvarlanmisToplam / matrah) * 100),
  }
}
