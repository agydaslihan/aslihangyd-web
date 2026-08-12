/**
 * Paylaşılan erişim kuralları (Payload `access`).
 *
 * Varsayılan duruş: **kapalı.** Bir koleksiyon açıkça herkese açılmadıkça
 * yalnızca giriş yapmış kullanıcılar okuyabilir. Yeni koleksiyon eklerken
 * `access` yazmayı unutmak, veriyi kazara internete açmanın en yaygın yoludur.
 */

import type { Access, FieldAccess } from 'payload'

import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ROLLER
 *
 * İki rol var ve ikisi de panele girer:
 *
 *  · **yonetici** — Aslıhan. Her şeyi yapar.
 *  · **danisman** — günlük portföy ve talep işi yapar; ayarlara, hukuki
 *    metinlere, vergi oranlarına ve silme işlemlerine dokunamaz.
 *
 * ⚠️ NEDEN SIKI TARAFTAN BAŞLIYORUZ
 *
 * Aslıhan yönetici olduğu için danışmanı kısıtlamanın ona hiçbir maliyeti
 * yok. Yanlış yönde hata yapmanın maliyetleri ise simetrik değil:
 *
 *  · Fazla kısıtladıysak → danışman "şuraya erişemiyorum" der, açarız.
 *  · Az kısıtladıysak → yanlış vergi oranı yayınlanır, ilan silinir ya da
 *    biri kendini yönetici yapar. Bunların hiçbiri geri alınırken kolay
 *    değil ve bir kısmı fark bile edilmez.
 *
 * Bu yüzden emin olmadığımız her yetki YÖNETİCİDE kaldı. Gevşetme kararı
 * Aslıhan'ın; docs/SENDEN-BEKLENENLER.md'de liste hâlinde duruyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export type Rol = 'yonetici' | 'danisman'

/** Ham değeri role çevirir; tanınmayan değer `null`. */
function rolMetni(deger: unknown): Rol | null {
  return deger === 'yonetici' || deger === 'danisman' ? deger : null
}

/** Kullanıcı nesnesinden rolü okur. */
function rolu(kullanici: unknown): Rol | null {
  if (typeof kullanici !== 'object' || kullanici === null) return null
  return rolMetni((kullanici as { rol?: unknown }).rol)
}

/** Giriş yapmış kullanıcı yönetici mi? */
export function yoneticiMi(kullanici: unknown): boolean {
  return rolu(kullanici) === 'yonetici'
}

/**
 * Kullanıcının rolü; oturumsuz ya da rolü çözülemeyen çağrıda `null`.
 *
 * ⚠️ `null` "yetkisiz" demek DEĞİL — "sunucu içi çağrı" demek. Bakım
 * cron'u, içe aktarma ve seed betikleri kullanıcısız çalışır ve bunlar
 * güvenilen yollardır. Yetki kararı veren yerlerde `yoneticiMi` kullanın;
 * `rolAl` yalnızca rolü bilmek isteyen kurallar içindir.
 */
export function rolAl(kullanici: unknown): Rol | null {
  return rolu(kullanici)
}

/**
 * Yeni kullanıcının rolü ne olmalı?
 *
 * ⚠️ KİLİTLENME KORUMASI — sistemdeki ilk kullanıcı DAİMA yönetici olur.
 *
 * Payload'ın ilk kullanıcı akışı erişim denetimini atlar ve `rol` alanını
 * varsayılan "danisman" ile açar. Aslıhan kurulumda bu alanı fark etmezse
 * kendi panelinden kilitlenirdi: ayarlara, vergi parametrelerine ve
 * kullanıcı yönetimine erişemez, üstelik bunu düzeltebilecek bir yönetici
 * de olmazdı.
 *
 * Kural saf bir fonksiyon olarak duruyor ki test edilebilsin — kilitlenme
 * hatası, üretimde ilk kurulumda fark edilirdi ve orada düzeltmek zor.
 */
export function yeniKullanicininRolu(mevcutKullaniciSayisi: number, istenenRol: unknown): Rol {
  if (mevcutKullaniciSayisi === 0) return 'yonetici'

  // ⚠️ `istenenRol` bir ROL DİZESİDİR, kullanıcı nesnesi değil. Buraya
  // `rolu()` (nesneden okuyan yardımcı) verilirse her rol `null` çözülür ve
  // fonksiyon **her yeni kullanıcıyı sessizce danışmana düşürür** —
  // Aslıhan hiç yönetici meslektaş ekleyemez. Entegrasyon testi yakaladı.
  return rolMetni(istenenRol) ?? 'danisman'
}

/** Yalnızca giriş yapmış panel kullanıcıları (rol ayrımı yapmaz). */
export const yalnizcaPanel: Access = ({ req }) => Boolean(req.user)

/**
 * Yalnızca yönetici.
 *
 * ⚠️ Rolü çözülemeyen kullanıcı da REDDEDİLİR. Eski bir oturumda `rol`
 * alanı gelmiyorsa "herhalde yöneticidir" varsayımı, yetkilendirmeyi
 * sessizce kapatmanın en yaygın yoludur.
 */
export const yalnizcaYonetici: Access = ({ req }) => yoneticiMi(req.user)

/**
 * Alan seviyesinde yalnızca yönetici.
 *
 * `rol` alanı için şart: danışman kendi kaydını güncelleyebiliyor ve bu
 * alan açık kalsaydı kendini yönetici yapabilirdi.
 */
export const alanYalnizcaYonetici: FieldAccess = ({ req }) => yoneticiMi(req.user)

/**
 * Kullanıcı listesi: yönetici herkesi, danışman yalnızca kendini görür.
 *
 * Danışmanın kendi kaydını okuyabilmesi şart — panel oturum sahibinin
 * kaydını okuyamazsa arayüz çalışmaz.
 */
export const kendiKaydiniOkur: Access = ({ req }) => {
  if (!req.user) return false
  if (yoneticiMi(req.user)) return true
  return { id: { equals: req.user.id } }
}

/** Herkese açık okuma (hukuki metinler, mahalle içeriği gibi). */
export const herkesOkur: Access = () => true

/**
 * Ziyaretçi yalnızca yayındaki kayıtları görür; panel kullanıcısı hepsini.
 *
 * Bu, EİDS engelinin ikinci savunma hattıdır: hook bir şekilde atlansa bile
 * `durum` alanı `yayinda`/`rezerve` olmayan ilan API'den okunamaz.
 */
export const yayindakileriHerkesOkur: Access = ({ req }) => {
  if (req.user) return true
  return { durum: { in: [...HERKESE_ACIK_DURUMLAR] } }
}

/** Yayımlanmış (taslak olmayan) içerik herkese açık. */
export const yayimlananlariHerkesOkur: Access = ({ req }) => {
  if (req.user) return true
  return { yayinda: { equals: true } }
}

/**
 * Kimse okuyamaz (panel kullanıcısı hariç) — kişisel veri içeren
 * koleksiyonlar için. KVKK: veri minimizasyonu ve erişim sınırlaması.
 */
export const kimseOkuyamaz: Access = ({ req }) => Boolean(req.user)

/** Herkes oluşturabilir (form gönderimi), kimse okuyamaz/güncelleyemez. */
export const herkesOlusturur: Access = () => true

/** Hiç kimse — panel kullanıcısı dahil. Salt okunur türetilmiş kayıtlar için. */
export const kimseDegistiremez: Access = () => false

/**
 * Silme yetkisi yalnızca yöneticide.
 *
 * ⚠️ Silme bu projede diğer işlemlerden farklı: bir ilan silindiğinde EİDS
 * kayıtları (taşınmaz numarası, yetki tarihleri) da gider ve bunlar yasal
 * dayanak. Bir gözlem silindiğinde endeksin geçmişi değişir. Güncelleme
 * hatası düzeltilir, silme hatası düzeltilmez.
 *
 * `yalnizcaYonetici` ile aynı işi yapar; ayrı bir ad, koleksiyonlarda
 * "burada neden yönetici şartı var?" sorusunun cevabını okunur kılıyor.
 */
export const yalnizcaYoneticiSiler: Access = yalnizcaYonetici
