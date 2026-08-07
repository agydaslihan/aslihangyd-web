'use client'

import { useState } from 'react'

import {
  GORSEL_BICIMLERI,
  paylasimMetni,
  type GorselBicimi,
  type PaylasimGirdisi,
} from '@/lib/sosyal/metin'

/**
 * Bir ilanın sosyal medya materyali.
 *
 * ⚠️ İstemci bileşeni — çünkü "kopyala" ve "tümünü indir" tarayıcı
 * eylemleri. Metin ve bağlantı SUNUCUDA üretilmiyor; aynı saf motor
 * burada da çağrılıyor, böylece görülen metin ile kopyalanan metin
 * ayrışamaz.
 */
export function SosyalKart({
  ilan,
  siteAdresi,
}: {
  ilan: PaylasimGirdisi & { id: number }
  siteAdresi: string
}) {
  const [kopyalandi, setKopyalandi] = useState(false)
  const [indiriliyor, setIndiriliyor] = useState(false)

  const metin = paylasimMetni(ilan, siteAdresi)

  function gorselAdresi(bicim: GorselBicimi): string {
    return `/api/sosyal/gorsel/${bicim}/${ilan.id}`
  }

  async function metniKopyala() {
    try {
      await navigator.clipboard.writeText(metin)
      setKopyalandi(true)
      window.setTimeout(() => setKopyalandi(false), 2500)
    } catch {
      /**
       * ⚠️ Sessizce yutulmuyor.
       *
       * Pano izni reddedilmiş olabilir (tarayıcı ayarı, HTTP bağlamı).
       * "Kopyalandı" yazıp kopyalamamak, kullanıcının boş bir panoyu
       * yapıştırmasına ve gönderiyi eksik paylaşmasına yol açardı.
       */
      window.alert(
        'Pano erişimi reddedildi. Metni aşağıdaki kutudan elle seçip kopyalayabilirsiniz.',
      )
    }
  }

  /**
   * "Tümünü indir" — her biçim için bir dosya.
   *
   * ⚠️ Zip üretilmiyor. Bir zip kütüphanesi eklemek, iki dosya indirmek
   * için taşınacak bağımlılığın karşılığını vermez. Tarayıcı arka arkaya
   * iki indirmeyi sorunsuz yapıyor.
   */
  async function tumunuIndir() {
    setIndiriliyor(true)
    try {
      for (const bicim of Object.keys(GORSEL_BICIMLERI) as GorselBicimi[]) {
        const yanit = await fetch(gorselAdresi(bicim))
        if (!yanit.ok) throw new Error(`Görsel üretilemedi (${bicim})`)

        const blob = await yanit.blob()
        const adres = URL.createObjectURL(blob)
        const bag = document.createElement('a')
        bag.href = adres
        bag.download = `${ilan.slug}-${bicim}.png`
        document.body.appendChild(bag)
        bag.click()
        bag.remove()
        URL.revokeObjectURL(adres)
      }
    } catch (hata) {
      window.alert(
        `Görseller indirilemedi: ${hata instanceof Error ? hata.message : 'bilinmeyen hata'}`,
      )
    } finally {
      setIndiriliyor(false)
    }
  }

  return (
    <article className="sosyal-kart">
      <h2 className="sosyal-kart-baslik">{ilan.baslik}</h2>

      <div className="sosyal-kart-onizleme">
        {(
          Object.entries(GORSEL_BICIMLERI) as [
            GorselBicimi,
            (typeof GORSEL_BICIMLERI)[GorselBicimi],
          ][]
        ).map(([bicim, olcu]) => (
          <a
            key={bicim}
            className={`sosyal-onizleme sosyal-onizleme-${bicim}`}
            href={gorselAdresi(bicim)}
            target="_blank"
            rel="noreferrer"
            title={`${olcu.etiket} — yeni sekmede aç`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/image bu uçta işe yaramaz: görsel her istekte üretiliyor ve optimizasyon ikinci bir üretim turu demek. */}
            <img src={gorselAdresi(bicim)} alt={`${ilan.baslik} — ${olcu.etiket}`} loading="lazy" />
            <span className="sosyal-onizleme-etiket">{olcu.etiket}</span>
          </a>
        ))}
      </div>

      <div className="sosyal-kart-eylemler">
        <button type="button" onClick={tumunuIndir} disabled={indiriliyor}>
          {indiriliyor ? 'İndiriliyor…' : 'Tümünü indir'}
        </button>
        <button type="button" onClick={metniKopyala}>
          {kopyalandi ? 'Kopyalandı' : 'Metni kopyala'}
        </button>
      </div>

      {/* Metin görünür: kopyalanan ile görülen aynı olsun, ve pano çalışmazsa elle seçilebilsin. */}
      <pre className="sosyal-kart-metin">{metin}</pre>
    </article>
  )
}
