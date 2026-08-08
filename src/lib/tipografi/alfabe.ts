/**
 * Font alt kümesinin karakter listesi — TEK GERÇEK KAYNAK.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA HEM FONTU ÜRETİYOR HEM DE İÇERİĞİ DENETLİYOR.
 *
 * `scripts/font-altkume.ts` buradaki listeyi Google Fonts'a gönderip
 * `src/fonts/*.woff2` dosyalarını üretiyor. `alfabe.test.ts` ise sitedeki
 * metinleri tarayıp bu listenin dışına çıkan karakter var mı diye bakıyor.
 *
 * İkisi aynı listeyi okuduğu için "fontta olmayan bir karakteri yazmak"
 * sessizce mümkün değil: ya test uyarır ya da liste büyütülüp font yeniden
 * üretilir. Listeyi büyütüp fontu yeniden üretmeyi UNUTMAK tek gerçek
 * risk — bu yüzden test hata mesajında bunu açıkça söylüyor.
 *
 * ⚠️ ALFABEYE GÖRE KESİLDİ, METNE GÖRE DEĞİL.
 *
 * İçerik CMS'ten geliyor; Aslıhan'ın yarın ne yazacağını bilmiyoruz.
 * "Sitede geçen karakterler" diye bir alt küme, ilk yeni cümlede eksik
 * glif üretirdi ve eksik glif tarayıcıda "tofu" (boş kutu) olarak görünür.
 * Fark edilmesi aylar alır çünkü hiçbir şey hata vermez.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Karakter grupları — hata mesajlarında hangi grubun eksik kaldığını söylemek için ayrı. */
export const ALFABE_GRUPLARI = {
  turkceBuyuk: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ',
  turkceKucuk: 'abcçdefgğhıijklmnoöprsştuüvyz',
  /**
   * ⚠️ Düzeltme imli ünlüler TÜRKÇENİN PARÇASI, süs değil.
   *
   * "hâlâ", "kâğıt", "rüzgâr", "âdet" — TDK yazımında geçiyorlar ve sitedeki
   * metinlerde zaten kullanılıyorlar. Alt kümeye ilk turda koymamıştım;
   * `alfabe.test.ts` bunu `mahalleler/page.tsx` ve anasayfa metinlerinde
   * yakaladı. Eksik kalsalardı cümlenin ortasında yedek fonta düşerlerdi.
   */
  turkceDuzeltme: 'âÂîÎûÛ',
  /** Türkçe alfabede yok ama marka, kısaltma ve yabancı sözcüklerde geçiyor. */
  yabanci: 'QWXqwx',
  /**
   * CMS'ten gelebilecek yabancı özel adlar için Latin-1 aksanlıları.
   *
   * ⚠️ Şu an sitede geçmiyorlar; bilerek konuyorlar. İçeriği Aslıhan
   * yazacak ve bir marka ya da kişi adı ("José", "Citroën") ilk geçtiğinde
   * eksik glif fark edilmeden yayına girerdi. Toplam maliyeti birkaç yüz
   * bayt; sigortası bedelinden ucuz.
   */
  yabanciAksan: 'àáäåèéêëìíïñòóôõùúýÿÀÁÄÅÈÉÊËÌÍÏÑÒÓÔÕÙÚÝ',
  rakam: '0123456789',
  noktalama: '.,:;!?\'"()[]{}/\\|@#&*+-=<>~^_`',
  paraBirimi: '₺$€£',
  tirnak: '“”‘’«»',
  /** Kısa çizgi (–), uzun çizgi (—), bölünmez tire (‑). */
  cizgi: '–—‑',
  isaret: '…°§№±×÷≈≤≥%‰·•',
  /**
   * Üst simgeler. `²` bu sitede olmazsa olmaz — her m² değerinde geçiyor.
   * `ⁿ` kredi hesaplayıcısının formül gösteriminde.
   */
  ustSimge: '²³ⁿ',
  /**
   * ⚠️ Eksi işareti (−, U+2212) tire (-) DEĞİL.
   * Hesaplayıcı çıktılarında negatif değerler bu karakterle yazılıyor;
   * rakamlarla aynı genişlikte olduğu için tabular hizalamayı bozmuyor.
   */
  matematik: '−',
  /** Arayüzde yön göstergeleri olarak kullanılıyor. */
  ok: '→←↑↓',
  /**
   * Arayüz işaretleri:
   * `▾` açılır başlık oku, `⌘` MapLibre'nin Mac yakınlaştırma mesajı,
   * `⌖` harita imleci, `✓`/`✗` mahalle kartı veri göstergeleri.
   */
  arayuz: '▾⌘⌖✓✗',
  telif: '©®™',
  bosluk: ' ',
} as const

/** Alt kümeye girecek benzersiz karakterler, tanım sırasında. */
export const ALFABE: string = (() => {
  const gorulen = new Set<string>()
  const sirali: string[] = []
  for (const grup of Object.values(ALFABE_GRUPLARI)) {
    for (const karakter of grup) {
      if (!gorulen.has(karakter)) {
        gorulen.add(karakter)
        sirali.push(karakter)
      }
    }
  }
  return sirali.join('')
})()

/** Hızlı üyelik sorgusu için küme. */
export const ALFABE_KUMESI: ReadonlySet<string> = new Set(ALFABE)

/**
 * Alt kümede bulunmayan karakterler.
 *
 * ⚠️ Satır sonu, sekme ve bölünmez boşluk sayılmıyor: bunlar çizilen bir
 * glif değil, boşluk karakteri. Fontta karşılıkları olmaması sorun değil.
 */
const YOKSAYILAN = new Set(['\n', '\r', '\t', ' ', '​', '﻿'])

export function alfabeDisiKarakterler(metin: string): string[] {
  const bulunan = new Set<string>()
  for (const karakter of metin) {
    if (YOKSAYILAN.has(karakter)) continue
    if (!ALFABE_KUMESI.has(karakter)) bulunan.add(karakter)
  }
  return [...bulunan].sort()
}

/** `→ U+2192` biçiminde okunabilir etiket — hata mesajlarında kullanılıyor. */
export function karakterEtiketi(karakter: string): string {
  const kod = karakter.codePointAt(0) ?? 0
  return `${karakter} U+${kod.toString(16).toUpperCase().padStart(4, '0')}`
}
