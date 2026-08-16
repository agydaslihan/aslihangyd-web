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
import { demoGorselUret, demoGorselVaryant } from './demo-gorsel.ts'
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
/**
 * ⚠️ YALNIZCA GELİŞTİRME. Beyaz liste, kara liste değil.
 *
 * Önceki sürüm yalnızca `NODE_ENV === 'production'` ise duruyordu.
 * `NODE_ENV` tanımsızsa — ki kabuktan elle çalıştırırken en yaygın durum
 * budur — betik çalışıyordu. Üretim veritabanına bağlı bir kabukta
 * `pnpm seed` yazmak, siteye "[DEMO]" kayıtlar basmak demekti.
 *
 * Artık ortamın açıkça `development` olması gerekiyor.
 */
if (process.env.NODE_ENV !== 'development') {
  console.error(
    `✗ Seed betiği yalnızca NODE_ENV=development ile çalışır (şu an: ${
      process.env.NODE_ENV ?? 'tanımsız'
    }).`,
  )
  console.error('  Bilerek çalıştırıyorsan: NODE_ENV=development pnpm seed')
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
    /**
     * ⚠️ Hero slaytları görsellerden ÖNCE boşaltılıyor.
     *
     * Slaytlar demo görsellere bağlı; görsel önce silinirse ilişki kırık
     * kalır ve ana sayfa görselsiz bir slayt çizmeye çalışır. Global
     * silinemediği için içi boşaltılıyor.
     */
    await payload.updateGlobal({ slug: 'hero-slider', data: { slaytlar: [] } })

    // ⚠️ Görseller en sona: ilan ve mahalle kayıtları onlara bağlı, önce
    // silinirse ilişki kırılır ve Payload hata verir.
    await payload.delete({ collection: 'medya', where: { alt: { like: DEMO_ONEKI } } })
  }

  /**
   * ── Demo görselleri ──────────────────────────────────────────────────
   *
   * ⚠️ ÖLÇÜMÜN DÜRÜSTLÜĞÜ İÇİN VAR.
   *
   * Görselsiz bir siteyi ölçmek sahte güvenlik veriyordu: LCP öğesi bir
   * metin bloğuydu ve gerçek hero fotoğrafı girdiğinde o rakam anlamını
   * yitirecekti. Buradaki görseller sentetik ama TEMSİLİ boyutta —
   * ziyaretçiye inecek AVIF, hero için ~80 kB, kart için ~30 kB.
   *
   * Gerçek fotoğraf kullanılmıyor: telif riski ve "bu bizim çekimimiz"
   * izlenimi. Her kayıt "ÖRNEK VERİ — YAYINLANMAYACAK" etiketli.
   */
  console.log('Demo görselleri üretiliyor (birkaç saniye sürer)…')

  // ⚠️ Hedefler bütçenin biraz ALTINDA: üretici hedefe yukarıdan yaklaşıyor
  // ve tam bütçeyi hedeflersek demo içeriğin kendisi "bütçe aşıldı" gösterir.
  const heroAyari = await demoGorselUret(2400, 1000, 101, 72 * 1024, 828)
  const kartAyari = await demoGorselUret(1200, 750, 202, 26 * 1024, 480)
  console.log(
    `  hero  ~${(heroAyari.avifBayt / 1024).toFixed(0)} kB AVIF · ` +
      `kart ~${(kartAyari.avifBayt / 1024).toFixed(0)} kB AVIF`,
  )

  async function gorselYukle(
    tur: 'hero' | 'kart',
    tohum: number,
    aciklama: string,
  ): Promise<number> {
    const ayar = tur === 'hero' ? heroAyari : kartAyari
    const [g, y] = tur === 'hero' ? ([2400, 1000] as const) : ([1200, 750] as const)
    // ⚠️ Her kayda AYRI dosya: aynı görseli paylaştırmak tarayıcı
    // önbelleğine takılır ve sayfayı olduğundan hafif gösterirdi.
    const jpeg = await demoGorselVaryant(g, y, tohum, ayar.gurultu)
    const kayit = await payload.create({
      collection: 'medya',
      data: {
        // ⚠️ Açıklama zaten ön ek taşıyor olabilir (ilan başlıkları taşıyor);
        // iki kez yazmak "[DEMO] [DEMO] …" üretiyordu.
        alt: aciklama.startsWith(DEMO_ONEKI) ? aciklama : `${DEMO_ONEKI} ${aciklama}`,
        kullanim: tur,
        kaynak: 'ÖRNEK VERİ — YAYINLANMAYACAK. Sentetik olarak üretildi.',
      },
      file: {
        data: jpeg,
        mimetype: 'image/jpeg',
        name: `demo-${tur}-${tohum}.jpg`,
        size: jpeg.length,
      },
    })
    return kayit.id
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

    const kapakId = await gorselYukle(
      'hero',
      300 + mahalle.siraNo,
      `${mahalle.ad} Mahallesi kapak görseli`,
    )

    const kayit = await payload.create({
      collection: 'mahalleler',
      data: mahalleVerisi({
        ad: mahalle.ad,
        siraNo: mahalle.siraNo,
        kapakGorseli: kapakId,
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

    // İlk fotoğraf kapak; galeri ölçümü için ikinci bir görsel de var.
    const ilanGorselleri = [
      { gorsel: await gorselYukle('hero', 400 + sira, `${ilan.baslik} kapak fotoğrafı`) },
      { gorsel: await gorselYukle('kart', 500 + sira, `${ilan.baslik} iç mekân fotoğrafı`) },
    ]

    await payload.create({
      collection: 'ilanlar',
      data: ilanVerisi({
        ...ilan,
        gorseller: ilanGorselleri,
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

  /* ── Hero slaytları ─────────────────────────────────────────────────── */

  /**
   * ⚠️ TOHUMA SLAYT EKLEMENİN SEBEBİ ÖLÇÜM.
   *
   * Hero slider sayfanın LCP öğesi ama slayt YOKKEN hiç render edilmiyor —
   * yani boş bir veritabanında Lighthouse slider'ı hiç ölçmez ve "LCP
   * bozulmadı" demek ölçülmemiş bir iddia olurdu.
   *
   * Tohum iki slayt basıyor: birincisi LCP öğesi, ikincisi tembel. CI'daki
   * Lighthouse koşumu böylece gerçek slider'lı sayfayı ölçüyor.
   *
   * ⚠️ Otomatik geçiş KAPALI bırakıldı — üretimdeki varsayılanla aynı.
   * Açık tohumlamak, ölçtüğümüz sayfayı gerçekte yayınlanacak sayfadan
   * farklı kılardı.
   */
  await payload.updateGlobal({
    slug: 'hero-slider',
    data: {
      slaytlar: [
        {
          gorsel: await gorselYukle('hero', 900, 'Çorlu genel görünüm'),
          baslik: 'Çorlu’da kararı rakam verir',
          altBaslik:
            'Mahalle verileri, kira çarpanı ve yatırım skoruyla veriye dayalı karar desteği.',
          butonMetni: 'Değerleme isteyin',
          butonLink: '/degerleme',
          metinHizasi: 'sol',
          overlayKoyulugu: 45,
          aktif: true,
        },
        {
          gorsel: await gorselYukle('hero', 901, 'Çorlu sanayi bölgesi'),
          baslik: 'Ticari ve sanayi portföyü',
          altBaslik: 'OSB yakınlığı ve ulaşım bağlantılarıyla değerlenen alanlar.',
          butonMetni: 'Ticari portföy',
          butonLink: '/ticari',
          metinHizasi: 'orta',
          overlayKoyulugu: 55,
          aktif: true,
        },
      ],
      otomatikGecis: false,
      gecisSuresi: 7,
    },
  })

  console.log('✓ 2 hero slaydı yazıldı (LCP ölçümü için)')
  console.log('\n⚠️  Bu veriler DEMO amaçlıdır ve yayınlanmamalıdır.')
  console.log('   Silmek için: TEMIZLE=1 pnpm seed\n')

  await payload.destroy?.()
  process.exit(0)
} catch (hata) {
  console.error('Seed başarısız:', hata)
  process.exit(1)
}
