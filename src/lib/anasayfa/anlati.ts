import type { AnlatiBolumu } from '@/components/anlati/YatayAnlati'

/**
 * "Neden ASLIHAN GYD" anlatısı — şartname §6.6.
 *
 * ⚠️ METİN KODDA, CMS'TE DEĞİL — ve bu bilinçli. Buradaki dört cümle
 * markanın kendi iddiası; sayfa metni değil konumlandırma. CMS'e açmak,
 * "veri odaklıyız" iddiasının bir gün fark edilmeden değişmesi demek
 * olurdu. Sayfa metinleri (`SayfaIcerikleri`) ayrı ve orada düzenlenebilir.
 *
 * ⚠️ DÖRT MADDE, ŞARTNAMEDEKİ SIRAYLA: yerel uzmanlık → veriyle karar →
 * şeffaf süreç → doğru pazarlama. Sıra bir akış: tanışmadan satışa.
 */
export const ANLATI_BOLUMLERI: readonly AnlatiBolumu[] = [
  {
    anahtar: 'yerel',
    ustBaslik: 'Yerel uzmanlık',
    baslik: 'Çorlu’yu sokak sokak biliyoruz.',
    metin:
      'Hangi mahallenin hangi değer sürücüsünden beslendiğini — sanayi, ulaşım, eğitim, sağlık — ' +
      'tek tek takip ediyoruz. Bir taşınmazın değerini binadan çok mahallesi belirler.',
  },
  {
    anahtar: 'veri',
    ustBaslik: 'Veriyle karar',
    baslik: 'Rakamın arkasında kaç gözlem var, söylüyoruz.',
    metin:
      'Her istatistiğin yanında gözlem sayısı (n) yazıyor. Az gözleme dayanan bir ortalama, ' +
      'ortalama değildir; bunu gizlemek yerine ekrana yazıyoruz.',
  },
  {
    anahtar: 'seffaf',
    ustBaslik: 'Şeffaf süreç',
    baslik: 'Her ilan EİDS doğrulamalı ve numarasıyla yayında.',
    metin:
      'Mülk sahibinin e-Devlet üzerinden verdiği yetki olmadan ilan yayınlamıyoruz. ' +
      'Taşınmaz numarası her ilanın üzerinde; doğrulaması sizde.',
  },
  {
    anahtar: 'pazarlama',
    ustBaslik: 'Doğru pazarlama',
    baslik: 'Doğru alıcıyı bulmak, çok alıcıya ulaşmaktan değerli.',
    metin:
      'Özellikle ticaride alıcı sayısı azdır ama doğru alıcı işlemin tamamını belirler. ' +
      'Portföyü herkese değil, arayana gösteriyoruz.',
  },
]
