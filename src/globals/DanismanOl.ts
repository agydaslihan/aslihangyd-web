import type { GlobalConfig } from 'payload'

import { sinirliEditor } from '@/lib/icerik/alanlar'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * "Danışman ol" sayfasının içeriği.
 *
 * ⚠️ Sayfanın AÇIK olup olmadığı buradan değil `SiteBolumleri`'nden
 * yönetilir. İçerik ile görünürlük ayrı: metni hazırlarken sayfayı kapalı
 * tutabilmek gerekiyor.
 *
 * ⚠️ Buraya sözleşme, yetkilendirme taslağı ya da hukuki taahhüt metni
 * YAZILMAZ. Bu bir davet sayfası; hukuki metinler avukattan gelir
 * (CLAUDE.md kural 3).
 */
export const DanismanOl: GlobalConfig = {
  slug: 'danisman-ol',
  label: 'Danışman Ol Sayfası',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: danışman ilanı metni — kurumsal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Sayfanın davet metni. Sayfanın açık/kapalı olması Ayarlar → Site Bölümleri altında.',
  },

  fields: [
    {
      name: 'baslik',
      type: 'text',
      label: 'Başlık',
      admin: { description: 'Boşsa varsayılan başlık kullanılır.' },
    },
    {
      name: 'aciklama',
      type: 'textarea',
      label: 'Açıklama',
      admin: { description: 'Davet bloğunda başlığın altında görünür.' },
    },
    {
      name: 'nedenler',
      type: 'array',
      label: '"Neden birlikte çalışmalı" maddeleri',
      labels: { singular: 'Madde', plural: 'Maddeler' },
      admin: {
        description:
          '⚠️ Kazanç vaadi ya da garanti içeren ifade yazma — reklam mevzuatı açısından ' +
          'risklidir. Somut ve doğrulanabilir maddeler kullan.',
      },
      fields: [
        { name: 'baslik', type: 'text', label: 'Madde başlığı', required: true },
        { name: 'metin', type: 'textarea', label: 'Açıklama' },
        {
          name: 'gorsel',
          type: 'upload',
          relationTo: 'medya',
          label: 'Küçük görsel (isteğe bağlı)',
          admin: {
            description:
              'Maddenin üstünde kare olarak görünür. Boşsa madde yalnızca metinle çizilir — ' +
              'mevcut tasarımın aynısı. ⚠️ Kare kırpılıyor; 400×400 piksel yeterli.',
          },
        },
      ],
    },

    {
      name: 'heroGorseli',
      type: 'upload',
      relationTo: 'medya',
      label: 'Üst bant görseli',
      admin: {
        description:
          'Sayfanın en üstündeki koyu bandın arka planı. Boşsa mevcut düz koyu bant kalır. ' +
          "⚠️ Sayfanın en büyük görseli budur ve LCP'yi belirler: yatay, en az 1600 piksel. " +
          'Medya kaydında kullanım türünü seçerseniz panel bütçe durumunu gösterir.',
      },
    },

    /**
     * ─────────────────────────────────────────────────────────────────────
     * ⚠️ KARARTMA BİR ZEVK AYARI DEĞİL, ERİŞİLEBİLİRLİK AYARI — VE ALT
     *    SINIRI ÖLÇÜLDÜ.
     *
     * Bandın metni beyaz. Karartma azaldıkça açık renkli bir fotoğrafta
     * beyaz metin okunmaz hâle geliyor. En kötü durum (bembeyaz fotoğraf)
     * için hesaplanan kontrast:
     *
     *     %40 → 2,49:1 ✗      %65 → 5,29:1 ✓
     *     %50 → 3,30:1 ✗      %70 → 6,28:1 ✓
     *     %60 → 4,49:1 ✗      %75 → 7,48:1 ✓
     *
     * WCAG AA eşiği 4,5:1. Alt sınır bu yüzden %65: bir kademe altı
     * (%60) eşiği KIL PAYI kaçırıyor ve o pay bir zevk meselesi değil.
     *
     * ⚠️ Serbest bir sayı alanı, %20 yazıp "daha güzel oldu" demeyi
     * mümkün kılardı — ve o sayfa, fotoğrafı açık olan ziyaretçi için
     * okunmaz olurdu.
     * ─────────────────────────────────────────────────────────────────────
     */
    {
      name: 'heroKarartmasi',
      type: 'select',
      label: 'Hero görselinin karartma oranı',
      defaultValue: '75',
      options: [
        { value: '65', label: '%65 — en açık (ölçülmüş alt sınır)' },
        { value: '75', label: '%75 — varsayılan' },
        { value: '85', label: '%85 — koyu' },
      ],
      admin: {
        description:
          '⚠️ Bandın metni beyaz. Karartma azaldıkça açık renkli bir fotoğrafta metin ' +
          'okunmaz hâle gelir. %65 ölçülmüş alt sınır: bir kademe altı WCAG AA eşiğini ' +
          'kıl payı kaçırıyor. Görsel yoksa bu ayarın bir etkisi olmaz.',
        condition: (veri: Record<string, unknown>) => Boolean(veri?.heroGorseli),
      },
    },
    {
      name: 'formUstuMetin',
      type: 'richText',
      label: 'Başvuru formunun üstündeki metin',
      editor: sinirliEditor,
      admin: {
        description:
          'Formdan hemen önce görünür; boşsa mevcut metin kalır. ⚠️ Çalışma koşulu, ' +
          'komisyon oranı ya da taahhüt YAZMAYIN — bunlar sözleşme konusu ve görüşmede ' +
          'yazılı olarak paylaşılıyor (CLAUDE.md kural 3).',
      },
    },

    {
      name: 'ekGorseller',
      type: 'array',
      label: 'Sayfa içi görseller',
      labels: { singular: 'Görsel', plural: 'Görseller' },
      admin: {
        description: 'Maddelerin altında ızgara olarak görünür. Boşsa hiç çizilmez.',
      },
      fields: [
        { name: 'gorsel', type: 'upload', relationTo: 'medya', label: 'Görsel', required: true },
        { name: 'aciklama', type: 'text', label: 'Açıklama (altyazı)' },
      ],
    },
  ],
}
