'use client'

import { useAllFormFields } from '@payloadcms/ui'
import { useMemo } from 'react'

import { paletiDegerlendir, yuvaIcinOner } from '@/lib/marka/kontrastKapisi'
import { HAZIR_PALETLER, varsayilanPalet, YUVALAR, type Palet } from '@/lib/marka/yuvalar'

import './marka.css'

/**
 * Kontrast kapısı + canlı önizleme + hazır paletler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİLEŞEN KAPIYI GÖSTERİR, KAPIYI O KURMAZ.
 *
 * Kapının kendisi renk alanlarının `validate` fonksiyonlarında ve sunucudaki
 * `beforeValidate` kancasında. İlk tasarım burada `disableSubmit` çağırmaktı;
 * denenince görüldü ki Payload'ın o çağrısı FORMUN TAMAMINI kilitliyor —
 * renk alanları dahil. Yani kapı kapanınca kullanıcı sorunu düzeltemez hâle
 * geliyordu.
 *
 * Üç katman, üçü de farklı işe yarıyor:
 *  · bu bileşen — neyin neden geçmediğini ANLATIR ve alternatif önerir
 *  · alan `validate` — kaydetmeyi ENGELLER ve hatalı yuvayı işaretler
 *  · sunucu kancası — Local API, seed ve elle SQL'i de kapsar
 * ─────────────────────────────────────────────────────────────────────────
 */

const AAA_ESIGI = 7

function paletiTopla(
  alanlar: Record<string, { value?: unknown } | undefined>,
  tema: 'acikTema' | 'koyuTema',
): Palet {
  return Object.fromEntries(
    YUVALAR.map((yuva) => [yuva.anahtar, String(alanlar[`${tema}.${yuva.anahtar}`]?.value ?? '')]),
  )
}

function PaletPaneli({ tema }: { tema: 'acikTema' | 'koyuTema' }) {
  const [alanlar, dispatch] = useAllFormFields()

  const palet = useMemo(() => paletiTopla(alanlar, tema), [alanlar, tema])
  const sonuc = useMemo(() => paletiDegerlendir(palet), [palet])

  function yuvayiYaz(anahtar: string, deger: string): void {
    dispatch({ type: 'UPDATE', path: `${tema}.${anahtar}`, value: deger })
  }

  function paletiUygula(kaynak: Palet): void {
    for (const yuva of YUVALAR) {
      const deger = kaynak[yuva.anahtar]
      if (deger) yuvayiYaz(yuva.anahtar, deger)
    }
  }

  const temaAdi = tema === 'acikTema' ? 'acik' : 'koyu'

  return (
    <div className="marka-panel">
      <section className="marka-panel__bolum">
        <h3 className="marka-panel__baslik">Kontrast ölçümü</h3>

        {sonuc.gecti ? (
          <p className="marka-panel__durum marka-panel__durum--gecti">
            ✓ Bütün çiftler WCAG AA eşiğini geçiyor. Kaydedebilirsiniz.
          </p>
        ) : (
          <p className="marka-panel__durum marka-panel__durum--kaldi">
            × {sonuc.kalanlar.length} çift AA eşiğinin altında.{' '}
            <strong>Bu palet kaydedilemez</strong> — erişilebilirlik pazarlık konusu değil. Kaydete
            bastığınızda ilgili renk alanları kırmızı işaretlenir.
          </p>
        )}

        <div className="marka-panel__tablo-sarmal">
          <table className="marka-panel__tablo">
            <thead>
              <tr>
                <th scope="col">Çift</th>
                <th scope="col">Oran</th>
                <th scope="col">Gereken</th>
                <th scope="col">Durum</th>
                <th scope="col">Düzeltme</th>
              </tr>
            </thead>
            <tbody>
              {sonuc.ciftler.map((cift) => (
                <tr
                  key={cift.etiket}
                  className={cift.gecti ? undefined : 'marka-panel__satir--kaldi'}
                >
                  <td>
                    {cift.etiket}
                    <span className="marka-panel__gerekce">{cift.gerekce}</span>
                  </td>
                  <td className="marka-panel__oran">{cift.oran.toFixed(2)}:1</td>
                  <td className="marka-panel__oran">{cift.esik}:1</td>
                  <td>
                    {/* ⚠️ Renk tek taşıyıcı değil: simge ve metin birlikte. */}
                    {cift.gecti ? (
                      <span className="marka-panel__rozet marka-panel__rozet--gecti">
                        ✓ {cift.oran >= AAA_ESIGI ? 'AAA' : 'AA'}
                      </span>
                    ) : (
                      <span className="marka-panel__rozet marka-panel__rozet--kaldi">
                        × AA için {cift.esik} gerekiyor
                      </span>
                    )}
                  </td>
                  <td>
                    {cift.gecti ? (
                      '—'
                    ) : (
                      <AlternatifDugmesi
                        anahtar={cift.on}
                        palet={palet}
                        uygula={(deger) => yuvayiYaz(cift.on, deger)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="marka-panel__bolum">
        <h3 className="marka-panel__baslik">Canlı önizleme</h3>
        <p className="marka-panel__not">
          Renk değiştikçe anında güncellenir. Siteyi bozmadan deneyebilirsiniz — kaydetmeden hiçbir
          şey yayına girmez.
        </p>
        <Onizleme palet={palet} />
      </section>

      <section className="marka-panel__bolum">
        <h3 className="marka-panel__baslik">Hazır paletler</h3>
        <p className="marka-panel__not">
          Bir palete dönmek yalnızca bu sekmedeki renkleri değiştirir; kaydetmeden yayına girmez.
        </p>
        <div className="marka-panel__paletler">
          {HAZIR_PALETLER.map((hazir) => (
            <button
              key={hazir.anahtar}
              type="button"
              className="marka-panel__dugme"
              onClick={() => paletiUygula(temaAdi === 'acik' ? hazir.acik : hazir.koyu)}
            >
              <span className="marka-panel__palet-ad">{hazir.ad}</span>
              <span className="marka-panel__palet-aciklama">{hazir.aciklama}</span>
              <span className="marka-panel__seritler" aria-hidden="true">
                {['zemin', 'bolumZemin', 'vurgu', 'butonZemin', 'dekoratifCizgi'].map((yuva) => (
                  <span
                    key={yuva}
                    className="marka-panel__serit"
                    style={{
                      background: (temaAdi === 'acik' ? hazir.acik : hazir.koyu)[yuva],
                    }}
                  />
                ))}
              </span>
            </button>
          ))}

          <button
            type="button"
            className="marka-panel__dugme marka-panel__dugme--varsayilan"
            onClick={() => paletiUygula(varsayilanPalet(temaAdi))}
          >
            <span className="marka-panel__palet-ad">Varsayılana dön</span>
            <span className="marka-panel__palet-aciklama">
              Sitenin kodla gelen renkleri. Her zaman kapıdan geçer.
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}

/**
 * "Yakın bir alternatif öner" — aynı tonu koruyarak eşiği geçen en yakın değer.
 *
 * ⚠️ Öneri yuvanın BÜTÜN çiftlerini birden karşılar. Yalnızca tıklanan
 * satıra göre önerseydi, üç zeminde kullanılan vurgu rengi için öneri
 * uygulanır ve tablo yine kırmızı kalırdı.
 */
function AlternatifDugmesi({
  anahtar,
  palet,
  uygula,
}: {
  anahtar: string
  palet: Palet
  uygula: (deger: string) => void
}) {
  const oneri = useMemo(() => yuvaIcinOner(anahtar, palet), [anahtar, palet])

  if (!oneri) {
    return (
      <span className="marka-panel__gerekce">Bu renkten yakın bir alternatif türetilemedi.</span>
    )
  }

  return (
    <button type="button" className="marka-panel__oneri" onClick={() => uygula(oneri)}>
      <span className="marka-panel__oneri-kutu" style={{ background: oneri }} aria-hidden="true" />
      Yakın alternatif: {oneri}
    </button>
  )
}

/** Küçük önizleme kartı — başlık, gövde, buton, rozet, kart. */
function Onizleme({ palet }: { palet: Palet }) {
  return (
    <div className="marka-onizleme" style={{ background: palet.zemin, color: palet.metin }}>
      <div className="marka-onizleme__bant" style={{ background: palet.yumusakZemin }}>
        <p className="marka-onizleme__baslik" style={{ color: palet.vurgu }}>
          Çorlu&apos;da veriyle karar verin
        </p>
        <p className="marka-onizleme__govde" style={{ color: palet.metin }}>
          Mahalle verileri, kira çarpanı ve yatırım analizi tek ekranda.
        </p>
        <span
          className="marka-onizleme__buton"
          style={{ background: palet.butonZemin, color: palet.butonMetin }}
        >
          Ücretsiz değerleme
        </span>
      </div>

      <div className="marka-onizleme__kart" style={{ background: palet.bolumZemin }}>
        <p className="marka-onizleme__kart-baslik" style={{ color: palet.vurgu }}>
          Muhittin Mahallesi
        </p>
        <span
          className="marka-onizleme__rozet"
          style={{ background: palet.koyuBantZemin, color: palet.koyuBantMetin }}
        >
          Doğrulanmış ilan
        </span>
        <hr className="marka-onizleme__cizgi" style={{ borderColor: palet.dekoratifCizgi }} />
        <p className="marka-onizleme__govde" style={{ color: palet.metin }}>
          Kira çarpanı, m² fiyatı ve 12 aylık değişim.
        </p>
      </div>

      <div
        className="marka-onizleme__koyu"
        style={{ background: palet.koyuBantZemin, color: palet.koyuBantMetin }}
      >
        Portföyünüzü konuşalım
      </div>
    </div>
  )
}

export function AcikPaletPaneli() {
  return <PaletPaneli tema="acikTema" />
}

export function KoyuPaletPaneli() {
  return <PaletPaneli tema="koyuTema" />
}
