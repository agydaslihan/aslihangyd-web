'use client'

import type { EidsDegerlendirmesi, EidsIlerlemesi } from '@/lib/eids'

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
export function EidsHazirlikPaneli({
  degerlendirme,
  ilerleme,
}: {
  degerlendirme: EidsDegerlendirmesi
  ilerleme: EidsIlerlemesi
}) {
  const { yayinlanabilir, uyarilar, kalanGun } = degerlendirme

  return (
    <div className={`sihirbaz-eids ${yayinlanabilir ? 'hazir' : 'eksik'}`}>
      <p className="sihirbaz-eids-durum">
        {yayinlanabilir ? 'EİDS koşulları sağlanıyor' : 'İlan henüz yayına alınamaz'}
      </p>

      {/*
        ⚠️ SAYAÇ VE ÇUBUK — ne kadar yol alındığını GÖSTERİYOR.
        Önceden liste hiç kısalmıyordu: altı engel tek seferde çıkıyor,
        biri doldurulunca beşi kalıyordu ama kullanıcı ilerlediğini
        göremiyordu. Sayı, aynı bilgiyi ilerleme olarak okutuyor.
      */}
      <p className="sihirbaz-eids-sayac">
        <span>{ilerleme.ozet}</span>
        <span
          className="sihirbaz-eids-cubuk"
          role="progressbar"
          aria-valuenow={ilerleme.tamamlanan}
          aria-valuemin={0}
          aria-valuemax={ilerleme.toplam}
          aria-label="EİDS koşulları"
        >
          <span style={{ width: `${(ilerleme.tamamlanan / ilerleme.toplam) * 100}%` }} />
        </span>
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

      {/*
        ⚠️ HER EKSİĞİN YANINDA KAYNAĞI. "Taşınmaz numarası gerekli" demek,
        onu nereden bulacağını bilmeyen birine hiçbir şey söylemiyor.
        Kaynak metni `lib/eids/ilerleme.ts` içinde, kuralın yanında duruyor.
      */}
      {ilerleme.eksikler.length > 0 ? (
        <ul className="sihirbaz-eids-liste">
          {ilerleme.eksikler.map((eksik) => (
            <li key={eksik.anahtar}>
              <strong>{eksik.etiket}</strong> — {eksik.mesaj}
              <span className="sihirbaz-eids-kaynak">{eksik.kaynak}</span>
            </li>
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
