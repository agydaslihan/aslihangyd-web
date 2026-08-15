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

  const merkezSayisi = onizleme?.merkezSatirlari.length ?? 0
  const yazilacak =
    (onizleme?.yeniSayisi ?? 0) + (onizleme?.guncellenecekSayisi ?? 0) + merkezSayisi

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

      <p className="aktarim-not">
        <strong>Sınırı olmayan mahalle konumsuz kalmaz.</strong> Aynı sorgu ikinci bir küme daha
        getiriyor: OpenStreetMap&apos;teki adlandırılmış yerleşim noktaları. Sınırı bulunamayan bir
        mahallenin merkezi buradan alınır — poligon olmadan da harita odaklanır ve POI içe aktarma
        çalışır. Elle koordinat girmeniz gerekmez.
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
            {merkezSayisi > 0 ? (
              <span className="aktarim-rozet aktarim-rozet--yeni">
                {merkezSayisi} yalnızca merkez (sınırı yok)
              </span>
            ) : null}
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

          {/* ─────────────────────────────────────────────────────────────
              ⚠️ "HİÇ VERİ GELMEDİ" İLE "GELDİ AMA EŞLEŞMEDİ" AYRI ŞEYLER.

              15 Ağustos 2026'da sorgu bir kip hatası yüzünden sıfır aday
              döndürdü ve panel bunu "OSM'de sınır yok, elle çizin" diye
              gösterdi. Yanlış yönlendirmeydi: veri OSM'de vardı, biz
              alamıyorduk. Aslıhan o ekrana bakıp 27 mahalleyi elle çizmeye
              başlasaydı, günler boşa giderdi.

              Sıfır aday neredeyse her zaman BİZİM tarafımızda bir sorundur;
              bir ilçenin tek bir mahallesinin bile sınırsız olması normal,
              hepsinin birden olması değil.
              ───────────────────────────────────────────────────────────── */}
          {onizleme.satirlar.length === 0 ? (
            <div className="aktarim-hata">
              <strong>OpenStreetMap hiç sınır döndürmedi.</strong> Bu, &quot;bu bölgede sınır
              yok&quot; demek değildir — sorgunun kendisi sonuç bulamamış demektir. Elle çizmeye
              başlamadan önce aşağıdaki <em>Gönderilen sorgu</em> bölümünü açıp içeriğini
              geliştiriciye iletin. Sınırlar OSM&apos;de varken bizim yanlış yerde aramamız daha
              önce bir kez oldu.
            </div>
          ) : null}

          {onizleme.merkezSatirlari.length > 0 ? (
            <>
              <h3>Sınırı yok — merkezi yerleşim noktasından gelecek</h3>
              <p className="aktarim-not">
                Bu mahallelerin OpenStreetMap&apos;te sınır poligonu yok ama adlandırılmış bir
                yerleşim noktası var. Merkez oradan alınıyor; <strong>sınır alanı boş kalır</strong>{' '}
                — noktadan poligon uydurulmuyor, çünkü haritada gerçek sanılan sahte bir alan
                gösterirdi.
              </p>
              <div className="aktarim-tablo-sarmal">
                <table className="aktarim-tablo">
                  <thead>
                    <tr>
                      <th scope="col">Mahalle</th>
                      <th scope="col">OSM adı</th>
                      <th scope="col">Yer türü</th>
                      <th scope="col">Merkez</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onizleme.merkezSatirlari.map((satir) => (
                      <tr key={satir.mahalleId} className="aktarim-satir--yeni">
                        <td>{satir.mahalleAdi}</td>
                        <td>{satir.aday.osmAdi}</td>
                        <td>
                          <code>{satir.aday.yerTuru}</code>
                        </td>
                        <td>
                          {satir.aday.merkez[1]?.toFixed(5)}, {satir.aday.merkez[0]?.toFixed(5)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {/* ─────────────────────────────────────────────────────────────
              ⚠️ BOŞ BIRAKILAN VERİ — UYDURULMAYAN VERİ.

              Ne sınırı ne yerleşim noktası bulunan mahalle konumsuz kalıyor.
              Yaklaşık bir koordinat üretmek (ilçe merkezine koymak, komşu
              mahalleden türetmek) haritayı çalışır gösterir ve yanlışlığı
              aylarca fark edilmezdi. Eksik olan görünür; yanlış olan görünmez.
              ───────────────────────────────────────────────────────────── */}
          {onizleme.kaynaksizMahalleler.length > 0 ? (
            <>
              <h3>Hiçbir kaynaktan konum bulunamadı — boş bırakılıyor</h3>
              <p className="aktarim-not">
                Bu mahalleler için OpenStreetMap&apos;te ne sınır poligonu ne de adlandırılmış bir
                yerleşim noktası var. <strong>Yaklaşık koordinat üretilmiyor:</strong> uydurulmuş
                bir merkez, haritayı çalışıyor gibi gösterip yanlış yeri işaret ederdi.
              </p>
              <p className="aktarim-not">
                Bir mahalle burada çıkıyorsa ilk kontrol edilecek şey adının doğru yazıldığı ve{' '}
                <strong>gerçekten {ILCE_ADI} ilçesine ait olduğudur</strong> — komşu ilçenin
                mahallesi bu ilçe içinde aranınca elbette bulunamaz.
              </p>
              <ul className="aktarim-liste">
                {onizleme.kaynaksizMahalleler.map((mahalle) => (
                  <li key={mahalle.id}>{mahalle.ad}</li>
                ))}
              </ul>
            </>
          ) : null}

          {onizleme.sinirsizMahalleler.length > 0 && onizleme.satirlar.length > 0 ? (
            <details className="aktarim-sorgu">
              <summary>
                Sınır poligonu olmayan {onizleme.sinirsizMahalleler.length} mahallenin tamamı
              </summary>
              <p className="aktarim-not">
                OSM gönüllü katkıyla büyür; Türkiye&apos;de mahalle sınırı kapsaması düzensizdir.
                Yukarıdakilerin merkezi yine de otomatik geliyor. Sınırı elle çizmek isterseniz
                geojson.io kullanıp Konum sekmesine yapıştırabilirsiniz — elle çizilen sınır bu
                ekran tarafından bir daha ezilmez.
              </p>
              <ul className="aktarim-liste">
                {onizleme.sinirsizMahalleler.map((mahalle) => (
                  <li key={mahalle.id}>{mahalle.ad}</li>
                ))}
              </ul>
            </details>
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
            {bekliyor
              ? 'Yazılıyor…'
              : merkezSayisi > 0
                ? `${yazilacak} kaydı yaz (${merkezSayisi}'i yalnızca merkez)`
                : `${yazilacak} sınırı yaz`}
          </button>

          <details className="aktarim-sorgu">
            <summary>Gönderilen sorgu</summary>
            <pre>{onizleme.sorgu}</pre>
          </details>
        </>
      ) : null}

      {sonuc ? (
        <>
          <p className="aktarim-basari">
            {sonuc.yazilan} mahallenin sınırı yazıldı, {sonuc.korunan} elle düzeltilmiş sınır
            korundu, {sonuc.eslesmeyen} OSM kaydı eşleşmedi
            {sonuc.merkeziKorunan > 0
              ? `, ${sonuc.merkeziKorunan} mahallede elle girilmiş merkez noktası korundu`
              : ''}
            {sonuc.merkezYazilan > 0
              ? `, ${sonuc.merkezYazilan} mahalleye sınırı olmadığı hâlde yerleşim noktasından merkez yazıldı`
              : ''}
            .
          </p>

          {/* ⚠️ Bulunamayanlar başarı mesajının içine gömülmüyor: boş kalan
              veri, yazılan veri kadar görünür olmalı. */}
          {sonuc.kaynaksiz.length > 0 ? (
            <p className="aktarim-not">
              <strong>Konumu bulunamayan {sonuc.kaynaksiz.length} mahalle boş bırakıldı:</strong>{' '}
              {sonuc.kaynaksiz.map((mahalle) => mahalle.ad).join(', ')}. Bunlar için ne sınır ne
              yerleşim noktası vardı; koordinat uydurulmadı.
            </p>
          ) : null}
        </>
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
