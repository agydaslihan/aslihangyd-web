'use client'

import { useState, useTransition } from 'react'

import {
  mahalleListesiniOnizle,
  mahalleListesiniYaz,
  mahalleSinirlariniOnizle,
  mahalleSinirlariniYaz,
} from '@/lib/mahalle/eylemler'
import type { ListeOnizlemesi, ListeYazmaSonucu } from '@/lib/mahalle/listeIceAktarma'
import type { SinirOnizlemesi, SinirYazmaSonucu } from '@/lib/mahalle/sinirIceAktarma'
import { ILCE_ADI } from '@/lib/mahalle/sinirSorgusu'

/**
 * Mahalle verisi sihirbazı — önce gör, sonra yaz.
 *
 * İki adım, zorunlu sırayla: mahalleler açılmadan sınır yazılacak bir kayıt
 * olmaz. Sıra ekranda görünür durumda; ikinci adım birinci tamamlanmadan da
 * çalıştırılabilir ama sonucunda ne olacağını önizleme açıkça söyler.
 */
export function MahalleVerisiSihirbazi({
  merkezSayisi,
  kirsalSayisi,
}: {
  merkezSayisi: number
  kirsalSayisi: number
}) {
  return (
    <>
      <ListeAdimi merkezSayisi={merkezSayisi} kirsalSayisi={kirsalSayisi} />
      <SinirAdimi />
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · Mahalle listesi
   ══════════════════════════════════════════════════════════════════════════ */

function ListeAdimi({
  merkezSayisi,
  kirsalSayisi,
}: {
  merkezSayisi: number
  kirsalSayisi: number
}) {
  const [onizleme, setOnizleme] = useState<ListeOnizlemesi | null>(null)
  const [sonuc, setSonuc] = useState<ListeYazmaSonucu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [bekliyor, basla] = useTransition()

  function onizle(): void {
    setSonuc(null)
    setHata(null)
    basla(async () => {
      const cevap = await mahalleListesiniOnizle()
      if (cevap.basarili && cevap.onizleme) setOnizleme(cevap.onizleme)
      else setHata(cevap.mesaj ?? 'Önizleme hazırlanamadı.')
    })
  }

  function yaz(): void {
    setHata(null)
    basla(async () => {
      const cevap = await mahalleListesiniYaz()
      if (cevap.basarili && cevap.sonuc) {
        setSonuc(cevap.sonuc)
        setOnizleme(null)
      } else {
        setHata(cevap.mesaj ?? 'Mahalleler açılamadı.')
      }
    })
  }

  const yazilacak = (onizleme?.yeniSayisi ?? 0) + (onizleme?.turEklenecekSayisi ?? 0)

  return (
    <section className="aktarim-adim">
      <h2>1 · Çorlu mahalle listesi</h2>

      <p className="aktarim-not">
        {merkezSayisi} merkez mahalle ve {kirsalSayisi} kırsal mahalle (eski köy) tanımlı. Yalnızca{' '}
        <strong>ad</strong> ve <strong>yerleşim türü</strong> yazılır; kayıtlar yayına alınmadan,
        tüm rakamlar boş açılır.
      </p>

      <button type="button" className="aktarim-buton" onClick={onizle} disabled={bekliyor}>
        {bekliyor ? 'Bakılıyor…' : 'Ne yazılacağını göster'}
      </button>

      {hata ? <p className="aktarim-hata">{hata}</p> : null}

      {onizleme ? (
        <>
          <div className="aktarim-ozet" style={{ marginTop: '1rem' }}>
            <span className="aktarim-rozet aktarim-rozet--yeni">
              {onizleme.yeniSayisi} yeni mahalle
            </span>
            <span className="aktarim-rozet">
              {onizleme.turEklenecekSayisi} kayda yerleşim türü eklenecek
            </span>
            <span className="aktarim-rozet aktarim-rozet--korunacak">
              {onizleme.mevcutSayisi} kayıt zaten tam
            </span>
          </div>

          <div className="aktarim-tablo-sarmal">
            <table className="aktarim-tablo">
              <thead>
                <tr>
                  <th scope="col">İşlem</th>
                  <th scope="col">Mahalle</th>
                  <th scope="col">Yerleşim türü</th>
                  <th scope="col">Adres (slug)</th>
                </tr>
              </thead>
              <tbody>
                {onizleme.satirlar.map((satir) => (
                  <tr
                    key={satir.slug}
                    className={
                      satir.islem === 'yeni'
                        ? 'aktarim-satir--yeni'
                        : satir.islem === 'mevcut'
                          ? 'aktarim-satir--korunacak'
                          : undefined
                    }
                  >
                    <td>
                      {satir.islem === 'yeni'
                        ? 'Yeni'
                        : satir.islem === 'tur_eklenecek'
                          ? 'Tür eklenecek'
                          : 'Dokunulmayacak'}
                    </td>
                    <td>{satir.mahalle.ad}</td>
                    <td>{satir.mahalle.tur === 'merkez' ? 'Merkez' : 'Kırsal (eski köy)'}</td>
                    <td>
                      <code>{satir.slug}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {onizleme.listeDisiKayitlar.length > 0 ? (
            <>
              <h3>Listede olmayan mahalle kayıtları</h3>
              <p className="aktarim-not">
                Bunlar sistemde var ama Çorlu listemizde yok. İçe aktarma hiçbir kaydı{' '}
                <strong>silmez</strong> — karar sizin. Yanlış ilçeye ait bir kayıt (örn. Velimeşe)
                buradaysa panelden silebilirsiniz.
              </p>
              <ul className="aktarim-liste">
                {onizleme.listeDisiKayitlar.map((kayit) => (
                  <li key={kayit.id}>
                    {kayit.ad} <code>{kayit.slug}</code>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <button
            type="button"
            className="aktarim-buton"
            onClick={yaz}
            disabled={bekliyor || yazilacak === 0}
          >
            {bekliyor ? 'Açılıyor…' : `${yazilacak} kaydı oluştur/güncelle`}
          </button>
        </>
      ) : null}

      {sonuc ? (
        <p className="aktarim-basari">
          {sonuc.eklenen} mahalle açıldı, {sonuc.turEklenen} kayda yerleşim türü eklendi,{' '}
          {sonuc.atlanan} kayıt zaten tamdı.
        </p>
      ) : null}

      {sonuc && sonuc.hatalar.length > 0 ? (
        <ul className="aktarim-hata-liste">
          {sonuc.hatalar.map((h) => (
            <li key={h.ad}>
              {h.ad}: {h.mesaj}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · Sınırlar
   ══════════════════════════════════════════════════════════════════════════ */

function SinirAdimi() {
  const [onizleme, setOnizleme] = useState<SinirOnizlemesi | null>(null)
  const [sonuc, setSonuc] = useState<SinirYazmaSonucu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [mahalleYok, setMahalleYok] = useState(false)
  const [bekliyor, basla] = useTransition()

  function onizle(): void {
    setSonuc(null)
    setHata(null)
    setMahalleYok(false)
    basla(async () => {
      const durum = await mahalleSinirlariniOnizle()
      if (durum.durum === 'hazir') setOnizleme(durum.onizleme)
      else if (durum.durum === 'mahalle_yok') setMahalleYok(true)
      else setHata(durum.mesaj)
    })
  }

  function yaz(): void {
    setHata(null)
    basla(async () => {
      const cevap = await mahalleSinirlariniYaz()
      if (cevap.basarili && cevap.sonuc) {
        setSonuc(cevap.sonuc)
        setOnizleme(null)
      } else {
        setHata(cevap.mesaj ?? 'Sınırlar yazılamadı.')
      }
    })
  }

  const yazilacak = (onizleme?.yeniSayisi ?? 0) + (onizleme?.guncellenecekSayisi ?? 0)

  return (
    <section className="aktarim-adim">
      <h2>2 · Mahalle sınırları — OpenStreetMap</h2>

      <p className="aktarim-not">
        Sınırlar <strong>{ILCE_ADI} ilçesinin idari sınırı</strong> içinde aranıyor — koda koordinat
        gömülmedi, OpenStreetMap&apos;e ilçenin adı soruluyor. Sınırı gelen her mahalleye ayrıca{' '}
        <strong>merkez noktası</strong> da hesaplanır; böylece haritalar ve POI içe aktarma çalışır
        hâle gelir.
      </p>

      <p className="aktarim-not">
        Sınır yalnızca <strong>adı sistemde olan</strong> bir mahalleye yazılır. Komşu ilçeden gelen
        kayıtlar bu yüzden kendiliğinden elenir; elenenler aşağıda listelenir.
      </p>

      <button type="button" className="aktarim-buton" onClick={onizle} disabled={bekliyor}>
        {bekliyor ? 'OpenStreetMap sorgulanıyor…' : 'Sınırları önizle'}
      </button>

      {mahalleYok ? (
        <p className="aktarim-hata">
          Sistemde hiç mahalle kaydı yok. Önce yukarıdaki 1. adımı çalıştırın.
        </p>
      ) : null}

      {hata ? <p className="aktarim-hata">{hata}</p> : null}

      {onizleme ? (
        <>
          <div className="aktarim-ozet" style={{ marginTop: '1rem' }}>
            <span className="aktarim-rozet aktarim-rozet--yeni">
              {onizleme.yeniSayisi} yeni sınır
            </span>
            <span className="aktarim-rozet">{onizleme.guncellenecekSayisi} tazelenecek</span>
            <span className="aktarim-rozet aktarim-rozet--korunacak">
              {onizleme.korunacakSayisi} korunacak (elle çizilmiş/düzeltilmiş)
            </span>
            <span className="aktarim-rozet">{onizleme.eslesmeyenSayisi} eşleşmedi</span>
          </div>

          <div className="aktarim-tablo-sarmal">
            <table className="aktarim-tablo">
              <thead>
                <tr>
                  <th scope="col">İşlem</th>
                  <th scope="col">OSM adı</th>
                  <th scope="col">Eşleşen mahalle</th>
                  <th scope="col">Merkez</th>
                  <th scope="col">Nokta sayısı</th>
                </tr>
              </thead>
              <tbody>
                {onizleme.satirlar.map((satir) => (
                  <tr
                    key={satir.aday.osmKimlik}
                    className={
                      satir.islem === 'yeni'
                        ? 'aktarim-satir--yeni'
                        : satir.islem === 'korunacak'
                          ? 'aktarim-satir--korunacak'
                          : undefined
                    }
                  >
                    <td>
                      {satir.islem === 'yeni'
                        ? 'Yeni'
                        : satir.islem === 'guncellenecek'
                          ? 'Tazelenecek'
                          : satir.islem === 'korunacak'
                            ? 'Korunacak'
                            : 'Eşleşmedi'}
                    </td>
                    <td>{satir.aday.osmAdi}</td>
                    <td>{satir.mahalleAdi ?? '—'}</td>
                    <td>
                      {satir.islem === 'eslesmedi'
                        ? '—'
                        : satir.merkeziYaz
                          ? 'yazılacak'
                          : 'elle girilmiş, korunacak'}
                    </td>
                    <td>{satir.aday.noktaSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {onizleme.sinirsizMahalleler.length > 0 ? (
            <>
              <h3>OpenStreetMap&apos;te sınırı bulunamayan mahalleler</h3>
              <p className="aktarim-not">
                OSM gönüllü katkıyla büyür; Türkiye&apos;de mahalle sınırı kapsaması düzensizdir.
                Bunların sınırını elle çizmek isterseniz geojson.io kullanıp Konum sekmesine
                yapıştırabilirsiniz — elle çizilen sınır bu ekran tarafından bir daha ezilmez.
              </p>
              <ul className="aktarim-liste">
                {onizleme.sinirsizMahalleler.map((mahalle) => (
                  <li key={mahalle.id}>{mahalle.ad}</li>
                ))}
              </ul>
            </>
          ) : null}

          {onizleme.ozet.adsizAtlandi > 0 || onizleme.ozet.geometrisizAtlandi > 0 ? (
            <p className="aktarim-not">
              {onizleme.ozet.adsizAtlandi > 0
                ? `${onizleme.ozet.adsizAtlandi} sınır adı olmadığı için atlandı. `
                : ''}
              {onizleme.ozet.geometrisizAtlandi > 0
                ? `${onizleme.ozet.geometrisizAtlandi} sınır kapalı bir alana dönüşmediği için ` +
                  'atlandı — yarım bir sınır haritada sessizce yanlış alan gösterirdi.'
                : ''}
            </p>
          ) : null}

          <button
            type="button"
            className="aktarim-buton"
            onClick={yaz}
            disabled={bekliyor || yazilacak === 0}
          >
            {bekliyor ? 'Yazılıyor…' : `${yazilacak} sınırı yaz`}
          </button>

          <details className="aktarim-sorgu">
            <summary>Gönderilen sorgu</summary>
            <pre>{onizleme.sorgu}</pre>
          </details>
        </>
      ) : null}

      {sonuc ? (
        <p className="aktarim-basari">
          {sonuc.yazilan} mahallenin sınırı yazıldı, {sonuc.korunan} elle düzeltilmiş sınır korundu,{' '}
          {sonuc.eslesmeyen} OSM kaydı eşleşmedi
          {sonuc.merkeziKorunan > 0
            ? `, ${sonuc.merkeziKorunan} mahallede elle girilmiş merkez noktası korundu`
            : ''}
          .
        </p>
      ) : null}

      {sonuc && sonuc.hatalar.length > 0 ? (
        <ul className="aktarim-hata-liste">
          {sonuc.hatalar.map((h) => (
            <li key={h.ad}>
              {h.ad}: {h.mesaj}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
