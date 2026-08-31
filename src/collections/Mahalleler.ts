import { turAlanlari } from '@/lib/medya/turAlanlari'
import { videoAlanlari } from '@/lib/medya/videoAlanlari'
import type { CollectionConfig } from 'payload'

import { yalnizcaPanel, yalnizcaYoneticiSiler, yayimlananlariHerkesOkur } from '@/lib/erisim'

import { YERLESIM_TURU_SECENEKLERI } from '@/lib/mahalle/corluMahalleleri'
import { yatirimSkoruHesapla } from '@/lib/skorlama/yatirimSkoru'

import { sinirElleDuzenlemeIzi } from './hooks/sinirElleDuzenlemeIzi'
import { seoAlanlari, slugAlani, veriEksikAlani } from './ortakAlanlar'

/**
 * Mahalleler — sitenin SEO motoru.
 *
 * ⚠️ Rakam alanlarının hepsi isteğe bağlıdır ve BOŞ BAŞLAR. CLAUDE.md kural 2
 * gereği gerçek veri bilinmeden sayı yazılmaz; arayüz boş durumu özel olarak
 * tasarlanmış bir "veri bekleniyor" bloğuyla gösterir.
 *
 * Rakamların yanında `gozlemSayisi` (n) ve `verilerinTarihi` zorunlu olarak
 * birlikte gösterilir — dürüstlük bu projede satış argümanıdır.
 */
export const Mahalleler: CollectionConfig = {
  slug: 'mahalleler',
  labels: { singular: 'Mahalle', plural: 'Mahalleler' },

  access: {
    read: yayimlananlariHerkesOkur,
    create: yalnizcaPanel,
    update: yalnizcaPanel,
    // ⚠️ Silme yalnızca yöneticide — bkz. lib/erisim.ts gerekçesi.
    delete: yalnizcaYoneticiSiler,
  },

  admin: {
    useAsTitle: 'ad',
    defaultColumns: ['ad', 'yerlesimTuru', 'yayinda', 'veriEksik', 'updatedAt'],
    description: 'Mahalle mini-portalları. Her mahalle sayfası ayrı bir SEO varlığıdır.',
  },

  hooks: {
    beforeChange: [
      // Sınırı elle düzelten insanın emeği bir daha içe aktarmayla ezilmesin.
      sinirElleDuzenlemeIzi,
      ({ data, originalDoc }) => {
        const kayit = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
        const skor = (kayit.yatirimSkoru ?? {}) as Record<string, unknown>

        const sayi = (deger: unknown) => (typeof deger === 'number' ? deger : null)

        const sonuc = yatirimSkoruHesapla({
          fiyatTrendi: sayi(skor.fiyatTrendi),
          kiraCarpani: sayi(skor.kiraCarpaniPuani),
          sanayiYakinligi: sayi(skor.sanayiYakinligi),
          ulasim: sayi(skor.ulasim),
          sosyalDonati: sayi(skor.sosyalDonati),
          arzBaskisi: sayi(skor.arzBaskisi),
        })

        // ⚠️ Yeterli bileşen verisi yoksa `toplam` BOŞ bırakılır.
        // Yarım veriyle puan yazmak, o puanı değersizleştirir.
        return {
          ...data,
          yatirimSkoru: {
            ...skor,
            toplam: sonuc.durum === 'hesaplandi' ? sonuc.veri.toplam : null,
          },
        }
      },
    ],
  },

  fields: [
    {
      name: 'yayinda',
      type: 'checkbox',
      label: 'Yayında',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'İçerik metni hazır olmadan yayına alma. 800 kelimeden kısa sayfalar arama motorunda ' +
          '"zayıf içerik" sayılır ve tüm siteyi aşağı çeker.',
      },
    },
    slugAlani('ad'),
    veriEksikAlani,
    {
      name: 'siraNo',
      type: 'number',
      label: 'Sıralama',
      defaultValue: 100,
      admin: { position: 'sidebar', description: 'Küçük sayı önce gösterilir.' },
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Tanım',
          fields: [
            {
              name: 'ad',
              type: 'text',
              label: 'Mahalle adı',
              required: true,
              admin: { description: '"Mahallesi" eki olmadan. Örn: Muhittin' },
            },
            {
              /**
               * ⚠️ Merkez ile kırsal ayrımı bir kalite yargısı DEĞİL.
               *
               * 6360 sayılı kanunla köyler mahalleye dönüştü; idari olarak
               * eşitler. Gayrimenkul açısından değiller: kırsal mahalle
               * arsa ağırlıklı, farklı imar durumunda ve farklı alıcıya
               * hitap ediyor. Ayrımı göstermezsek ziyaretçi 27 satırlık bir
               * listede hepsini aynı sanır.
               */
              name: 'yerlesimTuru',
              type: 'select',
              label: 'Yerleşim türü',
              index: true,
              options: [...YERLESIM_TURU_SECENEKLERI],
              admin: {
                description:
                  'Kırsal mahalleler (eski köyler) sitede ayrıca işaretlenir. ' +
                  'Emin değilseniz boş bırakın — boş alan rozet göstermez.',
              },
            },
            {
              name: 'ozet',
              type: 'textarea',
              label: 'Kısa tanıtım',
              maxLength: 300,
              admin: {
                description: 'Mahalle listesinde ve kartlarda görünen 1-2 cümle.',
              },
            },
            {
              name: 'oneCikanOzellikler',
              type: 'array',
              label: 'Öne çıkan özellikler',
              labels: { singular: 'Özellik', plural: 'Özellikler' },
              maxRows: 6,
              admin: {
                description:
                  'Mahalleyi tanımlayan 3-6 madde. Örn: "OSB\'ye 10 dakika", "Yoğun öğrenci nüfusu"',
              },
              fields: [{ name: 'metin', type: 'text', label: 'Özellik', required: true }],
            },
            {
              name: 'kapakGorseli',
              type: 'upload',
              relationTo: 'medya',
              label: 'Kapak görseli',
            },
            seoAlanlari,
          ],
        },

        {
          label: 'İçerik',
          description:
            'Bu sekmedeki metin sayfanın "Neden bu mahalle?" bölümünü oluşturur ve ' +
            'sitenin arama motoru performansının en belirleyici parçasıdır. Hedef: en az 800 kelime özgün metin.',
          fields: [
            {
              name: 'icerik',
              type: 'richText',
              label: 'Neden bu mahalle?',
            },
            {
              name: 'sikSorulanlar',
              type: 'array',
              label: 'Sık sorulan sorular',
              labels: { singular: 'Soru', plural: 'Sorular' },
              admin: {
                description:
                  'Google\'da "Sorular ve cevaplar" bloğu olarak görünebilir (FAQPage yapılandırılmış verisi).',
              },
              fields: [
                { name: 'soru', type: 'text', label: 'Soru', required: true },
                { name: 'cevap', type: 'textarea', label: 'Cevap', required: true },
              ],
            },
          ],
        },

        {
          label: 'Rakamlar',
          description:
            '⚠️ Bilmediğin rakamı BOŞ BIRAK. Boş alan arayüzde "veri bekleniyor" olarak ' +
            'gösterilir; uydurma rakam hem itibar hem hukuki risktir. ' +
            '⚠️ BİNLİK AYIRICI KULLANMAYIN: sayı alanı noktayı ondalık ayırıcı sayar, ' +
            '"39.704" yazdığınızda kaydedilen değer 39,704 olur. Doğrusu: 39704.',
          fields: [
            /**
             * ⚠️ ÖLÇEK UYARISI EN ÜSTTE — rakamlardan ÖNCE.
             *
             * Uyarı, doldurulan alanların altında dursaydı kaydet
             * düğmesine giden kişi onu hiç görmezdi. 31 Ağustos 2026'da
             * Alipaşa'nın üç rakamı da bindebir kaydedilmişti ve hata
             * ancak sitede fark edildi.
             */
            {
              name: 'olcekUyarisi',
              type: 'ui',
              admin: { components: { Field: '@/components/panel/OlcekUyarisi#default' } },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ortalamaM2Satis',
                  type: 'number',
                  label: 'Ortalama m² satış (₺/m²)',
                  min: 0,
                  admin: {
                    width: '50%',
                    components: { Field: '@/components/panel/TurkceSayiAlani#default' },
                  },
                },
                {
                  name: 'ortalamaKira',
                  type: 'number',
                  label: 'Ortalama aylık kira (₺/ay)',
                  min: 0,
                  admin: {
                    width: '50%',
                    components: { Field: '@/components/panel/TurkceSayiAlani#default' },
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'kiraCarpani',
                  type: 'number',
                  label: 'Kira çarpanı (yıl)',
                  min: 0,
                  admin: {
                    width: '50%',
                    description: 'Kaç yıllık kira, satış fiyatına eşit.',
                    components: { Field: '@/components/panel/TurkceSayiAlani#default' },
                  },
                },
                {
                  name: 'degisim12Ay',
                  type: 'number',
                  label: '12 aylık değişim (%)',
                  admin: {
                    width: '50%',
                    components: { Field: '@/components/panel/TurkceSayiAlani#default' },
                  },
                },
              ],
            },
            {
              name: 'nufus',
              type: 'number',
              label: 'Nüfus (kişi)',
              min: 0,
              admin: {
                description: 'Resmî kaynaktan (TÜİK/belediye) teyit edilmeden girme.',
                components: { Field: '@/components/panel/TurkceSayiAlani#default' },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'gozlemSayisi',
                  type: 'number',
                  label: 'Gözlem sayısı (n)',
                  min: 0,
                  admin: {
                    components: { Field: '@/components/panel/TurkceSayiAlani#default' },
                    width: '50%',
                    description:
                      'Bu rakamlar kaç gözleme dayanıyor? Sitede her rakamın yanında gösterilir. ' +
                      'n bilinmiyorsa rakamlar da yayınlanmamalıdır.',
                  },
                },
                {
                  name: 'verilerinTarihi',
                  type: 'date',
                  label: 'Veriler hangi tarih itibarıyla',
                  admin: {
                    width: '50%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                  },
                },
              ],
            },
            {
              name: 'veriKaynagi',
              type: 'text',
              label: 'Veri kaynağı',
              admin: {
                description:
                  'Örn: "Kendi gözlem kayıtlarımız", "TÜİK". Sitede kaynak açıkça belirtilir.',
              },
            },
          ],
        },

        {
          label: 'Konum',
          fields: [
            {
              name: 'merkez',
              type: 'point',
              label: 'Mahalle merkezi',
              admin: { description: 'Haritanın odaklanacağı nokta.' },
            },
            {
              name: 'sinir',
              type: 'json',
              label: 'Mahalle sınırı (GeoJSON)',
              admin: {
                description:
                  'OpenStreetMap sınır içe aktarma ekranından tek tıkla doldurulabilir. ' +
                  'Elle çizmek isterseniz geojson.io üzerinde çizip çıktıyı buraya yapıştırın. ' +
                  'Boşsa haritada sınır çizgisi gösterilmez, sadece merkez noktası kullanılır.',
              },
            },

            // ── Sınırın kaynak izi ──────────────────────────────────────
            {
              type: 'collapsible',
              label: 'Sınırın kaynağı',
              admin: { initCollapsed: true },
              fields: [
                {
                  name: 'sinirKaynagi',
                  type: 'select',
                  label: 'Sınır verisinin kaynağı',
                  defaultValue: 'elle',
                  index: true,
                  options: [
                    { value: 'elle', label: 'Elle girildi' },
                    { value: 'osm', label: 'OpenStreetMap' },
                  ],
                  admin: {
                    readOnly: true,
                    description:
                      'İçe aktarma bunu kendisi yazar. OpenStreetMap kaynaklı sınırlar sitede ' +
                      '"© OpenStreetMap katkıcıları" atfıyla gösterilir (ODbL lisansı gereği).',
                  },
                },
                {
                  name: 'sinirOsmKimlik',
                  type: 'text',
                  label: 'Sınırın OSM kimliği',
                  index: true,
                  admin: {
                    readOnly: true,
                    description:
                      'Örn. "relation/123456". Yeniden içe aktarmada aynı sınırı bulmak için.',
                  },
                },
                {
                  /**
                   * ⚠️ POI'deki `elleDuzenlendi` ile AYNI amaç, FARKLI tetik.
                   *
                   * POI kaydında panelden yapılan her düzenleme izi basar;
                   * o kayıtların tek işi OSM'den gelen bilgiyi tutmak.
                   * Mahalle kaydı öyle değil — içeriği, rakamları ve SEO'su
                   * sürekli düzenleniyor. Her düzenlemede iz basılsaydı ilk
                   * metin girişinden sonra sınırlar donar ve OSM'deki
                   * düzeltmeler bir daha hiç gelmezdi.
                   *
                   * Bu yüzden iz yalnızca `sinir` ya da `merkez` GERÇEKTEN
                   * değiştiğinde basılıyor (bkz. `sinirElleDuzenlemeIzi`).
                   */
                  name: 'sinirElleDuzenlendi',
                  type: 'checkbox',
                  label: 'Sınır elle düzeltildi — içe aktarma bu mahalleyi atlar',
                  defaultValue: false,
                  index: true,
                  admin: {
                    description:
                      'Sınırı ya da merkez noktasını elle değiştirdiğinizde otomatik ' +
                      'işaretlenir ve yeniden içe aktarma onu EZMEZ. İşareti kaldırırsanız ' +
                      "sınır tekrar OpenStreetMap'ten güncellenir.",
                  },
                },
              ],
            },
          ],
        },

        {
          label: 'Medya',
          description:
            'Drone ve 360° içerik hazır olana kadar bu alanlar boş kalır; sayfa boş durum tasarımıyla çalışır.',
          fields: [...videoAlanlari('mahalle'), ...turAlanlari('mahalle')],
        },

        {
          label: 'Yatırım skoru',
          description:
            'Altı bileşen 0-100 arası puanlanır; toplam skor ağırlıklı ortalamadır ve ' +
            'kaydettiğinde otomatik hesaplanır. Metodoloji ' +
            '/yatirim-skoru-metodolojisi sayfasında yayınlanır. ' +
            '⚠️ Bileşenlerin en az %70 ağırlığı doldurulmadan skor GÖSTERİLMEZ — ' +
            'yarım veriyle puan vermek, puanı değersizleştirir.',
          fields: [
            {
              name: 'yatirimSkoru',
              type: 'group',
              label: 'Yatırım skoru',
              fields: [
                {
                  name: 'toplam',
                  type: 'number',
                  label: 'Toplam skor (0-100)',
                  min: 0,
                  max: 100,
                  index: true,
                  admin: {
                    readOnly: true,
                    description:
                      'Bileşenlerden otomatik hesaplanır. Yeterli bileşen verisi yoksa boş kalır.',
                  },
                },
                {
                  name: 'hesaplanmaTarihi',
                  type: 'date',
                  label: 'Hesaplanma tarihi',
                  admin: {
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMMM yyyy' },
                    description: 'Skorun yanında "[tarih] itibarıyla" olarak gösterilir.',
                  },
                },

                // ── Bileşen puanları ──
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'fiyatTrendi',
                      type: 'number',
                      label: 'Fiyat artış trendi',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: 'Ağırlık %25. Çorlu ortalamasına göre göreli performans.',
                      },
                    },
                    {
                      name: 'kiraCarpaniPuani',
                      type: 'number',
                      label: 'Kira çarpanı puanı',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: 'Ağırlık %20. DÜŞÜK çarpan YÜKSEK puan alır.',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'sanayiYakinligi',
                      type: 'number',
                      label: 'Sanayi / istihdam yakınlığı',
                      min: 0,
                      max: 100,
                      admin: { width: '50%', description: 'Ağırlık %15.' },
                    },
                    {
                      name: 'ulasim',
                      type: 'number',
                      label: 'Ulaşım erişilebilirliği',
                      min: 0,
                      max: 100,
                      admin: { width: '50%', description: 'Ağırlık %15.' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'sosyalDonati',
                      type: 'number',
                      label: 'Sosyal donatı',
                      min: 0,
                      max: 100,
                      admin: { width: '50%', description: 'Ağırlık %15.' },
                    },
                    {
                      name: 'arzBaskisi',
                      type: 'number',
                      label: 'Arz baskısı',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description: 'Ağırlık %10. ÇOK yeni arz DÜŞÜK puan alır.',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        {
          label: 'Eşleştirme profili',
          description:
            'Mahalle Eşleştirme Testi bu öznitelikleri kullanır. Yatırım skorundaki dört ' +
            'bileşen (yatırım potansiyeli, sanayi yakınlığı, ulaşım, sosyal donatı) oradan ' +
            'otomatik okunur; burada yalnızca testte ek olarak gereken dördü var. ' +
            '⚠️ Başlangıç değeri KONULMADI: "Şeyhsinan ne kadar sakindir?" sorusunun cevabı ' +
            'orayı bilen birinin bilgisidir. Girilmeyen öznitelik hesaba katılmaz; ' +
            'ölçütlerin en az %60 ağırlığı dolmadan o mahalle için uyum yüzdesi ÜRETİLMEZ. ' +
            'Metodoloji /mahalle-eslestirme-metodolojisi sayfasında yayınlanır.',
          fields: [
            {
              name: 'eslestirmeProfili',
              type: 'group',
              label: 'Eşleştirme profili',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'topluTasima',
                      type: 'number',
                      label: 'Toplu taşıma',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description:
                          'Araç kullanmayan biri için otobüs/dolmuş erişimi ve hat sıklığı. ' +
                          '100 = araçsız rahatça yaşanır.',
                      },
                    },
                    {
                      name: 'okulErisimi',
                      type: 'number',
                      label: 'Okul erişimi',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description:
                          'Okul öncesi, ilkokul ve ortaokullara yürüme mesafesi. ' +
                          '100 = çocuk okula yürüyerek gider.',
                      },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'sessizlik',
                      type: 'number',
                      label: 'Sakinlik',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description:
                          'Trafik, gürültü ve yoğunluk. 100 = çok sakin, 0 = ana arter üzerinde. ' +
                          'Bu bir kalite yargısı DEĞİL: kimi sakinlik ister, kimi hareket.',
                      },
                    },
                    {
                      name: 'merkezeYakinlik',
                      type: 'number',
                      label: 'Merkeze yakınlık',
                      min: 0,
                      max: 100,
                      admin: {
                        width: '50%',
                        description:
                          'Çorlu merkezine ve çarşıya yakınlık. 100 = merkezde. ' +
                          'Sakinlikle genellikle ters çalışır; ikisini birlikte düşünün.',
                      },
                    },
                  ],
                },
                {
                  name: 'profilNotu',
                  type: 'textarea',
                  label: 'Profil notu',
                  admin: {
                    description:
                      'Bu puanları neye göre verdiğinizi yazın. Bir ziyaretçi "neden bu mahalle ' +
                      'önerildi?" diye sorduğunda cevabınız hazır olsun.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
