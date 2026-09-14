import { sayiIyelik } from '@/lib/metin/iyelik'

import { eidsDegerlendir } from './kurallar'
import { EIDS_ENGEL_KODLARI, type EidsEngelKodu, type EidsGirdisi } from './types'

/**
 * EİDS ilerlemesi — "altı eksikten kaçı tamamlandı".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: ALTI EKSİK TEK SEFERDE GÖRÜNÜYORDU.
 *
 * Kural doğru çalışıyordu ama akış yorucuydu: ilan baştan sona
 * dolduruluyor, sonda altı engel birden çıkıyordu. Bir liste hiç
 * kısalmıyorsa, ne kadar yol alındığı görünmüyor demektir.
 *
 * ⚠️ BU BİR GEVŞETME DEĞİL. Aynı `eidsDegerlendir` motorundan besleniyor;
 * hiçbir koşulu kaldırmıyor, hiçbirini isteğe bağlı yapmıyor. Yalnızca
 * SAYIYOR.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Kullanıcının gözünde tek bir "iş" olan gereklilik. */
export type EidsGereklilik =
  'durum' | 'ada' | 'parsel' | 'tasinmazNo' | 'yetkiBaslangic' | 'yetkiBitis'

export const EIDS_GEREKLILIKLERI: readonly {
  anahtar: EidsGereklilik
  etiket: string
  /** Bilginin nereden alınacağı — kullanıcıyı kaynağa yönlendiriyor. */
  kaynak: string
}[] = [
  {
    anahtar: 'durum',
    etiket: 'EİDS yetki durumu',
    kaynak: 'Mülk sahibi e-Devlet üzerinden işletmenizi yetkilendirdiğinde “Yetkili” olur.',
  },
  {
    anahtar: 'ada',
    etiket: 'Ada',
    kaynak: 'Tapu belgenizde “Ada” satırında yazar.',
  },
  {
    anahtar: 'parsel',
    etiket: 'Parsel',
    kaynak: 'Tapu belgenizde “Parsel” satırında yazar.',
  },
  {
    anahtar: 'tasinmazNo',
    etiket: 'Taşınmaz numarası',
    /**
     * ⚠️ İKİ KAYNAK. İlki mülk sahibinin ekranı; ikincisi işletmenin.
     * Ticaret Bakanlığı duyurusuna göre TTBS'deki izin ekranı "ilan
     * yayınlama izni verilen taşınmazların numaralarını (ID)" listeliyor —
     * yani yetki verildikten sonra danışman mülk sahibine sormadan bulabilir.
     */
    kaynak:
      'e-Devlet → Tapu Bilgileri ekranında görünür; yetki verildikten sonra ' +
      'TTBS → EİDS İlan Yayınlama İzinlerim ekranında da listelenir.',
  },
  {
    anahtar: 'yetkiBaslangic',
    etiket: 'Yetki başlangıç tarihi',
    kaynak: 'Mülk sahibi e-Devlet’ten verir; yetkilendirmenin başladığı gün.',
  },
  {
    anahtar: 'yetkiBitis',
    etiket: 'Yetki bitiş tarihi',
    kaynak:
      'Mülk sahibi e-Devlet’ten verir; süre en az 3 ay olmalı. ' +
      'TTBS → EİDS İlan Yayınlama İzinlerim ekranında da görünür.',
  },
]

/**
 * Bir gerekliliğin kaynak metni — alanın yanındaki ipucu.
 *
 * ⚠️ Sihirbaz alanı, panel formu ve EİDS paneli AYNI metni buradan okuyor.
 * Metin üç yerde ayrı ayrı yazılsaydı biri güncellenir, ikisi eskide
 * kalırdı ve kullanıcı aynı alan için iki farklı tarif görürdü.
 */
export function eidsKaynagi(anahtar: EidsGereklilik): string {
  const gereklilik = EIDS_GEREKLILIKLERI.find((g) => g.anahtar === anahtar)
  if (gereklilik === undefined) throw new Error(`Bilinmeyen EİDS gerekliliği: ${anahtar}`)
  return gereklilik.kaynak
}

/**
 * Engel kodu → hangi gereklilik.
 *
 * ⚠️ HER KOD EŞLENMEK ZORUNDA. Eşlenmeyen bir kod sayacı sessizce
 * yanıltır: ilan yayına alınamazken sayaç "hepsi tamam" derdi. Bir test
 * `EIDS_ENGEL_KODLARI` ile bu tablonun aynı kalmasını denetliyor.
 */
const KOD_GEREKLILIGI: Record<EidsEngelKodu, EidsGereklilik> = {
  durum_secilmemis: 'durum',
  durum_yetkili_degil: 'durum',
  ada_yok: 'ada',
  parsel_yok: 'parsel',
  tasinmaz_no_yok: 'tasinmazNo',
  yetki_baslangic_yok: 'yetkiBaslangic',
  yetki_baslamamis: 'yetkiBaslangic',
  yetki_bitis_yok: 'yetkiBitis',
  yetki_suresi_dolmus: 'yetkiBitis',
  /**
   * ⚠️ Tutarsız tarih çifti BİTİŞE yazılıyor. İkisi de doludur ve biri
   * yanlıştır; düzeltilecek olan neredeyse her zaman bitiştir (başlangıç
   * yetkilendirmenin yapıldığı gündür, geriye dönük değişmez).
   */
  yetki_tarihleri_tutarsiz: 'yetkiBitis',
}

export interface EidsIlerlemesi {
  toplam: number
  tamamlanan: number
  /** Hâlâ eksik olan gereklilikler — sırası `EIDS_GEREKLILIKLERI` ile aynı. */
  eksikler: readonly {
    anahtar: EidsGereklilik
    etiket: string
    kaynak: string
    /** Motorun ürettiği mesaj — neyin yanlış olduğunu söylüyor. */
    mesaj: string
  }[]
  /** Kısa özet: "6 eksikten 2'si tamamlandı". */
  ozet: string
}

/** Girdinin EİDS ilerlemesini hesaplar. */
export function eidsIlerlemesi(girdi: EidsGirdisi, simdi: Date = new Date()): EidsIlerlemesi {
  const { engeller } = eidsDegerlendir(girdi, simdi)

  // Aynı gerekliliğe birden çok engel düşebilir; ilk mesaj yeterli.
  const engelliler = new Map<EidsGereklilik, string>()
  for (const engel of engeller) {
    const gereklilik = KOD_GEREKLILIGI[engel.kod]
    if (!engelliler.has(gereklilik)) engelliler.set(gereklilik, engel.mesaj)
  }

  const eksikler = EIDS_GEREKLILIKLERI.filter((g) => engelliler.has(g.anahtar)).map((g) => ({
    anahtar: g.anahtar,
    etiket: g.etiket,
    kaynak: g.kaynak,
    mesaj: engelliler.get(g.anahtar) ?? '',
  }))

  const toplam = EIDS_GEREKLILIKLERI.length
  const tamamlanan = toplam - eksikler.length

  return {
    toplam,
    tamamlanan,
    eksikler,
    ozet:
      eksikler.length === 0
        ? `EİDS: ${toplam} koşulun hepsi tamamlandı`
        : // ⚠️ Ek sayıya göre değişiyor: 0’ı, 1’i, 2’si, 3’ü, 6’sı.
          `EİDS: ${toplam} eksikten ${sayiIyelik(tamamlanan)} tamamlandı`,
  }
}

/**
 * Eşlenmemiş engel kodları — boş olmalı.
 *
 * ⚠️ `Record<EidsEngelKodu, …>` tipi eksik anahtarı zaten derlemede
 * yakalıyor; bu fonksiyon çalışma zamanındaki ikinci kapı. İkisi de
 * gerekli: tip, kodu SONRADAN ekleyen birini uyarır; test, tablonun
 * `EIDS_ENGEL_KODLARI` ile aynı kaldığını her koşumda kanıtlar.
 */
export function eslenmemisKodlar(): EidsEngelKodu[] {
  return EIDS_ENGEL_KODLARI.filter((kod) => KOD_GEREKLILIGI[kod] === undefined)
}
