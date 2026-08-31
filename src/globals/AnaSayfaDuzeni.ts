import { revalidatePath } from 'next/cache'
import type { GlobalConfig } from 'payload'

import {
  ANASAYFA_SIRA_SECENEKLERI,
  HERO_ACILISLARI,
  VARSAYILAN_HERO_ACILISI,
  BOLUM_BOSLUKLARI,
  BOLUM_HIZALAMALARI,
  BOLUM_ZEMINLERI,
  VARSAYILAN_ANASAYFA_SIRASI,
  VARSAYILAN_GORUNUM,
} from '@/lib/anasayfa/duzen'
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
/**
 * Panelde görünen Türkçe etiketler.
 *
 * ⚠️ Değer kümesi kodda (`lib/anasayfa/duzen.ts`), etiketi burada: kablo
 * değeri ile ekran metni ayrı tutuluyor. Etiketi değiştirmek kayıtlı
 * veriyi bozmamalı.
 */
const ZEMIN_ETIKETI: Record<(typeof BOLUM_ZEMINLERI)[number], string> = {
  varsayilan: 'Varsayılan (bölümün kendi zemini)',
  kagit: 'Beyaz / kâğıt',
  bej: 'Sıcak bej',
  koyu: 'Koyu bant',
}

const BOSLUK_ETIKETI: Record<(typeof BOLUM_BOSLUKLARI)[number], string> = {
  dar: 'Dar',
  normal: 'Normal',
  genis: 'Geniş',
}

const HIZALAMA_ETIKETI: Record<(typeof BOLUM_HIZALAMALARI)[number], string> = {
  sol: 'Sol',
  orta: 'Orta',
}

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
      name: 'heroAcilisi',
      type: 'select',
      label: 'Hero açılışı',
      defaultValue: VARSAYILAN_HERO_ACILISI,
      options: HERO_ACILISLARI.map((k) => ({ value: k.value, label: k.label })),
      admin: {
        description:
          'Sayfanın ilk ekranı neyle başlasın. ' +
          '⚠️ Üçü de gerçek bir sayfa bölümü — hiçbiri açılır katman (pop-up) değil; ' +
          'araya giren katmanlar mobil arama sıralamasını düşürür. ' +
          'Hangi kip seçiliyse sayfanın tek H1 başlığı orada olur.',
      },
    },
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
        ...VARSAYILAN_GORUNUM,
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
      /**
       * ⚠️ Seçenek listeleri koddaki kümelerle aynı olmak zorunda;
       * `duzen.test.ts` ikisini karşılaştırıyor. Panelde seçilebilen ama
       * çizimde tanınmayan bir değer, sessizce varsayılana düşerdi.
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
        /**
         * ─────────────────────────────────────────────────────────────────
         * ⚠️ ÜÇ AYARIN DA DEĞER KÜMESİ KAPALI — serbest renk ya da piksel
         *    girişi YOK.
         *
         * Serbest bir değer, tasarım sisteminin dışına çıkan tek bir bölüm
         * üretmeye yeter; sonra o bölüm "neden farklı görünüyor" sorusunun
         * cevapsız kaldığı yer olur. Kapalı küme, panelin yanlış
         * yapılandırılamamasını garanti ediyor.
         * ─────────────────────────────────────────────────────────────────
         */
        {
          name: 'zemin',
          type: 'select',
          label: 'Zemin',
          defaultValue: VARSAYILAN_GORUNUM.zemin,
          /**
           * ⚠️ Seçenekler KODDAKİ KÜMEDEN türetiliyor. Elle yazılsaydı yeni
           * bir zemin eklendiğinde burayı güncellemeyi unutmak kaçınılmazdı
           * ve panelde seçilemeyen bir değer olurdu.
           */
          options: BOLUM_ZEMINLERI.map((deger) => ({
            value: deger,
            label: ZEMIN_ETIKETI[deger],
          })),
          admin: {
            width: '34%',
            description:
              '⚠️ "Varsayılan" beyaz demek DEĞİL: bölümün kendi tasarlanmış zeminini koru ' +
              'demek. Çorlu deneyimi ve çağrı bandı kendi bantlarını taşıyor.',
          },
        },
        {
          name: 'bosluk',
          type: 'select',
          label: 'Dikey boşluk',
          defaultValue: VARSAYILAN_GORUNUM.bosluk,
          options: BOLUM_BOSLUKLARI.map((deger) => ({
            value: deger,
            label: BOSLUK_ETIKETI[deger],
          })),
          admin: { width: '33%' },
        },
        {
          name: 'hizalama',
          type: 'select',
          label: 'İçerik hizalaması',
          defaultValue: VARSAYILAN_GORUNUM.hizalama,
          options: BOLUM_HIZALAMALARI.map((deger) => ({
            value: deger,
            label: HIZALAMA_ETIKETI[deger],
          })),
          admin: {
            width: '33%',
            description:
              '⚠️ Bölüm BAŞLIĞINI ve açıklamasını hizalar. Kart ızgaraları ve harita gibi ' +
              'kendi düzeni olan içerikler bundan etkilenmez — yarım çalışan bir ayar ' +
              'vermektense sınırını söylüyoruz.',
          },
        },
      ],
    },
  ],
}
