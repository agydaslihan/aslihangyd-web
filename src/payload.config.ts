import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { tr } from '@payloadcms/translations/languages/tr'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { AltbilgiBaglantilari } from '@/collections/AltbilgiBaglantilari'
import { DanismanBasvurulari } from '@/collections/DanismanBasvurulari'
import { Degerlemeler } from '@/collections/Degerlemeler'
import { SIHIRBAZ_YOLU } from '@/components/sihirbaz/yol'
import { ANASAYFA_YOLU } from '@/components/anasayfa/yol'
import { OLCUM_YOLU } from '@/components/olcum/yol'
import { SOSYAL_YOLU } from '@/components/sosyal/yol'
import { GOZLEM_ICE_AKTARMA_YOLU } from '@/components/gozlem/yol'
import { GOOGLE_YOLU } from '@/components/google/yol'
import { MAHALLE_VERISI_YOLU } from '@/components/mahalleVerisi/yol'
import { OSM_YOLU } from '@/components/osm/yol'
import { MAHALLE_RAKAM_YOLU } from '@/components/mahalleRakam/yol'
import { RAYIC_YOLU } from '@/components/rayic/yol'
import { YAKINLIK_YOLU } from '@/components/yakinlik/yol'
import { GozlemGunluk } from '@/collections/GozlemGunluk'
import { Gozlemler } from '@/collections/Gozlemler'
import { Ilanlar } from '@/collections/Ilanlar'
import { IlgiNoktalari } from '@/collections/IlgiNoktalari'
import { Kullanicilar } from '@/collections/Kullanicilar'
import { Mahalleler } from '@/collections/Mahalleler'
import { Medya } from '@/collections/Medya'
import { RayicDegerler } from '@/collections/RayicDegerler'
import { Sayfalar } from '@/collections/Sayfalar'
import { Talepler } from '@/collections/Talepler'
import { VergiParametreleri } from '@/collections/VergiParametreleri'
import { DegerlemeAyarlari } from '@/globals/DegerlemeAyarlari'
import { EndeksAyarlari } from '@/globals/EndeksAyarlari'
import { BakimDurumu } from '@/globals/BakimDurumu'
import { DanismanOl } from '@/globals/DanismanOl'
import { GooglePlacesKullanimi } from '@/globals/GooglePlacesKullanimi'
import { KurumsalBilgiler } from '@/globals/KurumsalBilgiler'
import { Hakkimizda } from '@/globals/Hakkimizda'
import { HeroSlider } from '@/globals/HeroSlider'
import { MarkaGorunum } from '@/globals/MarkaGorunum'
import { MenuDuzeni } from '@/globals/MenuDuzeni'
import { PortfoyBolumleri } from '@/globals/PortfoyBolumleri'
import { AlanSagligi } from '@/globals/AlanSagligi'
import { AnaSayfaDuzeni } from '@/globals/AnaSayfaDuzeni'
import { AltbilgiAyarlari } from '@/globals/AltbilgiAyarlari'
import { SayfaIcerikleri } from '@/globals/SayfaIcerikleri'
import { SiteBolumleri } from '@/globals/SiteBolumleri'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default buildConfig({
  // CLAUDE.md: kullanıcıya görünen HER ŞEY Türkçe — CMS admin paneli dahil.
  i18n: {
    supportedLanguages: { tr },
    fallbackLanguage: 'tr',
  },

  admin: {
    user: Kullanicilar.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Aslıhan GYD Yönetim',
    },

    /**
     * Portföy giriş sihirbazı — admin'in İÇİNDE, yanında.
     *
     * Ayrı bir sayfa yerine admin görünümü seçildi: oturum yönetimi
     * Payload'ın kalır, ikinci bir kimlik doğrulama yolu açılmaz ve
     * kullanıcı admin'den çıkmaz.
     *
     * ⚠️ Sihirbaz admin'in yerine geçmez. Kayıtları daima `taslak` olarak
     * oluşturur; yayına alma, EİDS kapısının bulunduğu ilan sayfasında
     * bilinçli bir eylem olarak kalır (CLAUDE.md kural 1).
     */
    components: {
      /**
       * ⚠️ Bildirim şeridi — panelin ana ekranında, en üstte.
       *
       * EİDS yetki bitişi ve bakım görevlerinin aksaması yasal sonuç
       * doğuruyor. SMTP gelene kadar tek uyarı kanalı `bakim.log` idi —
       * kimsenin bakmadığı bir dosya. Uyarı, işin yapıldığı yerde
       * görünmezse yok sayılır.
       */
      beforeDashboard: ['@/components/panel/BildirimSeridi#default'],

      views: {
        portfoySihirbazi: {
          Component: '@/components/sihirbaz/SihirbazGorunumu#default',
          path: SIHIRBAZ_YOLU,
        },

        /**
         * Sosyal medya materyali.
         *
         * ⚠️ Bu ekran hiçbir şey YAYINLAMAZ; görsel ve metin taslağı
         * üretir. Otomatik paylaşım bilinçli olarak yok — hesaptan çıkan
         * her cümle Aslıhan'ın sözü ve ilan metni yasal sonuç doğuruyor.
         */
        /**
         * Gözlemlenebilirlik.
         *
         * ⚠️ Bu ekran hiçbir şey YAZMAZ ve tek ziyaretçi göstermez;
         * `gozlem-gunluk` koleksiyonundaki gün satırlarını okuyup soruya
         * çevirir. Yalnızca yönetici: dönüşüm ve trafik verisi editoryal
         * değil ticari bilgi.
         */
        gozlemlenebilirlik: {
          Component: '@/components/olcum/OlcumGorunumu#default',
          path: OLCUM_YOLU,
        },

        /**
         * Ana sayfa bölümlerinin veri durumu.
         *
         * ⚠️ Verisi olmayan bölüm sayfada hiç çizilmiyor; bu ekran "neden
         * görünmüyor" sorusunun tek cevabı. Sayfanın okuduğu fonksiyonun
         * aynısını okuyor.
         */
        anaSayfaBolumleri: {
          Component: '@/components/anasayfa/AnaSayfaGorunumu#default',
          path: ANASAYFA_YOLU,
        },

        sosyalMateryal: {
          Component: '@/components/sosyal/SosyalGorunumu#default',
          path: SOSYAL_YOLU,
        },

        /**
         * Gözlem CSV içe aktarma.
         *
         * ⚠️ Diğer özel görünümlerin aksine bu ekran veri YAZAR. Yazma
         * yolu Local API + `overrideAccess: false`; koleksiyon erişim
         * kuralları ve `beforeChange` kancası aynen çalışır. Ekran
         * gövdesinde oturum kapısı zorunlu.
         */
        gozlemIceAktarma: {
          Component: '@/components/gozlem/IceAktarmaGorunumu#default',
          path: GOZLEM_ICE_AKTARMA_YOLU,
        },

        /**
         * OpenStreetMap POI içe aktarma.
         *
         * ⚠️ Yalnızca YÖNETİCİ: yüzlerce kayıt oluşturur ve dış servise
         * sorgu atar. ⚠️ ODbL atıf yükümlülüğü — içe aktarılan noktalar
         * sitede "© OpenStreetMap katkıcıları" ile gösterilir.
         */
        osmIceAktarma: {
          Component: '@/components/osm/OsmGorunumu#default',
          path: OSM_YOLU,
        },

        /**
         * Mahalle verisi kurulumu — liste + OpenStreetMap sınırları.
         *
         * ⚠️ Yalnızca YÖNETİCİ: yirmiden fazla kayıt açıyor ve mahalle
         * sınırlarını topluca değiştiriyor. ⚠️ Bu ekran RAKAM YAZMAZ; ad,
         * yerleşim türü, sınır ve merkez dışında hiçbir alana dokunmaz.
         * ⚠️ ODbL atıf yükümlülüğü sınırlar için de geçerli.
         */
        mahalleVerisi: {
          Component: '@/components/mahalleVerisi/MahalleVerisiGorunumu#default',
          path: MAHALLE_VERISI_YOLU,
        },

        /**
         * Google Places eşleştirme.
         *
         * ⚠️ Yalnızca YÖNETİCİ: her arama ücretli bir API çağrısı.
         * ⚠️ Ekran Google İÇERİĞİNİ KAYDETMEZ; yazdığı tek alan
         * `googlePlaceId`. Lisans, yer kimliği dışındaki içeriğin kalıcı
         * saklanmasına izin vermiyor.
         */
        googlePlaces: {
          Component: '@/components/google/GoogleGorunumu#default',
          path: GOOGLE_YOLU,
        },

        /**
         * Rayiç bedel CSV içe aktarma.
         *
         * ⚠️ Yalnızca YÖNETİCİ: bu veri alım maliyeti hesaplayıcısını ve
         * mahalle sayfasındaki rayiç/piyasa oranını besliyor; yanlış rakam
         * ziyaretçiye yanlış vergi hesabı gösterir.
         */
        rayicIceAktarma: {
          Component: '@/components/rayic/RayicGorunumu#default',
          path: RAYIC_YOLU,
        },

        /**
         * Mahalle rakamları CSV içe aktarma.
         *
         * ⚠️ Yalnızca YÖNETİCİ: m², kira, çarpan ve değişim rakamları
         * yatırım skorunu, mahalle karşılaştırmasını ve sitedeki her
         * "ortalama" ifadesini besliyor. Yanlış rakam ziyaretçiye yanlış
         * yatırım kararı aldırır.
         *
         * ⚠️ Araç var, veri yok — bilinçli. Rakamları Aslıhan giriyor;
         * koda yazmak CLAUDE.md kural 2'nin ihlali olurdu.
         */
        mahalleRakamlari: {
          Component: '@/components/mahalleRakam/RakamGorunumu#default',
          path: MAHALLE_RAKAM_YOLU,
        },

        /**
         * Yakınlıktan skor önerileri.
         *
         * ⚠️ Bu ekran da hiçbir şey KAYDETMEZ. İlgi noktası
         * koordinatlarından üç skor bileşeni türetip gerekçesiyle
         * gösterir; alanı Aslıhan doldurur. Otomatik yazım, POI kaydı
         * eksik olan mahalleyi "donatısı zayıf" diye damgalardı —
         * veri eksikliğini olguya çevirmek olurdu.
         */
        skorOnerileri: {
          Component: '@/components/yakinlik/SkorOnerileriGorunumu#default',
          path: YAKINLIK_YOLU,
        },
      },
      // Sihirbaz bir koleksiyon olmadığı için otomatik menüde görünmez;
      // görünmeyen bir araç, olmayan bir araçtır.
      afterNavLinks: [
        '@/components/sihirbaz/SihirbazNavBaglantisi#SihirbazNavBaglantisi',
        '@/components/sosyal/SosyalNavBaglantisi#SosyalNavBaglantisi',
        '@/components/gozlem/GozlemNavBaglantisi#GozlemNavBaglantisi',
        '@/components/olcum/OlcumNavBaglantisi#OlcumNavBaglantisi',
        '@/components/anasayfa/AnaSayfaNavBaglantisi#AnaSayfaNavBaglantisi',
        '@/components/mahalleVerisi/MahalleVerisiNavBaglantisi#MahalleVerisiNavBaglantisi',
        '@/components/mahalleRakam/RakamNavBaglantisi#RakamNavBaglantisi',
        '@/components/osm/OsmNavBaglantisi#OsmNavBaglantisi',
        '@/components/google/GoogleNavBaglantisi#GoogleNavBaglantisi',
        '@/components/rayic/RayicNavBaglantisi#RayicNavBaglantisi',
        '@/components/yakinlik/YakinlikNavBaglantisi#YakinlikNavBaglantisi',
      ],
    },
  },

  collections: [
    GozlemGunluk,
    Ilanlar,
    Mahalleler,
    IlgiNoktalari,
    Talepler,
    DanismanBasvurulari,
    Degerlemeler,
    Gozlemler,
    RayicDegerler,
    VergiParametreleri,
    Sayfalar,
    Medya,
    AltbilgiBaglantilari,
    Kullanicilar,
  ],

  globals: [
    KurumsalBilgiler,
    Hakkimizda,
    SayfaIcerikleri,
    AltbilgiAyarlari,
    HeroSlider,
    AnaSayfaDuzeni,
    MarkaGorunum,
    SiteBolumleri,
    MenuDuzeni,
    PortfoyBolumleri,
    DanismanOl,
    DegerlemeAyarlari,
    EndeksAyarlari,
    BakimDurumu,
    AlanSagligi,
    GooglePlacesKullanimi,
  ],

  editor: lexicalEditor(),

  // Görsel boyutlandırma (Medya koleksiyonundaki imageSizes) için gerekli.
  sharp,

  // CLAUDE.md kural 7: sırlar koda girmez, .env'den okunur.
  secret: process.env.PAYLOAD_SECRET ?? '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),

    /**
     * ⚠️ Şemayı YALNIZCA migration'lar değiştirir.
     *
     * Payload, üretim dışı ortamlarda varsayılan olarak şemayı doğrudan
     * veritabanına "push" eder. Bu, üç somut soruna yol açıyordu:
     *
     * 1. `pnpm test` çalıştırmak veritabanı şemasını sessizce değiştiriyordu.
     * 2. Push ile migration'lar birbirine karışınca `payload migrate`
     *    etkileşimli bir soru sorup CI'da kilitleniyordu.
     * 3. Geliştirme ile üretim şeması ayrışabiliyordu — migration'ın
     *    gerçekten çalıştığı ilk yer üretim oluyordu.
     *
     * Kapalı olması, üretimde çalışacak migration'ın geliştirmede de aynen
     * çalışmasını garanti eder. Şema değişikliği akışı:
     *   pnpm payload migrate:create <ad> && pnpm payload migrate
     */
    push: false,
  }),
})
