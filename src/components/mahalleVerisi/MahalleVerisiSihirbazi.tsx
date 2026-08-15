'use client'

import { useEffect, useState, useTransition } from 'react'

import { denemeliCalistir, type DenemeBilgisi } from '@/components/osm/denemeliCalistir'
import { overpassSogumasi } from '@/lib/osm/eylemler'
import { sureMetni } from '@/lib/osm/yenidenDeneme'
import {
  mahalleListesiniOnizle,
  mahalleListesiniYaz,
  mahalleSinirlariniOnizle,
  mahalleSinirlariniYaz,
  sinirGrubunuIndir,
  sinirHazirliginiBaslat,
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
                <strong>silmez</strong> — karar sizin. Yanlış ilçeye ait bir kayıt (Velimeşe ve
                Yeşiltepe Ergene ilçesine bağlıdır) buradaysa panelden silebilirsiniz.
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
            onClick={() => void yaz()}
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

/** Parçalı indirmenin ilerlemesi. */
interface Ilerleme {
  toplam: number
  tamamlanan: number
  /** Dört denemede de gelmeyen grupların sırası. */
  basarisiz: number[]
}

/**
 * İlerleme çubuğu ve yeniden deneme göstergesi.
 *
 * ⚠️ İkisi ayrı satırda: biri "nerede olduğumuzu", diğeri "neden
 * beklediğimizi" söylüyor. Tek satıra sıkıştırmak, bekleme sırasında
 * ilerlemeyi görünmez kılardı.
 */
function IlerlemeCubugu({
  ilerleme,
  deneme,
}: {
  ilerleme: Ilerleme
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
        aria-label="Sınır grupları indiriliyor"
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

      <p className="aktarim-not" aria-live="polite">
        {ilerleme.tamamlanan}/{ilerleme.toplam} grup indirildi
        {ilerleme.basarisiz.length > 0 ? ` · ${ilerleme.basarisiz.length} grup düştü` : ''}
      </p>

      {deneme ? (
        <p className={deneme.kota ? 'aktarim-hata' : 'aktarim-not'} aria-live="polite">
          {deneme.mesaj}
        </p>
      ) : null}
    </div>
  )
}

function SinirAdimi() {
  const [onizleme, setOnizleme] = useState<SinirOnizlemesi | null>(null)
  const [sonuc, setSonuc] = useState<SinirYazmaSonucu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [mahalleYok, setMahalleYok] = useState(false)
  const [bekliyor, setBekliyor] = useState(false)
  const [deneme, setDeneme] = useState<DenemeBilgisi | null>(null)
  const [ilerleme, setIlerleme] = useState<Ilerleme | null>(null)
  const [soguma, setSoguma] = useState(0)

  /**
   * ⚠️ POI içe aktarma az önce çalıştıysa uyar.
   *
   * Simetrik durum: iki ekran ayrı ama Overpass açısından aynı istemciyiz.
   * Hangisi önce çalışırsa çalışsın, hemen ardından diğerine başlamak 429
   * riskini doğuruyor.
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

  /**
   * Tek grubu indirir; geçici hatada üstel beklemeyle yeniden dener.
   *
   * ⚠️ Kalıcı hata ile geçici hata AYRI: 400 (bozuk sorgu) ya da 403
   * (engellendi) tekrar denenmiyor. Paylaşımlı bir kaynağa cevabını
   * duymadan yüklenmek nezaketsizlik olurdu.
   */
  async function grubuIndir(sira: number): Promise<boolean> {
    const cevap = await denemeliCalistir({
      cagir: (denemeSirasi) => sinirGrubunuIndir(sira, denemeSirasi),
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

  /** Önizlemeyi sunucudaki birikmiş hazırlıktan kurar. */
  async function onizlemeyiKur(): Promise<void> {
    const durum = await mahalleSinirlariniOnizle()
    if (durum.durum === 'hazir') setOnizleme(durum.onizleme)
    else if (durum.durum === 'mahalle_yok') setMahalleYok(true)
    else setHata(durum.mesaj)
  }

  async function onizle(): Promise<void> {
    setSonuc(null)
    setHata(null)
    setMahalleYok(false)
    setOnizleme(null)
    setIlerleme(null)
    setBekliyor(true)

    try {
      // ── 1. faz: kimlikler (ucuz sorgu, geometri istemez) ──
      const hazirlik = await denemeliCalistir({
        cagir: (denemeSirasi) => sinirHazirliginiBaslat(denemeSirasi),
        karar: (c) => ({
          tekrar: c.durum === 'yeniden_denenebilir' || c.durum === 'kota',
          kota: c.durum === 'kota',
          sunucuBeklemesiMs: c.durum === 'kota' ? c.sunucuBeklemesiMs : null,
        }),
        bildir: setDeneme,
      })
      setDeneme(null)

      if (hazirlik.durum === 'mahalle_yok') {
        setMahalleYok(true)
        return
      }
      if (hazirlik.durum !== 'hazir') {
        setHata(hazirlik.mesaj)
        return
      }

      // ── 2. faz: gruplar ──
      const basarisiz: number[] = []
      for (let sira = 0; sira < hazirlik.grupSayisi; sira += 1) {
        setIlerleme({ toplam: hazirlik.grupSayisi, tamamlanan: sira, basarisiz: [...basarisiz] })
        if (!(await grubuIndir(sira))) basarisiz.push(sira)
      }
      setIlerleme({
        toplam: hazirlik.grupSayisi,
        tamamlanan: hazirlik.grupSayisi,
        basarisiz: [...basarisiz],
      })

      /**
       * ⚠️ KISMİ SONUÇ KORUNUYOR. Bir grup dört denemede de gelmezse
       * diğerleri çöpe gitmiyor: önizleme gelenlerle kuruluyor ve
       * "kalanları tekrar dene" düğmesi yalnızca düşen grupları istiyor.
       */
      await onizlemeyiKur()
    } finally {
      setDeneme(null)
      setBekliyor(false)
    }
  }

  /** Yalnızca düşen grupları yeniden ister. */
  async function kalanlariDene(): Promise<void> {
    const dusenler = ilerleme?.basarisiz ?? []
    if (dusenler.length === 0) return

    setHata(null)
    setBekliyor(true)
    try {
      const halaDusen: number[] = []
      for (const sira of dusenler) {
        if (!(await grubuIndir(sira))) halaDusen.push(sira)
      }
      setIlerleme((onceki) =>
        onceki
          ? {
              ...onceki,
              tamamlanan: onceki.toplam - halaDusen.length,
              basarisiz: halaDusen,
            }
          : onceki,
      )
      await onizlemeyiKur()
    } finally {
      setDeneme(null)
      setBekliyor(false)
    }
  }

  async function yaz(): Promise<void> {
    setHata(null)
    setBekliyor(true)
    try {
      const cevap = await mahalleSinirlariniYaz()
      if (cevap.basarili && cevap.sonuc) {
        setSonuc(cevap.sonuc)
        setOnizleme(null)
        setIlerleme(null)
      } else {
        setHata(cevap.mesaj ?? 'Sınırlar yazılamadı.')
      }
    } finally {
      setBekliyor(false)
    }
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

      <button
        type="button"
        className="aktarim-buton"
        onClick={() => void onizle()}
        disabled={bekliyor}
      >
        {bekliyor ? 'OpenStreetMap sorgulanıyor…' : 'Sınırları önizle'}
      </button>

      {/* ⚠️ Uyarı, engel değil: buton açık kalıyor. */}
      {soguma > 0 && !ilerleme && !bekliyor ? (
        <p className="aktarim-not" style={{ marginTop: '0.75rem' }}>
          <strong>Az önce başka bir OpenStreetMap içe aktarması çalıştı.</strong> İki işlem aynı
          kotayı paylaşıyor; hemen başlarsanız sunucu bizi kısıtlayabilir (429).{' '}
          <strong>~{sureMetni(soguma)}</strong> bekleyip denemeniz daha hızlı sonuçlanır. Yine de
          şimdi başlayabilirsiniz.
        </p>
      ) : null}

      {ilerleme ? <IlerlemeCubugu ilerleme={ilerleme} deneme={deneme} /> : null}

      {/* ⚠️ KISMİ SONUÇ: düşen gruplar gelenleri geçersiz kılmıyor. */}
      {ilerleme && ilerleme.basarisiz.length > 0 && !bekliyor ? (
        <div className="aktarim-hata">
          <strong>
            {ilerleme.toplam - ilerleme.basarisiz.length}/{ilerleme.toplam} grup geldi.
          </strong>{' '}
          {ilerleme.basarisiz.length} grup dört denemede de gelmedi — OpenStreetMap sunucuları şu an
          yoğun. Gelenler duruyor, kaybolmadı.
          <p style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="aktarim-buton"
              onClick={() => void kalanlariDene()}
              disabled={bekliyor}
            >
              Kalan {ilerleme.basarisiz.length} grubu tekrar dene
            </button>
          </p>
        </div>
      ) : null}

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
