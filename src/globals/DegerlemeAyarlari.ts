import type { GlobalConfig } from 'payload'

import { BINA_DURUMLARI, KAT_TIPLERI } from '@/lib/degerleme/motor'
import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * Değerleme modeli katsayıları.
 *
 * ⚠️ Buraya BAŞLANGIÇ DEĞERİ KONULMADI ve konulmamalı.
 *
 * Katsayılar Aslıhan'ın saha bilgisiyle belirlenir. Benim "makul görünen"
 * bir katsayı yazmam, uydurma veriyi model parametresi kılığında sokmak
 * olurdu (CLAUDE.md kural 2). Bir katsayı girilmemişse motor o faktörü
 * hesaba katmaz ve ziyaretçiye "bu etki hesaba katılmadı" der — sessizce
 * 1,0 uygulamaz.
 *
 * Katsayılar çarpımsaldır: 1,00 = etkisiz, 1,05 = %5 artırır,
 * 0,90 = %10 düşürür.
 */
export const DegerlemeAyarlari: GlobalConfig = {
  slug: 'degerleme-ayarlari',
  label: 'Değerleme Ayarları',

  access: {
    // Motor istemcide çalışıyor; katsayılar zaten sonuç ekranında tek tek
    // gösteriliyor. Gizlenecek bir şey yok, tersine şeffaflık gereği.
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: değerleme katsayıları — tahmin aralığını belirler.
    update: yalnizcaYonetici,
  },

  admin: {
    description:
      'Değerleme modelinin katsayıları. Girilmeyen katsayı hesaba katılmaz — ' +
      'tahmini bir değer uydurulmaz. Katsayılar çarpımsaldır: 1,00 etkisiz demektir.',
  },

  fields: [
    {
      name: 'katKatsayilari',
      type: 'array',
      label: 'Kat katsayıları',
      labels: { singular: 'Kat', plural: 'Katlar' },
      admin: {
        description:
          'Örnek düşünce: zemin kat genellikle ara kattan düşük, yüksek kat manzara varsa yüksek değerlenir. ' +
          'Rakamları kendi gözleminize göre siz belirleyin.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'kat',
              type: 'select',
              label: 'Kat tipi',
              required: true,
              options: [...KAT_TIPLERI],
              admin: { width: '50%' },
            },
            {
              name: 'katsayi',
              type: 'number',
              label: 'Katsayı',
              required: true,
              min: 0.3,
              max: 2,
              admin: { width: '50%', step: 0.01, description: '1,00 = etkisiz' },
            },
          ],
        },
      ],
    },
    {
      name: 'durumKatsayilari',
      type: 'array',
      label: 'Yapı durumu katsayıları',
      labels: { singular: 'Durum', plural: 'Durumlar' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'durum',
              type: 'select',
              label: 'Yapı durumu',
              required: true,
              options: [...BINA_DURUMLARI],
              admin: { width: '50%' },
            },
            {
              name: 'katsayi',
              type: 'number',
              label: 'Katsayı',
              required: true,
              min: 0.3,
              max: 2,
              admin: { width: '50%', step: 0.01 },
            },
          ],
        },
      ],
    },
    {
      name: 'yasKatsayilari',
      type: 'array',
      label: 'Bina yaşı katsayıları',
      labels: { singular: 'Yaş dilimi', plural: 'Yaş dilimleri' },
      admin: {
        description:
          'Her dilim için ÜST YAŞ sınırı ve katsayı girin. En yaşlı dilimin üst sınırını ' +
          'BOŞ bırakın ("ve üzeri"). Sıralama önemli değil, sistem kendisi sıralar.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'ustYas',
              type: 'number',
              label: 'Üst yaş sınırı',
              min: 0,
              admin: { width: '50%', description: 'En yaşlı dilimde boş bırakın.' },
            },
            {
              name: 'katsayi',
              type: 'number',
              label: 'Katsayı',
              required: true,
              min: 0.3,
              max: 2,
              admin: { width: '50%', step: 0.01 },
            },
          ],
        },
      ],
    },
    {
      name: 'notlar',
      type: 'textarea',
      label: 'Metodoloji notu',
      admin: {
        description:
          'Katsayıları neye göre belirlediğinizi buraya yazın. Bir müşteri veya gazeteci ' +
          '"bu rakamı nasıl buldunuz?" diye sorduğunda cevabınız hazır olsun.',
      },
    },
  ],
}
