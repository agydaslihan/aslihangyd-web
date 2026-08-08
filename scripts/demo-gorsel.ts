import sharp from 'sharp'

/**
 * Ölçüm için temsili demo görselleri üretir.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ NEDEN VAR: GÖRSELSİZ ÖLÇÜM SAHTE GÜVENLİK VERİYOR.
 *
 * Lighthouse ölçümü bugüne kadar hiç görseli olmayan bir siteyi ölçtü.
 * LCP öğesi bir metin bloğuydu; gerçek hero fotoğrafı girdiğinde LCP öğesi
 * değişecek ve o rakamlar anlamını yitirecek. "Mobil LCP 3,0 sn" demek,
 * ölçülen sayfa yayına girecek sayfa değilse bir şey söylemiyor.
 *
 * ⚠️ NEDEN GERÇEK FOTOĞRAF KULLANILMIYOR.
 *
 * CLAUDE.md: uydurma veri yasak. İnternetten alınmış bir Çorlu fotoğrafı
 * hem telif riski hem de "bu bizim çekimimiz" izlenimi yaratır. Burada
 * üretilen görseller belirgin biçimde sentetik ve her biri
 * "ÖRNEK VERİ — YAYINLANMAYACAK" etiketiyle kaydediliyor.
 *
 * ⚠️ DÜZ GRADYAN İŞE YARAMAZ.
 *
 * İlk denemede düz bir renk geçişi ürettim: AVIF onu 2 kB'a sıkıştırdı,
 * yani ölçüm gerçek bir fotoğrafın maliyetini hiç yansıtmadı. Fotoğraflar
 * yüksek entropili; sıkıştırıcıyı zorlayan şey gürültü. Bu yüzden çok
 * katmanlı deterministik gürültü üretilip hafifçe bulanıklaştırılıyor —
 * hem doğal fotoğraf istatistiğine yaklaşıyor hem de sıkıştırma davranışı
 * gerçekçi oluyor.
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * ⚠️ GÜRÜLTÜ ÇÖZÜNÜRLÜKTEN BAĞIMSIZ ÜRETİLİYOR — ölçüm buna bağlı.
 *
 * İlk sürüm gürültüyü piksel başına üretiyordu. Sonuç: 828 px'te 80 kB
 * hedefini tutturan görsel, 1920 px'te 616 kB'a çıktı (bütçe 200 kB).
 * Sebep, piksel sayısı arttıkça entropinin orantılı büyümesi.
 *
 * Gerçek fotoğraflar böyle davranmaz: detay içeriğe bağlıdır, çözünürlüğe
 * değil. Aynı fotoğrafın 1920 px hâli 828 px hâlinin kabaca 2,5 katı eder,
 * 7,5 katı değil. Ölçümü gerçekçi kılmak için gürültü sabit bir taban
 * çözünürlükte üretilip yukarı ölçekleniyor — böylece komşu pikseller
 * ilişkili oluyor, tıpkı optik bir görüntüde olduğu gibi.
 */
const TABAN_GENISLIK = 640

/** Deterministik sözde rastgele üreteç — aynı tohum, aynı görsel. */
function uretec(tohum: number): () => number {
  let durum = tohum >>> 0
  return () => {
    durum = (durum * 1664525 + 1013904223) >>> 0
    return durum / 0xffffffff
  }
}

/**
 * Fotoğraf benzeri ham piksel verisi.
 *
 * Üç katman: geniş renk geçişi (manzara), orta ölçekli lekeler (araziyi
 * andıran yapı), ince gürültü (doku). `gurultu` katsayısı entropi
 * miktarını — dolayısıyla sıkıştırılmış boyutu — belirliyor.
 */
function pikseller(genislik: number, yukseklik: number, tohum: number, gurultu: number): Buffer {
  const rastgele = uretec(tohum)
  const veri = Buffer.allocUnsafe(genislik * yukseklik * 3)

  // Orta ölçekli leke ızgarası — her karesi kendi renk sapmasını taşıyor.
  const kareBoyu = 24
  const sutun = Math.ceil(genislik / kareBoyu) + 1
  const satir = Math.ceil(yukseklik / kareBoyu) + 1
  const lekeler = Array.from({ length: sutun * satir }, () => rastgele() * 2 - 1)

  let i = 0
  for (let y = 0; y < yukseklik; y++) {
    for (let x = 0; x < genislik; x++) {
      const dikeyOran = y / yukseklik
      const yatayOran = x / genislik

      // Gökyüzünden zemine doğru bir geçiş — lacivertten toprak tonuna.
      const temelR = 40 + dikeyOran * 120 + yatayOran * 20
      const temelG = 60 + dikeyOran * 95
      const temelB = 95 - dikeyOran * 35

      const leke = lekeler[Math.floor(y / kareBoyu) * sutun + Math.floor(x / kareBoyu)] ?? 0
      const lekeEtkisi = leke * 28

      const ince = (rastgele() * 2 - 1) * gurultu

      veri[i++] = Math.max(0, Math.min(255, temelR + lekeEtkisi + ince))
      veri[i++] = Math.max(0, Math.min(255, temelG + lekeEtkisi + ince))
      veri[i++] = Math.max(0, Math.min(255, temelB + lekeEtkisi * 0.6 + ince))
    }
  }
  return veri
}

/**
 * Taban çözünürlükte üretip hedef boyuta ölçekler.
 *
 * Ölçekleme sırasında `kernel: 'cubic'` kullanılıyor: keskin bir yükseltme
 * (nearest) piksel basamakları bırakır ve sıkıştırıcı onları yüksek
 * frekanslı detay sanıp gereksiz bayt harcar. Kübik yükseltme, gerçek bir
 * fotoğrafın yumuşak geçişlerine daha yakın.
 */
async function jpegUret(
  genislik: number,
  yukseklik: number,
  tohum: number,
  gurultu: number,
): Promise<Buffer> {
  const oran = yukseklik / genislik
  const tabanG = Math.min(TABAN_GENISLIK, genislik)
  const tabanY = Math.max(1, Math.round(tabanG * oran))
  const ham = pikseller(tabanG, tabanY, tohum, gurultu)

  return sharp(ham, { raw: { width: tabanG, height: tabanY, channels: 3 } })
    .resize(genislik, yukseklik, { kernel: 'cubic' })
    .jpeg({ quality: 92 })
    .toBuffer()
}

/**
 * Hedef bayta ayarlanmış demo görsel üretir.
 *
 * ⚠️ Hedef, YÜKLENEN dosyanın değil `next/image`in üreteceği AVIF'in
 * boyutu — ziyaretçinin gerçekten indireceği bayt bu. Gürültü katsayısı
 * ikili arama ile hedefe yaklaştırılıyor; entropi ile sıkıştırılmış boyut
 * arasındaki ilişki doğrusal değil, formülle kestirilemez.
 */
export async function demoGorselUret(
  genislik: number,
  yukseklik: number,
  tohum: number,
  hedefAvifBayt: number,
  olcumGenisligi = 828,
): Promise<{ jpeg: Buffer; avifBayt: number; gurultu: number }> {
  let alt = 0
  let ust = 90
  let enIyi: { jpeg: Buffer; avifBayt: number; gurultu: number } | null = null

  // On tur, hedefin %8'ine girince duruyor. Tam isabet gerekmiyor;
  // amaç gerçekçi bir büyüklük mertebesi.
  for (let tur = 0; tur < 10; tur++) {
    const gurultu = (alt + ust) / 2
    const jpeg = await jpegUret(genislik, yukseklik, tohum, gurultu)

    const avif = await sharp(jpeg)
      .resize({ width: Math.min(olcumGenisligi, genislik), withoutEnlargement: true })
      .avif({ quality: 75 })
      .toBuffer()

    if (
      enIyi === null ||
      Math.abs(avif.length - hedefAvifBayt) < Math.abs(enIyi.avifBayt - hedefAvifBayt)
    ) {
      enIyi = { jpeg, avifBayt: avif.length, gurultu }
    }
    if (Math.abs(avif.length - hedefAvifBayt) < hedefAvifBayt * 0.08) break

    if (avif.length > hedefAvifBayt) ust = gurultu
    else alt = gurultu
  }

  return enIyi!
}

/**
 * Bilinen bir gürültü katsayısıyla tek geçişte görsel üretir.
 *
 * ⚠️ Her kayda AYRI görsel gerekiyor.
 *
 * Aynı dosyayı üç mahalle kartında paylaştırmak ölçümü bozardı: tarayıcı
 * ikinci ve üçüncü kartta ağa hiç çıkmaz, sayfa olduğundan hafif görünür.
 * Ama ikili aramayı her görsel için tekrarlamak da pahalı (~8 sn). Bu
 * yüzden arama bir kez `demoGorselUret` ile yapılıp bulunan katsayı
 * buraya aktarılıyor; tohum değişince içerik değişiyor, boyut aynı
 * mertebede kalıyor.
 */
export async function demoGorselVaryant(
  genislik: number,
  yukseklik: number,
  tohum: number,
  gurultu: number,
): Promise<Buffer> {
  return jpegUret(genislik, yukseklik, tohum, gurultu)
}
