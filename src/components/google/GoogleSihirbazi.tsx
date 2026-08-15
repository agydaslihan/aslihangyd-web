'use client'

import { useState, useTransition } from 'react'

import { googleAdaylariAra, googleKimligiBagla } from '@/lib/google/eylemler'
import type { GoogleAdayi } from '@/lib/google/istemci'

export interface PoiSatiri {
  id: number
  ad: string
  tip: string
  kaynak: string
  googlePlaceId: string | null
  konumVar: boolean
}

/**
 * Google Places eşleştirme sihirbazı.
 *
 * ⚠️ ARAMA TOPLU DEĞİL, TEK TEK. "Hepsini eşleştir" düğmesi yüzlerce
 * ücretli çağrıyı tek tıkla harcar ve sonuçların hiçbiri gözle
 * doğrulanmamış olurdu. Eşleştirme bir yargı gerektiriyor: aynı adda üç
 * eczane olabilir ve doğrusunu adresinden bilen insan.
 */
export function GoogleSihirbazi({ satirlar }: { satirlar: PoiSatiri[] }) {
  /**
   * Bu oturumda değişen satırlar.
   *
   * `null` "bağlantı kaldırıldı" demek — `undefined` ("bu satıra
   * dokunulmadı") ile aynı şey değil. İkisini ayırmazsak bağlantıyı
   * kaldırdığınız satır "yalnızca eksikler" listesinden kaybolurdu; oysa
   * tam da o listede olması gerekiyor.
   */
  const [durumlar, setDurumlar] = useState<Record<number, string | null>>({})
  const [adaylar, setAdaylar] = useState<Record<number, GoogleAdayi[]>>({})
  const [hatalar, setHatalar] = useState<Record<number, string | null>>({})
  const [bekleyen, setBekleyen] = useState<number | null>(null)
  const [, basla] = useTransition()

  const [yalnizcaEksik, setYalnizcaEksik] = useState(true)

  function ara(poi: PoiSatiri): void {
    setBekleyen(poi.id)
    setHatalar((onceki) => ({ ...onceki, [poi.id]: null }))

    basla(async () => {
      const cevap = await googleAdaylariAra(poi.id)
      setBekleyen(null)

      if (cevap.basarili && cevap.adaylar) {
        setAdaylar((onceki) => ({ ...onceki, [poi.id]: cevap.adaylar ?? [] }))
        if (cevap.adaylar.length === 0) {
          setHatalar((onceki) => ({
            ...onceki,
            [poi.id]: 'Google bu ad ve konum için sonuç döndürmedi.',
          }))
        }
      } else {
        setHatalar((onceki) => ({ ...onceki, [poi.id]: cevap.mesaj ?? 'Arama başarısız.' }))
      }
    })
  }

  function bagla(poiId: number, placeId: string, etiket: string): void {
    setBekleyen(poiId)
    basla(async () => {
      const cevap = await googleKimligiBagla(poiId, placeId)
      setBekleyen(null)

      if (cevap.basarili) {
        setDurumlar((onceki) => ({ ...onceki, [poiId]: placeId === '' ? null : etiket }))
        setAdaylar((onceki) => ({ ...onceki, [poiId]: [] }))
      } else {
        setHatalar((onceki) => ({ ...onceki, [poiId]: cevap.mesaj ?? 'Bağlanamadı.' }))
      }
    })
  }

  /** Satırın şu anki bağlantı durumu — bu oturumdaki değişiklik dahil. */
  function bagliMi(poi: PoiSatiri): boolean {
    const degisen = durumlar[poi.id]
    if (degisen !== undefined) return degisen !== null
    return poi.googlePlaceId !== null
  }

  const gosterilecek = yalnizcaEksik ? satirlar.filter((poi) => !bagliMi(poi)) : satirlar
  const eksikSayisi = satirlar.filter((poi) => poi.googlePlaceId === null).length

  return (
    <section className="aktarim-adim">
      <h2>Noktaları Google&apos;daki karşılığıyla eşleştir</h2>

      <p className="aktarim-not">
        {satirlar.length} ilgi noktasından <strong>{eksikSayisi}</strong> tanesinin Google yer
        kimliği yok. Eşleştirme tek tek yapılır: aynı adda birden çok işletme olabilir ve doğrusunu
        adresinden ancak insan seçebilir.
      </p>

      <label className="aktarim-alan" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={yalnizcaEksik}
          onChange={(olay) => setYalnizcaEksik(olay.target.checked)}
        />
        <span>Yalnızca kimliği olmayanları göster</span>
      </label>

      {gosterilecek.length === 0 ? (
        <p className="aktarim-not">Gösterilecek nokta yok.</p>
      ) : (
        <div className="aktarim-tablo-sarmal">
          <table className="aktarim-tablo">
            <thead>
              <tr>
                <th scope="col">Nokta</th>
                <th scope="col">Tip</th>
                <th scope="col">Kaynak</th>
                <th scope="col">Google kimliği</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {gosterilecek.map((poi) => {
                const degisen = durumlar[poi.id]
                const poiAdaylari = adaylar[poi.id] ?? []
                const hata = hatalar[poi.id]

                return (
                  <tr key={poi.id}>
                    <td>{poi.ad}</td>
                    <td>{poi.tip}</td>
                    <td>{poi.kaynak}</td>
                    <td>
                      {degisen !== undefined ? (
                        degisen === null ? (
                          'bağlantı kaldırıldı'
                        ) : (
                          `bağlandı: ${degisen}`
                        )
                      ) : poi.googlePlaceId ? (
                        <code>{poi.googlePlaceId}</code>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ whiteSpace: 'normal', minWidth: '22rem' }}>
                      <button
                        type="button"
                        className="aktarim-buton aktarim-buton--ikincil"
                        onClick={() => ara(poi)}
                        disabled={bekleyen !== null}
                      >
                        {bekleyen === poi.id ? 'Aranıyor…' : "Google'da ara"}
                      </button>

                      {!poi.konumVar ? (
                        <p className="aktarim-not">
                          Bu noktanın konumu yok; arama yalnızca ada göre yapılır ve yanlış
                          şehirdeki bir işletmeyi getirebilir.
                        </p>
                      ) : null}

                      {hata ? <p className="aktarim-hata">{hata}</p> : null}

                      {poiAdaylari.length > 0 ? (
                        <ul className="aktarim-liste">
                          {poiAdaylari.map((aday) => (
                            <li key={aday.placeId}>
                              <strong>{aday.ad}</strong>
                              {aday.kategori ? ` · ${aday.kategori}` : ''}
                              {aday.adres ? ` · ${aday.adres}` : ''}{' '}
                              <button
                                type="button"
                                className="aktarim-buton aktarim-buton--ikincil"
                                onClick={() => bagla(poi.id, aday.placeId, aday.ad)}
                                disabled={bekleyen !== null}
                              >
                                Bunu bağla
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {bagliMi(poi) ? (
                        <button
                          type="button"
                          className="aktarim-buton aktarim-buton--ikincil"
                          onClick={() => bagla(poi.id, '', '')}
                          disabled={bekleyen !== null}
                        >
                          Bağlantıyı kaldır
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="aktarim-not">
        ⚠️ Sonuçlar Google&apos;dan geliyor ve <strong>kaydedilmiyor</strong> — bu listede
        gördüğünüz adlar yalnızca seçim yapabilmeniz için gösteriliyor. Bağla dediğinizde
        veritabanına yazılan tek şey yer kimliğidir.
      </p>
    </section>
  )
}
