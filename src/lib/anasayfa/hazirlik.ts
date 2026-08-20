import 'server-only'

import { heroAyarlari } from '@/lib/hero/sunucu'
import { hakkimizdaGetir } from '@/lib/veri/hakkimizda'
import { ilanlariGetir } from '@/lib/veri/ilanlar'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'
import { endeksSayfasiAcikMi } from '@/lib/veri/endeks'

/**
 * Ana sayfa bölümlerinin veri hazırlığı — TEK KAYNAK.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞARTNAME §6: "VERİSİ OLMAYAN BÖLÜM HİÇ ÇİZİLMESİN."
 *
 * Boş durum kartı gösterilmiyor: "Referanslar yakında" yazan bir kutu,
 * premium hissi ilk saniyede öldürüyor ve sayfayı olduğundan zayıf
 * gösteriyor. Veri yoksa bölüm yok; sayfa kısalıyor, zayıflamıyor.
 *
 * ⚠️ AYNI FONKSİYONU HEM SAYFA HEM PANEL OKUYOR. Ayrı yazılsalardı panel
 * "hazır" derken sayfa bölümü çizmeyebilirdi — ve bu fark, panele bakan
 * kişinin fark edemeyeceği türden olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface BolumHazirligi {
  anahtar: string
  ad: string
  /** Şartnamedeki bölüm numarası — panelde sırayı korumak için. */
  sira: string
  hazir: boolean
  /** Hazır değilse ne eksik; hazırsa neyle dolduğu. */
  aciklama: string
  /** Panelde "nereden düzeltilir" — boş bırakılabilir (kod kararı olanlar). */
  nereden: string | null
}

export async function anaSayfaHazirligi(): Promise<BolumHazirligi[]> {
  const [hero, hakkimizda, portfoy, mahalleler, endeksAcik] = await Promise.all([
    heroAyarlari(),
    hakkimizdaGetir(),
    ilanlariGetir({}, 1, 1),
    mahalleleriGetir(),
    endeksSayfasiAcikMi(),
  ])

  const heroGorseli = hero.slaytlar.find((slayt) => slayt.gorselUrl !== '')

  /**
   * ⚠️ Payload `point` alanı `[boylam, enlem]` dizisi olarak geliyor.
   * Boş bırakılmış mahalle `null` taşıyor; harita orada çizilemez.
   */
  const koordinatliMahalle = mahalleler.filter(
    (mahalle) => Array.isArray(mahalle.merkez) && mahalle.merkez.length === 2,
  ).length

  return [
    {
      anahtar: 'hero_medyasi',
      ad: 'Sinematik vitrin görseli',
      sira: '6.1',
      hazir: heroGorseli !== undefined,
      aciklama: heroGorseli
        ? 'Panelden yüklenen hero görseli tam ekran zemin olarak kullanılıyor.'
        : 'Görsel yok — vitrin sıcak gradyan zeminle çiziliyor. Bu bir boş durum değil, ' +
          'tasarlanmış ikinci basamak; Çorlu fotoğrafı geldiğinde kendiliğinden devreye girer.',
      nereden: 'Ayarlar → Hero (Ana Sayfa)',
    },
    {
      anahtar: 'yuzen_istatistik',
      ad: 'Yüzen istatistik kartı',
      sira: '6.1',
      /**
       * ⚠️ KOŞUL SABİT `false` DEĞİL, VERİ YOKLUĞU.
       *
       * Kart "satılan portföy" ve "ortalama satış süresi" istiyor; ikisi de
       * kapanmış işlem kaydı gerektiriyor ve sistemde öyle bir koleksiyon
       * yok. Uydurma rakam yasak (kural 2), sıfır yazmak da yanlış bilgi.
       */
      hazir: false,
      aciklama:
        'Kapanmış işlem kaydı tutulmuyor: satılan portföy ve ortalama satış süresi ' +
        'hesaplanamıyor. Kart yazıldı, veri gelene kadar çizilmiyor.',
      nereden: null,
    },
    {
      anahtar: 'kurucu_portresi',
      ad: 'Kurucu hikâyesi — portre',
      sira: '6.3',
      hazir: hakkimizda.portre !== null,
      aciklama:
        hakkimizda.portre !== null
          ? 'Portre yüklü; bölünmüş düzen fotoğrafla çiziliyor.'
          : 'Portre yok — bölüm tipografik blokla çiziliyor. Boş çerçeve gösterilmiyor.',
      nereden: 'Ayarlar → Hakkımızda Sayfası',
    },
    {
      anahtar: 'mahalle_deneyimi',
      ad: 'İnteraktif Çorlu deneyimi',
      sira: '6.4',
      hazir: koordinatliMahalle > 0,
      aciklama:
        koordinatliMahalle > 0
          ? `${koordinatliMahalle} mahallenin merkez koordinatı var.`
          : 'Hiçbir mahallenin merkez koordinatı yok; harita çizilemez.',
      nereden: 'Mahalleler → merkez koordinatı',
    },
    {
      anahtar: 'portfoy',
      ad: 'Premium portföy',
      sira: '6.5',
      hazir: portfoy.toplam > 0,
      aciklama:
        portfoy.toplam > 0
          ? `${portfoy.toplam} yayındaki taşınmaz.`
          : 'Yayında taşınmaz yok; bölüm çizilmiyor.',
      nereden: 'Taşınmazlar',
    },
    {
      anahtar: 'canli_piyasa',
      ad: 'Canlı piyasa göstergesi',
      sira: '6.7',
      hazir: endeksAcik,
      aciklama: endeksAcik
        ? 'Endeks eşikleri sağlandı; gösterge çizilebilir.'
        : 'Çorlu Konut Endeksi eşikleri sağlanmadı (6 ay + 500 gözlem). ' +
          'Endeks açılınca bu bölüm kendiliğinden görünür.',
      nereden: 'Gözlemler → veri girişi',
    },
    {
      anahtar: 'referanslar',
      ad: 'Referanslar',
      sira: '6.8',
      /**
       * ⚠️ Google Business Profile bağlanmadı ve değerlendirmeleri elle
       * girmek bilinçli olarak REDDEDİLDİ: elle yazılan bir müşteri yorumu,
       * kaynağı doğrulanamayan bir iddiadır.
       */
      hazir: false,
      aciklama:
        'Google Business Profile bağlı değil. Değerlendirmeler elle girilmiyor — ' +
        'kaynağı doğrulanamayan yorum yayınlanmaz.',
      nereden: null,
    },
  ]
}
