import type { CollectionConfig } from 'payload'

import { kimseDegistiremez, yalnizcaPanel } from '@/lib/erisim'

/**
 * Günlük gözlem özeti — panelin tek veri kaynağı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BURADA "ZİYARETÇİ" DİYE BİR SATIR YOK — VE OLMAYACAK.
 *
 * Her satır BİR GÜNDÜR, bir kişi değil. Tablo tasarımı KVKK kararının
 * kendisi: tek bir ziyaretçiye ait satır hiç yazılmadığı için, sonradan
 * "yanlışlıkla kişisel veri toplamışız" durumu yapısal olarak imkânsız.
 *
 * ⚠️ IP, oturum kimliği, tarayıcı parmak izi, serbest metin: hiçbiri
 * YOK. Şemada böyle bir alan olmaması, kod incelemesinden daha güçlü bir
 * güvence.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ŞARTNAMEDEN BİLİNÇLİ SAPMA — açıkça yazıyorum.
 *
 * Şartname "ham olay kaydı, 90 gün sonra otomatik silinir" diyor. Ham
 * kayıt HİÇ TUTULMUYOR: olaylar da bellekte toplanıp gün/olay/ayrıntı
 * kırılımında yazılıyor. Sebebi, ham kaydın bu üründe hiçbir soruyu
 * cevaplamaması — lead ilişkilendirmesi `Talepler.gonderildigiSayfa`
 * alanından geliyor, ham olay satırından değil.
 *
 * 90 gün kuralı yine de uygulanıyor: en ayrıntılı katman olan `olaylar`
 * dizisi 90 günden eski satırlarda bakım göreviyle temizleniyor;
 * toplulaştırılmış sayaçlar kalıcı.
 *
 * ⚠️ SALT OKUNUR. Elle düzenlenebilseydi panel bir ölçüm değil bir görüş
 * olurdu — Google Places sayacındaki gerekçenin aynısı.
 */
export const GozlemGunluk: CollectionConfig = {
  slug: 'gozlem-gunluk',

  labels: { singular: 'Günlük gözlem', plural: 'Günlük gözlem' },

  access: {
    // Ziyaret sayıları ziyaretçiyi ilgilendirmez.
    read: yalnizcaPanel,
    create: kimseDegistiremez,
    update: kimseDegistiremez,
    delete: kimseDegistiremez,
  },

  admin: {
    group: 'Ayarlar',
    useAsTitle: 'gun',
    defaultColumns: ['gun', 'toplamIstek', 'onayliIstek'],
    description:
      'Günlük toplulaştırılmış ölçüm. Her satır bir GÜNDÜR, bir kişi değil. ' +
      'Okumak için "Gözlemlenebilirlik" ekranını kullanın; burası ham depodur.',
    hidden: ({ user }) => (user as { rol?: string } | null)?.rol !== 'yonetici',
  },

  fields: [
    {
      name: 'gun',
      type: 'text',
      label: 'Gün (YYYY-AA-GG)',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'toplamIstek',
          type: 'number',
          label: 'Toplam sayfa görüntüleme (Katman A)',
          defaultValue: 0,
          admin: { width: '50%', readOnly: true },
        },
        {
          /**
           * ⚠️ Onay oranının payı. Panelde Katman B metriklerinin yanında
           * "onay oranı: %X" olarak görünüyor — eksik veriyi gizlemek
           * yanlış karar aldırır.
           */
          name: 'onayliIstek',
          type: 'number',
          label: 'Analitik onayı veren istek (Katman B)',
          defaultValue: 0,
          admin: { width: '50%', readOnly: true },
        },
      ],
    },

    {
      name: 'sayfalar',
      type: 'array',
      label: 'Sayfa bazında',
      admin: { readOnly: true },
      fields: [
        { name: 'rota', type: 'text', required: true },
        { name: 'goruntuleme', type: 'number', defaultValue: 0 },
        { name: 'hata', type: 'number', defaultValue: 0 },
        { name: 'toplamMs', type: 'number', defaultValue: 0 },
        { name: 'enYavasMs', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'kaynaklar',
      type: 'array',
      label: 'Yönlendiren alan adları',
      admin: {
        readOnly: true,
        description: '⚠️ Yalnızca alan adı. Tam URL hiç kaydedilmiyor.',
      },
      fields: [
        { name: 'alan', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'utmKaynaklar',
      type: 'array',
      label: 'UTM kampanya kaynakları',
      admin: { readOnly: true },
      fields: [
        { name: 'kaynak', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'ulkeler',
      type: 'array',
      label: 'Ülkeler',
      admin: { readOnly: true, description: 'Cloudflare ülke başlığından. IP okunmuyor.' },
      fields: [
        { name: 'kod', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'cihazlar',
      type: 'array',
      label: 'Cihaz sınıfı',
      admin: { readOnly: true },
      fields: [
        { name: 'sinif', type: 'text', required: true },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'olaylar',
      type: 'array',
      label: 'Olaylar (Katman B)',
      admin: {
        readOnly: true,
        description:
          '⚠️ 90 günden eski satırlarda bu dizi bakım göreviyle temizlenir; ' +
          'toplulaştırılmış sayaçlar kalır.',
      },
      fields: [
        { name: 'ad', type: 'text', required: true },
        { name: 'ayrinti', type: 'text' },
        { name: 'niyet', type: 'text' },
        { name: 'adet', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'ayrintiTemizlendi',
      type: 'checkbox',
      label: '90 gün doldu, ayrıntı temizlendi',
      defaultValue: false,
      admin: { readOnly: true },
    },
  ],
}
