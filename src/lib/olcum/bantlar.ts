/**
 * Ölçüm bantları — HAM DEĞER YERİNE KOVA.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYANIN VARLIK SEBEBİ TEK BİR CÜMLE: ham sayı ayırt eder, bant
 *    etmez.
 *
 * "Ekran 2560×1440", "oturumda 7 sayfa gezildi", "yolu şuydu" gibi
 * değerler tek başlarına masum görünüyor. Birleştiklerinde değiller:
 * çözünürlük + tarayıcı + saat + gezinme sırası, literatürde tarayıcı
 * parmak izi diye geçen şeyin ta kendisi. Aynı gün aynı siteye giren iki
 * kişiyi ayırmaya yeter.
 *
 * Bu yüzden istemciden çıkan her sayı önce bir kovaya düşüyor. Kova sayısı
 * bilinçli olarak AZ: beş çözünürlük bandı, dört derinlik bandı. Az kova,
 * az ayırt edicilik.
 *
 * ⚠️ Bu dosya `tipler.ts` içine konmadı. Orası istemciye inen ortak dosya
 * ve `FiltrePaneli` gibi ölçümle ilgisi olmayan bileşenler onu içe
 * aktarıyor; buradaki kod yalnızca `OlayIzleyici` ile birlikte, yani
 * YALNIZCA ANALİTİK ONAYI VARSA inmeli.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Ekran genişliği bandı.
 *
 * ⚠️ Sınırlar tasarım sisteminin kırılma noktalarıyla AYNI (`sm` 640,
 * `lg` 1024, `xl` 1280, `2xl` 1536 civarı). Rapor "hangi cihazda nasıl
 * görünüyor" sorusuna cevap verecekse, bantların düzenin gerçekten
 * değiştiği yerlerden geçmesi gerekiyor — yuvarlak sayılar güzel durur
 * ama hiçbir şey anlatmaz.
 */
/**
 * ⚠️ ETİKETLERDE `<` VE `+` YOK — ve bu bir süs kararı değil.
 *
 * Olay ucu (`/api/olcum/olay`) ayrıntı alanını harf/rakam/tire/nokta/eğik
 * çizgi ile sınırlıyor: arama kutusuna yazılan bir cümlenin oraya
 * sızmasını YAPISAL olarak engelliyor. `<640` ve `1920+` bu süzgeçten
 * geçemez ve olay sessizce düşerdi — panelde "veri yok" görünür, sebebi
 * hiçbir yerde yazmazdı.
 *
 * Bu sınıf bir arıza bu projede daha önce yaşandı; burada kaydetmeden
 * önce yakalandı.
 */
export const EKRAN_BANTLARI = ['0-639', '640-1023', '1024-1439', '1440-1919', '1920-ustu'] as const

export type EkranBandi = (typeof EKRAN_BANTLARI)[number]

export function ekranBandi(genislik: number): EkranBandi {
  if (!Number.isFinite(genislik) || genislik <= 0) return '0-639'
  if (genislik < 640) return '0-639'
  if (genislik < 1024) return '640-1023'
  if (genislik < 1440) return '1024-1439'
  if (genislik < 1920) return '1440-1919'
  return '1920-ustu'
}

/**
 * Oturum derinliği bandı — bir sekmede kaç sayfa gezildi.
 *
 * ⚠️ "1" BANDI HEMEN ÇIKMA (bounce) ORANININ KENDİSİ. Ayrı bir bounce
 * sayacı tutulmuyor: tek sayfalık oturumların payı zaten bu bant.
 * İki ayrı sayaç tutmak, ikisinin birbirini tutmadığı bir gün üretirdi.
 */
export const DERINLIK_BANTLARI = ['1', '2-3', '4-6', '7-ustu'] as const

export type DerinlikBandi = (typeof DERINLIK_BANTLARI)[number]

export function derinlikBandi(sayfaSayisi: number): DerinlikBandi {
  if (!Number.isFinite(sayfaSayisi) || sayfaSayisi <= 1) return '1'
  if (sayfaSayisi <= 3) return '2-3'
  if (sayfaSayisi <= 6) return '4-6'
  return '7-ustu'
}

/**
 * Bandın ortalama hesabında kullanılacak temsilci değeri.
 *
 * ⚠️ ORTALAMA YAKLAŞIKTIR VE PANELDE ÖYLE YAZIYOR. Ham sayı saklanmadığı
 * için gerçek ortalama hesaplanamaz; bant ortası kullanılıyor. "7+" için
 * 8 seçildi — üst sınır olmadığı için gerçek ortalama bundan büyük
 * olabilir, yani tahmin ihtiyatlı tarafta.
 */
export const DERINLIK_TEMSILCISI: Record<DerinlikBandi, number> = {
  '1': 1,
  '2-3': 2.5,
  '4-6': 5,
  '7-ustu': 8,
}

/** Panelde görünen hâli — kablo değeri ile ekran metni ayrı. */
export const DERINLIK_ETIKETI: Record<DerinlikBandi, string> = {
  '1': '1 sayfa',
  '2-3': '2–3 sayfa',
  '4-6': '4–6 sayfa',
  '7-ustu': '7 ve üzeri',
}

export const EKRAN_ETIKETI: Record<(typeof EKRAN_BANTLARI)[number], string> = {
  '0-639': '640 px altı',
  '640-1023': '640–1023 px',
  '1024-1439': '1024–1439 px',
  '1440-1919': '1440–1919 px',
  '1920-ustu': '1920 px ve üzeri',
}

/**
 * Sayfa yolu dizisi — en fazla üç adım.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR ZİYARETÇİ İZİ DEĞİL, BİR DİZİ SAYACI. Talimat da bunu
 *    söylüyor: "tek ziyaretçi izi DEĞİL, en sık görülen 10 yol dizisi".
 *
 * Sunucuya giden şey `"/ > /portfoy > /portfoy/[slug]"` gibi bir DİZGE ve
 * karşılığında bir sayaç artıyor. Kim olduğu, ne zaman geldiği, kaç kez
 * geldiği bilgisi yok; aynı diziyi yüz kişi yürüse sayaç yüz olur ve yüz
 * kişiden hiçbiri ayırt edilemez.
 *
 * ⚠️ ÜÇ ADIM SINIRI KEYFİ DEĞİL. Dizi uzadıkça olası kombinasyon sayısı
 * çarpım hızıyla artıyor; yeterince uzun bir dizi, tek bir ziyarete ait
 * olacak kadar seyrek hâle gelir ve o noktada "toplulaştırılmış" olmaktan
 * çıkar. Üç adım, sorulan soruyu ("hangi sıra ile geziliyor") cevaplarken
 * seyrekleşmeyen en uzun dizi.
 *
 * ⚠️ Rapor tarafında ayrıca k-anonimlik eşiği var: tek kez görülen diziler
 * listelenmiyor (`rapor.ts`, `ASGARI_YOL`).
 * ─────────────────────────────────────────────────────────────────────────
 */
export const YOL_ADIM_SINIRI = 3

/**
 * ⚠️ AYIRICI `>` VE BOŞLUKSUZ.
 *
 * Olay ucu ayrıntıda boşluğa izin vermiyor (cümle sızmasın diye) ve 40
 * karakterle sınırlı. Boşluklu bir ayırıcı olayı sessizce düşürürdü.
 */
export const YOL_AYIRICI = '>'

/**
 * Bir rotayı yol dizisinde kullanılacak KABA adıma indirger.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SLUG ATILIYOR — İKİ SEBEPLE, İKİSİ DE ZORUNLU.
 *
 * 1. UZUNLUK: `/portfoy/demo-3-1-daire-asansorlu-otoparkli` tek başına 42
 *    karakter; üç adımlık bir dizi ayrıntı alanının 40 karakterlik sınırını
 *    kat kat aşar ve olay sessizce düşerdi.
 *
 * 2. MAHREMİYET: slug taşıyan diziler hızla seyrekleşir. Üç belirli ilanın
 *    belirli sırayla gezilmesi, tek bir ziyarete ait olacak kadar nadir bir
 *    olaydır — o noktada "toplulaştırılmış" olmaktan çıkar. Kaba adım
 *    (`/portfoy.detay`) aynı soruyu cevaplıyor ("liste → detay → iletişim")
 *    ve sayaçları yüksek tutuyor.
 *
 * Hangi İLANIN gezildiği zaten ayrıca ve toplulaştırılmış olarak ölçülüyor
 * (sayfa görüntüleme sayacı).
 */
export function yolAdimi(rota: string): string {
  const parcalar = rota.split('/').filter(Boolean)
  if (parcalar.length === 0) return '/'
  const ilk = parcalar[0] ?? ''
  return parcalar.length > 1 ? `/${ilk}.detay` : `/${ilk}`
}

export function yolDizisi(rotalar: readonly string[]): string | null {
  const adimlar: string[] = []
  for (const rota of rotalar.map(yolAdimi)) {
    // Aynı kaba adım art arda tekrar etmesin: `/portfoy.detay` → `/portfoy.detay`
    // geçişi gezinme değil, aynı bölümde dolaşmaktır.
    if (adimlar[adimlar.length - 1] === rota) continue
    adimlar.push(rota)
  }

  const son = adimlar.slice(-YOL_ADIM_SINIRI)
  // Tek adımlık bir "dizi" yol değil, sayfa görüntülemedir; zaten sayılıyor.
  if (son.length < 2) return null
  return son.join(YOL_AYIRICI)
}
