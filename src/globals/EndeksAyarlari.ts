import type { GlobalConfig } from 'payload'

import { ODA_TIPLERI } from '@/lib/endeks/tipler'
import { herkesOkur, yalnizcaPanel } from '@/lib/erisim'

/**
 * Endeks ayarları — sepet ağırlıkları ve yayın kontrolü.
 *
 * ⚠️ AĞIRLIKLARA BAŞLANGIÇ DEĞERİ KONULMADI.
 *
 * Ağırlıklar **konut stokunu** temsil etmeli, gözlem sayısını değil
 * (ENDEKS-VERI-YONETIMI.md §3.2). Bu, bileşim yanlılığını öldüren adımdır ve
 * Aslıhan'ın saha bilgisini gerektirir: hangi mahallede kaç konut var,
 * hangi tip yaygın. Benim tahminim uydurma veri olurdu.
 *
 * ⚠️ Ağırlıklar YILDA BİR KEZ, Ocak ayında güncellenir. Ay ay değişirse
 * endeks anlamını kaybeder.
 */
export const EndeksAyarlari: GlobalConfig = {
  slug: 'endeks-ayarlari',
  label: 'Endeks Ayarları',

  access: {
    read: herkesOkur,
    update: yalnizcaPanel,
  },

  admin: {
    description:
      'Çorlu Konut Endeksi sepet ağırlıkları ve yayın durumu. ' +
      'Ağırlıklar yılda bir kez, Ocak ayında güncellenir.',
  },

  fields: [
    {
      name: 'yayinda',
      type: 'checkbox',
      label: 'Endeks sayfası yayında',
      defaultValue: false,
      admin: {
        description:
          '⚠️ Bu kutuyu işaretlemek TEK BAŞINA yeterli değildir. Sistem ayrıca veri ' +
          'koşullarını kontrol eder (en az 6 ay, 500 gözlem, %70 ağırlık kapsamı, ' +
          'metodoloji sayfası yayında). Koşullar sağlanmazsa sayfa 404 döner. ' +
          'Bu kontrol koda gömülüdür ve "bir ay erken açalım" cazibesine karşı durur.',
      },
    },
    {
      name: 'metodolojiYayinda',
      type: 'checkbox',
      label: 'Metodoloji sayfası hazır ve yayında',
      defaultValue: false,
      admin: {
        description:
          'Endeks, metodolojisi yayınlanmadan yayına alınamaz. Yöntemi açıklamak hem ' +
          'güven hem koruma sağlar: "yöntemimiz açık, isteyen kontrol edebilir".',
      },
    },
    {
      name: 'sepetAgirliklari',
      type: 'array',
      label: 'Sepet ağırlıkları',
      labels: { singular: 'Katman', plural: 'Katmanlar' },
      admin: {
        description:
          'Her katman (mahalle × oda tipi) için ağırlık. Ağırlıklar KONUT STOKUNU ' +
          'temsil etmeli, gözlem sayınızı değil. Toplamı 1,00 olmalı. ' +
          'Başlangıçta saha bilginizle tahmin edin; TÜİK bina sayımı varsa iyileştirin.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'mahalle',
              type: 'relationship',
              relationTo: 'mahalleler',
              label: 'Mahalle',
              required: true,
              admin: { width: '40%' },
            },
            {
              name: 'odaTipi',
              type: 'select',
              label: 'Oda tipi',
              required: true,
              options: ODA_TIPLERI.map((oda) => ({ value: oda, label: oda })),
              admin: { width: '30%' },
            },
            {
              name: 'agirlik',
              type: 'number',
              label: 'Ağırlık',
              required: true,
              min: 0,
              max: 1,
              admin: { width: '30%', step: 0.01, description: 'Örn: 0,14' },
            },
          ],
        },
      ],
    },
    {
      name: 'agirlikGuncellemeYili',
      type: 'number',
      label: 'Ağırlıkların güncellendiği yıl',
      admin: {
        description: 'Ağırlıkları en son hangi yıl gözden geçirdiniz?',
      },
    },
    {
      name: 'tcmbKarsilastirmaNotu',
      type: 'textarea',
      label: 'TCMB karşılaştırma notu',
      admin: {
        description:
          "Üç ayda bir TCMB Tekirdağ konut fiyat endeksiyle karşılaştırın. Sapma %5'i " +
          'geçerse veriyi gözden geçirin. Sonucu buraya not edin — kendinizi denetlemenin ' +
          'en ucuz yolu budur.',
      },
    },
  ],
}
