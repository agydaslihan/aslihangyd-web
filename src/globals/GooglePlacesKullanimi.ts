import type { GlobalConfig } from 'payload'

import { kimseDegistiremez, yalnizcaPanel } from '@/lib/erisim'

/**
 * Google Places çağrı sayacı — aylık.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: GÖRÜNMEYEN MALİYET, KONTROL EDİLEMEYEN MALİYETTİR.
 *
 * Google Places ücretli bir servistir ve fatura ay sonunda gelir. Sayaç
 * olmasaydı "bu özellik bize ayda ne kadara mal oluyor?" sorusunun cevabı
 * yalnızca Google'ın kendi panelinde olurdu — yani Aslıhan'ın hiç
 * bakmadığı bir yerde.
 *
 * Sayaç bir bütçe SINIRI değil, bir gösterge. Sınır koymak (örn. "ayda
 * 500 çağrıdan sonra kapan") özelliği sessizce yarım çalışır hâle
 * getirirdi; katmanı kapatma kararı insanın olmalı ve Site Bölümleri
 * anahtarıyla tek tıkla verilebiliyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SALT OKUNUR. Sayaç yalnızca sunucu tarafında, gerçek bir API çağrısı
 * yapıldığında artar. Elle düzenlenebilseydi maliyet göstergesi olmaktan
 * çıkar, bir tahmin olurdu.
 */
export const GooglePlacesKullanimi: GlobalConfig = {
  slug: 'google-places-kullanimi',
  label: 'Google Places Kullanımı',

  access: {
    // Maliyet bilgisi ziyaretçiyi ilgilendirmez.
    read: yalnizcaPanel,
    update: kimseDegistiremez,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Google Places API çağrılarının aylık sayısı. Yalnızca gerçekten yapılan çağrılar ' +
      'sayılır; sayaç elle düzenlenemez. Katmanı kapatmak için Site Bölümleri → ' +
      '"Google Places" anahtarını kullanın.',
  },

  fields: [
    {
      name: 'aylar',
      type: 'array',
      label: 'Aylık kullanım',
      labels: { singular: 'Ay', plural: 'Aylar' },
      admin: { readOnly: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'ay',
              type: 'text',
              label: 'Ay (YYYY-AA)',
              required: true,
              admin: { width: '33%' },
            },
            {
              name: 'aramaCagrisi',
              type: 'number',
              label: 'Arama çağrısı',
              defaultValue: 0,
              admin: { width: '33%' },
            },
            {
              name: 'detayCagrisi',
              type: 'number',
              label: 'Detay çağrısı',
              defaultValue: 0,
              admin: { width: '34%' },
            },
          ],
        },
        {
          name: 'sonCagri',
          type: 'date',
          label: 'Son çağrı',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
  ],
}
