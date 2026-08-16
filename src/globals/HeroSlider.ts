import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'
import { AZAMI_OVERLAY, ASGARI_OVERLAY } from '@/lib/hero/tipler'

/**
 * Ana sayfa hero slaytları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HERO SİTENİN LCP ÖĞESİ — BURADAKİ HER KARAR PERFORMANSA ÇARPIYOR
 *
 * Ana sayfada ilk boyanan büyük öğe hero görselidir; Lighthouse'un LCP
 * ölçümü onu ölçer. Bu yüzden bazı ayarlar bilinçli olarak AÇILMADI:
 *
 *  · Geçiş efekti seçimi yok — her efekt ek JS ve ek boyama demek
 *  · Slayt başına ayrı yükseklik yok — sabit en-boy oranı CLS'i sıfırda
 *    tutuyor; slayta göre değişen yükseklik düzeni zıplatırdı
 *  · Video slayt yok — LCP'yi ölçülemez hâle getirir
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ GÖRSEL YOKSA SİTE KIRILMAZ. Hiç aktif slayt yoksa mevcut metin
 * hero'su aynen görünür. Slider bir ek, bir varlık şartı değil.
 */
export const HeroSlider: GlobalConfig = {
  slug: 'hero-slider',
  label: 'Ana Sayfa Hero',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: ana sayfanın ilk ekranı — editoryal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Ana sayfanın en üstündeki alan. Hiç slayt eklemezseniz mevcut metin hero’su görünmeye ' +
      'devam eder — site slayt olmadan da düzgün çalışır.',
  },

  fields: [
    {
      name: 'slaytlar',
      type: 'array',
      label: 'Slaytlar',
      labels: { singular: 'Slayt', plural: 'Slaytlar' },
      admin: {
        description:
          'Sıra bu listedeki sıradır; sürükleyerek değiştirin. ⚠️ İLK slayt sayfanın LCP ' +
          'öğesidir: görselini "Hero" kullanımıyla yükleyin ve mobil bütçesini (80 kB) aşmayın.',
      },
      fields: [
        {
          name: 'gorsel',
          type: 'upload',
          relationTo: 'medya',
          label: 'Görsel',
          required: true,
          admin: {
            description:
              'Yatay, en az 1920 piksel geniş. Medya kaydında "Kullanım: Hero" seçerseniz ' +
              'panel size ziyaretçiye inecek gerçek boyutu ve bütçe durumunu gösterir.',
          },
        },
        {
          name: 'baslik',
          type: 'text',
          label: 'Başlık',
          required: true,
        },
        {
          name: 'altBaslik',
          type: 'textarea',
          label: 'Alt başlık',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'butonMetni',
              type: 'text',
              label: 'Buton metni',
              admin: { width: '50%', description: 'Boşsa buton hiç çıkmaz.' },
            },
            {
              name: 'butonLink',
              type: 'text',
              label: 'Buton adresi',
              admin: { width: '50%', description: 'Örn. /degerleme veya /portfoy' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'metinHizasi',
              type: 'select',
              label: 'Metin hizası',
              defaultValue: 'sol',
              options: [
                { value: 'sol', label: 'Sol' },
                { value: 'orta', label: 'Orta' },
              ],
              admin: { width: '50%' },
            },
            {
              name: 'overlayKoyulugu',
              type: 'number',
              label: 'Karartma (%)',
              defaultValue: 45,
              min: ASGARI_OVERLAY,
              max: AZAMI_OVERLAY,
              admin: {
                width: '50%',
                step: 5,
                description:
                  'Görselin üstündeki koyu perde. ⚠️ Metnin okunabilmesi buna bağlı: açık ' +
                  'renkli bir fotoğrafta düşük karartma başlığı okunmaz yapar.',
              },
            },
          ],
        },
        {
          name: 'aktif',
          type: 'checkbox',
          label: 'Yayında',
          defaultValue: true,
          admin: {
            description: 'Kapalı slayt sitede hiç görünmez ama kaydı silinmez.',
          },
        },
      ],
    },

    {
      type: 'row',
      fields: [
        {
          /**
           * ⚠️ VARSAYILAN KAPALI VE BU BİR ERİŞİLEBİLİRLİK KARARI.
           *
           * Kendiliğinden hareket eden içerik WCAG 2.2.2'nin konusu: dikkat
           * bozukluğu olan ve ekran büyütücü kullanan ziyaretçiler için
           * engelleyici. Ayrıca her otomatik geçiş bir boyama daha demek —
           * LCP ölçümünün ortasında yeni bir büyük görsel çizmek, ölçülen
           * değeri kötüleştiriyor.
           *
           * Açmak Aslıhan'ın kararı; varsayılan olarak açık gelmesi bizim
           * kararımız olurdu ve yanlış olurdu.
           */
          name: 'otomatikGecis',
          type: 'checkbox',
          label: 'Otomatik geçiş',
          defaultValue: false,
          admin: {
            width: '50%',
            description:
              'Varsayılan KAPALI. Açarsanız slaytlar kendiliğinden ilerler; duraklat düğmesi ' +
              'her zaman görünür ve "hareketi azalt" tercihi olan ziyaretçilerde geçiş hiç ' +
              'başlamaz.',
          },
        },
        {
          name: 'gecisSuresi',
          type: 'number',
          label: 'Geçiş süresi (saniye)',
          defaultValue: 7,
          min: 4,
          max: 30,
          admin: {
            width: '50%',
            description:
              'Otomatik geçiş açıkken beklenecek süre. ⚠️ 4 saniyenin altına inilemiyor: ' +
              'okumaya vakit bırakmayan bir slider, olmayan bir slider’dan kötüdür.',
          },
        },
      ],
    },
  ],
}
