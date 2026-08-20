import type { GlobalConfig } from 'payload'

import { kimseDegistiremez, yalnizcaPanel } from '@/lib/erisim'

/**
 * Alan adı sağlığı — son sorgunun sonucu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU KAYIT BİR ÖNBELLEK VE VAR OLMA SEBEBİ NEZAKET.
 *
 * Şartnamenin şartı: kayıt kuruluşunu yorma, günde bir sor, sonucu
 * önbellekle. Panel şeridi her sayfa açılışında çalışıyor; oradan RDAP
 * sorgusu yapılsaydı günde yüzlerce istek giderdi.
 *
 * Sorguyu yalnızca `alan-sagligi` bakım görevi yapıyor ve sonucunu buraya
 * yazıyor; panel bu satırı okuyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SALT OKUNUR. Elle düzenlenebilseydi gösterge bir ölçüm değil bir
 * görüş olurdu — Google Places sayacındaki gerekçenin aynısı.
 */
export const AlanSagligi: GlobalConfig = {
  slug: 'alan-sagligi',
  label: 'Alan Adı Sağlığı',

  access: {
    read: yalnizcaPanel,
    update: kimseDegistiremez,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Alan adının kayıt kuruluşundaki durumu ve dışarıdan çözülüp çözülmediği. Günde bir ' +
      'kez bakım göreviyle güncellenir; elle düzenlenemez.',
  },

  fields: [
    { name: 'alan', type: 'text', label: 'Alan adı', admin: { readOnly: true } },
    {
      name: 'saglik',
      type: 'text',
      label: 'Sağlık',
      admin: { readOnly: true, description: 'saglikli / uyari / kritik / bilinmiyor' },
    },
    { name: 'ozet', type: 'text', label: 'Özet', admin: { readOnly: true } },
    { name: 'eylem', type: 'textarea', label: 'Ne yapılmalı', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        {
          name: 'bitisTarihi',
          type: 'text',
          label: 'Alan adı bitiş tarihi',
          admin: { width: '50%', readOnly: true },
        },
        {
          name: 'kalanGun',
          type: 'number',
          label: 'Bitişe kalan gün',
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    {
      name: 'durumlar',
      type: 'text',
      label: 'Kayıt kuruluşu durumları',
      admin: { readOnly: true, description: 'RDAP’ten gelen ham durum listesi.' },
    },
    {
      name: 'cozumleme',
      type: 'text',
      label: 'Dış DNS sonucu',
      admin: {
        readOnly: true,
        description:
          '⚠️ Kendi sunucumuzun çözümleyicisi değil, 1.1.1.1 ve 8.8.8.8 üzerinden sorulur. ' +
          'Kendi DNS’imiz önbellekten cevap verip düşmüş bir alan adını "çalışıyor" gösterebilir.',
      },
    },
    {
      name: 'sorguZamani',
      type: 'date',
      label: 'Son sorgu',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
