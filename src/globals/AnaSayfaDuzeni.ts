import { revalidatePath } from 'next/cache'
import type { GlobalConfig } from 'payload'

import { ANASAYFA_SIRA_SECENEKLERI, VARSAYILAN_ANASAYFA_SIRASI } from '@/lib/anasayfa/duzen'
import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * Ana sayfa düzeni — bölüm sırası ve açık/kapalı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EKRAN BÖLÜM TANIMLAMAZ, DİZER. Menü Düzeni'ndeki ayrımın aynısı:
 * hangi bölümlerin VAR OLDUĞU kodda, hangisinin SİTE GENELİNDE görüneceği
 * Site Bölümleri'nde, ana sayfada hangi SIRADA duracağı burada.
 *
 * Serbest bir sayfa kurucusu (blok ekle/çıkar/düzenle) üçünü tek yerde
 * toplardı; ilk yanlış yapılandırmada ana sayfa sessizce yarım çizilirdi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SIRALAMA SÜRÜKLE-BIRAK. Payload'ın dizi alanı satırları tutamaçtan
 * sürükleyerek yeniden diziyor; ayrı bir "sıra numarası" alanı eklenmedi.
 * Sayı alanı olsaydı iki satıra aynı numarayı yazmak mümkün olurdu ve
 * çakışmayı çözmek için görünmez bir kural gerekirdi.
 *
 * ⚠️ VİTRİN LİSTEDE YOK. Sinematik vitrin sayfanın LCP öğesi; aşağı
 * alınması ölçülebilir bir performans kaybı. Gerekçe `lib/anasayfa/duzen.ts`
 * başında.
 *
 * ⚠️ KAPATMAK SİLMEK DEĞİL. Buradaki anahtar yalnızca ANA SAYFAYI etkiler.
 * Bir bölümü siteden tamamen kaldırmak için Site Bölümleri kullanılır —
 * orası menüyü, altbilgiyi ve site haritasını da birlikte kapatır.
 */
export const AnaSayfaDuzeni: GlobalConfig = {
  slug: 'anasayfa-duzeni',
  label: 'Ana Sayfa Düzeni',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: sitenin vitrini — editoryal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Ana sayfadaki bölümlerin sırası ve görünürlüğü. Satırları tutamacından sürükleyerek ' +
      'sıralayın. Kapatmak bölümü yalnızca ana sayfadan kaldırır; siteden tamamen kaldırmak ' +
      'için Site Bölümleri’ni kullanın.',
  },

  hooks: {
    // Ana sayfa statik üretiliyor; değişiklik anında görünmeli.
    afterChange: [
      () => {
        try {
          revalidatePath('/')
        } catch {
          // Payload REST bağlamında istek dışı çağrılabilir; sorun değil.
        }
      },
    ],
  },

  fields: [
    {
      name: 'sira',
      type: 'array',
      label: 'Bölüm sırası',
      labels: { singular: 'Bölüm', plural: 'Bölümler' },
      /**
       * ⚠️ Varsayılan kod sırası. Boş listeyle açılsaydı Aslıhan on dört
       * satırı tek tek eklemek zorunda kalır ve ilk kaydetmeye kadar panel
       * sırayı yanlış gösterirdi.
       */
      defaultValue: VARSAYILAN_ANASAYFA_SIRASI.map((anahtar) => ({
        bolum: anahtar,
        acik: true,
      })),
      admin: {
        description:
          'Yukarıdan aşağı ana sayfa sırası. Listeden silinen bölüm kaybolmaz — ' +
          'varsayılan yerinde çizilmeye devam eder.',
        initCollapsed: false,
      },
      /**
       * ⚠️ Tekrar eden bölüm KAYDEDİLMEZ, sessizce yok sayılmaz.
       *
       * Çizim tarafı zaten ikinciyi atlıyor (bir bölüm sayfada iki kez
       * duramaz) ama panelde "ekledim, görünmedi" demek en kötü geri
       * bildirim. Hata burada, sebebiyle birlikte söyleniyor.
       */
      validate: (deger: unknown) => {
        if (!Array.isArray(deger)) return true

        const gorulen = new Set<string>()
        for (const satir of deger) {
          const bolum = (satir as { bolum?: unknown }).bolum
          if (typeof bolum !== 'string') continue
          if (gorulen.has(bolum)) {
            const ad =
              ANASAYFA_SIRA_SECENEKLERI.find((secenek) => secenek.value === bolum)?.label ?? bolum
            return `"${ad}" listede birden çok kez var. Bir bölüm ana sayfada yalnızca bir kez yer alabilir.`
          }
          gorulen.add(bolum)
        }

        return true
      },
      fields: [
        {
          name: 'bolum',
          type: 'select',
          label: 'Bölüm',
          required: true,
          /**
           * ⚠️ Seçenekler koddan türetiliyor, elle yazılmıyor. Elle
           * yazılsaydı yeni bir bölüm eklendiğinde burayı güncellemeyi
           * unutmak kaçınılmazdı — ve yeni bölüm sıralanamaz olurdu.
           */
          options: [...ANASAYFA_SIRA_SECENEKLERI],
          admin: { width: '70%' },
        },
        {
          name: 'acik',
          type: 'checkbox',
          label: 'Ana sayfada göster',
          defaultValue: true,
          admin: {
            width: '30%',
            description: 'Kapalıysa bölüm yalnızca ana sayfadan kalkar.',
          },
        },
      ],
    },
  ],
}
