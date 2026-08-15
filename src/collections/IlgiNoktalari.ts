import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaPanel, yalnizcaYoneticiSiler } from '@/lib/erisim'

import { osmElleDuzenlemeIzi } from './hooks/osmElleDuzenlemeIzi'

/**
 * İlgi noktaları (POI) — okul, sağlık, market, park, sanayi, ulaşım.
 *
 * Mahalle sayfalarındaki "çevre" katmanını ve PostGIS yakınlık sorgularını
 * ("sanayiye 10 dakika") besler.
 *
 * ⚠️ Konum verisi elle veya resmî/açık kaynaklardan girilir. İlan
 * platformlarından otomatik veri çekilmez (CLAUDE.md kural 6).
 */

export const POI_TIPLERI = [
  { value: 'okul', label: 'Okul' },
  { value: 'universite', label: 'Üniversite' },
  { value: 'hastane', label: 'Hastane / sağlık' },
  { value: 'eczane', label: 'Eczane' },
  { value: 'market', label: 'Market' },
  { value: 'avm', label: 'AVM' },
  { value: 'park', label: 'Park / yeşil alan' },
  { value: 'oyun_alani', label: 'Çocuk oyun alanı' },
  { value: 'sanayi', label: 'Sanayi / OSB' },
  { value: 'durak', label: 'Toplu taşıma durağı' },
  { value: 'istasyon', label: 'Tren istasyonu' },
  { value: 'havalimani', label: 'Havalimanı' },
  { value: 'resmi', label: 'Resmî kurum' },
] as const

export type PoiTipi = (typeof POI_TIPLERI)[number]['value']

/**
 * Yatırım skorunda "sosyal donatı" bileşenine giren tipler (Faz 4).
 *
 * ⚠️ `eczane` ve `oyun_alani` 12 Ağustos 2026'da Aslıhan'ın kararıyla
 * eklendi: eczane sağlık erişiminin günlük ölçüsü, oyun alanı ise çocuklu
 * aile için mahalle kalitesinin doğrudan göstergesi. İkisi de OSM'den
 * geliyor ve zaten eşlenmeyen tür raporunda görünüyorlardı.
 *
 * ⚠️ Restoran BİLİNÇLİ OLARAK DIŞARIDA: sinyal değeri düşük, merkeziyeti
 * zaten başka kriterlerle ölçüyoruz ve veriye gürültü ekliyor.
 */
export const SOSYAL_DONATI_TIPLERI = [
  'okul',
  'hastane',
  'eczane',
  'market',
  'avm',
  'park',
  'oyun_alani',
] as const

/** "Ulaşım" bileşenine giren tipler. */
export const ULASIM_TIPLERI = ['durak', 'istasyon', 'havalimani'] as const

export const IlgiNoktalari: CollectionConfig = {
  slug: 'ilgi-noktalari',
  labels: { singular: 'İlgi Noktası', plural: 'İlgi Noktaları' },

  access: {
    read: herkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  hooks: {
    // Elle düzeltilen OSM kaydı bir daha içe aktarmayla ezilmesin.
    beforeChange: [osmElleDuzenlemeIzi],
  },

  admin: {
    useAsTitle: 'ad',
    defaultColumns: ['ad', 'tip', 'mahalle', 'updatedAt'],
    description:
      'Haritadaki katmanlar ve mesafe hesapları bu kayıtlardan beslenir. ' +
      'Konum girilmemiş kayıtlar haritada gösterilmez.',
    listSearchableFields: ['ad'],
  },

  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'ad',
          type: 'text',
          label: 'Ad',
          required: true,
          admin: { width: '60%' },
        },
        {
          name: 'tip',
          type: 'select',
          label: 'Tip',
          required: true,
          index: true,
          options: [...POI_TIPLERI],
          admin: { width: '40%' },
        },
      ],
    },
    {
      name: 'konum',
      type: 'point',
      label: 'Konum',
      required: true,
      admin: {
        description: 'Haritadan seçin veya koordinat girin. Mesafe hesapları bu noktayı kullanır.',
      },
    },
    {
      name: 'mahalle',
      type: 'relationship',
      relationTo: 'mahalleler',
      label: 'Bulunduğu mahalle',
      index: true,
      admin: {
        description:
          'İsteğe bağlı. Mahalle sınırı tanımlıysa sistem bunu ileride otomatik belirleyebilir.',
      },
    },
    {
      name: 'onemli',
      type: 'checkbox',
      label: 'Öne çıkan nokta',
      defaultValue: false,
      admin: {
        description:
          'Şehir hastanesi, OSB, tren istasyonu gibi bölgenin değerini belirleyen noktalar. ' +
          'Mahalle sayfasında ayrıca vurgulanır.',
      },
    },
    {
      name: 'detay',
      type: 'textarea',
      label: 'Açıklama',
    },

    // ── Kaynak izi ────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'Kaynak',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'kaynak',
          type: 'select',
          label: 'Veri kaynağı',
          required: true,
          defaultValue: 'elle',
          index: true,
          options: [
            { value: 'elle', label: 'Elle girildi' },
            { value: 'osm', label: 'OpenStreetMap' },
            { value: 'google', label: 'Google Places (elle doğrulandı)' },
          ],
          admin: {
            readOnly: true,
            description:
              'İçe aktarma bunu kendisi yazar. OpenStreetMap kaynaklı kayıtlar sitede ' +
              '"© OpenStreetMap katkıcıları" atfıyla gösterilir (ODbL lisansı gereği). ' +
              '"Google Places" yalnızca elle girilen kayıtlar için bir köken beyanıdır — ' +
              'Google içeriği hiçbir zaman otomatik olarak kaydedilmez.',
          },
        },
        {
          /**
           * ─────────────────────────────────────────────────────────────
           * ⚠️ GOOGLE'DAN SAKLADIĞIMIZ TEK ŞEY BU ALAN.
           *
           * Places lisansı, yer kimliği dışındaki içeriğin kalıcı olarak
           * saklanmasına izin vermiyor. Ad, adres, çalışma saati, telefon
           * — hiçbiri veritabanına yazılmıyor; gösterileceği anda çekilip
           * Google atfıyla gösteriliyor ve hiçbir yere kaydedilmiyor.
           *
           * Bu alan bir bağlantıdır, bir kopya değil: "bu bizim noktamız,
           * Google'daki karşılığı şu".
           * ─────────────────────────────────────────────────────────────
           */
          name: 'googlePlaceId',
          type: 'text',
          label: 'Google yer kimliği',
          index: true,
          admin: {
            description:
              'Google Places eşleştirme ekranından doldurulur. Yalnızca kimlik saklanır; ' +
              'çalışma saati ve işletme adı gösterileceği anda Google’dan çekilir, ' +
              'kaydedilmez (lisans gereği). Boşsa bu nokta için Google katmanı çalışmaz.',
          },
        },
        {
          name: 'osmKimlik',
          type: 'text',
          label: 'OSM kimliği',
          index: true,
          admin: {
            readOnly: true,
            description:
              'Örn. "node/123456". Yeniden içe aktarmada aynı kaydı bulmak için kullanılır.',
          },
        },
        {
          /**
           * ⚠️ ELLE DÜZELTİLEN KAYIT BİR DAHA EZİLMEZ.
           *
           * OSM'de eksik ve yanlış kayıt olur. Aslıhan bir noktanın adını ya
           * da konumunu düzelttiğinde, bir sonraki içe aktarma onu OSM'deki
           * hâline geri çevirseydi düzeltme emeği her seferinde çöpe giderdi
           * ve sistem güvenilmez olurdu.
           *
           * Bu kutu, kaydı **panel üzerinden** düzenleyen ilk kişide
           * kendiliğinden işaretlenir (bkz. `osmElleDuzenlemeIzi` kancası).
           * İçe aktarma bu kayıtları atlar ve raporunda "korundu" der.
           */
          name: 'elleDuzenlendi',
          type: 'checkbox',
          label: 'Elle düzeltildi — içe aktarma bu kaydı atlar',
          defaultValue: false,
          index: true,
          admin: {
            description:
              'Bu kaydı panelden düzenlediğinizde otomatik işaretlenir ve yeniden içe ' +
              "aktarma onu EZMEZ. İşareti kaldırırsanız kayıt tekrar OSM'den güncellenir.",
          },
        },
      ],
    },
  ],
}
