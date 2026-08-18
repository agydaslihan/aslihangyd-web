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
import type { Field } from 'payload'

/**
 * Düzenlenebilir sayfa içeriklerinin ortak alanları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ EDİTÖR SINIRLI VE BU BİLİNÇLİ — `Hakkimizda` ile aynı gerekçe.
 *
 * Açık: başlık (h2/h3), kalın, italik, madde/numaralı liste, bağlantı.
 * Kapalı: renk, punto, hizalama, tablo, gömülü HTML, alıntı.
 *
 * Serbest bir editör tasarımı iki haftada bozar. Daha önemlisi: punto ve
 * renk açılsaydı kontrast kapısının DIŞINDA bir metin katmanı doğardı —
 * panelde ölçülmeyen, sitede okunmayan.
 *
 * ⚠️ `h1` editörde YOK. Sayfanın `h1`i başlık alanından geliyor ve tek
 * olmalı; ikinci bir `h1` ekran okuyucu gezinmesini ve SEO'yu bozar.
 *
 * ⚠️ Ayar tek yerde: altı sayfa aynı editörü paylaşıyor. İki yerde ayrı
 * kurulsaydı biri gevşetildiğinde diğeri fark edilmeden sıkı kalırdı ve
 * "neden burada yapabiliyorum da orada yapamıyorum" sorusu doğardı.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const sinirliEditor = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BoldFeature(),
    ItalicFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    LinkFeature(),
    InlineToolbarFeature(),
  ],
})

export interface SayfaAlanSecenekleri {
  /** Panelde görünen sayfa adı — açıklama metinlerinde geçiyor. */
  ad: string
  /** Başlık alanı için ipucu: kod hangi varsayılanı kullanıyor. */
  varsayilanBaslik: string
  /** Alt başlık/açıklama alanının etiketi sayfaya göre değişiyor. */
  altBaslikEtiketi?: string
  /** Zengin metin bloğu gerekiyor mu — bazı sayfalarda yalnızca başlık var. */
  zenginMetin?: boolean
  /** Serbest görsel blokları açılsın mı. */
  gorseller?: boolean
}

/**
 * Bir sayfanın düzenlenebilir çekirdeği.
 *
 * ⚠️ HİÇBİR ALAN ZORUNLU DEĞİL. Boş bırakılan alan, koddaki mevcut
 * varsayılan metnin görünmesi demek — sayfa kırılmıyor. Zorunlu yapılsaydı
 * içerik yazılana kadar kayıt kaydedilemez ve sayfa yayından kalkardı.
 */
export function sayfaAlanlari(secenekler: SayfaAlanSecenekleri): Field[] {
  const {
    ad,
    varsayilanBaslik,
    altBaslikEtiketi,
    zenginMetin = true,
    gorseller = false,
  } = secenekler

  const alanlar: Field[] = [
    {
      name: 'baslik',
      type: 'text',
      label: 'Sayfa başlığı (h1)',
      admin: {
        description:
          `Boş bırakırsanız mevcut başlık kullanılır: "${varsayilanBaslik}". ` +
          'Sayfadaki tek h1 budur.',
      },
    },
    {
      name: 'altBaslik',
      type: 'textarea',
      label: altBaslikEtiketi ?? 'Başlık altı açıklama',
      admin: {
        description: `${ad} sayfasında başlığın hemen altında görünür. Boşsa mevcut metin kalır.`,
      },
    },
  ]

  if (zenginMetin) {
    alanlar.push({
      name: 'icerik',
      type: 'richText',
      label: 'Serbest metin',
      editor: sinirliEditor,
      admin: {
        description:
          'Sayfanın gövdesine eklenir. Boş bırakabilirsiniz — o zaman hiç görünmez, ' +
          'sayfa mevcut hâliyle çalışır.',
      },
    })
  }

  if (gorseller) {
    alanlar.push({
      name: 'gorseller',
      type: 'array',
      label: 'Görseller',
      labels: { singular: 'Görsel', plural: 'Görseller' },
      admin: {
        description:
          'Metnin altında ızgara olarak görünür. ⚠️ Medya kaydında kullanım türünü seçerseniz ' +
          'panel size ziyaretçiye inecek gerçek boyutu ve bütçe durumunu gösterir.',
      },
      fields: [
        { name: 'gorsel', type: 'upload', relationTo: 'medya', label: 'Görsel', required: true },
        {
          name: 'aciklama',
          type: 'text',
          label: 'Açıklama (altyazı)',
          admin: { description: 'Boşsa altyazı gösterilmez.' },
        },
      ],
    })
  }

  return alanlar
}
