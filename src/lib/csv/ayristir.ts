/**
 * CSV ayrıştırıcı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN KÜTÜPHANE DEĞİL
 *
 * Bu ayrıştırıcının çözmesi gereken asıl sorun genel CSV değil, **Türkçe
 * Excel'in CSV'si.** Türkçe yerelde Excel:
 *
 *  - Alanları noktalı virgülle ayırır (`;`), virgülle değil — çünkü virgül
 *    ondalık ayırıcıdır
 *  - Dosyayı BOM ile başlatır
 *  - Satır sonlarını CRLF yapar
 *
 * Hazır kütüphanelerin çoğu virgülü varsayar; noktalı virgülle ayrılmış bir
 * dosyayı **tek sütun** olarak okur ve hata vermez. Sessizce yanlış çalışan
 * bir içe aktarma, hata veren bir içe aktarmadan çok daha pahalıdır.
 *
 * Ayırıcı sezgisi + Türkçe sayı ayrıştırma (`sayiyaCevir`) bu dosyanın asıl
 * işi; RFC 4180 tırnak kuralları da uygulanır (gömülü ayırıcı, satır sonu
 * ve çift tırnak kaçışı).
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Sınanan ayırıcılar — sıra önemli değil, en çok sütun üreten kazanır. */
const AYIRICI_ADAYLARI = [';', ',', '\t', '|'] as const

export type Ayirici = (typeof AYIRICI_ADAYLARI)[number]

export interface AyristirmaSonucu {
  /** Başlık satırı — ham haliyle, kırpılmış. */
  basliklar: string[]
  /** Veri satırları. Her satır başlık sayısına hizalanır. */
  satirlar: string[][]
  /** Kullanılan ayırıcı — arayüzde gösterilir ki yanlışsa fark edilsin. */
  ayirici: Ayirici
  /** Ayrıştırma sırasında atlanan tamamen boş satır sayısı. */
  atlananBosSatir: number
}

/**
 * Ayırıcı sezgisi.
 *
 * İlk birkaç satırda hangi ayırıcı **tutarlı biçimde en çok sütun**
 * üretiyorsa o seçilir. Tutarlılık şart: 3 satırda 7, 2, 9 sütun üreten bir
 * aday, 3 satırda hep 4 sütun üretenden kötüdür.
 */
export function ayiriciSez(metin: string): Ayirici {
  const ornekSatirlar = metin
    .split(/\r?\n/)
    .filter((satir) => satir.trim() !== '')
    .slice(0, 5)

  if (ornekSatirlar.length === 0) return ';'

  let enIyi: Ayirici = ';'
  let enIyiPuan = -1

  for (const aday of AYIRICI_ADAYLARI) {
    const sayilar = ornekSatirlar.map((satir) => satirdakiAyiriciSayisi(satir, aday))
    const enAz = Math.min(...sayilar)
    if (enAz === 0) continue

    // Tutarsızlık cezası: satırlar arası fark ne kadar büyükse puan o kadar düşer.
    const enCok = Math.max(...sayilar)
    const puan = enAz * 10 - (enCok - enAz)

    if (puan > enIyiPuan) {
      enIyiPuan = puan
      enIyi = aday
    }
  }

  return enIyi
}

/** Tırnak içindeki ayırıcılar sayılmaz. */
function satirdakiAyiriciSayisi(satir: string, ayirici: string): number {
  let sayi = 0
  let tirnakIcinde = false

  for (let i = 0; i < satir.length; i += 1) {
    const karakter = satir[i]
    if (karakter === '"') {
      // Çift tırnak kaçışı ("") tırnak durumunu değiştirmez.
      if (tirnakIcinde && satir[i + 1] === '"') {
        i += 1
        continue
      }
      tirnakIcinde = !tirnakIcinde
      continue
    }
    if (!tirnakIcinde && karakter === ayirici) sayi += 1
  }

  return sayi
}

/**
 * CSV metnini satırlara ayırır.
 *
 * @param ayirici Belirtilmezse sezilir. Arayüz sezgiyi kullanıcıya gösterir
 *                ve elle değiştirmesine izin verir.
 */
export function csvAyristir(metin: string, ayirici?: Ayirici): AyristirmaSonucu {
  // BOM — Excel'in Türkçe yerelde en sık bıraktığı iz. Temizlenmezse ilk
  // sütun başlığı "Tarih" değil "﻿Tarih" olur ve eşleşme tutmaz.
  const temiz = metin.replace(/^﻿/, '')
  const kullanilan = ayirici ?? ayiriciSez(temiz)

  const tumSatirlar: string[][] = []
  let aktifSatir: string[] = []
  let aktifAlan = ''
  let tirnakIcinde = false

  const alaniBitir = (): void => {
    aktifSatir.push(aktifAlan)
    aktifAlan = ''
  }

  const satiriBitir = (): void => {
    alaniBitir()
    tumSatirlar.push(aktifSatir)
    aktifSatir = []
  }

  for (let i = 0; i < temiz.length; i += 1) {
    const karakter = temiz[i]

    if (tirnakIcinde) {
      if (karakter === '"') {
        if (temiz[i + 1] === '"') {
          aktifAlan += '"'
          i += 1
        } else {
          tirnakIcinde = false
        }
      } else {
        aktifAlan += karakter
      }
      continue
    }

    if (karakter === '"') {
      tirnakIcinde = true
      continue
    }

    if (karakter === kullanilan) {
      alaniBitir()
      continue
    }

    if (karakter === '\r') {
      // CRLF'in CR'ı yutulur; satırı LF bitirir.
      if (temiz[i + 1] === '\n') continue
      satiriBitir()
      continue
    }

    if (karakter === '\n') {
      satiriBitir()
      continue
    }

    aktifAlan += karakter
  }

  // Dosya satır sonuyla bitmiyorsa son satır kaybolmasın.
  if (aktifAlan !== '' || aktifSatir.length > 0) satiriBitir()

  const doluSatirlar = tumSatirlar.filter((satir) => satir.some((alan) => alan.trim() !== ''))
  const atlananBosSatir = tumSatirlar.length - doluSatirlar.length

  const basliklar = (doluSatirlar[0] ?? []).map((baslik) => baslik.trim())
  const govde = doluSatirlar.slice(1)

  // Satırları başlık sayısına hizala: eksik hücreler boş dizeyle doldurulur,
  // fazlası korunur (kullanıcı önizlemede görsün diye kırpılmıyor).
  const satirlar = govde.map((satir) => {
    const hizali = [...satir.map((alan) => alan.trim())]
    while (hizali.length < basliklar.length) hizali.push('')
    return hizali
  })

  return { basliklar, satirlar, ayirici: kullanilan, atlananBosSatir }
}

/**
 * Türkçe (ve İngilizce) sayı metnini sayıya çevirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU FONKSİYONUN YANLIŞ ÇALIŞMASI SESSİZ BİR FELAKETTİR
 *
 * "4.300.000" Türkçe'de 4,3 milyondur; İngilizce ayrıştırıcıda 4,3 olur.
 * Böyle bir hata endekse girer ve fark edilmesi aylar sürer.
 *
 * Kural:
 *  - Hem `.` hem `,` varsa → SONDAKİ ondalık ayırıcıdır (1.234,56 / 1,234.56)
 *  - Yalnızca `,` varsa → ondalık ayırıcıdır (Türkçe yerel)
 *  - Yalnızca `.` varsa → son grup tam 3 haneliyse binlik, değilse ondalık
 *    ("4.300" → 4300 · "4.35" → 4.35)
 *
 * Belirsizlik tamamen yok edilemez; bu yüzden içe aktarma önizlemesi
 * **çözümlenmiş sayıyı** gösterir. Asıl güvence gözle doğrulamadır.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function sayiyaCevir(ham: string): number | null {
  const metin = ham.trim()
  if (metin === '') return null

  // Para birimi simgeleri, boşluklar ve binlik ayırıcı olarak kullanılan
  // kesme işareti temizlenir.
  const sade = metin.replace(/[₺$€\s ']/g, '')
  if (sade === '') return null

  // Rakam, ayırıcı ve işaret dışında bir şey varsa sayı değildir.
  if (!/^[-+]?[\d.,]+$/.test(sade)) return null

  const sonNokta = sade.lastIndexOf('.')
  const sonVirgul = sade.lastIndexOf(',')

  let normal: string

  if (sonNokta !== -1 && sonVirgul !== -1) {
    // İkisi de var: sondaki ondalık ayırıcıdır.
    if (sonVirgul > sonNokta) {
      normal = sade.replace(/\./g, '').replace(',', '.')
    } else {
      normal = sade.replace(/,/g, '')
    }
  } else if (sonVirgul !== -1) {
    // Yalnızca virgül → Türkçe ondalık. Birden fazlaysa binlik ayırıcıdır.
    const virgulSayisi = (sade.match(/,/g) ?? []).length
    normal = virgulSayisi > 1 ? sade.replace(/,/g, '') : sade.replace(',', '.')
  } else if (sonNokta !== -1) {
    const noktaSayisi = (sade.match(/\./g) ?? []).length
    const sonGrup = sade.slice(sonNokta + 1)

    // Birden fazla nokta ya da tam 3 haneli son grup → binlik ayırıcı.
    if (noktaSayisi > 1 || (sonGrup.length === 3 && sonNokta > 0)) {
      normal = sade.replace(/\./g, '')
    } else {
      normal = sade
    }
  } else {
    normal = sade
  }

  const sayi = Number(normal)
  return Number.isFinite(sayi) ? sayi : null
}

/**
 * Tarih metnini ISO tarihine çevirir ('YYYY-MM-DD').
 *
 * Desteklenen biçimler: `GG.AA.YYYY`, `GG/AA/YYYY`, `YYYY-AA-GG`,
 * `GG-AA-YYYY`. Türkçe elektronik tabloların ürettiği biçimler bunlar.
 *
 * ⚠️ `new Date(metin)` KULLANILMIYOR: "03.08.2026" gibi bir dizeyi tarayıcı
 * ve Node farklı yorumlar, bazıları da ay/gün sırasını Amerikan varsayar.
 * 3 Ağustos ile 8 Mart arasındaki fark, endekste bir aylık kaymadır.
 */
export function tariheCevir(ham: string): string | null {
  const metin = ham.trim()
  if (metin === '') return null

  const parcalar = metin.split(/[.\-/]/).map((p) => p.trim())
  if (parcalar.length !== 3) return null
  if (parcalar.some((p) => p === '' || !/^\d+$/.test(p))) return null

  const [birinci, ikinci, ucuncu] = parcalar as [string, string, string]

  let yil: number
  let ay: number
  let gun: number

  if (birinci.length === 4) {
    // YYYY-AA-GG
    yil = Number(birinci)
    ay = Number(ikinci)
    gun = Number(ucuncu)
  } else if (ucuncu.length === 4) {
    // GG.AA.YYYY — Türkçe yerelin varsayılanı
    gun = Number(birinci)
    ay = Number(ikinci)
    yil = Number(ucuncu)
  } else {
    // İki haneli yıl belirsizdir; tahmin etmiyoruz.
    return null
  }

  if (ay < 1 || ay > 12) return null
  if (gun < 1 || gun > 31) return null
  if (yil < 1900 || yil > 2200) return null

  // Ayın gerçekten o kadar günü var mı (31 Şubat reddedilsin).
  const tarih = new Date(Date.UTC(yil, ay - 1, gun))
  if (tarih.getUTCMonth() !== ay - 1 || tarih.getUTCDate() !== gun) return null

  const iki = (sayi: number): string => String(sayi).padStart(2, '0')
  return `${yil}-${iki(ay)}-${iki(gun)}`
}
