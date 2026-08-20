import { Sahne } from '@/components/hareket/Sahne'
import { CizgiGrafikIkon, DogrulanmisIkon, KonumIkon, YuzdeIkon } from '@/components/ui/Ikon'

/**
 * Hero'ya binen dört güven kartı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN HERO'YA BİNİYOR.
 *
 * Kartlar hero'nun alt kenarını kesiyor (`-mt-16`). Bu süs değil: sayfanın
 * ilk ekranında "aşağıda devam var" işareti veriyor. Tam olarak kesilen
 * bir bölüm sınırı, kullanıcıya kaydırma sinyali olarak sayfanın en ucuz
 * ve en güvenilir aracı.
 *
 * ⚠️ Kartlar kademeli giriyor (60 ms aralık). Dördü aynı anda belirseydi
 * hareket "bir şey yüklendi" gibi okunurdu; kademe onu "sıralı bir anlatı"
 * yapıyor. 60 ms bilinçli üst sınıra yakın: daha uzunu sayfayı yavaş
 * gösterir.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KARTLAR = [
  {
    Ikon: DogrulanmisIkon,
    baslik: 'EİDS doğrulamalı',
    metin: 'Her ilan yetki belgesiyle ve taşınmaz numarasıyla yayınlanır.',
  },
  {
    Ikon: CizgiGrafikIkon,
    baslik: 'Rakamla karar',
    metin: 'Kira çarpanı, amortisman ve 12 aylık değişim her ilanda açık.',
  },
  {
    Ikon: KonumIkon,
    baslik: 'Çorlu’ya odaklı',
    metin: 'Tek şehir, derin veri: mahalle mahalle değer sürücüleri.',
  },
  {
    Ikon: YuzdeIkon,
    baslik: 'Önce değer',
    metin: 'Hesaplayıcılar ve değerleme sonucu iletişim istemeden açık.',
  },
] as const

export function GuvenKartlari() {
  return (
    <div className="kapsayici relative z-10 -mt-12 sm:-mt-16">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KARTLAR.map((kart, sira) => (
          <Sahne as="li" key={kart.baslik} gecikme={sira * 60}>
            <div
              data-yukselen
              className="border-kenar bg-yuzey rounded-kart shadow-kart flex h-full flex-col gap-3 border-[0.5px] p-5"
            >
              {/* ⚠️ İkon gold ama METİN gold değil — gold asla metin rengi
                  olmuyor (paletin mutlak kuralı). İkon çizgi olduğu için
                  1.4.11'in 3:1 grafik eşiğine tabi ve gold-600 onu geçiyor. */}
              <kart.Ikon width={26} height={26} className="text-[color:var(--color-gold-600)]" />
              <h3 className="text-metin font-sans text-govde font-medium">{kart.baslik}</h3>
              <p className="text-metin-2 text-govde-kucuk leading-relaxed">{kart.metin}</p>
            </div>
          </Sahne>
        ))}
      </ul>
    </div>
  )
}
