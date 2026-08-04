'use client'

import type { EidsDegerlendirmesi } from '@/lib/eids'

/**
 * EİDS hazırlık paneli — sihirbazın asıl kazancı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Payload admin'de eksik EİDS bilgisi ancak ilan "Yayında" yapılmaya
 * çalışıldığında hata olarak çıkar; yani tüm veri girildikten sonra.
 * Bu panel aynı değerlendirmeyi **her tuşta** çalıştırıp neyin eksik
 * olduğunu baştan gösterir.
 *
 * ⚠️ Bu panel bir KAPI DEĞİL, bir AYNA. Gerçek kapı `eidsYayinEngeli`
 * kancasıdır ve sunucuda çalışır. Buradaki gösterim istemcide üretilir;
 * istemciye güvenilmez. Aynı motoru (`eidsDegerlendir`) kullanması,
 * gösterilenle uygulananın ayrışmamasını garanti eder — panelin kendi
 * kural kopyasını taşıması, iki kuralın zamanla birbirinden ayrılması
 * demek olurdu.
 *
 * Panel hiçbir zaman "yayınlayabilirsiniz" düğmesi göstermez. Yayına alma
 * kararı, kapının bulunduğu yerde — admin'de — bilinçli bir eylem olarak
 * kalır.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function EidsHazirlikPaneli({ degerlendirme }: { degerlendirme: EidsDegerlendirmesi }) {
  const { yayinlanabilir, engeller, uyarilar, kalanGun } = degerlendirme

  return (
    <div className={`sihirbaz-eids ${yayinlanabilir ? 'hazir' : 'eksik'}`}>
      <p className="sihirbaz-eids-durum">
        {yayinlanabilir ? 'EİDS koşulları sağlanıyor' : 'İlan henüz yayına alınamaz'}
      </p>

      <p className="sihirbaz-eids-aciklama">
        {yayinlanabilir ? (
          <>
            Kaydettikten sonra ilan sayfasından <strong>Yayında</strong> durumuna alabilirsiniz.
          </>
        ) : (
          <>
            İlan <strong>taslak olarak kaydedilebilir</strong>; aşağıdakiler tamamlanana kadar
            yayına alınamaz.
          </>
        )}
      </p>

      {engeller.length > 0 ? (
        <ul className="sihirbaz-eids-liste">
          {engeller.map((engel) => (
            <li key={engel.kod}>{engel.mesaj}</li>
          ))}
        </ul>
      ) : null}

      {uyarilar.length > 0 ? (
        <ul className="sihirbaz-eids-liste uyari">
          {uyarilar.map((uyari) => (
            <li key={uyari.kod}>{uyari.mesaj}</li>
          ))}
        </ul>
      ) : null}

      {yayinlanabilir && kalanGun !== null && kalanGun >= 0 ? (
        <p className="sihirbaz-eids-kalan">
          Yetkinin bitmesine <strong>{kalanGun} gün</strong> kaldı. Süre dolduğunda ilan otomatik
          olarak yayından kaldırılır.
        </p>
      ) : null}

      <p className="sihirbaz-eids-yasal">
        Bu kontrol Taşınmaz Ticareti Yönetmeliği (EİDS) gereğidir ve devre dışı bırakılamaz.
      </p>
    </div>
  )
}
