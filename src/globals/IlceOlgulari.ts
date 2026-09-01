import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * İlçe düzeyindeki olgular — mahalle sayfalarının payda değeri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEK BİR RAKAM İÇİN AYRI GLOBAL, VE SEBEBİ VAR.
 *
 * "Bu mahalle ilçe nüfusunun %3,6'sı" cümlesi iki rakam istiyor: mahalle
 * nüfusu (mahalle kaydında) ve ilçe nüfusu (hiçbir yerde yoktu). İlçe
 * nüfusunu koda gömmek, TÜİK her yıl yeni sayı yayınladığında sessizce
 * eskiyen bir sabit üretirdi (kural 4'ün mantığı: değişen veri CMS'te).
 *
 * ⚠️ KAYNAK ALANI ZORUNLU. Payda kaynaksızsa, ondan çıkan yüzde de
 * kaynaksızdır.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const IlceOlgulari: GlobalConfig = {
  slug: 'ilce-olgulari',
  label: 'İlçe Olguları (Çorlu)',

  access: {
    read: herkesOkur,
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Mahalle sayfalarındaki "ilçe nüfusundaki payı" hesabının paydası. ' +
      '⚠️ Kaynak yazılmadan rakam girmeyin.',
  },

  fields: [
    {
      name: 'nufus',
      type: 'number',
      label: 'Çorlu ilçe nüfusu (kişi)',
      min: 0,
      defaultValue: 306_939,
      admin: {
        description:
          '⚠️ BİNLİK AYIRICI KULLANMAYIN: sayı alanı noktayı ondalık ayırıcı sayar. ' +
          'Doğrusu: 306939.',
      },
    },
    {
      name: 'nufusYili',
      type: 'number',
      label: 'Nüfus verisinin yılı',
      defaultValue: 2025,
      admin: { description: 'Yılsız bir nüfus rakamı anlamsızdır.' },
    },
    {
      name: 'nufusKaynagi',
      type: 'text',
      label: 'Nüfus verisinin kaynağı',
      defaultValue: 'TÜİK ADNKS 2025',
      admin: { description: 'Ekranda rakamın yanında aynen gösterilir.' },
    },
  ],
}
