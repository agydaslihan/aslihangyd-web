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
    /**
     * ─────────────────────────────────────────────────────────────────────
     * ⚠️ GÖRSEL BİÇİMİ SINIRLI SEÇENEKLERLE — SERBEST CSS YOK.
     *
     * En-boy oranı, köşe yarıçapı ve kenarlık serbest bırakılsaydı ilk
     * yanlış değerde sayfa tasarım sisteminin dışına çıkardı. Dört oran,
     * üç yarıçap ve bir aç/kapa: hepsi tasarımın zaten tanıdığı değerler.
     *
     * ⚠️ EN-BOY ORANI SABİTLENMESİ CLS İÇİN DE ÖNEMLİ: oran bilinince yer
     * görsel inmeden ayrılıyor. "Otomatik" seçeneği yok — dosyanın kendi
     * oranına bırakmak, farklı oranlarda yüklenen iki fotoğrafta düzeni
     * zıplatırdı.
     * ─────────────────────────────────────────────────────────────────────
     */
    {
      type: 'row',
      fields: [
        {
          name: 'portreOrani',
          type: 'select',
          label: 'Portre en-boy oranı',
          defaultValue: '3:4',
          options: [
            { value: '1:1', label: 'Kare (1:1)' },
            { value: '3:4', label: 'Dikey (3:4)' },
            { value: '4:3', label: 'Yatay (4:3)' },
            { value: '16:9', label: 'Geniş (16:9)' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'portreYaricapi',
          type: 'select',
          label: 'Köşe yarıçapı',
          defaultValue: 'buyuk',
          options: [
            { value: 'yok', label: 'Köşeli' },
            { value: 'orta', label: 'Yumuşak' },
            { value: 'buyuk', label: 'Belirgin' },
          ],
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'portreKenarligi',
          type: 'checkbox',
          label: 'İnce kenarlık',
          defaultValue: false,
          admin: {
            width: '50%',
            description: 'Açık fotoğrafların kenarı beyaz zeminde kayboluyorsa işe yarar.',
          },
        },
        {
          name: 'portreHizalamasi',
          type: 'select',
          label: 'Alt yazı hizası',
          defaultValue: 'sol',
          options: [
            { value: 'sol', label: 'Sol' },
            { value: 'orta', label: 'Orta' },
            { value: 'sag', label: 'Sağ' },
          ],
          admin: { width: '50%' },
        },
      ],
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
