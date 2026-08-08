import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaPanel } from '@/lib/erisim'

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
    delete: yalnizcaPanel,
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
      // Erişilebilirlik sonradan eklenen bir şey değil: alt metni olmayan
      // görsel ekran okuyucuda kaybolur ve WCAG AA'yı düşürür.
      required: true,
      admin: {
        description:
          'Görselde ne olduğunu bir cümleyle yaz. Ekran okuyucu kullananlar ve ' +
          'görsel yüklenmediğinde herkes bunu görür. Örn: "Muhittin Mahallesi\'nde 3+1 dairenin salonu".',
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
     * ⚠️ Ölçüm `beforeChange`te yapılıyor, çünkü yalnızca burada dosyanın
     * ham içeriği (`req.file.data`) elimizde. `afterChange`te dosya diske
     * yazılmış olur ve yeniden okumak gerekirdi.
     *
     * Yükleme yoksa (yalnızca alt metni düzenlenmişse) ölçüm atlanıyor;
     * her kaydetmede AVIF kodlaması yapmak paneli yavaşlatırdı.
     */
    beforeChange: [
      async ({ data, req }) => {
        const dosya = req.file
        if (!dosya?.data) return data

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
