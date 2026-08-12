'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { bilincliDisaridaGerekcesi } from '@/lib/osm/eslesme'
import { osmOnizlemesiHazirla, osmSatirlariniYaz } from '@/lib/osm/eylemler'
import type { IceAktarmaDurumu, Onizleme, YazmaSonucu } from '@/lib/osm/iceAktarma'
import { VARSAYILAN_MARJ_METRE } from '@/lib/osm/sorgu'

/**
 * OSM içe aktarma sihirbazı — önce gör, sonra yaz.
 *
 * CSV içe aktarmadaki ilkenin aynısı: yüzlerce kaydı görmeden yazmak,
 * hatayı ancak veri girdikten sonra fark etmek demek.
 */
export function OsmSihirbazi({ merkezliMahalleSayisi }: { merkezliMahalleSayisi: number }) {
  const [marj, setMarj] = useState(VARSAYILAN_MARJ_METRE)
  const [durum, setDurum] = useState<IceAktarmaDurumu | null>(null)
  const [sonuc, setSonuc] = useState<YazmaSonucu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, basla] = useTransition()

  function onizle(): void {
    setSonuc(null)
    setHata(null)
    basla(async () => {
      setDurum(await osmOnizlemesiHazirla(marj))
    })
  }

  function yaz(onizleme: Onizleme): void {
    basla(async () => {
      const cevap = await osmSatirlariniYaz(onizleme.satirlar)
      if (cevap.basarili && cevap.sonuc) {
        setSonuc(cevap.sonuc)
        setDurum(null)
      } else {
        setHata(cevap.mesaj ?? 'İçe aktarma tamamlanamadı.')
      }
    })
  }

  const onizleme = durum?.durum === 'hazir' ? durum.onizleme : null

  return (
    <div className="osm-sihirbaz">
      <section className="osm-adim">
        <h2>1 · Arama alanı</h2>
        <p className="osm-not">
          {merkezliMahalleSayisi} mahallenin merkezi tanımlı. Alan bu noktaların çevresine aşağıdaki
          pay eklenerek hesaplanıyor.
        </p>

        <label className="osm-alan">
          <span>Mahalle merkezlerine eklenecek pay (metre)</span>
          <input
            type="number"
            min={0}
            max={50_000}
            step={500}
            value={marj}
            onChange={(olay) => setMarj(Number(olay.target.value))}
          />
          <em>
            Küçük pay: daha az ama daha kesin sonuç. Büyük pay: çevre köyler ve OSB&apos;ler de
            girer.
          </em>
        </label>

        <button type="button" className="osm-buton" onClick={onizle} disabled={bekliyor}>
          {bekliyor ? 'OpenStreetMap sorgulanıyor…' : 'Önizle'}
        </button>
      </section>

      {durum?.durum === 'merkez_yok' ? (
        <p className="osm-hata">Merkez noktası tanımlı mahalle bulunamadı.</p>
      ) : null}

      {durum?.durum === 'kutu_gecersiz' || durum?.durum === 'hata' ? (
        <p className="osm-hata">{durum.mesaj}</p>
      ) : null}

      {hata ? <p className="osm-hata">{hata}</p> : null}

      {onizleme ? <OnizlemeBolumu onizleme={onizleme} bekliyor={bekliyor} yaz={yaz} /> : null}

      {sonuc ? (
        <section className="osm-adim">
          <h2>Sonuç</h2>
          <p className="osm-basari">
            {sonuc.eklenen} yeni nokta eklendi, {sonuc.guncellenen} nokta güncellendi,{' '}
            {sonuc.korunan} elle düzeltilmiş kayıt korundu.
          </p>
          {sonuc.hatalar.length > 0 ? (
            <ul className="osm-hata-liste">
              {sonuc.hatalar.map((h) => (
                <li key={h.ad}>
                  {h.ad}: {h.mesaj}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function OnizlemeBolumu({
  onizleme,
  bekliyor,
  yaz,
}: {
  onizleme: Onizleme
  bekliyor: boolean
  yaz: (onizleme: Onizleme) => void
}) {
  const yazilacak = onizleme.yeniSayisi + onizleme.guncellenecekSayisi

  return (
    <>
      <section className="osm-adim">
        <h2>2 · Önizleme</h2>

        <div className="osm-ozet">
          <span className="osm-rozet osm-rozet--yeni">{onizleme.yeniSayisi} yeni</span>
          <span className="osm-rozet">{onizleme.guncellenecekSayisi} güncellenecek</span>
          <span className="osm-rozet osm-rozet--korunacak">
            {onizleme.korunacakSayisi} korunacak (elle düzeltilmiş)
          </span>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            ⚠️ EŞLENMEYEN TÜR RAPORU KALICIDIR — HER İÇE AKTARMADA OKUNUR.

            Açık geliyor ve boşken bile görünüyor. Kapalı bir `<details>`
            okunmayan bir rapordur; boşken hiç görünmemesi ise "rapor
            çalıştı ve temiz çıktı" ile "rapor hiç üretilmedi" arasındaki
            farkı gizler.

            "Eczaneleri de alalım mı?" sorusu tam olarak buradan çıktı;
            eczane ve oyun alanı 12 Ağustos 2026'da bu listeye bakılarak
            eklendi.
            ───────────────────────────────────────────────────────────── */}
        <section className="osm-eslenmeyen">
          <h3>Eşleme tablomuzda karşılığı olmayan türler</h3>

          {onizleme.ozet.eslenmeyenler.length === 0 ? (
            <p className="osm-not">
              Bu bölgede gelen her etiketin eşleme tablomuzda karşılığı vardı — dışarıda kalan tür
              yok.
            </p>
          ) : (
            <>
              <ul>
                {onizleme.ozet.eslenmeyenler.slice(0, 40).map((e) => {
                  const gerekce = bilincliDisaridaGerekcesi(e.etiket)
                  return (
                    <li key={e.etiket}>
                      <code>{e.etiket}</code> — {e.sayi} kayıt
                      {gerekce !== null ? (
                        <>
                          {' '}
                          <strong>· bilinçli olarak dışarıda:</strong> {gerekce}
                        </>
                      ) : null}
                    </li>
                  )
                })}
              </ul>

              {onizleme.ozet.eslenmeyenler.length > 40 ? (
                <p className="osm-not">
                  İlk 40 tür gösteriliyor; toplam {onizleme.ozet.eslenmeyenler.length} tür var.
                </p>
              ) : null}

              <p className="osm-not">
                Bunlardan almak istediğiniz bir tür varsa söyleyin; eşleme tablosuna eklenir ve{' '}
                <Link href="/veri-kaynaklari">/veri-kaynaklari</Link> sayfasında yayınlanır.
                &quot;Bilinçli olarak dışarıda&quot; işaretli olanların kararı zaten verilmiş —
                gerekçesi yanında yazıyor.
              </p>
            </>
          )}
        </section>

        {onizleme.ozet.adsizAtlandi > 0 || onizleme.ozet.konumsuzAtlandi > 0 ? (
          <p className="osm-not">
            {onizleme.ozet.adsizAtlandi > 0
              ? `${onizleme.ozet.adsizAtlandi} nokta adı olmadığı için atlandı. `
              : ''}
            {onizleme.ozet.konumsuzAtlandi > 0
              ? `${onizleme.ozet.konumsuzAtlandi} nokta konumu çözülemediği için atlandı.`
              : ''}
          </p>
        ) : null}

        <div className="osm-tablo-sarmal">
          <table className="osm-tablo">
            <thead>
              <tr>
                <th scope="col">İşlem</th>
                <th scope="col">Ad</th>
                <th scope="col">Tip</th>
                <th scope="col">OSM etiketi</th>
                <th scope="col">Öne çıkan</th>
              </tr>
            </thead>
            <tbody>
              {onizleme.satirlar.slice(0, 300).map((satir) => (
                <tr key={satir.aday.osmKimlik} className={`osm-satir--${satir.islem}`}>
                  <td>
                    {satir.islem === 'yeni'
                      ? 'Yeni'
                      : satir.islem === 'guncellenecek'
                        ? 'Güncellenecek'
                        : 'Korunacak'}
                  </td>
                  <td>{satir.aday.ad}</td>
                  <td>{satir.aday.tip}</td>
                  <td>
                    <code>{satir.aday.etiket}</code>
                  </td>
                  <td>{satir.aday.onemli ? 'evet' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {onizleme.satirlar.length > 300 ? (
          <p className="osm-not">
            İlk 300 satır gösteriliyor; {onizleme.satirlar.length} satırın tamamı aktarılacak.
          </p>
        ) : null}

        <button
          type="button"
          className="osm-buton"
          onClick={() => yaz(onizleme)}
          disabled={bekliyor || yazilacak === 0}
        >
          {bekliyor ? 'Aktarılıyor…' : `${yazilacak} noktayı içe aktar`}
        </button>
      </section>

      <details className="osm-sorgu">
        <summary>Gönderilen sorgu</summary>
        <pre>{onizleme.sorgu}</pre>
      </details>
    </>
  )
}
