/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ⚠️  DEMO VERİ — YAYINLANMAYACAK
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Bu betik YALNIZCA geliştirme ortamında çalışır ve arayüzü boş olmayan
 * bir veriyle görmek için kullanılır.
 *
 * Buradaki hiçbir rakam gerçek değildir:
 *   • Fiyatlar, kiralar, m² değerleri UYDURMADIR.
 *   • Mahalle rakamları UYDURMADIR.
 *   • EİDS taşınmaz numaraları ve ada/parsel bilgileri UYDURMADIR.
 *
 * Bu yüzden her kayıt başlığında "[DEMO]" öneki taşır ve mahalleler
 * `veriEksik: true` işaretlidir. Üretim veritabanında çalıştırmayın;
 * betik NODE_ENV=production ise kendini durdurur.
 *
 * Gerçek Çorlu verisi Aslıhan tarafından yönetim panelinden girilecektir
 * (bkz. docs/SENDEN-BEKLENENLER.md).
 *
 * Kullanım:  pnpm seed              (ekler)
 *            TEMIZLE=1 pnpm seed    (önce demo kayıtları siler)
 *
 * Not: `payload run` betiğe komut satırı argümanı geçirmez, bu yüzden
 * seçenek ortam değişkeniyle veriliyor.
 * ═══════════════════════════════════════════════════════════════════════
 */

import config from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'

const DEMO_ONEKI = '[DEMO]'

/**
 * `slug` şemada zorunlu olduğu için üretilen tip onu ister; çalışma zamanında
 * `slugAlani` kancası başlıktan otomatik üretiyor. Seed bilerek slug
 * göndermiyor — otomatik üretim de böylece denenmiş oluyor.
 */
function ilanVerisi(veri: Record<string, unknown>) {
  return veri as RequiredDataFromCollectionSlug<'ilanlar'>
}

function mahalleVerisi(veri: Record<string, unknown>) {
  return veri as RequiredDataFromCollectionSlug<'mahalleler'>
}

function sayfaVerisi(veri: Record<string, unknown>) {
  return veri as RequiredDataFromCollectionSlug<'sayfalar'>
}

/** Uzak gelecekte biten yetki: demo ilanlar zamanla yayından düşmesin. */
function eids(no: string) {
  return {
    eidsDurum: 'yetkili' as const,
    tasinmazNo: `DEMO-${no}`,
    ada: '0000',
    parsel: no,
    eidsYetkiBaslangic: '2026-01-01T00:00:00.000Z',
    eidsYetkiBitis: '2030-12-31T00:00:00.000Z',
  }
}

const MAHALLELER = [
  { ad: `${DEMO_ONEKI} Muhittin`, siraNo: 10 },
  { ad: `${DEMO_ONEKI} Şeyhsinan`, siraNo: 20 },
  { ad: `${DEMO_ONEKI} Hıdırağa`, siraNo: 30 },
]

/**
 * ⚠️ Üst düzey `await` bilinçli — `main().catch()` sarmalayıcısı DEĞİL.
 *
 * `payload run`, modül değerlendirmesi bitince süreci sonlandırıyor. Asenkron
 * iş bir fonksiyonun içine saklanırsa modül anında "bitmiş" sayılır ve betik
 * hiçbir şey yazmadan, hata da vermeden sessizce sonlanır.
 */
if (process.env.NODE_ENV === 'production') {
  console.error('✗ Seed betiği üretim ortamında çalıştırılamaz.')
  process.exit(1)
}

try {
  const payload = await getPayload({ config })
  const temizle = process.env.TEMIZLE === '1'

  if (temizle) {
    console.log('Demo kayıtlar siliniyor…')
    await payload.delete({ collection: 'ilanlar', where: { baslik: { like: DEMO_ONEKI } } })
    await payload.delete({ collection: 'mahalleler', where: { ad: { like: DEMO_ONEKI } } })
    await payload.delete({ collection: 'sayfalar', where: { baslik: { like: DEMO_ONEKI } } })
  }

  // ── Mahalleler ────────────────────────────────────────────────────────
  const mahalleIdleri: number[] = []

  for (const mahalle of MAHALLELER) {
    const mevcut = await payload.find({
      collection: 'mahalleler',
      where: { ad: { equals: mahalle.ad } },
      limit: 1,
    })

    if (mevcut.docs[0]) {
      mahalleIdleri.push(mevcut.docs[0].id)
      continue
    }

    const kayit = await payload.create({
      collection: 'mahalleler',
      data: mahalleVerisi({
        ad: mahalle.ad,
        siraNo: mahalle.siraNo,
        yayinda: true,
        // ⚠️ Rakamlar bilinçli olarak BOŞ bırakıldı. Boş durum tasarımının
        // gerçekte nasıl göründüğünü görmek, uydurma rakam görmekten daha
        // değerli — site aylarca bu halde çalışacak.
        veriEksik: true,
        ozet:
          'DEMO KAYIT — gerçek mahalle tanıtımı Aslıhan tarafından girilecek. ' +
          'Bu metin yalnızca arayüzü test etmek içindir.',
      }),
    })

    mahalleIdleri.push(kayit.id)
  }

  console.log(`✓ ${mahalleIdleri.length} demo mahalle hazır`)

  // ── İlanlar ───────────────────────────────────────────────────────────
  const ILANLAR = [
    {
      baslik: `${DEMO_ONEKI} 3+1 daire, asansörlü, otoparklı`,
      tip: 'satilik' as const,
      kategori: 'konut' as const,
      fiyat: 4_800_000,
      tahminiKira: 20_000,
      brutM2: 135,
      netM2: 118,
      odaSayisi: '3+1',
      binaYasi: 7,
      bulunduguKat: '3',
      toplamKat: 8,
      asansor: true,
      krediyeUygun: true,
      oneCikan: true,
      durum: 'yayinda' as const,
    },
    {
      baslik: `${DEMO_ONEKI} 2+1 yatırımlık daire`,
      tip: 'satilik' as const,
      kategori: 'konut' as const,
      fiyat: 3_150_000,
      tahminiKira: 14_500,
      brutM2: 95,
      odaSayisi: '2+1',
      binaYasi: 3,
      oneCikan: true,
      durum: 'yayinda' as const,
    },
    {
      baslik: `${DEMO_ONEKI} Fiyatı görüşmeye açık müstakil ev`,
      tip: 'satilik' as const,
      kategori: 'konut' as const,
      // Fiyat ve kira BİLİNÇLİ olarak yok: "fiyat görüşülür" ve boş
      // gösterge durumlarının nasıl göründüğünü doğrulamak için.
      brutM2: 210,
      odaSayisi: '4+1',
      durum: 'yayinda' as const,
    },
    {
      baslik: `${DEMO_ONEKI} Kiralık 1+1 eşyalı daire`,
      tip: 'kiralik' as const,
      kategori: 'konut' as const,
      fiyat: 12_000,
      brutM2: 55,
      odaSayisi: '1+1',
      esyali: true,
      durum: 'yayinda' as const,
    },
    {
      baslik: `${DEMO_ONEKI} Sanayi bölgesinde kapalı depo`,
      tip: 'kiralik' as const,
      kategori: 'depo' as const,
      fiyat: 185_000,
      brutM2: 2400,
      durum: 'yayinda' as const,
    },
    {
      baslik: `${DEMO_ONEKI} Rezerve edilmiş 3+1`,
      tip: 'satilik' as const,
      kategori: 'konut' as const,
      fiyat: 5_400_000,
      tahminiKira: 22_000,
      brutM2: 145,
      odaSayisi: '3+1',
      durum: 'rezerve' as const,
    },
  ]

  let eklenen = 0

  for (const [sira, ilan] of ILANLAR.entries()) {
    const mevcut = await payload.find({
      collection: 'ilanlar',
      where: { baslik: { equals: ilan.baslik } },
      limit: 1,
    })
    if (mevcut.docs[0]) continue

    await payload.create({
      collection: 'ilanlar',
      data: ilanVerisi({
        ...ilan,
        il: 'Tekirdağ',
        ilce: 'Çorlu',
        mahalle: mahalleIdleri[sira % mahalleIdleri.length]!,
        ...eids(String(1000 + sira)),
        ozet: 'DEMO KAYIT — yayınlanmayacak. Arayüz testi için oluşturulmuştur.',
      }),
    })

    eklenen += 1
  }

  console.log(`✓ ${eklenen} demo ilan eklendi`)

  // ── Hukuki sayfa iskeletleri ──────────────────────────────────────────
  // ⚠️ İÇERİK YAZILMIYOR (CLAUDE.md kural 3). Yalnızca sayfa kayıtları
  // oluşturuluyor ki adresler 404 vermesin ve avukat metni geldiğinde
  // yapıştırılacak yer hazır olsun.
  const HUKUKI = [
    { slug: 'kvkk', baslik: 'KVKK Aydınlatma Metni' },
    { slug: 'gizlilik', baslik: 'Gizlilik Politikası' },
    { slug: 'cerez-politikasi', baslik: 'Çerez Politikası' },
    { slug: 'kullanim-kosullari', baslik: 'Kullanım Koşulları' },
  ]

  let sayfaSayisi = 0

  for (const sayfa of HUKUKI) {
    const mevcut = await payload.find({
      collection: 'sayfalar',
      where: { slug: { equals: sayfa.slug } },
      limit: 1,
    })
    if (mevcut.docs[0]) continue

    await payload.create({
      collection: 'sayfalar',
      data: sayfaVerisi({
        slug: sayfa.slug,
        baslik: sayfa.baslik,
        yayinda: true,
        hukukiMetin: true,
        ozet: 'Bu metnin içeriği hukuk danışmanı tarafından hazırlanacaktır.',
        // `icerik` bilinçli olarak boş: agent hukuki metin yazmaz.
      }),
    })

    sayfaSayisi += 1
  }

  console.log(`✓ ${sayfaSayisi} hukuki sayfa iskeleti oluşturuldu (içerik boş)`)
  console.log('\n⚠️  Bu veriler DEMO amaçlıdır ve yayınlanmamalıdır.')
  console.log('   Silmek için: TEMIZLE=1 pnpm seed\n')

  await payload.destroy?.()
  process.exit(0)
} catch (hata) {
  console.error('Seed başarısız:', hata)
  process.exit(1)
}
