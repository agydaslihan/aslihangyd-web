import type { CollectionConfig } from 'payload'

import { herkesOkur, yalnizcaPanel, yalnizcaYoneticiSiler } from '@/lib/erisim'
import { RAYIC_KAYNAKLARI } from '@/lib/rayic/tipler'

/**
 * Rayiç bedeller — emlak vergisine esas asgari değerler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ RAYİÇ BEDEL PİYASA FİYATI DEĞİLDİR
 *
 * Belediyelerin takdir komisyonlarınca belirlenen, emlak vergisi ve tapu
 * harcı için ASGARİ matrahtır. Piyasa fiyatının çoğu yerde belirgin
 * biçimde altındadır; bu bir hata değil, tanımı gereğidir. Sitede
 * gösterildiği her yerde kaynağı ve yılı birlikte basılıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ VERİ ELLE GİRİLİR ya da belediyenin yayınladığı tablodan CSV olarak
 * aktarılır. Hiçbir yerden otomatik çekilmiyor.
 *
 * ⚠️ Bu koleksiyon ziyaretçiye AÇIK. Gözlemlerden farkı: rayiç bedel resmî
 * ve kamuya açık bir veridir, bizim ticari sırrımız değil. Gizlemek için
 * bir sebep yok; yayınlamak için (rayiç/piyasa oranı) iyi bir sebep var.
 */
export const RayicDegerler: CollectionConfig = {
  slug: 'rayic-degerler',
  labels: { singular: 'Rayiç Değer', plural: 'Rayiç Değerler' },

  access: {
    read: herkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  admin: {
    useAsTitle: 'ozet',
    defaultColumns: ['ozet', 'mahalle', 'yil', 'metrekareRayicBedel', 'kaynak'],
    description:
      'Emlak vergisine esas asgari değerler. ⚠️ Piyasa fiyatı DEĞİLDİR — piyasanın çoğu ' +
      'yerde altındadır. Kaynağı ve yılı sitede her gösterimde birlikte yayınlanır.',
    listSearchableFields: ['ozet', 'sokak'],
    pagination: { defaultLimit: 50 },
  },

  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>

        const yil = typeof kayit.yil === 'number' ? kayit.yil : null
        const sokak =
          typeof kayit.sokak === 'string' && kayit.sokak.trim() !== '' ? kayit.sokak : null
        const m2 = typeof kayit.metrekareRayicBedel === 'number' ? kayit.metrekareRayicBedel : null

        const parcalar = [
          yil !== null ? String(yil) : null,
          sokak,
          m2 !== null ? `${Math.round(m2).toLocaleString('tr-TR')} TL/m²` : null,
        ].filter(Boolean)

        return { ...data, ozet: parcalar.join(' · ') || 'Rayiç değer' }
      },
    ],
  },

  fields: [
    {
      name: 'ozet',
      type: 'text',
      label: 'Özet',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Listede görünen ad; kaydettiğinizde otomatik üretilir.',
      },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'mahalle',
          type: 'relationship',
          relationTo: 'mahalleler',
          label: 'Mahalle',
          required: true,
          index: true,
          admin: { width: '60%' },
        },
        {
          name: 'yil',
          type: 'number',
          label: 'Yıl',
          required: true,
          index: true,
          min: 1990,
          max: 2100,
          admin: {
            width: '40%',
            description:
              'Rayiç bedelin ait olduğu yıl. Her yıl yeniden değerleme oranıyla artar; ' +
              'yıl yazılmadan rakam anlamsızdır.',
          },
        },
      ],
    },

    {
      name: 'sokak',
      type: 'text',
      label: 'Sokak / cadde (isteğe bağlı)',
      admin: {
        description:
          'Belediye tabloları çoğu zaman sokak bazında gelir. Boş bırakılırsa değer ' +
          'mahallenin geneli için kabul edilir. ⚠️ Sokak bazlı ve mahalle geneli kayıtlar ' +
          'birlikte durabilir; site mahalle genelini kullanır.',
      },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'metrekareRayicBedel',
          type: 'number',
          label: 'Bina m² rayiç bedeli (₺)',
          min: 0,
          admin: {
            width: '50%',
            description: 'Konut/bina için metrekare başına vergiye esas asgari değer.',
          },
        },
        {
          name: 'arsaRayicBedel',
          type: 'number',
          label: 'Arsa m² rayiç bedeli (₺)',
          min: 0,
          admin: {
            width: '50%',
            description: 'Arsa metrekaresi başına vergiye esas asgari değer.',
          },
        },
      ],
    },

    {
      type: 'row',
      fields: [
        {
          name: 'kaynak',
          type: 'select',
          label: 'Kaynak',
          required: true,
          defaultValue: 'belediye',
          index: true,
          options: [...RAYIC_KAYNAKLARI],
          admin: {
            width: '50%',
            description: 'Sitede rakamın yanında aynen gösterilir.',
          },
        },
        {
          name: 'guncellemeTarihi',
          type: 'date',
          label: 'Kaynağın tarihi',
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
            description:
              'Tabloyu hangi tarihte aldığınız. "Veriler [tarih] itibarıyladır" ibaresi ' +
              'bundan üretilir.',
          },
        },
      ],
    },

    {
      name: 'notlar',
      type: 'textarea',
      label: 'Notlar',
      admin: {
        description:
          'Hangi belediye, hangi tablo, hangi sayfa. ⚠️ Kaynağı "elle" seçtiyseniz nereden ' +
          'aldığınızı buraya yazın — kaynağı yazılmayan rakam denetlenemez.',
      },
    },
  ],
}
