/**
 * Olay sözlüğü — SUNUCU VE PANEL TARAFI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA İSTEMCİYE İNMEMELİ.
 *
 * Açıklama metinleri panelde okunuyor ve toplamı birkaç kilobayt. Sözlük
 * `tipler.ts` içindeyken, yalnızca `fiyatBandi()` için o dosyayı içe aktaran
 * `FiltrePaneli` bütün açıklamaları portföy sayfasının paketine sokuyordu —
 * hem de analitik onayı VERMEMİŞ ziyaretçiler için.
 *
 * Olay ADLARI istemcide `data-gozlem` öznitelikleri ve `gozlemOlayi()`
 * çağrılarıyla düz dizge olarak geçiyor; sözlüğün kendisi orada gerekmiyor.
 * Doğrulama sunucuda (`/api/olcum/olay`) yapılıyor ve asıl kapı orası.
 *
 * ⚠️ OLAY ADLARI SABİT. Bir ad iki yerde farklı yazılsaydı (gönderen bileşen
 * ile paneldeki sorgu) yazım farkı sessizce "bu olay hiç gerçekleşmedi" gibi
 * görünürdü; `olcum.test.ts` her sözlük girdisinin kaynakta gerçekten
 * gönderildiğini denetliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Niyet } from './tipler'

export interface OlayTanimi {
  /** Kayıtta ve sorguda kullanılan sabit ad. */
  ad: string
  /** Panelde görünen Türkçe etiket. */
  etiket: string
  niyet: Niyet
  /** Bu olay neyi anlatıyor — panelde ipucu olarak görünür. */
  aciklama: string
}

/**
 * ⚠️ Buraya eklenen her satır Katman B'dir: yalnızca analitik onayı
 * verilmişse gönderilir. Katman A hiç olay taşımaz, yalnızca sayfa sayar.
 */
export const OLAYLAR: readonly OlayTanimi[] = [
  /* ── Yüksek niyet ── */
  {
    ad: 'whatsapp_tikla',
    etiket: 'WhatsApp tıklaması',
    niyet: 'yuksek',
    aciklama: 'Ziyaretçi konuşmayı başlatmak üzere WhatsApp bağlantısına bastı.',
  },
  {
    ad: 'telefon_tikla',
    etiket: 'Telefon tıklaması',
    niyet: 'yuksek',
    aciklama: 'Ziyaretçi numarayı aramak üzere bastı.',
  },
  {
    ad: 'degerleme_tamamlandi',
    etiket: 'Değerleme sonucu görüntülendi',
    niyet: 'yuksek',
    aciklama: 'Form yeterince doldurulup gerçek bir değer aralığı hesaplandı.',
  },
  {
    ad: 'gizli_portfoy_talep',
    etiket: 'Gizli portföy erişim talebi',
    niyet: 'yuksek',
    aciklama: 'Yayınlanmayan portföy için erişim istendi.',
  },
  {
    ad: 'iletisim_gonderildi',
    etiket: 'İletişim formu gönderildi',
    niyet: 'yuksek',
    aciklama: 'Form başarıyla gönderildi (doğrulamadan geçti).',
  },
  {
    ad: 'ilan_uzun_okuma',
    etiket: 'İlan detayında 60+ saniye',
    niyet: 'yuksek',
    aciklama: 'Ziyaretçi ilan sayfasında bir dakikadan uzun kaldı — ciddi ilgi işareti.',
  },

  /* ── Orta niyet ── */
  {
    ad: 'degerleme_birakildi',
    etiket: 'Değerleme yarıda bırakıldı',
    niyet: 'orta',
    aciklama:
      '⚠️ Hangi ALANDA bırakıldığı kritik: en çok bırakılan alan sorunlu alandır. ' +
      'En son doldurulan alanın adı olayla birlikte kaydediliyor.',
  },
  {
    ad: 'degerleme_alani',
    etiket: 'Değerleme formunda alan dolduruldu',
    niyet: 'orta',
    aciklama:
      'Hangi alana kadar gelindiğini gösterir. Ardışık alanlar arasındaki düşüş, ' +
      'ziyaretçinin tam olarak nerede vazgeçtiğini söyler.',
  },
  {
    ad: 'hesaplayici_kullanildi',
    etiket: 'Hesaplayıcı kullanıldı',
    niyet: 'orta',
    aciklama: 'Bir hesaplayıcı sonuç üretti. Hangisi olduğu ayrıntı alanında.',
  },
  {
    ad: 'mahalle_testi_tamamlandi',
    etiket: 'Mahalle eşleştirme testi tamamlandı',
    niyet: 'orta',
    aciklama: 'Test sonuna kadar dolduruldu ve öneri görüntülendi.',
  },
  {
    ad: 'filtre_uygulandi',
    etiket: 'Filtre uygulandı',
    niyet: 'orta',
    aciklama: 'Portföy listesinde bir ölçüt seçildi. Hangi ölçüt olduğu ayrıntı alanında.',
  },
  {
    ad: 'ilan_karti_tikla',
    etiket: 'İlan kartına tıklandı',
    niyet: 'orta',
    aciklama: 'Listeden bir ilan detayına geçildi.',
  },
  {
    ad: 'fiyat_bandi',
    etiket: 'Aranan fiyat aralığı',
    niyet: 'orta',
    aciklama:
      '⚠️ TAM DEĞİL, BANT. Ziyaretçinin girdiği fiyat sınırı en yakın bantla ' +
      'kaydediliyor (0–1 mn, 1–2 mn …). Tam değer, mahalle ve zamanla birleşince ' +
      'tek bir ziyaretçiyi işaret edebilirdi.',
  },
  {
    ad: 'sonucsuz_arama',
    etiket: 'Sonuç bulunamayan arama',
    niyet: 'orta',
    aciklama: 'Portföy boşluğunu gösterir: ziyaretçinin aradığı ölçütlerde gösterecek ilan yok.',
  },

  /* ── Düşük niyet ── */
  {
    ad: 'harita_katmani',
    etiket: 'Harita katmanı açıldı/kapandı',
    niyet: 'dusuk',
    aciklama: 'Haritada bir katman görünürlüğü değiştirildi.',
  },
  {
    ad: 'slider_gezinme',
    etiket: 'Hero slider gezinmesi',
    niyet: 'dusuk',
    aciklama: 'Ana sayfadaki slaytlar arasında elle geçiş yapıldı.',
  },
  {
    ad: 'kaydirma_derinligi',
    etiket: 'Kaydırma derinliği',
    niyet: 'dusuk',
    aciklama: 'Sayfanın ne kadarının görüldüğü (%25/50/75/100 bandı olarak).',
  },
]

const OLAY_HARITASI = new Map(OLAYLAR.map((olay) => [olay.ad, olay]))

export function olayTanimi(ad: string): OlayTanimi | undefined {
  return OLAY_HARITASI.get(ad)
}

export function olayNiyeti(ad: string): Niyet {
  return OLAY_HARITASI.get(ad)?.niyet ?? 'dusuk'
}

export function gecerliOlayMi(ad: unknown): ad is string {
  return typeof ad === 'string' && OLAY_HARITASI.has(ad)
}

/** Yüksek niyetli olay adları — huni ve sıralama bu kümeye bakıyor. */
export const YUKSEK_NIYETLI_OLAYLAR: readonly string[] = OLAYLAR.filter(
  (olay) => olay.niyet === 'yuksek',
).map((olay) => olay.ad)
