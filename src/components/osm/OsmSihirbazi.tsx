'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { bilincliDisaridaGerekcesi } from '@/lib/osm/eslesme'
import {
  osmOnizlemesiHazirla,
  osmSatirlariniYaz,
  overpassSogumasi,
  poiHazirliginiBaslat,
  poiKutusunuIndir,
  poiMahalleEslestir,
} from '@/lib/osm/eylemler'
import type { GeriyeDonukSonuc } from '@/lib/osm/geriyeDonukEslesme'
import { sureMetni } from '@/lib/osm/yenidenDeneme'

import { denemeliCalistir, type DenemeBilgisi } from './denemeliCalistir'
import type { IceAktarmaDurumu, Onizleme, YazmaSonucu } from '@/lib/osm/iceAktarma'
import { VARSAYILAN_MARJ_METRE } from '@/lib/osm/sorgu'

/**
 * OSM içe aktarma sihirbazı — önce gör, sonra yaz.
 *
 * CSV içe aktarmadaki ilkenin aynısı: yüzlerce kaydı görmeden yazmak,
 * hatayı ancak veri girdikten sonra fark etmek demek.
 */
/** Parçalı POI indirmenin ilerlemesi. */
interface PoiIlerleme {
  toplam: number
  tamamlanan: number
  basarisiz: number[]
}

/**
 * İlerleme çubuğu ve yeniden deneme göstergesi.
 *
 * Sınır sihirbazındakiyle aynı ilke: "nerede olduğumuz" ile "neden
 * beklediğimiz" ayrı satırlarda.
 */
function PoiIlerlemeCubugu({
  ilerleme,
  deneme,
}: {
  ilerleme: PoiIlerleme
  deneme: DenemeBilgisi | null
}) {
  const yuzde = ilerleme.toplam === 0 ? 0 : (ilerleme.tamamlanan / ilerleme.toplam) * 100

  return (
    <div style={{ marginTop: '1rem' }}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={ilerleme.toplam}
        aria-valuenow={ilerleme.tamamlanan}
        aria-label="Bölgeler indiriliyor"
        style={{
          height: '0.5rem',
          borderRadius: '999px',
          background: 'var(--theme-elevation-100)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${yuzde}%`,
            height: '100%',
            background: 'var(--theme-success-500)',
            transition: 'width 200ms ease',
          }}
        />
      </div>

      <p className="osm-not" aria-live="polite">
        {ilerleme.tamamlanan}/{ilerleme.toplam} bölge indirildi
        {ilerleme.basarisiz.length > 0 ? ` · ${ilerleme.basarisiz.length} bölge düştü` : ''}
      </p>

      {deneme ? (
        <p className={deneme.kota ? 'osm-hata' : 'osm-not'} aria-live="polite">
          {deneme.mesaj}
        </p>
      ) : null}
    </div>
  )
}

export function OsmSihirbazi({ merkezliMahalleSayisi }: { merkezliMahalleSayisi: number }) {
  const [marj, setMarj] = useState(VARSAYILAN_MARJ_METRE)
  const [durum, setDurum] = useState<IceAktarmaDurumu | null>(null)
  const [sonuc, setSonuc] = useState<YazmaSonucu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, setBekliyor] = useState(false)
  const [deneme, setDeneme] = useState<DenemeBilgisi | null>(null)
  const [ilerleme, setIlerleme] = useState<PoiIlerleme | null>(null)
  const [soguma, setSoguma] = useState(0)
  const [eslestirme, setEslestirme] = useState<GeriyeDonukSonuc | null>(null)
  const [eslestirmeCalisiyor, setEslestirmeCalisiyor] = useState(false)

  /**
   * Geriye dönük mahalle eşleştirme.
   *
   * ⚠️ Overpass'a HİÇ dokunmuyor — veri zaten elimizde, eksik olan yalnızca
   * ilişki. Bu yüzden soğuma uyarısı ve yeniden deneme merdiveni burada
   * geçerli değil; kota tüketen bir iş değil.
   */
  async function mahalleleriEslestirCalistir(): Promise<void> {
    setEslestirmeCalisiyor(true)
    setEslestirme(null)
    try {
      const cevap = await poiMahalleEslestir()
      if (cevap.basarili && cevap.sonuc) setEslestirme(cevap.sonuc)
      else setHata(cevap.mesaj ?? 'Eşleştirme tamamlanamadı.')
    } finally {
      setEslestirmeCalisiyor(false)
    }
  }

  /**
   * ⚠️ SINIR İÇE AKTARMA AZ ÖNCE ÇALIŞTIYSA UYAR.
   *
   * İki ekran ayrı ama Overpass açısından aynı istemciyiz. Sınır içe
   * aktarmanın hemen ardından POI'ye başlamak doğrudan 429'a koşmak demek.
   *
   * Sayfa açılırken bir kez soruluyor; içe aktarma başladıktan sonra
   * göstermenin anlamı yok — o istekleri zaten biz yapıyoruz.
   */
  useEffect(() => {
    let iptal = false
    void overpassSogumasi().then(({ kalanSaniye }) => {
      if (!iptal) setSoguma(kalanSaniye)
    })
    return () => {
      iptal = true
    }
  }, [])

  /** Tek kutuyu indirir; geçici hatada üstel beklemeyle yeniden dener. */
  async function kutuyuIndir(sira: number): Promise<boolean> {
    const cevap = await denemeliCalistir({
      cagir: (denemeSirasi) => poiKutusunuIndir(sira, denemeSirasi),
      karar: (c) => ({
        tekrar: c.durum === 'yeniden_denenebilir' || c.durum === 'kota',
        kota: c.durum === 'kota',
        sunucuBeklemesiMs: c.durum === 'kota' ? c.sunucuBeklemesiMs : null,
      }),
      bildir: setDeneme,
    })
    setDeneme(null)
    return cevap.durum === 'tamam'
  }

  async function onizle(): Promise<void> {
    setSonuc(null)
    setHata(null)
    setDurum(null)
    setIlerleme(null)
    setBekliyor(true)

    try {
      // Kutuları hesaplamak ağ isteği gerektirmiyor; tek atışta yapılır.
      const hazirlik = await poiHazirliginiBaslat(marj)
      if (hazirlik.durum === 'merkez_yok') {
        setDurum({ durum: 'merkez_yok' })
        return
      }
      if (hazirlik.durum !== 'hazir') {
        setDurum({ durum: 'kutu_gecersiz', mesaj: hazirlik.mesaj })
        return
      }

      const basarisiz: number[] = []
      for (let sira = 0; sira < hazirlik.kutuSayisi; sira += 1) {
        setIlerleme({ toplam: hazirlik.kutuSayisi, tamamlanan: sira, basarisiz: [...basarisiz] })
        if (!(await kutuyuIndir(sira))) basarisiz.push(sira)
      }
      setIlerleme({
        toplam: hazirlik.kutuSayisi,
        tamamlanan: hazirlik.kutuSayisi,
        basarisiz: [...basarisiz],
      })

      // ⚠️ Kısmi sonuç korunuyor: düşen kutular gelenleri geçersiz kılmıyor.
      setDurum(await osmOnizlemesiHazirla())
    } finally {
      setDeneme(null)
      setBekliyor(false)
    }
  }

  /** Yalnızca düşen kutuları yeniden ister. */
  async function kalanlariDene(): Promise<void> {
    const dusenler = ilerleme?.basarisiz ?? []
    if (dusenler.length === 0) return

    setHata(null)
    setBekliyor(true)
    try {
      const halaDusen: number[] = []
      for (const sira of dusenler) {
        if (!(await kutuyuIndir(sira))) halaDusen.push(sira)
      }
      setIlerleme((onceki) =>
        onceki
          ? { ...onceki, tamamlanan: onceki.toplam - halaDusen.length, basarisiz: halaDusen }
          : onceki,
      )
      setDurum(await osmOnizlemesiHazirla())
    } finally {
      setDeneme(null)
      setBekliyor(false)
    }
  }

  async function yaz(onizleme: Onizleme): Promise<void> {
    setBekliyor(true)
    try {
      const cevap = await osmSatirlariniYaz(onizleme.satirlar)
      if (cevap.basarili && cevap.sonuc) {
        setSonuc(cevap.sonuc)
        setDurum(null)
        setIlerleme(null)
      } else {
        setHata(cevap.mesaj ?? 'İçe aktarma tamamlanamadı.')
      }
    } finally {
      setBekliyor(false)
    }
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

        <button
          type="button"
          className="osm-buton"
          onClick={() => void onizle()}
          disabled={bekliyor}
        >
          {bekliyor ? 'OpenStreetMap sorgulanıyor…' : 'Önizle'}
        </button>

        {/* ⚠️ Uyarı, engel değil: buton açık kalıyor. */}
        {soguma > 0 && !ilerleme && !bekliyor ? (
          <p className="osm-not" style={{ marginTop: '0.75rem' }}>
            <strong>Sınır içe aktarma az önce çalıştı.</strong> İki işlem aynı OpenStreetMap
            kotasını paylaşıyor; hemen başlarsanız sunucu bizi kısıtlayabilir (429).{' '}
            <strong>~{sureMetni(soguma)}</strong> bekleyip denemeniz daha hızlı sonuçlanır. Yine de
            şimdi başlayabilirsiniz.
          </p>
        ) : null}

        {ilerleme ? <PoiIlerlemeCubugu ilerleme={ilerleme} deneme={deneme} /> : null}

        {/* ⚠️ KISMİ SONUÇ: düşen kutular gelenleri geçersiz kılmıyor. */}
        {ilerleme && ilerleme.basarisiz.length > 0 && !bekliyor ? (
          <div className="osm-hata">
            <strong>
              {ilerleme.toplam - ilerleme.basarisiz.length}/{ilerleme.toplam} bölge geldi.
            </strong>{' '}
            {ilerleme.basarisiz.length} bölge dört denemede de gelmedi — OpenStreetMap sunucuları şu
            an yoğun. Gelen noktalar duruyor, kaybolmadı.
            <p style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="osm-buton"
                onClick={() => void kalanlariDene()}
                disabled={bekliyor}
              >
                Kalan {ilerleme.basarisiz.length} bölgeyi tekrar dene
              </button>
            </p>
          </div>
        ) : null}
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

          {/* ⚠️ "Kesin" ile "yaklaşık" ayrı sayılıyor. İkisi aynı kutuya
              konsaydı mahalle sayfası komşu mahallenin okulunu kendi okulu
              gibi gösterir ve bunu kimse fark edemezdi. */}
          <p className="osm-basari">
            <strong>{sonuc.eslesme.kesin} nokta mahalleye eşleşti</strong>
            {sonuc.eslesme.yaklasik > 0 ? (
              <>
                , <strong>{sonuc.eslesme.yaklasik} nokta yaklaşık</strong> — hiçbir sınırın içinde
                değil, en yakın mahalle merkezine atandı ve işaretlendi
              </>
            ) : null}
            {sonuc.eslesme.eslesmeyen > 0
              ? `, ${sonuc.eslesme.eslesmeyen} nokta hiç eşleşmedi (mahalle merkezi tanımlı değil)`
              : ''}
            .
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

      {/* ── Geriye dönük eşleştirme ──────────────────────────────────── */}
      <section className="osm-adim">
        <h2>Mevcut noktaları mahallelere eşleştir</h2>
        <p className="osm-not">
          POI&apos;ler mahalle sınırları henüz yokken içe aktarıldıysa mahallesiz kalmış olabilir.
          Bu düğme <strong>OpenStreetMap&apos;e hiç dokunmadan</strong> elimizdeki noktaları mevcut
          sınırlarla eşleştirir — veri zaten bizde, eksik olan yalnızca ilişki.
        </p>
        <p className="osm-not">
          Elle düzeltilmiş kayıtlar atlanır; mahalle ilişkisini panelden değiştirdiyseniz o kayıt
          bir daha ezilmez.
        </p>

        <button
          type="button"
          className="osm-buton"
          onClick={() => void mahalleleriEslestirCalistir()}
          disabled={eslestirmeCalisiyor}
        >
          {eslestirmeCalisiyor ? 'Eşleştiriliyor…' : 'Mevcut noktaları eşleştir'}
        </button>

        {eslestirme ? (
          <p className="osm-basari" style={{ marginTop: '0.75rem' }}>
            {eslestirme.incelenen} kayıt incelendi · {eslestirme.guncellenen} güncellendi ·{' '}
            {eslestirme.degismeyen} zaten doğruydu · {eslestirme.korunan} elle düzeltilmiş kayıt
            korundu.
            <br />
            <strong>{eslestirme.ozet.kesin} nokta mahalleye eşleşti</strong>,{' '}
            <strong>{eslestirme.ozet.yaklasik} nokta yaklaşık</strong>
            {eslestirme.ozet.eslesmeyen > 0
              ? `, ${eslestirme.ozet.eslesmeyen} nokta hiç eşleşmedi`
              : ''}
            .
          </p>
        ) : null}

        {eslestirme && eslestirme.hatalar.length > 0 ? (
          <ul className="osm-hata-liste">
            {eslestirme.hatalar.slice(0, 20).map((h) => (
              <li key={h.ad}>
                {h.ad}: {h.mesaj}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
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
          onClick={() => void yaz(onizleme)}
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
