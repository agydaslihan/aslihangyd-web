'use client'

import { useState } from 'react'

import { PortfoySihirbazi, type MahalleSecenegi } from './PortfoySihirbazi'
import { SihirbazModali } from './SihirbazModali'

/**
 * "İlan ver" düğmesi ve modal kabuğu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İÇERİDEKİ SİHİRBAZ SAYFADAKİYLE AYNI BİLEŞEN.
 *
 * İkinci bir sihirbaz yazmak, EİDS kapısının, otomatik kaydetmenin ve
 * şemanın iki ayrı kopyasını doğururdu; ikisinin ayrıştığı gün hangisinin
 * doğru olduğu sorulamazdı. Modal yalnızca bir kabuk.
 *
 * ⚠️ `/admin/portfoy-sihirbazi` rotası DURUYOR: derin bağlantı, yer imi ve
 * yeni sekmede açma çalışmaya devam ediyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SİHİRBAZ MODAL KAPANINCA SIFIRLANIYOR. `key` değiştirilerek bileşen
 * yeniden kuruluyor: yarım bırakılıp kapatılan bir formun ikinci açılışta
 * eski hâliyle gelmesi, "yeni ilan" diyen kişiye eski ilanı gösterirdi.
 * Kaydedilmiş taslak zaten sunucuda duruyor.
 */
export function IlanVerDugmesi({
  mahalleler,
  adminTemelAdresi,
}: {
  mahalleler: MahalleSecenegi[]
  adminTemelAdresi: string
}) {
  const [acik, setAcik] = useState(false)
  const [oturum, setOturum] = useState(0)

  return (
    <>
      <button
        type="button"
        className="sihirbaz-dugme"
        onClick={() => {
          setOturum((n) => n + 1)
          setAcik(true)
        }}
      >
        İlan ver
      </button>

      <SihirbazModali
        acik={acik}
        baslik="Yeni ilan"
        onKapat={() => setAcik(false)}
        /**
         * ⚠️ Onay sorusu BURADA, sihirbazın içinde değil: kapatma kararı
         * kabuğun işi. Sihirbaz kendi durumunu `beforeunload` ile zaten
         * koruyor; bu, modal içindeki ikinci kapı.
         */
        kapatmadanOnceSor={() =>
          window.confirm(
            'Sihirbazı kapatmak istiyor musunuz? Kaydedilmemiş değişiklikler kaybolur — ' +
              '“Taslak kaydet ve çık” ile kaydedebilirsiniz.',
          )
        }
      >
        <PortfoySihirbazi
          key={oturum}
          mahalleler={mahalleler}
          adminTemelAdresi={adminTemelAdresi}
          onKapat={() => setAcik(false)}
        />
      </SihirbazModali>
    </>
  )
}
