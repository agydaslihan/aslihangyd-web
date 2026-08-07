/**
 * Sosyal medya paylaşım metni ve bağlantısı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OTOMATİK YAYIN YOK.
 *
 * Bu modül metin TASLAĞI üretir. Hiçbir yere gönderilmez, hiçbir hesaba
 * bağlanılmaz. Aslıhan metni okur, düzeltir, kendi hesabından paylaşır.
 *
 * Gerekçe teknik değil: bir gayrimenkul danışmanının hesabından çıkan her
 * cümle onun sözüdür. Makinenin yazdığı bir cümlenin altına imza atmak,
 * yazdığını okumadan imza atmaktır.
 *
 * ⚠️ UYDURMA RAKAM YOK (CLAUDE.md kural 2).
 *
 * Metin yalnızca kayıtta GERÇEKTEN VAR OLAN alanları kullanır. Fiyat
 * girilmemişse "fiyat" cümlesi hiç kurulmaz; "cazip fiyatlı" gibi
 * doldurma ifadeler üretilmez.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface PaylasimGirdisi {
  baslik: string
  slug: string
  tip: 'satilik' | 'kiralik'
  kategori: string
  mahalleAdi: string | null
  fiyat: number | null
  brutM2: number | null
  odaSayisi: string | null
  ozet: string | null
  /** Doğrulanmış ilan rozeti için — taşınmaz numarası. */
  tasinmazNo: string | null
}

export type Mecra = 'instagram' | 'whatsapp' | 'facebook'

export const MECRA_ETIKETLERI: Record<Mecra, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
}

/* ══════════════════════════════════════════════════════════════════════════
   Bağlantı
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * UTM etiketli paylaşım bağlantısı.
 *
 * ⚠️ Etiketler olmadan Instagram'dan gelen ziyaretçi analitikte
 * "yönlendiren yok" görünür (uygulama içi tarayıcılar referrer
 * göndermez) ve paylaşımın işe yarayıp yaramadığı hiç bilinemez.
 */
export function paylasimBaglantisi(
  siteAdresi: string,
  slug: string,
  mecra: Mecra,
  kampanya = 'portfoy',
): string {
  const adres = new URL(`/portfoy/${slug}`, siteAdresi)
  adres.searchParams.set('utm_source', mecra)
  adres.searchParams.set('utm_medium', 'sosyal')
  adres.searchParams.set('utm_campaign', kampanya)
  return adres.toString()
}

/* ══════════════════════════════════════════════════════════════════════════
   Etiketler
   ══════════════════════════════════════════════════════════════════════════ */

/** Her paylaşımda geçen sabit etiketler. */
const TEMEL_ETIKETLER = ['#çorlu', '#tekirdağ', '#gayrimenkul']

const KATEGORI_ETIKETLERI: Record<string, string[]> = {
  konut: ['#konut', '#satılıkdaire'],
  isyeri: ['#işyeri', '#ticarigayrimenkul'],
  arsa: ['#arsa', '#arsayatırımı'],
  depo: ['#depo', '#lojistik'],
  fabrika: ['#fabrika', '#sanayi'],
}

/**
 * Etiket listesi.
 *
 * ⚠️ Sayı bilinçli olarak az (en fazla 8). Instagram 30'a izin veriyor ama
 * alakasız etiket yığını, hesabı emlak spam'i gibi gösterir ve erişimi
 * artırmaz. Etiketler yalnızca kayıtta var olan bilgiden türer.
 */
export function etiketler(girdi: PaylasimGirdisi): string[] {
  const liste = [...TEMEL_ETIKETLER]

  const kategori = KATEGORI_ETIKETLERI[girdi.kategori]
  if (kategori !== undefined) liste.push(...kategori)

  if (girdi.mahalleAdi !== null) {
    // "Şeyhsinan Mahallesi" → "#şeyhsinan"
    const sade = girdi.mahalleAdi
      .replace(/\s*mahallesi\s*/i, '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/\s+/g, '')
    if (sade !== '') liste.push(`#${sade}`)
  }

  if (girdi.tip === 'kiralik') liste.push('#kiralık')

  return [...new Set(liste)].slice(0, 8)
}

/* ══════════════════════════════════════════════════════════════════════════
   Metin
   ══════════════════════════════════════════════════════════════════════════ */

const TL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/**
 * Paylaşım metni taslağı.
 *
 * ⚠️ Yatırım tavsiyesi feragati metnin içinde (CLAUDE.md kural 5): gönderi
 * kopyalanıp başka yere taşındığında feragat de onunla gitsin. Ayrı bir
 * alanda dursaydı ilk kopyalamada düşerdi.
 */
export function paylasimMetni(
  girdi: PaylasimGirdisi,
  siteAdresi: string,
  mecra: Mecra = 'instagram',
): string {
  const satirlar: string[] = []

  const yer = girdi.mahalleAdi === null ? 'Çorlu' : `Çorlu ${girdi.mahalleAdi}`
  satirlar.push(`${yer} — ${girdi.baslik}`)
  satirlar.push('')

  // Rakamlar yalnızca gerçekten varsa yazılır.
  const nitelikler: string[] = []
  if (girdi.odaSayisi !== null) nitelikler.push(girdi.odaSayisi)
  if (girdi.brutM2 !== null) nitelikler.push(`${TL.format(girdi.brutM2)} m²`)
  if (girdi.fiyat !== null) {
    nitelikler.push(`${TL.format(girdi.fiyat)} ₺${girdi.tip === 'kiralik' ? '/ay' : ''}`)
  }
  if (nitelikler.length > 0) satirlar.push(nitelikler.join(' · '))

  if (girdi.ozet !== null && girdi.ozet.trim() !== '') {
    satirlar.push('')
    satirlar.push(girdi.ozet.trim())
  }

  if (girdi.tasinmazNo !== null) {
    satirlar.push('')
    satirlar.push(`Doğrulanmış ilan · Taşınmaz no: ${girdi.tasinmazNo}`)
  }

  satirlar.push('')
  satirlar.push(paylasimBaglantisi(siteAdresi, girdi.slug, mecra))

  satirlar.push('')
  satirlar.push(
    'Bu bilgiler yatırım tavsiyesi niteliğinde değildir. ' +
      'Geçmiş veriler gelecekteki getiriyi garanti etmez.',
  )

  satirlar.push('')
  satirlar.push(etiketler(girdi).join(' '))

  return satirlar.join('\n')
}

/* ══════════════════════════════════════════════════════════════════════════
   Görsel biçimleri
   ══════════════════════════════════════════════════════════════════════════ */

export const GORSEL_BICIMLERI = {
  kare: { genislik: 1080, yukseklik: 1080, etiket: 'Gönderi (1080×1080)' },
  hikaye: { genislik: 1080, yukseklik: 1920, etiket: 'Hikâye (1080×1920)' },
} as const

export type GorselBicimi = keyof typeof GORSEL_BICIMLERI

export function gecerliBicimMi(deger: string): deger is GorselBicimi {
  return deger in GORSEL_BICIMLERI
}
