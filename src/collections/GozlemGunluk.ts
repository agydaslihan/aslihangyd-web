import type { CollectionConfig } from 'payload'

import { kimseDegistiremez, yalnizcaPanel } from '@/lib/erisim'

/**
 * Günlük gözlem özeti — panelin tek veri kaynağı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BURADA "ZİYARETÇİ" DİYE BİR SATIR YOK — VE OLMAYACAK.
 *
 * Her satır BİR GÜNDÜR, bir kişi değil. Tablo tasarımı KVKK kararının
 * kendisi: tek bir ziyaretçiye ait satır hiç yazılmadığı için, sonradan
 * "yanlışlıkla kişisel veri toplamışız" durumu yapısal olarak imkânsız.
 *
 * ⚠️ IP, oturum kimliği, tarayıcı parmak izi, serbest metin: hiçbiri
 * YOK. Şemada böyle bir alan olmaması, kod incelemesinden daha güçlü bir
 * güvence.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ŞARTNAMEDEN BİLİNÇLİ SAPMA — açıkça yazıyorum.
 *
 * Şartname "ham olay kaydı, 90 gün sonra otomatik silinir" diyor. Ham
 * kayıt HİÇ TUTULMUYOR: olaylar da bellekte toplanıp gün/olay/ayrıntı
 * kırılımında yazılıyor. Sebebi, ham kaydın bu üründe hiçbir soruyu
 * cevaplamaması — lead ilişkilendirmesi `Talepler.gonderildigiSayfa`
 * alanından geliyor, ham olay satırından değil.
 *
 * 90 gün kuralı yine de uygulanıyor: en ayrıntılı katman olan `olaylar`
 * dizisi 90 günden eski satırlarda bakım göreviyle temizleniyor;
 * toplulaştırılmış sayaçlar kalıcı.
 *
 * ⚠️ SALT OKUNUR. Elle düzenlenebilseydi panel bir ölçüm değil bir görüş
 * olurdu — Google Places sayacındaki gerekçenin aynısı.
 */
export const GozlemGunluk: CollectionConfig = {
  slug: 'gozlem-gunluk',

  labels: { singular: 'Günlük gözlem', plural: 'Günlük gözlem' },

  access: {
    // Ziyaret sayıları ziyaretçiyi ilgilendirmez.
    read: yalnizcaPanel,
    create: kimseDegistiremez,
    update: kimseDegistiremez,
    delete: kimseDegistiremez,
  },

  admin: {
    group: 'Ayarlar',
    useAsTitle: 'gun',
    defaultColumns: ['gun', 'toplamIstek', 'onayliIstek'],
    description:
      'Günlük toplulaştırılmış ölçüm. Her satır bir GÜNDÜR, bir kişi değil. ' +
      'Okumak için "Gözlemlenebilirlik" ekranını kullanın; burası ham depodur.',
    hidden: ({ user }) => (user as { rol?: string } | null)?.rol !== 'yonetici',
  },

  fields: [
    {
      name: 'gun',
      type: 'text',
      label: 'Gün (YYYY-AA-GG)',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'toplamIstek',
          type: 'number',
          label: 'Toplam sayfa görüntüleme (Katman A)',
          defaultValue: 0,
          admin: { width: '50%', readOnly: true },
        },
        {
          /**
           * ⚠️ Onay oranının payı. Panelde Katman B metriklerinin yanında
           * "onay oranı: %X" olarak görünüyor — eksik veriyi gizlemek
           * yanlış karar aldırır.
           */
          name: 'onayliIstek',
          type: 'number',
          label: 'Analitik onayı veren istek (Katman B)',
          defaultValue: 0,
          admin: { width: '50%', readOnly: true },
        },
      ],
    },

    {
      name: 'sayfalar',
      type: 'array',
      label: 'Sayfa bazında',
      admin: { readOnly: true },
      fields: [
        { name: 'rota', type: 'text', required: true },
        { name: 'goruntuleme', type: 'number', defaultValue: 0 },
        { name: 'hata', type: 'number', defaultValue: 0 },
        { name: 'toplamMs', type: 'number', defaultValue: 0 },
        { name: 'enYavasMs', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'kaynaklar',
      type: 'array',
      label: 'Yönlendiren alan adları',
      admin: {
        readOnly: true,
        description: '⚠️ Yalnızca alan adı. Tam URL hiç kaydedilmiyor.',
      },
      fields: [
        { name: 'alan', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'utmKaynaklar',
      type: 'array',
      label: 'UTM kampanya kaynakları',
      admin: { readOnly: true },
      fields: [
        { name: 'kaynak', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'ulkeler',
      type: 'array',
      label: 'Ülkeler',
      admin: { readOnly: true, description: 'Cloudflare ülke başlığından. IP okunmuyor.' },
      fields: [
        { name: 'kod', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'cihazlar',
      type: 'array',
      label: 'Cihaz sınıfı',
      admin: { readOnly: true },
      fields: [
        { name: 'sinif', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'girisSayfalari',
      type: 'array',
      label: 'Giriş sayfaları',
      admin: {
        description:
          'Ziyaretçinin siteye girdiği sayfa. ⚠️ Hiçbir kimlik üretilmiyor: ' +
          'yönlendireni bizden olmayan istek giriş sayılıyor. Yaklaşıklığın sınırı ' +
          'panelde yazılı.',
      },
      fields: [
        { name: 'rota', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'saatler',
      type: 'array',
      label: 'Saat yoğunluğu',
      admin: { description: 'Yerel saat (Europe/Istanbul) kovası, 0–23.' },
      fields: [
        { name: 'saat', type: 'number', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'tarayicilar',
      type: 'array',
      label: 'Tarayıcı dağılımı',
      admin: {
        description:
          '⚠️ SÜRÜM YOK, altı kaba kova. Sürüm + çözünürlük + saat birleşince ' +
          'tarayıcı parmak izi olurdu.',
      },
      fields: [
        { name: 'aile', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'sehirler',
      type: 'array',
      label: 'Şehir dağılımı',
      admin: {
        description:
          '⚠️ Cloudflare’in çözdüğü şehir adı; adres bilgisi okunmuyor. Raporda ' +
          'k-anonimlik eşiği uygulanıyor: eşiğin altındaki şehirler tek tek ' +
          'gösterilmez.',
      },
      fields: [
        { name: 'ad', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'olaylar',
      type: 'array',
      label: 'Olaylar (Katman B)',
      admin: {
        readOnly: true,
        description:
          '⚠️ 90 günden eski satırlarda bu dizi bakım göreviyle temizlenir; ' +
          'toplulaştırılmış sayaçlar kalır.',
      },
      fields: [
        { name: 'ad', type: 'text', required: true },
        { name: 'ayrinti', type: 'text' },
        { name: 'niyet', type: 'text' },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'vitaller',
      type: 'array',
      label: 'Core Web Vitals histogramı (Katman B)',
      admin: {
        readOnly: true,
        description:
          '⚠️ HAM DEĞER YOK — yalnızca kova sayaçları. "LCP = 2.431 ms" tek bir ' +
          'ziyarete ait bir kayıt olurdu; kovaya düşen sayaç kimseye ait değil. ' +
          'Örneklem yalnızca analitik onayı veren ziyaretçilerden oluşur.',
      },
      fields: [
        { name: 'ad', type: 'text', required: true, label: 'Metrik (LCP/CLS/INP)' },
        { name: 'cihaz', type: 'text', label: 'mobil / masaustu' },
        { name: 'kova', type: 'number', label: 'Kova sırası', defaultValue: 0 },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },

    /* ── Bot ve arama motoru trafiği ─────────────────────────────────────
     *
     * ⚠️ İNSAN SAYAÇLARINDAN AYRI SÜTUNLAR, AYNI SATIR. Ayrı bir koleksiyon
     * açmak gün başına ikinci bir yazma demekti ve şartnamenin sert kuralı
     * ("sayfa görüntüleme başına INSERT yok") iki kat zorlanırdı. Eklenen
     * şey yeni bir yazma yolu değil, yeni bir BOYUT.
     *
     * ⚠️ BU SÜTUNLAR KİŞİSEL VERİ DEĞİL — botlar kişi değil. Çerez
     * yazılmıyor, IP okunmuyor, `User-Agent` kaydedilmiyor: ham dize bir
     * kovaya çevrilip atılıyor (`lib/olcum/bot.ts`). Dolayısıyla KVKK'nın
     * 90 gün taahhüdü buraya uygulanmıyor; saklama sınırı DİSK için var ve
     * 180 gün (`BOT_SAKLAMA_GUN`).
     * ─────────────────────────────────────────────────────────────────── */

    {
      name: 'botToplamIstek',
      type: 'number',
      label: 'Bot isteği (Katman A)',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description:
          '⚠️ `toplamIstek` İÇİNDE DEĞİL, ONUN YANINDA. İkisini toplamak ' +
          '"ziyaretçi" sayısını bot taramalarıyla şişirmek olurdu.',
      },
    },
    {
      name: 'botIstekleri',
      type: 'array',
      label: 'Bot türüne göre istek',
      admin: {
        readOnly: true,
        description:
          'Tür, `User-Agent` dizesinden türetilmiş bir KOVA; ham dize hiçbir yere ' +
          'kaydedilmiyor. `diger` türündeki satırlar botun adıyla duruyor — adsız ' +
          'bir "diğer" toplamı, yeni bir botun trafiğini fark etmemizi engellerdi.',
      },
      fields: [
        { name: 'tur', type: 'text', required: true, label: 'Tür' },
        { name: 'ad', type: 'text', label: 'Ad' },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'botSayfalari',
      type: 'array',
      label: 'Taranan sayfalar',
      admin: {
        readOnly: true,
        description:
          '⚠️ `ilkMs` / `sonMs` EPOCH MİLİSANİYE. Gün satırları beş dakikada bir ' +
          'birleştiriliyor ve birleştirme ilk tarama için en KÜÇÜK, son tarama için ' +
          'en BÜYÜK değeri alıyor; dizge karşılaştırmasıyla bu, biçim değiştiği gün ' +
          'sessizce yanlış sonuç verirdi.',
      },
      fields: [
        { name: 'rota', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
        { name: 'ilkMs', type: 'number', defaultValue: 0, label: 'İlk tarama (epoch ms)' },
        { name: 'sonMs', type: 'number', defaultValue: 0, label: 'Son tarama (epoch ms)' },
      ],
    },
    {
      name: 'botDurumlari',
      type: 'array',
      label: 'Bot isteklerinin yanıt kodu',
      admin: {
        readOnly: true,
        description:
          '⚠️ YALNIZCA `404` ve `5xx` GÖZLENEBİLİYOR. Vekil katmanı yanıtı görmüyor; ' +
          '200 sayısı türetiliyor (toplam − 404 − 5xx) ve ara durumlar (301, 304) o ' +
          'tarafta kalıyor. Yaklaşıklık panelde yazılı.',
      },
      fields: [
        { name: 'kod', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      /**
       * ⚠️ BU BAYRAK BİR DÜRÜSTLÜK ŞARTI.
       *
       * 11 Ekim 2026'dan önce yazılan satırlarda insan sayaçları bot
       * trafiğini DE içeriyordu: `proxy.ts` her isteği sayıyordu ve bot
       * süzgeci yoktu. `User-Agent` hiçbir yere kaydedilmediği için geriye
       * dönük ayrıştırmak imkânsız. Bayrak taşımayan günler panelde uyarı
       * olarak görünüyor; kaldırmak, karşılaştırmayı sessizce yanlış
       * yapmak olurdu.
       */
      name: 'botAyrimi',
      type: 'checkbox',
      label: 'İnsan ve bot sayaçları ayrıştırıldı',
      defaultValue: false,
      admin: { readOnly: true },
    },
    {
      name: 'botTemizlendi',
      type: 'checkbox',
      label: '180 gün doldu, bot ayrıntısı temizlendi',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'Bot verisi kişisel veri değil; sınır KVKK değil DİSK için. Sayfa ve tür ' +
          'kırılımı temizlenir, toplam istek sayısı kalır.',
      },
    },

    {
      name: 'ayrintiTemizlendi',
      type: 'checkbox',
      label: '90 gün doldu, ayrıntı temizlendi',
      defaultValue: false,
      admin: { readOnly: true },
    },
  ],
}
