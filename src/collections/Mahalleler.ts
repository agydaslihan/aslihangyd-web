import type { CollectionConfig } from 'payload'

import { yalnizcaPanel, yayimlananlariHerkesOkur } from '@/lib/erisim'

import { yatirimSkoruHesapla } from '@/lib/skorlama/yatirimSkoru'

import { seoAlanlari, slugAlani, veriEksikAlani } from './ortakAlanlar'

/**
 * Mahalleler — sitenin SEO motoru.
 *
 * ⚠️ Rakam alanlarının hepsi isteğe bağlıdır ve BOŞ BAŞLAR. CLAUDE.md kural 2
 * gereği gerçek veri bilinmeden sayı yazılmaz; arayüz boş durumu özel olarak
 * tasarlanmış bir "veri bekleniyor" bloğuyla gösterir.
 *
 * Rakamların yanında `gozlemSayisi` (n) ve `verilerinTarihi` zorunlu olarak
 * birlikte gösterilir — dürüstlük bu projede satış argümanıdır.
 */
export const Mahalleler: CollectionConfig = {
  slug: 'mahalleler',
  labels: { singular: 'Mahalle', plural: 'Mahalleler' },

  access: {
    read: yayimlananlariHerkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    delete: yalnizcaPanel,
  },

  admin: {
    useAsTitle: 'ad',
    defaultColumns: ['ad', 'yayinda', 'veriEksik', 'updatedAt'],
    description: 'Mahalle mini-portalları. Her mahalle sayfası ayrı bir SEO varlığıdır.',
  },

  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
        const skor = (kayit.yatirimSkoru ?? {}) as Record<string, unknown>

        const sayi = (deger: unknown) => (typeof deger === 'number' ? deger : null)

        const sonuc = yatirimSkoruHesapla({
          fiyatTrendi: sayi(skor.fiyatTrendi),
          kiraCarpani: sayi(skor.kiraCarpaniPuani),
          sanayiYakinligi: sayi(skor.sanayiYakinligi),
          ulasim: sayi(skor.ulasim),
          sosyalDonati: sayi(skor.sosyalDonati),
          arzBaskisi: sayi(skor.arzBaskisi),
        })

        // ⚠️ Yeterli bileşen verisi yoksa `toplam` BOŞ bırakılır.
        // Yarım veriyle puan yazmak, o puanı değersizleştirir.
        return {
          ...data,
          yatirimSkoru: {
            ...skor,
            toplam: sonuc.durum === 'hesaplandi' ? sonuc.veri.toplam : null,
          },
        }
      },
    ],
  },

  fields: [
    {
      name: 'yayinda',
      type: 'checkbox',
      label: 'Yayında',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'İçerik metni hazır olmadan yayına alma. 800 kelimeden kısa sayfalar arama motorunda ' +
          '"zayıf içerik" sayılır ve tüm siteyi aşağı çeker.',
      },
    },
    slugAlani('ad'),
    veriEksikAlani,
    {
      name: 'siraNo',
      type: 'number',
      label: 'Sıralama',
      defaultValue: 100,
      admin: { position: 'sidebar', description: 'Küçük sayı önce gösterilir.' },
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Tanım',
          fields: [
            {
              name: 'ad',
              type: 'text',
              label: 'Mahalle adı',
              required: true,
              admin: { description: '"Mahallesi" eki olmadan. Örn: Muhittin' },
            },
            {
              name: 'ozet',
              type: 'textarea',
              label: 'Kısa tanıtım',
              maxLength: 300,
              admin: {
                description: 'Mahalle listesinde ve kartlarda görünen 1-2 cümle.',
              },
            },
            {
              name: 'oneCikanOzellikler',
              type: 'array',
              label: 'Öne çıkan özellikler',
              labels: { singular: 'Özellik', plural: 'Özellikler' },
              maxRows: 6,
              admin: {
                description:
                  'Mahalleyi tanımlayan 3-6 madde. Örn: "OSB\'ye 10 dakika", "Yoğun öğrenci nüfusu"',
              },
              fields: [{ name: 'metin', type: 'text', label: 'Özellik', required: true }],
            },
            {
              name: 'kapakGorseli',
              type: 'upload',
              relationTo: 'medya',
              label: 'Kapak görseli',
            },
            seoAlanlari,
          ],
        },

        {
          label: 'İçerik',
          description:
            'Bu sekmedeki metin sayfanın "Neden bu mahalle?" bölümünü oluşturur ve ' +
            'sitenin arama motoru performansının en belirleyici parçasıdır. Hedef: en az 800 kelime özgün metin.',
          fields: [
            {
              name: 'icerik',
              type: 'richText',
              label: 'Neden bu mahalle?',
            },
            {
              name: 'sikSorulanlar',
              type: 'array',
              label: 'Sık sorulan sorular',
              labels: { singular: 'Soru', plural: 'Sorular' },
              admin: {
                description:
                  'Google\'da "Sorular ve cevaplar" bloğu olarak görünebilir (FAQPage yapılandırılmış verisi).',
              },
              fields: [
                { name: 'soru', type: 'text', label: 'Soru', required: true },
                { name: 'cevap', type: 'textarea', label: 'Cevap', required: true },
              ],
            },
          ],
        },

        {
          label: 'Rakamlar',
          description:
            '⚠️ Bilmediğin rakamı BOŞ BIRAK. Boş alan arayüzde "veri bekleniyor" olarak ' +
            'gösterilir; uydurma rakam hem itibar hem hukuki risktir.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'ortalamaM2Satis',
                  type: 'number',
                  label: 'Ortalama m² satış fiyatı (₺)',
                  min: 0,
                  admin: { width: '50%' },
                },
                {
                  name: 'ortalamaKira',
                  type: 'number',
                  label: 'Ortalama aylık kira (₺)',
                  min: 0,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'kiraCarpani',
                  type: 'number',
                  label: 'Kira çarpanı',
                  min: 0,
                  admin: { width: '50%', description: 'Kaç yıllık kira, satış fiyatına eşit.' },
                },
                {
                  name: 'degisim12Ay',
                  type: 'number',
                  label: '12 aylık değişim (%)',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'nufus',
              type: 'number',
              label: 'Nüfus',
              min: 0,
              admin: { description: 'Resmî kaynaktan (TÜİK/belediye) teyit edilmeden girme.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'gozlemSayisi',
                  type: 'number',
                  label: 'Gözlem sayısı (n)',
                  min: 0,
                  admin: {
                    width: '50%',
                    description:
                      'Bu rakamlar kaç gözleme dayanıyor? Sitede her rakamın yanında gösterilir. ' +
                      'n bilinmiyorsa rakamlar da yayınlanmamalıdır.',
                  },
                },
                {
                  name: 'verilerinTarihi',
                  type: 'date',
                  label: 'Veriler hangi tarih itibarıyla',
                  admin: {
                    width: '50%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                  },
                },
              ],
            },
            {
              name: 'veriKaynagi',
              type: 'text',
              label: 'Veri kaynağı',
              admin: {
                description:
                  'Örn: "Kendi gözlem kayıtlarımız", "TÜİK". Sitede kaynak açıkça belirtilir.',
              },
            },
          ],
        },

        {
          label: 'Konum',
          fields: [
            {
              name: 'merkez',
              type: 'point',
              label: 'Mahalle merkezi',
              admin: { description: 'Haritanın odaklanacağı nokta.' },
            },
            {
              name: 'sinir',
              type: 'json',
              label: 'Mahalle sınırı (GeoJSON)',
              admin: {
                description:
                  'geojson.io üzerinde çizip GeoJSON çıktısını buraya yapıştırabilirsin. ' +
                  'Boşsa haritada sınır çizgisi gösterilmez, sadece merkez noktası kullanılır.',
              },
            },
          ],
        },

        {
          label: 'Medya',
          description:
            'Drone ve 360° içerik hazır olana kadar bu alanlar boş kalır; sayfa boş durum tasarımıyla çalışır.',
          fields: [
            {
              name: 'droneVideoId',
              type: 'text',
              label: 'Drone video kimliği (CDN)',
              admin: {
                description: 'Bunny Stream video kimliği. Boşsa hero bölümü görsele düşer.',
              },
            },
            {
              name: 'droneVideoPosteri',
              type: 'upload',
              relationTo: 'medya',
              label: 'Video kapak görseli',
              admin: {
                description:
                  "Video yüklenene kadar gösterilir. Sayfanın en büyük görseli budur — LCP'yi belirler.",
              },
            },
            {
              name: 'sanalTurUrl',
              type: 'text',
              label: '360° sokak turu adresi',
            },
          ],
        },

        {
          label: 'Yatırım skoru',
          description:
            'Altı bileşen 0-100 arası puanlanır; toplam skor ağırlıklı ortalamadır ve ' +
            'kaydettiğinde otomatik hesaplanır. Metodoloji ' +
            '/yatirim-skoru-metodolojisi sayfasında yayınlanır. ' +
            '⚠️ Bileşenlerin en az %70 ağırlığı doldurulmadan skor GÖSTERİLMEZ — ' +
            'yarım veriyle puan vermek, puanı değersizleştirir.',
          fields: [
            {
              name: 'yatirimSkoru',
              type: 'group',
              label: 'Yatırım skoru',
              fields: [
                {
                  name: 'toplam',
                  type: 'number',
                  label: 'Toplam skor (0-100)',
                  min: 0,
                  max: 100,
                  index: true,
                  admin: {
                    readOnly: true,
                    description:
                      'Bileşenlerden otomatik hesaplanır. Yeterli bileşen verisi yoksa boş kalır.',
                  },
                },
                {
                  name: 'hesaplanmaTarihi',
                  type: 'date',
                  label: 'Hesaplanma tarihi',
                  admin: {
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                    description: 'Skorun yanında "[tarih] itibarıyla" olarak gösterilir.',
                  },
                },

                // ── Bileşen puanları ──
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fiyatTrendi',
                      type: 'number',
                      label: 'Fiyat artış trendi',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: 'Ağırlık %25. Çorlu ortalamasına göre göreli performans.',
                      },
                    },
                    {
                      name: 'kiraCarpaniPuani',
                      type: 'number',
                      label: 'Kira çarpanı puanı',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: 'Ağırlık %20. DÜŞÜK çarpan YÜKSEK puan alır.',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'sanayiYakinligi',
                      type: 'number',
                      label: 'Sanayi / istihdam yakınlığı',
                      min: 0,
                      max: 100,
                      admin: { width: '50%', description: 'Ağırlık %15.' },
                    },
                    {
                      name: 'ulasim',
                      type: 'number',
                      label: 'Ulaşım erişilebilirliği',
                      min: 0,
                      max: 100,
                      admin: { width: '50%', description: 'Ağırlık %15.' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'sosyalDonati',
                      type: 'number',
                      label: 'Sosyal donatı',
                      min: 0,
                      max: 100,
                      admin: { width: '50%', description: 'Ağırlık %15.' },
                    },
                    {
                      name: 'arzBaskisi',
                      type: 'number',
                      label: 'Arz baskısı',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: 'Ağırlık %10. ÇOK yeni arz DÜŞÜK puan alır.',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
