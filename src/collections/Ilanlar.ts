import type { CollectionConfig } from 'payload'

import {
  EIDS_DURUMLARI,
  EIDS_DURUM_ETIKETLERI,
  ILAN_DURUMLARI,
  ILAN_DURUM_ETIKETLERI,
} from '@/lib/eids'
import { yalnizcaPanel, yalnizcaYoneticiSiler, yayindakileriHerkesOkur } from '@/lib/erisim'
import {
  BINA_KULLANIM_DURUMLARI,
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
  ISINMA_TIPLERI,
  ODA_SAYILARI,
  TAPU_DURUMLARI,
  VARSAYILAN_IL,
  VARSAYILAN_ILCE,
} from '@/lib/secenekler'

import { eidsYayinEngeli } from './hooks/eidsYayinEngeli'
import { ilanGostergeleri } from './hooks/ilanGostergeleri'
import { seoAlanlari, slugAlani } from './ortakAlanlar'

/**
 * İlanlar — portföydeki taşınmazlar.
 *
 * ⚠️ EİDS: `eidsYayinEngeli` kancası, EİDS koşulları sağlanmadan ilanın
 * herkese açık bir duruma alınmasını engeller. İkinci savunma hattı olarak
 * `access.read` de yalnızca yayındaki kayıtları dışarı verir.
 */
export const Ilanlar: CollectionConfig = {
  slug: 'ilanlar',
  labels: { singular: 'İlan', plural: 'İlanlar' },

  access: {
    read: yayindakileriHerkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  admin: {
    useAsTitle: 'baslik',
    defaultColumns: ['baslik', 'durum', 'tip', 'fiyat', 'eidsYetkiBitis', 'updatedAt'],
    description:
      'Portföydeki taşınmazlar. Bir ilan yayına alınabilmesi için EİDS yetkisinin geçerli olması zorunludur.',
    listSearchableFields: ['baslik', 'tasinmazNo', 'ada', 'parsel'],
  },

  hooks: {
    // Sıra önemli: önce göstergeler yazılır, sonra EİDS engeli kontrol edilir.
    beforeChange: [ilanGostergeleri, eidsYayinEngeli],
  },

  fields: [
    // ── Kenar çubuğu ──────────────────────────────────────────────────────
    {
      name: 'durum',
      type: 'select',
      label: 'Yayın durumu',
      required: true,
      defaultValue: 'taslak',
      index: true,
      options: ILAN_DURUMLARI.map((value) => ({ value, label: ILAN_DURUM_ETIKETLERI[value] })),
      admin: {
        position: 'sidebar',
        description:
          '"Yayında" veya "Rezerve" seçebilmek için EİDS sekmesindeki tüm koşullar sağlanmalıdır.',
      },
    },
    slugAlani('baslik'),
    {
      name: 'danisman',
      type: 'relationship',
      relationTo: 'kullanicilar',
      label: 'Sorumlu danışman',
      admin: { position: 'sidebar' },
    },
    {
      name: 'oneCikan',
      type: 'checkbox',
      label: 'Ana sayfada öne çıkar',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'gizliPortfoy',
      type: 'checkbox',
      label: 'Gizli portföy (off-market)',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'İşaretliyse ilanın adresi, fotoğrafları ve detayları herkese gösterilmez; ' +
          'yalnızca mahalle, kategori, m² aralığı ve fiyat bandı görünür. (Faz 2B modülü)',
      },
    },

    // ── Sekmeler ──────────────────────────────────────────────────────────
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Temel',
          fields: [
            {
              name: 'baslik',
              type: 'text',
              label: 'İlan başlığı',
              required: true,
              maxLength: 120,
              admin: {
                description:
                  'Örn: "Muhittin Mahallesi\'nde 3+1, 135 m², asansörlü". Rakam ve mahalle adı geçsin — arama motorunda fark eder.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'tip',
                  type: 'select',
                  label: 'İlan tipi',
                  required: true,
                  defaultValue: 'satilik',
                  index: true,
                  options: [...ILAN_TIPLERI],
                  admin: { width: '50%' },
                },
                {
                  name: 'kategori',
                  type: 'select',
                  label: 'Kategori',
                  required: true,
                  defaultValue: 'konut',
                  index: true,
                  options: [...ILAN_KATEGORILERI],
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'ozet',
              type: 'textarea',
              label: 'Kısa özet',
              maxLength: 300,
              admin: {
                description:
                  'Liste kartlarında ve paylaşımlarda görünen 1-2 cümle. Boş bırakılırsa açıklamanın başı kullanılır.',
              },
            },
            {
              name: 'aciklama',
              type: 'richText',
              label: 'Açıklama',
            },
            seoAlanlari,
          ],
        },

        {
          label: 'Konum ve tapu',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'il',
                  type: 'text',
                  label: 'İl',
                  required: true,
                  defaultValue: VARSAYILAN_IL,
                  admin: { width: '33%' },
                },
                {
                  name: 'ilce',
                  type: 'text',
                  label: 'İlçe',
                  required: true,
                  defaultValue: VARSAYILAN_ILCE,
                  admin: { width: '33%' },
                },
                {
                  name: 'mahalle',
                  type: 'relationship',
                  relationTo: 'mahalleler',
                  label: 'Mahalle',
                  required: true,
                  index: true,
                  admin: { width: '34%' },
                },
              ],
            },
            {
              name: 'adres',
              type: 'text',
              label: 'Açık adres (yayınlanmaz)',
              admin: {
                description:
                  'Yalnızca yönetim panelinde görünür, siteye çıkmaz. Randevu ve dosya takibi için.',
              },
            },
            {
              name: 'konum',
              type: 'point',
              label: 'Harita konumu',
              admin: {
                description:
                  'Haritadaki konum. Gizli portföyde tam nokta yerine mahalle merkezi gösterilir.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ada',
                  type: 'text',
                  label: 'Ada',
                  admin: {
                    width: '50%',
                    description: 'Tapu bilgisi. Yayın için zorunludur (EİDS).',
                  },
                },
                {
                  name: 'parsel',
                  type: 'text',
                  label: 'Parsel',
                  admin: {
                    width: '50%',
                    description: 'Tapu bilgisi. Yayın için zorunludur (EİDS).',
                  },
                },
              ],
            },
            {
              name: 'tapuDurumu',
              type: 'select',
              label: 'Tapu durumu',
              options: [...TAPU_DURUMLARI],
            },
          ],
        },

        {
          label: 'EİDS',
          description:
            'Elektronik İlan Doğrulama Sistemi. Bu sekmedeki koşullar sağlanmadan ilan yayına alınamaz — ' +
            'bu bir yasal zorunluluktur, uyarı değildir.',
          fields: [
            {
              name: 'eidsDurum',
              type: 'select',
              label: 'Yetki durumu',
              index: true,
              options: EIDS_DURUMLARI.map((value) => ({
                value,
                label: EIDS_DURUM_ETIKETLERI[value],
              })),
              admin: {
                description:
                  'Mülk sahibi e-Devlet → "EİDS Taşınmaz İlanı Yetkilendirme İşlemleri" üzerinden işletmeyi yetkilendirir. ' +
                  'Yalnızca "Yetkili" durumunda ilan yayınlanabilir.',
              },
            },
            {
              name: 'tasinmazNo',
              type: 'text',
              label: 'EİDS taşınmaz numarası',
              index: true,
              admin: {
                description:
                  'İlan sayfasında "Doğrulanmış İlan" rozetiyle birlikte ziyaretçiye gösterilir.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'eidsYetkiBaslangic',
                  type: 'date',
                  label: 'Yetki başlangıcı',
                  admin: {
                    width: '50%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                  },
                },
                {
                  name: 'eidsYetkiBitis',
                  type: 'date',
                  label: 'Yetki bitişi',
                  index: true,
                  admin: {
                    width: '50%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                    description:
                      'Yetki en az 3 ay verilir. Süre dolduğunda ilan otomatik olarak yayından kaldırılır.',
                  },
                },
              ],
            },
          ],
        },

        {
          label: 'Fiyat ve yatırım',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'fiyat',
                  type: 'number',
                  label: 'Fiyat',
                  min: 0,
                  index: true,
                  admin: {
                    width: '50%',
                    description: 'Kiralık ilanlarda aylık kira bedelidir.',
                  },
                },
                {
                  name: 'paraBirimi',
                  type: 'select',
                  label: 'Para birimi',
                  defaultValue: 'TRY',
                  options: [
                    { value: 'TRY', label: 'Türk lirası (₺)' },
                    { value: 'USD', label: 'ABD doları ($)' },
                    { value: 'EUR', label: 'Euro (€)' },
                  ],
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'tahminiKira',
                  type: 'number',
                  label: 'Tahmini aylık kira',
                  min: 0,
                  admin: {
                    width: '50%',
                    description:
                      'Satılık ilanlarda yatırım göstergelerini bu alan besler. ' +
                      'Bilmiyorsan BOŞ BIRAK — tahmini rakam yazma, göstergeler boş durumda kalsın.',
                    condition: (data) => data?.tip === 'satilik',
                  },
                },
                {
                  name: 'aidat',
                  type: 'number',
                  label: 'Aylık aidat',
                  min: 0,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'pazarlikPayi',
              type: 'checkbox',
              label: 'Pazarlık payı var',
              defaultValue: false,
            },

            {
              type: 'collapsible',
              label: 'Hesaplanan yatırım göstergeleri (otomatik)',
              admin: {
                initCollapsed: false,
                description:
                  'Bu üç değer kaydettiğinde otomatik hesaplanır, elle girilemez. ' +
                  'Kira bilgisi girilmemişse boş kalır — uydurma sayı üretilmez. ' +
                  'Sitede gösterilirken yanlarında "yatırım tavsiyesi değildir" ibaresi yer alır.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'kiraCarpani',
                      type: 'number',
                      label: 'Kira çarpanı',
                      admin: {
                        width: '33%',
                        readOnly: true,
                        description: 'fiyat ÷ (kira × 12)',
                      },
                    },
                    {
                      name: 'brutGetiri',
                      type: 'number',
                      label: 'Brüt getiri (%)',
                      admin: { width: '33%', readOnly: true },
                    },
                    {
                      name: 'amortismanYili',
                      type: 'number',
                      label: 'Amortisman (yıl)',
                      admin: { width: '34%', readOnly: true },
                    },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: 'Nitelikler',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'brutM2',
                  type: 'number',
                  label: 'Brüt m²',
                  min: 0,
                  admin: { width: '50%' },
                },
                {
                  name: 'netM2',
                  type: 'number',
                  label: 'Net m²',
                  min: 0,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'odaSayisi',
                  type: 'select',
                  label: 'Oda sayısı',
                  index: true,
                  options: [...ODA_SAYILARI],
                  admin: {
                    width: '50%',
                    condition: (data) => data?.kategori === 'konut',
                  },
                },
                {
                  name: 'banyoSayisi',
                  type: 'number',
                  label: 'Banyo sayısı',
                  min: 0,
                  admin: { width: '50%', condition: (data) => data?.kategori === 'konut' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'bulunduguKat',
                  type: 'text',
                  label: 'Bulunduğu kat',
                  admin: { width: '33%', description: 'Örn: 3, Zemin, Bahçe katı' },
                },
                {
                  name: 'toplamKat',
                  type: 'number',
                  label: 'Toplam kat',
                  min: 0,
                  admin: { width: '33%' },
                },
                {
                  name: 'binaYasi',
                  type: 'number',
                  label: 'Bina yaşı',
                  min: 0,
                  admin: { width: '34%' },
                },
              ],
            },
            {
              name: 'isinma',
              type: 'select',
              label: 'Isıtma',
              options: [...ISINMA_TIPLERI],
            },
            {
              name: 'kullanimDurumu',
              type: 'select',
              label: 'Kullanım durumu',
              options: [...BINA_KULLANIM_DURUMLARI],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'esyali',
                  type: 'checkbox',
                  label: 'Eşyalı',
                  defaultValue: false,
                  admin: { width: '33%' },
                },
                {
                  name: 'krediyeUygun',
                  type: 'checkbox',
                  label: 'Krediye uygun',
                  defaultValue: false,
                  admin: { width: '33%' },
                },
                {
                  name: 'asansor',
                  type: 'checkbox',
                  label: 'Asansör',
                  defaultValue: false,
                  admin: { width: '34%' },
                },
              ],
            },
            {
              name: 'ozellikler',
              type: 'array',
              label: 'Öne çıkan özellikler',
              labels: { singular: 'Özellik', plural: 'Özellikler' },
              admin: {
                description: 'Örn: "Otoparklı", "Site içerisinde", "Güneybatı cephe"',
              },
              fields: [{ name: 'metin', type: 'text', label: 'Özellik', required: true }],
            },
          ],
        },

        {
          label: 'Medya',
          description:
            'Videolar sunucuda barındırılmaz; CDN (Bunny Stream) üzerinden yayınlanır. ' +
            'Video hesabı açılana kadar bu alanlar boş kalabilir — sayfa kırılmaz.',
          fields: [
            {
              name: 'gorseller',
              type: 'array',
              label: 'Fotoğraflar',
              labels: { singular: 'Fotoğraf', plural: 'Fotoğraflar' },
              admin: {
                description: 'İlk fotoğraf kapak olarak kullanılır.',
              },
              fields: [
                {
                  name: 'gorsel',
                  type: 'upload',
                  relationTo: 'medya',
                  label: 'Görsel',
                  required: true,
                },
              ],
            },
            {
              name: 'katPlani',
              type: 'upload',
              relationTo: 'medya',
              label: 'Kat planı',
            },
            {
              name: 'droneVideoId',
              type: 'text',
              label: 'Drone video kimliği (CDN)',
              admin: {
                description: 'Bunny Stream video kimliği. Boşsa video bölümü hiç gösterilmez.',
              },
            },
            {
              name: 'sanalTurUrl',
              type: 'text',
              label: '360° sanal tur adresi',
              admin: {
                description: 'Tam adres (https://...). Boşsa tur bölümü gösterilmez.',
              },
            },
          ],
        },

        {
          label: 'Belgeler',
          description:
            'EİDS yetkilendirmesi, yönetmeliğin gerektirdiği sözleşme ve belgeleri düzenleme ' +
            'zorunluluğunu ortadan kaldırmaz. Belgeler yalnızca panelde görünür, siteye çıkmaz.',
          fields: [
            {
              name: 'yetkilendirmeSozlesmesi',
              type: 'upload',
              relationTo: 'medya',
              label: 'Yetkilendirme sözleşmesi',
            },
            {
              name: 'gostermeBelgesi',
              type: 'upload',
              relationTo: 'medya',
              label: 'Taşınmaz gösterme belgesi',
            },
            {
              name: 'belgeNotu',
              type: 'textarea',
              label: 'Belge notları',
            },
          ],
        },
      ],
    },
  ],
}
