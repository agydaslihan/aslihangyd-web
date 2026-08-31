import { sayiyaCevir } from '@/lib/csv/ayristir'

/**
 * Panel sayı alanının Türkçe ayrıştırıcısı — KÖK NEDEN DÜZELTMESİ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SORUN UYARIYLA ÇÖZÜLMEZ, ÇÜNKÜ SORUN KULLANICIDA DEĞİL
 *
 * Payload'ın `type: 'number'` alanı tarayıcıya `<input type="number">`
 * basar. Tarayıcı bu girdide noktayı **ondalık** ayırıcı sayar. Türkçe
 * yazan biri "39.704" yazdığında tarayıcı bunu 39,704 diye okur ve
 * değeri bin kat küçültür. Hata sessizdir: ne kırmızı çerçeve çıkar ne
 * uyarı — kayıt başarıyla kaydedilir.
 *
 * Aynı girdi ters yönde de kırıktır: "2,55" yazıldığında Chrome virgülü
 * kabul etmez ve alanı BOŞ sayar. Yani Türkçe yerelin iki ayırıcısı da
 * çalışmıyor.
 *
 * 31 Ağustos 2026'da Alipaşa'nın üç rakamı (m² satış, kira, nüfus) ve bir
 * ilanın aidatı bu yüzden bindebir kaydedilmişti; hata veritabanında değil
 * SİTEDE fark edildi.
 *
 * Çözüm: alanı `type="text"` + `inputMode="decimal"` yapmak ve metni
 * içe aktarıcıyla **aynı** ayrıştırıcıdan (`sayiyaCevir`) geçirmek. Böylece
 * elle girilen "39.704" ile CSV'den gelen "39.704" aynı sayıyı üretir —
 * iki ayrı ayrıştırıcı olsaydı ikisi zamanla ayrışırdı.
 *
 * ⚠️ Ölçek uyarısı (`OlcekUyarisi`) KALDIRILMADI. Bu ayrıştırıcı biçim
 * hatasını çözüyor; uyarı ise doğru biçimde yazılmış ama yine de
 * mertebesi tuhaf olan rakamı yakalıyor. İkisi farklı işler.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface SayiCozumu {
  /** Forma yazılacak değer. Boş girdi `null` — "bilinmiyor" demektir. */
  deger: number | null
  /** Ayrıştırılamadıysa Türkçe hata; ayrıştıysa `null`. */
  hata: string | null
}

/**
 * Ardışık ya da baştaki ayırıcı — insan elinden çıkmış bir sayı değildir.
 *
 * `sayiyaCevir` CSV için hoşgörülüdür ("1..2" → 12). İçe aktarmada bu
 * doğru davranış: bin satırlık dosya tek bozuk hücre yüzünden durmasın.
 * Panelde ise tam tersi doğru — tek bir alan yazılıyor, kullanıcı ekranın
 * başında, hatayı şimdi göstermek en ucuz an.
 */
const BOZUK_AYIRICI = /^[.,]|[.,]{2}|[.,]$/

/** Kullanıcının yazdığı metni sayıya çevirir. */
export function panelSayisiCoz(ham: string): SayiCozumu {
  const metin = ham.trim()
  if (metin === '') return { deger: null, hata: null }

  if (BOZUK_AYIRICI.test(metin)) {
    return { deger: null, hata: 'Nokta ve virgüller yan yana ya da sonda olamaz.' }
  }

  const sayi = sayiyaCevir(metin)
  if (sayi === null) {
    return { deger: null, hata: 'Sayı olarak okunamadı. Örnek: 39.704 ya da 2,55.' }
  }

  return { deger: sayi, hata: null }
}

/**
 * Sayıyı Türkçe yerelde yazar — kullanıcının GÖRDÜĞÜ değer bu.
 *
 * ⚠️ Geri bildirimin tamamı bu satırda. "39.704" yazan biri altta
 * "39.704" görürse binlik okunmuş, "39,704" görürse ondalık okunmuş
 * demektir. İki durum ekranda farklı görünmeseydi ayrıştırıcının doğru
 * çalıştığına dair kullanıcının hiçbir kanıtı olmazdı.
 */
export function panelSayisiYaz(deger: number | null | undefined): string {
  if (typeof deger !== 'number' || !Number.isFinite(deger)) return ''
  return deger.toLocaleString('tr-TR', { maximumFractionDigits: 20 })
}

/**
 * Türkçe sayı girdisi kullanan alanlar.
 *
 * ⚠️ Küçük tam sayılar (banyo sayısı, kat, bina yaşı, 0–100 puanlar) bu
 * listede YOK: binlik ayırıcı riski taşımıyorlar ve `type="number"`in ok
 * tuşlarıyla artırma davranışı orada gerçekten işe yarıyor.
 */
export const TURKCE_SAYI_ALANLARI = [
  'ortalamaM2Satis',
  'ortalamaKira',
  'kiraCarpani',
  'degisim12Ay',
  'nufus',
  'gozlemSayisi',
  'fiyat',
  'tahminiKira',
  'aidat',
  'brutM2',
  'netM2',
] as const

export type TurkceSayiAlani = (typeof TURKCE_SAYI_ALANLARI)[number]
