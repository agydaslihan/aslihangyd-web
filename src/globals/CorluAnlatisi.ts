import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * Çorlu Değer Anlatısı — tüm mahalle sayfalarında ortak bölüm.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HER İDDİANIN KAYNAĞI VAR VE KAYNAK EKRANDA GÖRÜNÜYOR.
 *
 * Bu bir yatırım sitesi. "Çorlu sanayi kenti" cümlesi kulağa masum gelir;
 * o cümleye bakıp taşınmaz alan kişi için masum değildir. Bu yüzden her
 * bloğun en az bir kaynağı olmak zorunda ve kaynak listesi bölümün
 * sonunda yayınlanıyor.
 *
 * ⚠️ KAYNAĞI OLMAYAN CÜMLE YAZILMADI. Araştırmada bulunamayan şeyler
 * bilerek DIŞARIDA bırakıldı; eksik bir bölüm, kaynaksız bir cümleden
 * iyidir. Neyin bulunamadığı ilerleme kaydında yazılı.
 *
 * ⚠️ İKİ KAYNAK ÇELİŞİYORSA İKİSİ DE YAZILIYOR. Çorlu Deri OSB'nin
 * fabrika sayısı ve istihdamı, OSB'nin kendi sitesiyle Çorlu
 * Belediyesi'nin sayfasında farklı. Birini seçip diğerini gizlemek,
 * okuyana olmayan bir kesinlik satmak olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Metin CMS'te düzenlenebilir. Kod içindeki varsayılan, 31 Ağustos
 * 2026'da yapılan araştırmanın çıktısı; Aslıhan güncelleyebilir ama
 * kaynak alanı boş bırakılamaz (alan zorunlu).
 */

const KAYNAK_ALANLARI = [
  { name: 'ad', type: 'text' as const, label: 'Kaynağın adı', required: true },
  {
    name: 'adres',
    type: 'text' as const,
    label: 'Kaynağın adresi',
    required: true,
    admin: { description: 'Tam adres (https://...). Ekranda bağlantı olarak görünür.' },
  },
  {
    name: 'erisim',
    type: 'text' as const,
    label: 'Erişim tarihi',
    admin: { description: 'Örn: 31 Ağustos 2026. Rakam veren kaynaklarda zorunlu sayılır.' },
  },
]

/**
 * Varsayılan içerik — 31 Ağustos 2026 araştırması.
 *
 * ⚠️ Rakamların yılı ve kaynağı metnin İÇİNDE yazılı; kaynak listesi onu
 * tekrar ediyor. Biri silinirse diğeri hâlâ duruyor.
 */
const VARSAYILAN_BLOKLAR = [
  {
    baslik: 'Sanayi ve istihdam',
    metin:
      'Çorlu ilçe sınırları içinde üç sanayi alanı bulunuyor: Çorlu 1 Organize Sanayi Bölgesi, ' +
      'Çorlu Deri Karma Organize Sanayi Bölgesi ve Avrupa Serbest Bölgesi.\n\n' +
      'Çorlu 1 OSB, kendi verisine göre yaklaşık 382 hektar alanda (net sanayi alanı 255 hektar) ' +
      'kurulu; 41 firma faaliyet gösteriyor ve 4.800 kişi çalışıyor. Sektörler: tekstil, gıda, ' +
      'plastik, yapı kimyasalı, inşaat boyası, matbaa-ambalaj, metal, oluklu mukavva, madeni ' +
      'eşya, makine imalatı ve kablo.\n\n' +
      'Çorlu Deri OSB için iki resmî kaynak farklı rakam veriyor ve ikisi de burada yazılıyor. ' +
      'OSB’nin kendi sitesi: 130 hektar, 118 fabrika, yaklaşık 10.000 kişi istihdam, Türkiye ' +
      'deri üretiminin %37’si. Çorlu Belediyesi’nin sanayi sayfası: 130 hektar, 106 deri ' +
      'fabrikası, bunlardan 45’i aktif, 1.750 kişi istihdam ve üç atık su arıtma tesisi ' +
      '(3.000, 4.500 ve 36.000 m³/gün).\n\n' +
      'Çorlu Belediyesi’ne göre sanayi belirli koridorlarda yoğunlaşıyor: Çorlu–Çerkezköy yolu ' +
      'üzerinde tekstil, boyama, kablo, meşrubat ve kazan fabrikaları; Çorlu–Tekirdağ yolu ' +
      '(Karatepe bölgesi) üzerinde taş ocakları ve ayçiçek yağı fabrikaları; Türkgücü Köyü yolu ' +
      'üzerinde tekstil fabrikaları.\n\n' +
      'Çorlu Belediyesi’nin aynı sayfasına göre ilçede Ticaret ve Sanayi Odası’na kayıtlı 5.030 ' +
      'üye bulunuyor.\n\n' +
      'Not: Velimeşe OSB ile Ergene 1 ve Ergene 2 OSB, Çorlu Ticaret ve Sanayi Odası’nın ' +
      'listesinde Ergene ilçesi altında yer alıyor; Çorlu ilçe sınırları içinde değil.',
    kaynaklar: [
      {
        ad: 'Çorlu 1 Organize Sanayi Bölgesi — Bölgemiz',
        adres: 'https://www.corlu1osb.org.tr/tr/kurumsal/bolgemiz/',
        erisim: '31 Ağustos 2026',
      },
      {
        ad: 'Çorlu Deri Karma Organize Sanayi Bölgesi — Hakkımızda',
        adres: 'https://www.corluderiosb.org.tr/hakkimizda',
        erisim: '31 Ağustos 2026',
      },
      {
        ad: 'Çorlu Belediyesi — Sanayi',
        adres: 'https://www.corlu.bel.tr/idet/72/261/sanayi',
        erisim: '31 Ağustos 2026',
      },
      {
        ad: 'Çorlu Ticaret ve Sanayi Odası — Organize Sanayi Bölgeleri',
        adres: 'https://www.corlutso.org.tr/content-345-organize_sanayi_bolgeleri.html',
        erisim: '31 Ağustos 2026',
      },
    ],
  },
  {
    baslik: 'Ulaşım',
    metin:
      'Halkalı–Kapıkule Hızlı Tren Projesi üç etaptan oluşuyor: Kapıkule–Çerkezköy (153 km), ' +
      'Çerkezköy–Ispartakule ve Ispartakule–Halkalı. Ulaştırma ve Altyapı Bakanı’nın 31 Ocak ' +
      '2025 tarihli açıklamasına göre Kapıkule–Çerkezköy etabında %95 fiziki ilerleme ' +
      'sağlanmış durumda. Hat tamamlandığında Halkalı–Kapıkule arası yolcu seyahat süresinin ' +
      '4 saatten 1,5 saate, yük taşıma süresinin 8,5 saatten 3,5 saate düşmesi hedefleniyor.\n\n' +
      '⚠️ Bu projenin istasyonları arasında Çorlu, incelediğimiz resmî açıklamalarda ' +
      'geçmiyor. Çorlu’da hızlı tren istasyonu olacağına dair bir kaynak bulunamadığı için ' +
      'böyle bir iddiada bulunmuyoruz.\n\n' +
      'Çorlu’da Devlet Hava Meydanları İşletmesi’ne (DHMİ) bağlı Tekirdağ Çorlu Atatürk ' +
      'Havalimanı bulunuyor. Havalimanının güncel tarifeli sefer durumu için DHMİ’nin uçuş ' +
      'bilgileri sayfasına bakılmalıdır; bu sayfada sefer bilgisi yayınlanmadığı için burada ' +
      'sefer iddiasında bulunmuyoruz.',
    kaynaklar: [
      {
        ad: 'Anadolu Ajansı — Halkalı-Kapıkule Hızlı Tren Projesi açıklaması (31 Ocak 2025)',
        adres:
          'https://www.aa.com.tr/tr/gundem/bakan-uraloglu-halkali-kapikule-hizli-tren-projesinin-kapikule-cerkezkoy-etabinda-yuzde-95-fiziki-ilerleme-sagladik/3467770',
        erisim: '31 Ağustos 2026',
      },
      {
        ad: 'DHMİ — Tekirdağ Çorlu Atatürk Havalimanı',
        adres: 'https://dhmi.gov.tr/Sayfalar/Havalimani/Corlu/AnaSayfa.aspx',
        erisim: '31 Ağustos 2026',
      },
    ],
  },
  {
    baslik: 'Eğitim ve sağlık',
    metin:
      'Tekirdağ Namık Kemal Üniversitesi’nin Çorlu Mühendislik Fakültesi Çorlu’da bulunuyor ve ' +
      'dokuz bölümü var: bilgisayar, biyomedikal, çevre, elektrik-elektronik, elektronik ve ' +
      'haberleşme, endüstri, inşaat, makine ve tekstil mühendisliği.\n\n' +
      'Çorlu’da Sağlık Bakanlığı’na bağlı Çorlu Devlet Hastanesi hizmet veriyor. Hastanenin ' +
      'yatak kapasitesi kurumun kendi sayfasında yayınlanmadığı için burada rakam ' +
      'vermiyoruz.',
    kaynaklar: [
      {
        ad: 'Tekirdağ Namık Kemal Üniversitesi — Çorlu Mühendislik Fakültesi',
        adres: 'https://cmf.nku.edu.tr/',
        erisim: '31 Ağustos 2026',
      },
      {
        ad: 'T.C. Sağlık Bakanlığı — Çorlu Devlet Hastanesi',
        adres: 'https://corludh.saglik.gov.tr/',
        erisim: '31 Ağustos 2026',
      },
    ],
  },
  {
    baslik: 'Nüfus ve büyüme',
    metin:
      'TÜİK Adrese Dayalı Nüfus Kayıt Sistemi’nin 2025 sonuçlarına göre Çorlu’nun nüfusu ' +
      '306.939 kişi. Bir önceki yıl 300.296 kişiydi.\n\n' +
      'Aynı verilere göre Tekirdağ’ın toplam nüfusu 1.208.441 kişi; Çorlu, ilin en kalabalık ' +
      'ilçesi ve il nüfusunun yaklaşık dörtte birini barındırıyor.',
    kaynaklar: [
      {
        ad: 'TÜİK ADNKS 2025 sonuçları — Tekirdağ ve ilçe nüfusları (haber)',
        adres:
          'https://tekirdagyenihaber.com/2026/02/09/tekirdagin-nufusu-1-milyon-208-bin-441-kisi-oldu/',
        erisim: '31 Ağustos 2026',
      },
    ],
  },
]

export const CorluAnlatisi: GlobalConfig = {
  slug: 'corlu-anlatisi',
  label: 'Çorlu Değer Anlatısı',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: her mahalle sayfasında görünen ortak metin.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      '⚠️ HER İDDİANIN KAYNAĞI ZORUNLU. Bu bölüm tüm mahalle sayfalarında görünüyor ve ' +
      'burası bir yatırım sitesi. Kaynağı olmayan cümle yazmayın; emin olmadığınız şeyi ' +
      'atlayın. "Muhtemelen", "genelde", "bilinir" gibi ifadeler kullanmayın — bir rakam ' +
      'veriyorsanız yılını ve kaynağını yazın.',
  },

  fields: [
    {
      name: 'acik',
      type: 'checkbox',
      label: 'Bölüm yayında',
      defaultValue: true,
      admin: {
        description: 'Kapatılırsa mahalle sayfalarında bu bölüm hiç çizilmez.',
      },
    },
    {
      name: 'baslik',
      type: 'text',
      label: 'Bölüm başlığı',
      defaultValue: 'Çorlu neden değerli?',
    },
    {
      name: 'giris',
      type: 'textarea',
      label: 'Giriş metni',
      defaultValue:
        'Aşağıdaki bilgiler Çorlu’nun tamamı için geçerlidir ve resmî kaynaklara dayanır. ' +
        'Her başlığın altında kullandığımız kaynaklar listelenmiştir.',
    },
    {
      name: 'bloklar',
      type: 'array',
      label: 'Başlıklar',
      labels: { singular: 'Başlık', plural: 'Başlıklar' },
      defaultValue: VARSAYILAN_BLOKLAR,
      admin: {
        description:
          '⚠️ Her başlığın en az bir kaynağı olmalı. Kaynaksız bir başlık sitede ' +
          'GÖSTERİLMEZ — kod seviyesinde engellenir.',
      },
      fields: [
        { name: 'baslik', type: 'text', label: 'Başlık', required: true },
        {
          name: 'metin',
          type: 'textarea',
          label: 'Metin',
          required: true,
          admin: { description: 'Paragrafları boş satırla ayırın.' },
        },
        {
          name: 'kaynaklar',
          type: 'array',
          label: 'Kaynaklar',
          labels: { singular: 'Kaynak', plural: 'Kaynaklar' },
          minRows: 1,
          required: true,
          fields: KAYNAK_ALANLARI,
        },
      ],
    },
  ],
}
