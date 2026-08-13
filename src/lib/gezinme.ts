import { ARACLAR } from '@/lib/araclar'
import { BOLUMLER, type BolumAnahtari } from '@/lib/siteBolumleri'

/**
 * Üst menü yapısı — mega menüler dahil.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `site.ts` DEĞİL DE AYRI DOSYA
 *
 * `ANA_GEZINME` düz bir sayfa listesi ve altbilgi, site haritası, mobil
 * menü hepsi onu kullanıyor. Mega menü ise bambaşka bir şey: iki seviyeli,
 * açıklamalı ve bazı öğeleri site bölümü anahtarına bağlı. İkisini aynı
 * yapıya sıkıştırmak, düz listeyi kullanan dört yeri de karmaşıklaştırırdı.
 *
 * ⚠️ KAPALI BÖLÜME BAĞLANTI VERİLMEZ.
 *
 * `/endeks` veri eşikleri sağlanana kadar `notFound()` dönüyor (tasarım
 * gereği — CLAUDE.md 6c). Şartname "Endeks"i üst menüye koyuyor ama kapalı
 * bir sayfaya menüden bağlantı vermek ziyaretçiyi 404'e göndermek olurdu.
 * Bu yüzden bölüm anahtarı taşıyan öğeler yalnızca bölüm AÇIKKEN görünür;
 * karar sunucuda veriliyor ve menüye hazır iniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Bir adresin hangi site bölümü tarafından kapatılabildiğini bulur.
 *
 * ⚠️ `rotalar` kullanılıyor, `adres` DEĞİL. İkisi farklı şeyler:
 * `rotalar` bölüm kapalıyken 404 dönen yolları listeler; `adres` yalnızca
 * "bu özellik nerede yaşıyor" der. Örneğin `ai_arama` bölümünün adresi
 * `/portfoy` ama `rotalar` boş — kapatıldığında sayfa değil yalnızca
 * arama kutusu kayboluyor. `adres`e bakan bir eşleme, Portföy'ü kapalı
 * sanıp menüden düşürürdü.
 */
function bolumAnahtariniBul(adres: string): BolumAnahtari | undefined {
  const yol = adres.split('?')[0] ?? adres
  return BOLUMLER.find((bolum) => bolum.rotalar.includes(yol))?.anahtar
}

export interface MegaOge {
  ad: string
  adres: string
  /** Mega menüde adın altında görünen tek satır. */
  aciklama: string
  /** Doluysa bu öğe yalnızca ilgili site bölümü açıkken görünür. */
  bolum?: BolumAnahtari
}

export interface UstMenuOgesi {
  ad: string
  adres: string
  /** Doluysa üzerine gelince mega menü açılır. */
  mega?: readonly MegaOge[]
  /** Doluysa bu öğe yalnızca ilgili site bölümü açıkken görünür. */
  bolum?: BolumAnahtari
}

/**
 * Portföy mega menüsü.
 *
 * Şartname dört giriş istiyor: Satılık / Kiralık / Ticari / Gizli Portföy.
 * İlk ikisi `/portfoy` üzerinde filtre; ikisi ayrı sayfa ve ikisi de site
 * bölümü anahtarına bağlı.
 *
 * ⚠️ Filtre adresleri listeleme sayfasının okuduğu parametrelerle birebir
 * aynı olmalı; farklı yazılırsa menü sessizce filtresiz sayfaya götürür.
 */
const PORTFOY_MEGA: readonly MegaOge[] = [
  {
    ad: 'Satılık',
    adres: '/portfoy?tip=satilik',
    aciklama: 'Yatırım ve oturum için satılık portföy',
  },
  {
    ad: 'Kiralık',
    adres: '/portfoy?tip=kiralik',
    aciklama: 'Kiralık konut ve işyeri',
  },
  {
    ad: 'Ticari',
    adres: '/ticari',
    aciklama: 'Dükkân, ofis, depo ve arsa',
    bolum: 'ticari',
  },
  {
    ad: 'Gizli Portföy',
    adres: '/gizli-portfoy',
    aciklama: 'Yayınlanmayan taşınmazlar — erişim talebiyle',
    bolum: 'gizli_portfoy',
  },
]

/**
 * Araçlar mega menüsü.
 *
 * ⚠️ Hesaplayıcılar `ARACLAR` listesinden TÜRETİLİYOR, elle yazılmıyor.
 * İki yerde ayrı yazılsaydı yeni bir hesaplayıcı eklendiğinde menüye
 * konmayı unutmak kaçınılmazdı — ve kimse fark etmezdi.
 */
const ARACLAR_MEGA: readonly MegaOge[] = [
  ...ARACLAR.map((arac) => ({
    ad: arac.kisaAd,
    adres: arac.adres,
    // Mega menüde uzun açıklama satırı kırıyor; ilk cümle yeter.
    aciklama: arac.aciklama.split('. ')[0] ?? arac.aciklama,
    // ⚠️ Anahtar ELLE YAZILMIYOR, rotalardan bulunuyor. Yatırım
    // simülatörü bir bölüm anahtarına bağlı ve elle yazıldığında tam
    // olarak o atlanmıştı — menü kapalı bölümün 404'üne bağlanıyordu.
    bolum: bolumAnahtariniBul(arac.adres),
  })),
  {
    ad: 'Mahalle eşleştirme testi',
    adres: '/mahalle-testi',
    aciklama: 'Önceliklerinize en uygun mahalleyi bulun',
    bolum: 'mahalle_testi',
  },
  {
    ad: 'Bölge radarı',
    adres: '/bolge-radari',
    aciklama: 'Mahalle medyanına göre sinyaller',
    bolum: 'bolge_radari',
  },
]

/**
 * Üst menü — şartname §4'teki sıra.
 *
 * "Değerleme" menüden çıktı: artık sağdaki dolu adaçayı butonu
 * ("Evimi değerlendir") aynı sayfaya götürüyor ve iki kez listelemek
 * butonun vurgusunu düşürürdü.
 */
export const UST_MENU_YAPISI: readonly UstMenuOgesi[] = [
  { ad: 'Portföy', adres: '/portfoy', mega: PORTFOY_MEGA },
  { ad: 'Mahalleler', adres: '/mahalleler' },
  { ad: 'Araçlar', adres: '/araclar', mega: ARACLAR_MEGA },
  { ad: 'Endeks', adres: '/endeks', bolum: 'endeks' },
  { ad: 'Hakkımızda', adres: '/hakkimizda' },
  { ad: 'İletişim', adres: '/iletisim' },
]

/** Sağdaki dolu eylem — şartnamedeki iki adaçayı eyleminden biri. */
export const BASLIK_EYLEMI = { ad: 'Evimi değerlendir', adres: '/degerleme' } as const

/**
 * Endeks üst menüde görünmeli mi?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KAPI BİRLİKTE ÇALIŞIR — biri tek başına yetmez.
 *
 *  1. `bolumAcik`  — Aslıhan'ın SiteSections anahtarı
 *  2. `sayfaAcik`  — veri eşikleri (`endeksSayfasiAcikMi`): katman başına
 *                    en az 8 gözlem, en az 6 ay geçmiş (CLAUDE.md 6c)
 *
 * Yalnızca bölüm anahtarına bakılsaydı menü 404'e bağlanırdı; bu tam olarak
 * bir kez oldu ve duman testinde yakalandı. Yalnızca eşiğe bakılsaydı
 * Aslıhan'ın "henüz yayınlamayalım" kararı yok sayılırdı.
 *
 * ⚠️ Eşik sağlandığı anda menü KENDİLİĞİNDEN görünür; elle açılacak
 * ikinci bir yer yok. Unutulacak bir adım bırakmamak bilinçli.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function endeksMenudeGorunurMu(bolumAcik: boolean, sayfaAcik: boolean): boolean {
  return bolumAcik && sayfaAcik
}

/**
 * Kapalı bölümlerin öğelerini düşürür.
 *
 * Sunucuda çağrılır; istemci menüsü hazır listeyi alır. Bölüm durumunu
 * istemcide çözmek, kapalı bir bağlantının bir kare boyunca görünmesi
 * demekti.
 */
export function menuyuSuz(
  yapi: readonly UstMenuOgesi[],
  acikBolumler: ReadonlySet<string>,
): UstMenuOgesi[] {
  return yapi
    .filter((oge) => oge.bolum === undefined || acikBolumler.has(oge.bolum))
    .map((oge) => ({
      ...oge,
      mega: oge.mega?.filter((alt) => alt.bolum === undefined || acikBolumler.has(alt.bolum)),
    }))
}
