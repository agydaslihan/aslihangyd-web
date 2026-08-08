/**
 * Yükleme iskeletinin ayırdığı alan — iskelet ve gerçek sayfa AYNI kaynaktan okur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: İSKELET SAYISI SABİTTİ VE DÜZEN ZIPLIYORDU.
 *
 * `/mahalleler/loading.tsx` sabit 6 kart yeri ayırıyordu; tohumlanmış veri
 * 3 mahalle. Gerçek içerik gelince ızgara bir satır kaybediyor, footer
 * yukarı sıçrıyor ve masaüstünde CLS 0,029 çıkıyordu. Lighthouse film
 * şeridinde 375 ms'de 6 iskelet, 750 ms'de 3 gerçek kart görülüyor.
 *
 * "Üretimde 6 pilot mahalle olacak, kendiliğinden düzelir" demek şansa
 * dayanmaktı: 7. mahalle eklendiği gün kayma geri gelir ve kimse sebebini
 * hatırlamaz.
 *
 * ⚠️ ÇÖZÜM SAYIYI TUTTURMAK DEĞİL, ALAN AYIRMAK.
 *
 * `loading.tsx` veriyi bekleyemez — beklerse iskeletin varlık sebebi
 * kalmaz. Yani gerçek kayıt sayısını ASLA bilemez. Bu yüzden sayıyı
 * tahmin etmek yerine ızgaraya iki taraftan da aynı `min-height`
 * veriliyor:
 *
 *   · İçerik iskeletten KISAysa  → min-height alanı tutar, footer
 *     yerinden oynamaz (ölçtüğümüz durum bu)
 *   · İçerik iskeletten UZUNsa   → ızgara büyür, footer AŞAĞI iner;
 *     ekranın dışına çıktığı için görünür bir kayma olmaz
 *
 * Kalan tek risk, ızgaranın tam ekranın alt sınırında bitmesi. Bunu
 * tamamen ortadan kaldırmak, iskeletin gerçek satır sayısını bilmesini
 * gerektirirdi ki mümkün değil.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * İskelette gösterilecek kart sayısı.
 *
 * Görsel bir ipucu; alanı `IZGARA_MIN_YUKSEKLIK` tutuyor, bu sayı değil.
 */
export const ISKELET_KART_SAYISI = 6

/**
 * Kart ızgarasının en az kaplayacağı yükseklik — hem iskelette hem
 * gerçek sayfada uygulanır.
 *
 * ⚠️ Yalnızca `lg` kırılımından itibaren. Ölçüm mobilde CLS 0,000
 * gösterdi: orada ızgara tek sütun olduğu için her zaman ekrandan uzun ve
 * footer görünür alana hiç girmiyor. Mobilde min-height uygulamak, üç
 * kartlı bir listede kocaman bir boşluk bırakmaktan başka işe yaramazdı.
 *
 * Değer iki satır karta göre: masaüstünde kart ≈ 24rem (16/10 görsel +
 * içerik), iki satır + boşluk ≈ 49rem.
 */
export const IZGARA_MIN_YUKSEKLIK = 'lg:min-h-[49rem]'

/**
 * Mahalle kartının görsel alanı — iskeletin taklit etmesi gereken oran.
 *
 * ⚠️ `MahalleKarti` ile birebir aynı kalmalı. Farklı olduğu için
 * iskelet kart başına ~113 px eksik yer ayırıyordu.
 */
export const MAHALLE_GORSEL_SINIFI = 'aspect-16/10'
