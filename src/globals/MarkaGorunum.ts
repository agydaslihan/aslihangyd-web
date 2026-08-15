import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'
import { gecerliHex, kapiMesaji, paletiDegerlendir } from '@/lib/marka/kontrastKapisi'
import { YUVALAR, type Palet } from '@/lib/marka/yuvalar'

/**
 * Marka ve Görünüm — logo, site adı ve renk yuvaları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ AÇILAN ŞEY SINIRLI VE BU BİLİNÇLİ
 *
 * Açık: on anlamsal renk yuvası, logo, site adı, slogan, OG görseli.
 * Kapalı: serbest CSS/HTML, tipografi, boşluk/köşe/gölge jetonları,
 * rampa basamakları.
 *
 * Gerekçe: serbest bir tema düzenleyici tasarımı iki haftada bozar.
 * Tipografi ayrıca Türkçe alt kümeye bağlı — font değişirse alt küme
 * bozulur ve harfler kutu olur. Boşluk ve köşe jetonları tasarım
 * sistemidir, içerik değil.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KONTRAST KAPISI SUNUCUDA DA VAR — PANELDEKİ AYNA DEĞİL, İKİNCİ KAPI
 *
 * Panel geçmeyen paletle kaydet butonunu pasifleştiriyor. Bu kanca aynı
 * motoru sunucuda tekrar koşuyor: Local API, seed betiği ya da elle SQL
 * ile geçersiz palet yazılamasın.
 *
 * EİDS kancasındaki ilkenin aynısı: panel bir kapı değil ayna; gerçek kapı
 * sunucuda.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Bir tema için on renk alanı üretir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KAPI `validate` İLE KURULDU, "kaydet butonunu pasifleştir" İLE DEĞİL.
 *
 * İlk tasarım Payload'ın `setDisabled(true)` çağrısıydı. Denenince görüldü:
 * o çağrı FORMUN TAMAMINI kilitliyor — renk alanları dahil. Yani kapı
 * kapanınca kullanıcı sorunu düzeltemez hâle geliyordu. Kapının amacı kötü
 * paleti engellemek, kullanıcıyı hapsetmek değil.
 *
 * `validate` ile: kaydetme fiilen engelleniyor (Payload geçersiz formu
 * göndermiyor), hatalı yuva kırmızı işaretleniyor ve sebep o alanın altında
 * yazıyor. Hem engel hem yön gösterme.
 *
 * ⚠️ Doğrulama TEK RENGE değil, o rengin girdiği ÇİFTLERE bakıyor. Tek
 * başına bir hex "geçerli" olabilir; sorun her zaman bir çiftte doğar.
 * ─────────────────────────────────────────────────────────────────────────
 */
function renkAlanlari(tema: 'acik' | 'koyu') {
  return YUVALAR.map((yuva) => ({
    name: yuva.anahtar,
    type: 'text' as const,
    label: yuva.etiket,
    required: true,
    defaultValue: tema === 'acik' ? yuva.varsayilanAcik : yuva.varsayilanKoyu,
    validate: (_deger: unknown, { siblingData }: { siblingData?: unknown }) => {
      const palet = paletiOku(siblingData)
      if (!gecerliHex(palet[yuva.anahtar])) return 'Geçersiz renk — #rrggbb bekleniyor.'

      const sonuc = paletiDegerlendir(palet)
      const ilgili = sonuc.kalanlar.filter(
        (cift) => cift.on === yuva.anahtar || cift.arka === yuva.anahtar,
      )
      if (ilgili.length === 0) return true

      return ilgili
        .map(
          (cift) => `${cift.etiket}: ${cift.oran.toFixed(2)}:1 — en az ${cift.esik}:1 gerekiyor.`,
        )
        .join(' ')
    },
    admin: {
      description: yuva.aciklama,
      components: {
        Field: '@/components/marka/RenkAlani#RenkAlani',
      },
    },
    custom: { yuva: yuva.anahtar, tema },
  }))
}

/** Kaydedilmiş veriden palet çıkarır. */
export function paletiOku(kaynak: unknown): Palet {
  const veri = (kaynak ?? {}) as Record<string, unknown>
  return Object.fromEntries(YUVALAR.map((yuva) => [yuva.anahtar, String(veri[yuva.anahtar] ?? '')]))
}

export const MarkaGorunum: GlobalConfig = {
  slug: 'marka-gorunum',
  label: 'Marka ve Görünüm',

  access: {
    // Renkler ve logo zaten her ziyaretçinin gördüğü şey.
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: sitenin görünümünü tümden değiştirir.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Logo, site adı ve renkler. Renk değişikliği kaydedildiği anda yayına girer — ' +
      'imajın yeniden derlenmesi gerekmez.',
  },

  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data

        for (const [alan, etiket] of [
          ['acikTema', 'açık'],
          ['koyuTema', 'koyu'],
        ] as const) {
          const palet = paletiOku(data[alan])
          const sonuc = paletiDegerlendir(palet)
          if (!sonuc.gecti) {
            throw new Error(kapiMesaji(sonuc, etiket))
          }
        }

        return data
      },
    ],
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Marka',
          description:
            'Logo yüklenmezse site adı yazıyla gösterilir — site logosuz da düzgün çalışır.',
          fields: [
            {
              name: 'siteAdi',
              type: 'text',
              label: 'Site adı',
              admin: {
                description:
                  'Başlıkta, altbilgide ve sekme adında görünür. Boşsa "Aslıhan GYD" kullanılır.',
              },
            },
            {
              name: 'slogan',
              type: 'text',
              label: 'Kısa slogan',
              admin: { description: 'Logonun yanında ve paylaşım kartlarında görünür.' },
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'medya',
              label: 'Ana logo (açık tema)',
              admin: {
                description:
                  'SVG tercih edilir, PNG de kabul. ⚠️ Her sayfada yükleniyor — 50 kB üstü ' +
                  'dosyalar için panelde uyarı çıkar.',
              },
            },
            {
              name: 'logoKoyu',
              type: 'upload',
              relationTo: 'medya',
              label: 'Koyu tema logosu',
              admin: {
                description: 'İsteğe bağlı. Boşsa koyu temada da ana logo kullanılır.',
              },
            },
            {
              name: 'simgeKaynak',
              type: 'upload',
              relationTo: 'medya',
              label: 'Simge kaynağı (favicon)',
              admin: {
                description:
                  'KARE görsel, en az 512×512. Favicon, dokunma simgesi ve manifest ' +
                  'ikonları bundan otomatik üretilir — ayrı ayrı yüklemenize gerek yok.',
              },
            },
            {
              name: 'ogGorseli',
              type: 'upload',
              relationTo: 'medya',
              label: 'Paylaşım görseli (OG)',
              admin: {
                description:
                  'Sosyal medyada bağlantı paylaşıldığında görünen kart görseli. ' +
                  'Önerilen 1200×630. Boşsa otomatik üretilen kart kullanılır.',
              },
            },
            {
              name: 'markaOzeti',
              type: 'ui',
              label: 'Durum',
              admin: {
                components: { Field: '@/components/marka/MarkaOzeti#MarkaOzeti' },
              },
            },
          ],
        },
        {
          label: 'Renkler — açık tema',
          description:
            'Sitenin varsayılan teması. Her renk değiştiğinde kontrast anında ölçülür; ' +
            'WCAG AA geçmeyen bir çift varsa kaydetme kapalıdır.',
          fields: [
            {
              name: 'acikTema',
              type: 'group',
              label: 'Açık tema renkleri',
              fields: renkAlanlari('acik'),
            },
            {
              name: 'acikOzet',
              type: 'ui',
              label: 'Kontrast ve önizleme',
              admin: {
                components: { Field: '@/components/marka/PaletPaneli#AcikPaletPaneli' },
              },
            },
          ],
        },
        {
          label: 'Renkler — koyu tema',
          description: 'Ziyaretçi koyu temaya geçtiğinde kullanılır. Aynı kapı burada da geçerli.',
          fields: [
            {
              name: 'koyuTema',
              type: 'group',
              label: 'Koyu tema renkleri',
              fields: renkAlanlari('koyu'),
            },
            {
              name: 'koyuOzet',
              type: 'ui',
              label: 'Kontrast ve önizleme',
              admin: {
                components: { Field: '@/components/marka/PaletPaneli#KoyuPaletPaneli' },
              },
            },
          ],
        },
      ],
    },
  ],
}
