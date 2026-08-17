import {
  BoldFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * /hakkimizda sayfasının içeriği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EDİTÖR SINIRLI VE BU BİLİNÇLİ
 *
 * Açık: başlık (h2/h3), kalın, italik, madde/numaralı liste, bağlantı.
 * Kapalı: renk, punto, hizalama, tablo, gömülü HTML, yükleme bloğu, alıntı.
 *
 * Serbest bir editör tasarımı iki haftada bozar — marka panelinde yuva
 * sayısını on ile sınırlamanın gerekçesinin aynısı. Ayrıca punto ve renk
 * açılırsa kontrast kapısının dışında bir metin katmanı doğar: panelde
 * ölçülmeyen, sitede okunmayan.
 *
 * ⚠️ `h1` editörde YOK. Sayfanın `h1`i başlıkta ve tek olmalı; ikinci bir
 * `h1` ekran okuyucu gezinmesini ve SEO'yu bozar.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ YASAL BİLGİLER BURADA DEĞİL. Yetki belgesi, MERSİS ve vergi bilgileri
 * `KurumsalBilgiler`den otomatik geliyor. İki yerde tutulsaydı biri
 * güncellenip diğeri unutulur ve sayfa kendi kendisiyle çelişirdi.
 */
export const Hakkimizda: GlobalConfig = {
  slug: 'hakkimizda',
  label: 'Hakkımızda Sayfası',

  access: {
    read: herkesOkur,
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Sayfanın tanıtım metni ve görselleri. Yetki belgesi ve vergi bilgileri buraya ' +
      'YAZILMAZ — onlar Kurumsal Bilgiler’den otomatik geliyor.',
  },

  fields: [
    {
      name: 'girisMetni',
      type: 'textarea',
      label: 'Giriş cümlesi',
      admin: {
        description:
          'Başlığın hemen altındaki tek paragraf. Boşsa koddaki varsayılan cümle kullanılır.',
      },
    },
    {
      name: 'icerik',
      type: 'richText',
      label: 'Tanıtım metni',
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          // ⚠️ h1 yok: sayfanın h1'i başlıkta ve tek olmalı.
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
          BoldFeature(),
          ItalicFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
          LinkFeature(),
          InlineToolbarFeature(),
        ],
      }),
      admin: {
        description:
          'Kimiz, nasıl çalışıyoruz, neye göre tavsiye veriyoruz. ' +
          'Biçimlendirme bilinçli olarak sınırlı: başlık, kalın, italik, liste, bağlantı.',
      },
    },
    {
      name: 'portre',
      type: 'upload',
      relationTo: 'medya',
      label: 'Portre fotoğrafı',
      admin: {
        description:
          'Dikey ya da kare çekim. Boş bırakılabilir — sayfa portresiz de düzgün çalışır.',
      },
    },
    {
      name: 'portreAltMetni',
      type: 'text',
      label: 'Portre alt yazısı',
      admin: { description: 'Fotoğrafın altında görünen kısa satır (ad, unvan).' },
    },
    {
      name: 'ekGorseller',
      type: 'array',
      label: 'Ek görseller',
      labels: { singular: 'Görsel', plural: 'Görseller' },
      admin: {
        description:
          'Ofis, ekip, saha fotoğrafları. ⚠️ Bunlar sayfanın altında ızgarada gösteriliyor; ' +
          'her biri için medya kaydında "Kullanım: Kart" seçmek bütçe uyarısını doğru çalıştırır.',
      },
      fields: [
        {
          name: 'gorsel',
          type: 'upload',
          relationTo: 'medya',
          label: 'Görsel',
          required: true,
        },
        {
          name: 'aciklama',
          type: 'text',
          label: 'Açıklama',
          admin: { description: 'Görselin altında görünür. Boşsa yazı çıkmaz.' },
        },
      ],
    },
  ],
}
