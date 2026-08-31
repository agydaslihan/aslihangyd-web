import { KATMAN_MINIMUM_GOZLEM } from '@/lib/endeks/tipler'

/**
 * Mahalle rakamlarının güven kuralları — TEK KAYNAK.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU KURALLAR UYARIR, ENGELLEMEZ.
 *
 * Gözlem içe aktarmasındaki ilkenin aynısı: bir rakamı "aykırı" diye
 * reddetmek, veriyi kendi beklentimize göre budamaktır. Gerçekten hızlı
 * değer kazanan bir mahalle gerçekten +%70 yapabilir. Sistem soruyu sorar,
 * kararı insan verir.
 *
 * ⚠️ AMA GÖRMEDEN GEÇEMEZ. Uyarı üretilmesi yetmiyor; uyarılı veri sitede
 * de "tahmini" olarak işaretleniyor. İçe aktarmada görülüp unutulan bir
 * uyarı, hiç verilmemiş uyarıyla aynıdır.
 *
 * ⚠️ AYNI MODÜL HEM İÇE AKTARMADA HEM SİTEDE KULLANILIYOR. İki ayrı yerde
 * iki ayrı eşik yazılsaydı, panelde "düşük güven" diyen bir rakam sitede
 * güvenilir görünebilirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Bir mahallenin rakamlarının "güvenilir" sayılması için gereken gözlem.
 *
 * ⚠️ SAYI ENDEKSTEN GELİYOR, BURADA YENİDEN YAZILMIYOR. CLAUDE.md 6c
 * katman başına 8 gözlem diyor; mahalle rakamları için ayrı bir eşik
 * uydurmak, aynı projede iki farklı "yeterli veri" tanımı üretirdi.
 */
export const GUVEN_ESIGI = KATMAN_MINIMUM_GOZLEM

/**
 * Aylık kiranın m² satış fiyatına makul oranı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BANT BİR TAHMİN DEĞİL, TÜRETİLMİŞ BİR ARALIK — VE VARSAYIMLARI
 *    AÇIKÇA YAZILI.
 *
 * Bir dairenin aylık kirası, tanım gereği:
 *
 *     kira = (m²Satış × dairenin m²'si) / (12 × kira çarpanı)
 *
 * Buradan oran:
 *
 *     kira / m²Satış = dairenin m²'si / (12 × çarpan)
 *
 * Çorlu ölçeğinde daire 80–120 m², çarpan 15–25 yıl alındığında:
 *
 *     alt  = 80 / (12 × 25) = 0,27
 *     üst  = 120 / (12 × 15) = 0,67
 *
 * ⚠️ ASIL YAKALADIĞI ŞEY BİRİM KARIŞIKLIĞI. Kira aylık yerine m² başına
 * girildiğinde oran ~0,01'e, satış fiyatı m² yerine toplam girildiğinde
 * ~0,0005'e düşüyor. İkisi de bandın kilometrelerce dışında.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const KIRA_ORANI_ALT = 0.27
export const KIRA_ORANI_UST = 0.67

/**
 * 12 aylık değişimin uyarısız kabul edildiği aralık.
 *
 * ⚠️ ±%60 dışı imkânsız değil, ALIŞILMADIK. Yeni bir OSB yatırımı ya da
 * hızlı tren duyurusu bir mahallede bunu yapabilir. Ama aynı rakam, bir
 * önceki yılın verisiyle karşılaştırılırken yapılan bir birim hatasının da
 * en yaygın görüntüsü.
 */
export const DEGISIM_SINIRI = 60

/**
 * Kira çarpanının makul aralığı.
 *
 * ⚠️ 5 yılın altı ve 50 yılın üstü, konut piyasasında bir yatırım
 * göstergesi değil bir veri hatasıdır.
 */
export const CARPAN_ALT = 5
export const CARPAN_UST = 50

export interface MahalleRakamlari {
  ortalamaM2Satis?: number | null
  ortalamaKira?: number | null
  kiraCarpani?: number | null
  degisim12Ay?: number | null
  gozlemSayisi?: number | null
}

export type GuvenUyarisiKodu =
  'az_gozlem' | 'gozlem_yok' | 'kira_orani' | 'degisim_asiri' | 'carpan_disi'

export interface GuvenUyarisi {
  kod: GuvenUyarisiKodu
  mesaj: string
}

const sayi = (deger: unknown): number | null =>
  typeof deger === 'number' && Number.isFinite(deger) ? deger : null

/**
 * Rakamlar "düşük güvenli" mi?
 *
 * ⚠️ GÖZLEM SAYISI BİLİNMİYORSA DA DÜŞÜK GÜVEN. "n girilmemiş" ile "n
 * yeterli" aynı şey değil; boş bırakılmış bir n, rakamın neye dayandığını
 * kimsenin bilmediği anlamına gelir.
 */
export function dusukGuvenliMi(rakamlar: MahalleRakamlari): boolean {
  const n = sayi(rakamlar.gozlemSayisi)
  return n === null || n < GUVEN_ESIGI
}

/** Sitede gösterilecek herhangi bir rakam var mı? */
export function rakamVarMi(rakamlar: MahalleRakamlari): boolean {
  return (
    sayi(rakamlar.ortalamaM2Satis) !== null ||
    sayi(rakamlar.ortalamaKira) !== null ||
    sayi(rakamlar.kiraCarpani) !== null ||
    sayi(rakamlar.degisim12Ay) !== null
  )
}

/**
 * Bir mahallenin rakamları için tüm uyarılar.
 *
 * ⚠️ Sıra önemli: en çok şey söyleyen uyarı önce. Panelde ilk satır
 * okunuyor, gerisi çoğu zaman okunmuyor.
 */
export function guvenUyarilari(rakamlar: MahalleRakamlari): GuvenUyarisi[] {
  const uyarilar: GuvenUyarisi[] = []

  const n = sayi(rakamlar.gozlemSayisi)
  const m2Satis = sayi(rakamlar.ortalamaM2Satis)
  const kira = sayi(rakamlar.ortalamaKira)
  const carpan = sayi(rakamlar.kiraCarpani)
  const degisim = sayi(rakamlar.degisim12Ay)

  if (rakamVarMi(rakamlar)) {
    if (n === null) {
      uyarilar.push({
        kod: 'gozlem_yok',
        mesaj:
          'Gözlem sayısı (n) girilmemiş. Rakamlar sitede "tahmini" olarak işaretlenecek — ' +
          'neye dayandığı bilinmeyen bir rakam yayınlanamaz.',
      })
    } else if (n < GUVEN_ESIGI) {
      uyarilar.push({
        kod: 'az_gozlem',
        mesaj:
          `Gözlem sayısı ${n}; metodolojimizin eşiği ${GUVEN_ESIGI}. Rakamlar aktarılır ama ` +
          'sitede "tahmini" olarak işaretlenir ve endekse girmez.',
      })
    }
  }

  if (m2Satis !== null && kira !== null && m2Satis > 0) {
    const oran = kira / m2Satis
    if (oran < KIRA_ORANI_ALT || oran > KIRA_ORANI_UST) {
      uyarilar.push({
        kod: 'kira_orani',
        mesaj:
          `Aylık kiranın m² satış fiyatına oranı ${oran.toFixed(2)}; beklenen aralık ` +
          `${KIRA_ORANI_ALT}–${KIRA_ORANI_UST}. Birim karışıklığı olabilir: kira aylık mı, ` +
          'satış fiyatı m² başına mı?',
      })
    }
  }

  if (degisim !== null && Math.abs(degisim) > DEGISIM_SINIRI) {
    uyarilar.push({
      kod: 'degisim_asiri',
      mesaj:
        `12 aylık değişim %${degisim}; ±%${DEGISIM_SINIRI} dışında. Gerçek olabilir, ama ` +
        'birim ya da dönem hatasının da en yaygın görüntüsü.',
    })
  }

  if (carpan !== null && (carpan < CARPAN_ALT || carpan > CARPAN_UST)) {
    uyarilar.push({
      kod: 'carpan_disi',
      mesaj:
        `Kira çarpanı ${carpan} yıl; beklenen aralık ${CARPAN_ALT}–${CARPAN_UST}. ` +
        'Bu aralığın dışı bir yatırım göstergesi değil, bir veri hatasıdır.',
    })
  }

  return uyarilar
}
