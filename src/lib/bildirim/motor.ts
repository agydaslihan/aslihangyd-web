/**
 * Panel bildirim motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ GÜNLÜK DOSYASINA YAZILAN UYARIYI KİMSE OKUMAZ.
 *
 * EİDS yetki bitişi ve bakım görevlerinin aksaması yasal sonuç doğuruyor.
 * Bugüne kadar tek kanal `/srv/aslihangyd/logs/bakim.log` idi — yani
 * kimsenin bakmadığı bir dosya. SMTP gelene kadar panelin ana ekranı tek
 * gerçek uyarı kanalı.
 *
 * Bu dosya SAF: veritabanına dokunmaz, yalnızca verilen sayılardan
 * bildirim listesi üretir. Sorgulama `src/lib/veri/bildirimler.ts` içinde.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { gunFarki, gunAnahtari, type GunAnahtari } from '@/lib/tarih'

/**
 * Öncelik — sıralamayı bu belirler.
 *
 * ⚠️ `yasal` her zaman en üstte. Bir portföyün 60 gündür ilgi görmemesi
 * ticari bir sorun; yetkisi dolmuş bir ilanın yayında kalması idari
 * yaptırım. İkisini aynı görsel ağırlıkta göstermek, ikincisini
 * görünmez kılar.
 */
export type Oncelik = 'yasal' | 'onemli' | 'bilgi'

export const ONCELIK_SIRASI: Record<Oncelik, number> = {
  yasal: 0,
  onemli: 1,
  bilgi: 2,
}

export interface Bildirim {
  anahtar: string
  oncelik: Oncelik
  baslik: string
  /** Ne yapılması gerektiği. Boş bırakılmaz. */
  aciklama: string
  /** Panelde gidilecek adres. Yoksa bildirim sadece bilgilendirir. */
  adres?: string
  adresEtiketi?: string
}

/* ══════════════════════════════════════════════════════════════════════════
   Eşikler
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Bakım görevi kaç saat çalışmazsa uyarı verilir.
 *
 * 26 saat, 24 değil: cron günde bir kez çalışıyor ve saat kayması,
 * yeniden başlatma ya da uzun süren bir görev yüzünden 24 saati birkaç
 * dakika aşabilir. 24'e sabitlemek her gün yanlış alarm üretirdi ve
 * yanlış alarm veren bir uyarı kısa sürede görmezden gelinir.
 */
export const BAKIM_ESIK_SAAT = 26

/** Portföy kaç gün ilgisiz kalırsa hatırlatılır. */
export const ILGISIZ_PORTFOY_GUN = 60

/** Mahalle kaç gün gözlemsiz kalırsa hatırlatılır. */
export const GOZLEMSIZ_MAHALLE_GUN = 45

/* ══════════════════════════════════════════════════════════════════════════
   Girdi
   ══════════════════════════════════════════════════════════════════════════ */

export interface BakimGorevDurumu {
  anahtar: string
  ad: string
  yasal: boolean
  /** Son başarılı çalışma anı (ISO). Hiç çalışmadıysa `null`. */
  sonBasariliCalisma: string | null
  /** Son çalışmada hata alındıysa mesajı. */
  sonHata: string | null
}

export interface BildirimGirdisi {
  /** 15 gün içinde yetkisi bitecek yayındaki ilan sayısı. */
  yetkisiBitecekIlan: number
  /** Yetkisi çoktan dolmuş ama hâlâ yayında görünen ilan sayısı. */
  yetkisiDolmusYayindaIlan: number
  /** Bakım görevlerinin son durumu. */
  bakimGorevleri: readonly BakimGorevDurumu[]
  /** 60 gündür hiç talep almamış yayındaki ilan sayısı. */
  ilgisizPortfoy: number
  /** 45 gündür gözlem girilmemiş yayındaki mahalle sayısı. */
  gozlemsizMahalle: number
  /** Yetki belgesi numarası girilmiş mi. */
  yetkiBelgesiVar: boolean
  /**
   * Danışmanın yayına gönderdiği, yönetici onayı bekleyen ilan sayısı.
   *
   * ⚠️ Yalnızca YÖNETİCİYE gösterilir. Danışman bu kuyruğa bakıp bir şey
   * yapamaz; ona göstermek, üzerinde işlem yapamayacağı bir uyarı biriktirir
   * ve şeridin tamamını görmezden gelmeyi öğretir.
   */
  onayBekleyenIlan: number
}

/* ══════════════════════════════════════════════════════════════════════════
   Üretim
   ══════════════════════════════════════════════════════════════════════════ */

/** İki ISO anı arasındaki saat farkı. Geçersiz girdide `null`. */
export function saatFarki(bas: string | null, simdi: Date): number | null {
  if (bas === null) return null
  const an = Date.parse(bas)
  if (Number.isNaN(an)) return null
  return (simdi.getTime() - an) / 3_600_000
}

export function bildirimleriUret(girdi: BildirimGirdisi, simdi: Date = new Date()): Bildirim[] {
  const bildirimler: Bildirim[] = []

  /* ── YASAL ─────────────────────────────────────────────────────────── */

  /**
   * ⚠️ En ağır durum: yetkisi dolmuş ilan hâlâ yayında.
   *
   * Normalde imkânsız — kayıt kancası engelliyor ve bakım görevi geceleri
   * temizliyor. Görünüyorsa bakım görevi çalışmıyor demektir ve her geçen
   * gün ihlal süresi.
   */
  if (girdi.yetkisiDolmusYayindaIlan > 0) {
    bildirimler.push({
      anahtar: 'eids-dolmus-yayinda',
      oncelik: 'yasal',
      baslik: `${girdi.yetkisiDolmusYayindaIlan} ilanın yetki süresi DOLMUŞ ama hâlâ yayında`,
      aciklama:
        'Yetkisiz ilan yayını idari yaptırım doğurur. Bakım görevi bu ilanları geceleri ' +
        'yayından almalıydı; çalışmamış olabilir. Hemen elle yayından alın.',
      adres: '/admin/collections/ilanlar?where[durum][in]=yayinda,rezerve',
      adresEtiketi: 'Yayındaki ilanlar',
    })
  }

  if (girdi.onayBekleyenIlan > 0) {
    /**
     * Yasal DEĞİL, önemli: kuyrukta bekleyen ilan yayına girmiyor demektir.
     * Yetkisiz yayın (yasal) ile karıştırılmamalı — burada henüz bir ihlal
     * yok, duran bir iş var.
     */
    bildirimler.push({
      anahtar: 'onay-bekleyen-ilan',
      oncelik: 'onemli',
      baslik:
        girdi.onayBekleyenIlan === 1
          ? '1 ilan yayın onayı bekliyor'
          : `${girdi.onayBekleyenIlan} ilan yayın onayı bekliyor`,
      aciklama:
        'Danışman hazırlayıp yayına gönderdi. EİDS bilgilerini (taşınmaz numarası, ada, ' +
        'parsel, yetki tarihleri) doğrulayıp yayınlayın. Yetki belgesi sizin adınıza; ' +
        'yayın kararı bu yüzden sizde.',
      adres: '/admin/collections/ilanlar?where[durum][equals]=onay_bekliyor',
      adresEtiketi: 'Onay kuyruğunu aç',
    })
  }

  if (girdi.yetkisiBitecekIlan > 0) {
    bildirimler.push({
      anahtar: 'eids-bitiyor',
      oncelik: 'yasal',
      baslik: `${girdi.yetkisiBitecekIlan} ilanın EİDS yetkisi 15 gün içinde bitiyor`,
      aciklama:
        'Yetki yenilenmezse ilan otomatik olarak yayından kalkar. Mülk sahibinden ' +
        'e-Devlet üzerinden yetki yenilemesini isteyin.',
      adres: '/admin/collections/ilanlar?where[durum][in]=yayinda,rezerve&sort=eidsYetkiBitis',
      adresEtiketi: 'Yetki bitişine göre sırala',
    })
  }

  // Bakım görevleri — yasal olanlar burada, diğerleri aşağıda.
  for (const gorev of girdi.bakimGorevleri) {
    const gecenSaat = saatFarki(gorev.sonBasariliCalisma, simdi)
    const hicCalismadi = gecenSaat === null
    const gecikti = gecenSaat !== null && gecenSaat > BAKIM_ESIK_SAAT

    if (!hicCalismadi && !gecikti && gorev.sonHata === null) continue

    const oncelik: Oncelik = gorev.yasal ? 'yasal' : 'onemli'

    if (hicCalismadi) {
      bildirimler.push({
        anahtar: `bakim-hic-${gorev.anahtar}`,
        oncelik,
        baslik: `Bakım görevi hiç çalışmadı: ${gorev.ad}`,
        aciklama: gorev.yasal
          ? 'Bu görev yasal yükümlülük. Cron kurulumu yapılmamış olabilir — ' +
            'docs/ISLETME-REHBERI.md §6.5.'
          : 'Cron kurulumu yapılmamış olabilir — docs/ISLETME-REHBERI.md §6.5.',
      })
      continue
    }

    if (gecikti) {
      /**
       * 48 saatin altı "dün çalışmadı".
       *
       * 27 saat geçmişse matematiksel olarak "1 gün" ama insan diliyle
       * "dün gece çalışmadı" demek. `Math.floor(27/24) = 1` diyip
       * "1 gündür çalışmıyor" yazmak, tek bir kaçırılmış koşuyu süregelen
       * bir arıza gibi gösterirdi.
       */
      const gun = Math.floor((gecenSaat ?? 0) / 24)
      bildirimler.push({
        anahtar: `bakim-gecikti-${gorev.anahtar}`,
        oncelik,
        baslik:
          gun >= 2
            ? `Bakım görevi ${gun} gündür çalışmıyor: ${gorev.ad}`
            : `Bakım görevi dün çalışmadı: ${gorev.ad}`,
        aciklama: gorev.yasal
          ? 'Yasal yükümlülük aksıyor. Sunucuda elle çalıştırın: scripts/bakim.sh ' + gorev.anahtar
          : 'Sunucuda elle çalıştırılabilir: scripts/bakim.sh ' + gorev.anahtar,
      })
      continue
    }

    // Zamanında çalışmış ama hata döndürmüş.
    bildirimler.push({
      anahtar: `bakim-hata-${gorev.anahtar}`,
      oncelik,
      baslik: `Bakım görevi hata verdi: ${gorev.ad}`,
      aciklama: `Son hata: ${gorev.sonHata}`,
    })
  }

  if (!girdi.yetkiBelgesiVar) {
    bildirimler.push({
      anahtar: 'yetki-belgesi-yok',
      oncelik: 'yasal',
      baslik: 'Taşınmaz Ticareti Yetki Belgesi numarası girilmedi',
      aciklama:
        'Numara mevzuat gereği sitede görünmek zorunda. Girilene kadar altbilgide ' +
        'her sayfada uyarı görünüyor.',
      adres: '/admin/globals/kurumsal-bilgiler',
      adresEtiketi: 'Kurumsal bilgiler',
    })
  }

  /* ── TİCARİ ────────────────────────────────────────────────────────── */

  if (girdi.ilgisizPortfoy > 0) {
    bildirimler.push({
      anahtar: 'ilgisiz-portfoy',
      oncelik: 'bilgi',
      baslik: `${girdi.ilgisizPortfoy} portföy ${ILGISIZ_PORTFOY_GUN} gündür ilgi görmedi`,
      aciklama:
        'Hiç talep gelmemiş. Fiyat, fotoğraf ya da başlık gözden geçirilebilir; ' +
        'ya da mülk sahibiyle konuşma zamanı gelmiş olabilir.',
      adres: '/admin/collections/ilanlar?where[durum][in]=yayinda,rezerve',
      adresEtiketi: 'Portföyü aç',
    })
  }

  if (girdi.gozlemsizMahalle > 0) {
    bildirimler.push({
      anahtar: 'gozlemsiz-mahalle',
      oncelik: 'bilgi',
      baslik: `${girdi.gozlemsizMahalle} mahallede ${GOZLEMSIZ_MAHALLE_GUN} gündür gözlem yok`,
      aciklama:
        'Endeks ve mahalle rakamları gözleme dayanıyor. Veri eskidikçe endeksin ' +
        'yayına girme tarihi uzuyor.',
      adres: '/admin/collections/gozlemler',
      adresEtiketi: 'Gözlemler',
    })
  }

  return siralaBildirimler(bildirimler)
}

/**
 * Öncelik sırası — yasal olan her zaman üstte.
 *
 * Eşit öncelikte tanım sırası korunur (kararlı sıralama): aynı ağırlıktaki
 * bildirimlerin her yenilemede yer değiştirmesi, gözün listeyi tanımasını
 * engeller.
 */
export function siralaBildirimler(bildirimler: readonly Bildirim[]): Bildirim[] {
  return [...bildirimler].sort((a, b) => ONCELIK_SIRASI[a.oncelik] - ONCELIK_SIRASI[b.oncelik])
}

/**
 * Gün sayısından "kaç gün önce" metni.
 *
 * ⚠️ Europe/Istanbul gün anahtarı kullanılıyor: sunucu UTC çalışıyor ve
 * doğrudan `Date` farkı, gece yarısından sonraki ilk üç saatte bir gün
 * kayıyor.
 */
export function gecenGun(tarih: string | null, simdi: Date = new Date()): number | null {
  const bas = gunAnahtari(tarih)
  const son = gunAnahtari(simdi)
  if (bas === null || son === null) return null
  return gunFarki(bas as GunAnahtari, son as GunAnahtari)
}
