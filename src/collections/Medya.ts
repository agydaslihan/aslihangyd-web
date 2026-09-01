import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaPanel, yalnizcaYoneticiSiler } from '@/lib/erisim'

/**
 * Görsel ve belge deposu.
 *
 * Video BU KOLEKSİYONDA TUTULMAZ. CLAUDE.md: "Video: ASLA self-host etme,
 * CDN (Bunny Stream) üzerinden HLS." 4K drone videosu sunucunun bant
 * genişliğini tüketir ve siteyi düşürür — MIME kısıtı bunu kod seviyesinde
 * engeller.
 */
export const Medya: CollectionConfig = {
  slug: 'medya',
  labels: { singular: 'Görsel', plural: 'Görseller' },

  access: {
    read: herkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  admin: {
    useAsTitle: 'alt',
    description: 'Site görselleri. Video yüklenmez — videolar CDN üzerinden yayınlanır.',
  },

  upload: {
    staticDir: process.env.MEDYA_DIZINI ?? 'medya',

    // Yalnızca görsel ve PDF. Video uzantıları bilinçli olarak dışarıda.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'],

    focalPoint: true,

    // Boyutlar mobil öncelikli seçildi (trafiğin ~%75'i mobil).
    // Tarayıcıya AVIF/WebP servis etmeyi next/image üstlenir; burada
    // yalnızca piksel boyutlarını hazırlıyoruz.
    imageSizes: [
      { name: 'kucuk', width: 480, height: undefined, withoutEnlargement: true },
      { name: 'orta', width: 960, height: undefined, withoutEnlargement: true },
      { name: 'buyuk', width: 1600, height: undefined, withoutEnlargement: true },
      // Sosyal medya paylaşım kartı — sabit oran gerekir.
      { name: 'paylasim', width: 1200, height: 630, fit: 'cover' },
    ],
  },

  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alternatif metin',
      /**
       * ─────────────────────────────────────────────────────────────────
       * ⚠️ ZORUNLU DEĞİL — VE BU KARAR SAHADAN GELDİ.
       *
       * Alan önceden `required: true` idi ve gerekçesi doğruydu:
       * erişilebilirlik sonradan eklenen bir şey değil. Ama sonucu şuydu:
       * sahada bir dairede yirmi fotoğraf çeken kişi, yirmi kez metin
       * yazmak zorunda kalıyor ve yüklemeyi bırakıyor. Yüklenmemiş bir
       * fotoğrafın alt metni de yoktur.
       *
       * Yeni kural: boş bırakılabilir, ama BOŞ KALMAZ. Kanca bağlamdan
       * bir metin türetiyor ve `altOtomatik` işaretini koyuyor. Otomatik
       * metin, boş alt metinden iyidir — ve panel kaç görselin gerçek
       * metne ihtiyacı olduğunu sayıyor.
       *
       * ⚠️ Bu bir erişilebilirlikten VAZGEÇİŞ değil, bir kademelendirme:
       * her görselin bir alt metni var; hangilerinin insan eliyle
       * yazılması gerektiği görünür durumda.
       * ─────────────────────────────────────────────────────────────────
       */
      required: false,
      admin: {
        description:
          'Görselde ne olduğunu bir cümleyle yaz. Ekran okuyucu kullananlar ve ' +
          'görsel yüklenmediğinde herkes bunu görür. Örn: "Muhittin Mahallesi\'nde 3+1 dairenin salonu". ' +
          '⚠️ Boş bırakırsanız dosya adından geçici bir metin üretilir ve görsel ' +
          '"alt metni eksik" olarak işaretlenir — sonra toplu olarak düzeltebilirsiniz.',
      },
    },
    {
      name: 'altOtomatik',
      type: 'checkbox',
      label: 'Alt metin otomatik üretildi',
      defaultValue: false,
      admin: {
        readOnly: true,
        description:
          'İşaretliyse bu görselin alt metni insan eliyle yazılmadı. Ekran okuyucu için ' +
          'yeterli değil; fırsat bulunca düzeltin.',
      },
    },
    {
      name: 'kaynak',
      type: 'text',
      label: 'Kaynak / telif',
      admin: {
        description:
          'Görsel size ait değilse kaynağını yazın. Boş bırakılırsa kendi çekimimiz sayılır.',
      },
    },

    /**
     * ⚠️ Bütçe, görselin NEREDE kullanıldığına bağlı — tek eşik olamaz.
     *
     * İlk sürümde her görsel hero bütçesiyle (mobil 80 kB) yargılanıyordu.
     * Sonuç: kart görselleri de "bütçe aşıldı" gösteriyordu, oysa kart
     * hiçbir zaman 828 piksel inmez — `sizes` ona 480 piksel indirtir.
     * Kalıcı yanlış alarm, kısa sürede görmezden gelinen bir uyarıdır.
     *
     * Varsayılan "belirsiz": rozet sayıları gösterir ama hüküm vermez.
     * Bilmediğini uydurmaktansa söylememesi yeğ.
     */
    {
      name: 'kullanim',
      type: 'select',
      label: 'Nerede kullanılacak',
      defaultValue: 'belirsiz',
      options: [
        { label: 'Belirsiz / karışık', value: 'belirsiz' },
        { label: 'Hero — sayfa başındaki büyük görsel', value: 'hero' },
        { label: 'Kart / galeri küçük görseli', value: 'kart' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Boyut bütçesi buna göre değerlendirilir. Hero görseli sayfanın en büyük ' +
          'öğesidir ve açılış hızını doğrudan belirler.',
      },
    },

    /**
     * ⚠️ Aşağıdaki dört alan KANCA TARAFINDAN yazılıyor, elle girilmez.
     *
     * Panelde `readOnly`; biri elle değiştirebilseydi bütçe rozeti gerçeği
     * değil, birinin yazdığını gösterirdi.
     */
    {
      name: 'tahminiKartBayt',
      type: 'number',
      label: 'Kart boyutunda inen (AVIF, 480 px)',
      admin: { readOnly: true, position: 'sidebar', hidden: true },
    },
    {
      name: 'tahminiMobilBayt',
      type: 'number',
      label: 'Mobilde inen boyut (AVIF, 828 px)',
      admin: { readOnly: true, position: 'sidebar', hidden: true },
    },
    {
      name: 'tahminiMasaustuBayt',
      type: 'number',
      label: 'Masaüstünde inen boyut (AVIF, 1920 px)',
      admin: { readOnly: true, position: 'sidebar', hidden: true },
    },
    {
      name: 'bulanikVeri',
      type: 'text',
      label: 'Bulanık önizleme',
      admin: { readOnly: true, hidden: true },
    },

    /**
     * Bütçe rozeti — panelde görünen uyarı.
     *
     * ⚠️ Bu bir KAPI DEĞİL, AYNA. Bütçeyi aşan görselin yüklenmesi
     * engellenmiyor: bazen büyük görsel bilinçli bir karardır ve içerik
     * girişini bloke etmek, Aslıhan'ın panelde takılıp kalması demekti.
     * Ama sessiz de kalmıyor — sayı gözünün önünde duruyor.
     */
    {
      name: 'butceRozeti',
      type: 'ui',
      label: 'Boyut bütçesi',
      admin: {
        position: 'sidebar',
        components: { Field: '@/components/panel/GorselButceRozeti#GorselButceRozeti' },
      },
    },
  ],

  hooks: {
    /**
     * ⚠️ SVG TEMİZLİĞİ `beforeOperation`DA — VE BU YER ÖLÇÜMLE BULUNDU.
     *
     * İlk kurulumda temizlik `beforeChange` içindeydi ve HİÇBİR ETKİSİ
     * OLMADI: yüklenen dosya kaydedildi, içindeki dış referans olduğu gibi
     * servis edildi. Sebep sıra — Payload `generateFileData`yı
     * `beforeChange`ten ÖNCE çalıştırıp diske yazılacak tamponu orada
     * hazırlıyor; sonradan `req.file.data`yı değiştirmek yazılan dosyayı
     * değiştirmiyor.
     *
     * Deneyle görüldü: temizlenmesi gereken SVG 233 baytla, dış referansı
     * yerinde duruyordu. `beforeOperation` dosya işlenmeden önce çalışıyor.
     *
     * ⚠️ SVG BİR GÖRSEL DEĞİL BİR BELGEDİR. `<img>` içinde betiği çalışmaz
     * ama dosya kendi adresinden açıldığında tarayıcı onu XML olarak açar
     * ve içindeki `<script>` bizim kaynağımızda çalışır.
     *
     * ⚠️ PAYLOAD'IN KENDİ KAPISI DA VAR ve bu kanca onun yerine geçmiyor:
     * Payload 3.87 zararlı içerik taşıyan SVG'yi tümden REDDEDİYOR
     * ("SVG file contains potentially harmful content"). Bu kanca onun
     * geçirdiklerini temizliyor — örneğin uzak bir sunucuya işaret eden
     * `<image href="https://…">`, yani logoyu ziyaretçinin IP'sini
     * bildiren bir izleyiciye çeviren satır. Payload onu zararlı saymıyor;
     * biz istemiyoruz.
     */
    beforeOperation: [
      async ({ args, operation }) => {
        if (operation !== 'create' && operation !== 'update') return args

        const dosya = args.req?.file
        if (!dosya?.data) return args

        const { svgMi, svgTemizle } = await import('@/lib/medya/svgTemizle')
        if (!svgMi(dosya.mimetype, dosya.name)) return args

        const { icerik, kaldirilanlar } = svgTemizle(dosya.data.toString('utf8'))
        if (kaldirilanlar.length > 0) {
          dosya.data = Buffer.from(icerik, 'utf8')
          dosya.size = dosya.data.byteLength
          // ⚠️ Sessizce temizlemiyoruz: yükleyen kişi ne olduğunu bilmeli.
          args.req.payload.logger.warn(
            `[medya] SVG temizlendi (${dosya.name}): ${kaldirilanlar.join(', ')}`,
          )
        }

        return args
      },
    ],

    /**
     * ⚠️ Ölçüm `beforeChange`te yapılıyor, çünkü yalnızca burada dosyanın
     * ham içeriği (`req.file.data`) elimizde. `afterChange`te dosya diske
     * yazılmış olur ve yeniden okumak gerekirdi.
     *
     * Yükleme yoksa (yalnızca alt metni düzenlenmişse) ölçüm atlanıyor;
     * her kaydetmede AVIF kodlaması yapmak paneli yavaşlatırdı.
     */
    beforeChange: [
      /**
       * Boş alt metni doldurur.
       *
       * ⚠️ ÜRETİLEN METİN DOSYA ADINDAN — çünkü elimizdeki tek bağlam o.
       * "Görsel" yazmak hiçbir şey söylemez; dosya adı en azından
       * "salon-genis-aci.jpg" gibi bir ipucu taşıyabilir. Metin geçici
       * olduğu `altOtomatik` işaretiyle belli.
       *
       * ⚠️ İNSAN YAZDIYSA DOKUNULMAZ: yalnızca boşken çalışıyor ve
       * kullanıcı sonradan yazdığında işaret kalkıyor.
       */
      ({ data }) => {
        const yazilan = typeof data?.alt === 'string' ? data.alt.trim() : ''

        if (yazilan !== '') {
          data.altOtomatik = false
          return data
        }

        const dosyaAdi =
          typeof data?.filename === 'string' && data.filename !== ''
            ? data.filename
                .replace(/\.[a-z0-9]+$/i, '')
                .replace(/[-_]+/g, ' ')
                .trim()
            : ''

        data.alt =
          dosyaAdi === '' ? 'Görsel (alt metin eklenmedi)' : `${dosyaAdi} (alt metin eklenmedi)`
        data.altOtomatik = true
        return data
      },
      async ({ data, req }) => {
        const dosya = req.file
        if (!dosya?.data) return data

        // SVG'de bayt bütçesi ölçümü anlamsız: sharp onu rasterleştirmiyor.
        const { svgMi } = await import('@/lib/medya/svgTemizle')
        if (svgMi(dosya.mimetype, dosya.name)) return data

        const { gorselButcesiniOlc } = await import('@/lib/medya/gorselButcesi')
        const olcum = await gorselButcesiniOlc(dosya.data)
        if (!olcum) return data

        return {
          ...data,
          tahminiKartBayt: olcum.kartBayt,
          tahminiMobilBayt: olcum.mobilBayt,
          tahminiMasaustuBayt: olcum.masaustuBayt,
          bulanikVeri: olcum.bulanikVeri,
        }
      },
    ],
  },
}
