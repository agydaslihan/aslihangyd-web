'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { eidsDegerlendir, EIDS_DURUMLARI, EIDS_DURUM_ETIKETLERI, type EidsDurum } from '@/lib/eids'
import { CEPHE_YONLERI } from '@/lib/gunes/cephe'
import { gostergeleriHesapla, type IlanGostergeleri } from '@/lib/ilan/hesaplamalar'
import { ilanTaslaginiKaydet } from '@/lib/sihirbaz/eylemler'
import { sihirbazGorseliYukle } from '@/lib/sihirbaz/gorselEylemleri'
import { benzerIlanOnerileri } from '@/lib/sihirbaz/oneriEylemleri'
import type { Oneri } from '@/lib/sihirbaz/oneriTipleri'
import { ADIMLAR, VARSAYILAN_KATEGORI, VARSAYILAN_TIP, adimHatalari } from '@/lib/sihirbaz/sema'
import {
  BINA_KULLANIM_DURUMLARI,
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
  ISINMA_TIPLERI,
  ODA_SAYILARI,
  TAPU_DURUMLARI,
  VARSAYILAN_IL,
  VARSAYILAN_ILCE,
} from '@/lib/secenekler'

import { Alan, Metin, Onay, Sayi, Secim, Tarih } from './Alanlar'
import { EidsHazirlikPaneli } from './EidsHazirlikPaneli'

/**
 * Portföy giriş sihirbazı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN VAR — Payload admin zaten çalışıyorken
 *
 * 1. **Sıra belirsizliği.** Admin'de 6 sekme var; hangisinden başlanacağı
 *    görünmüyor. Sihirbaz doğal sırayı öneriyor (dayatmıyor — gezinme
 *    serbest).
 * 2. **EİDS geri bildirimi geç geliyor.** Admin'de eksik EİDS ancak
 *    "Yayında" denemesinde çıkar. Sihirbaz her tuşta değerlendiriyor;
 *    aynı motor (`eidsDegerlendir`), aynı kurallar.
 * 3. **Göstergeler kaydetmeden görünmüyor.** Kira çarpanı ve brüt getiri
 *    burada anında görünüyor.
 *
 * ⚠️ Sihirbaz admin'in YERİNE geçmez. Yayına alma admin'de kalır; kayıt
 * daima `taslak`.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SAHADA, TELEFONDAN KULLANILIYOR. Tasarımın üç sonucu:
 *  · alanların hiçbiri zorunlu değil (mahalle hariç — o koleksiyonun kendi
 *    şartı), çünkü yarım bırakılamayan bir form hiç başlanmayan formdur;
 *  · fotoğraf doğrudan kameradan, konum doğrudan GPS'ten alınabiliyor;
 *  · otomatik kaydetme var — elden düşen bir telefon yarım saatlik girişi
 *    silmemeli.
 */

type Form = Record<string, string | boolean | string[]>

export interface YuklenmisGorsel {
  id: number
  url: string
  ad: string
  alt: string
}

const BASLANGIC: Form = {
  baslik: '',
  tip: VARSAYILAN_TIP,
  kategori: VARSAYILAN_KATEGORI,
  mahalle: '',
  il: VARSAYILAN_IL,
  ilce: VARSAYILAN_ILCE,
  adres: '',
  ada: '',
  parsel: '',
  tapuDurumu: '',
  eidsDurum: '',
  tasinmazNo: '',
  eidsYetkiBaslangic: '',
  eidsYetkiBitis: '',
  boylam: '',
  enlem: '',
  brutM2: '',
  netM2: '',
  odaSayisi: '',
  banyoSayisi: '',
  bulunduguKat: '',
  toplamKat: '',
  binaYasi: '',
  isinma: '',
  kullanimDurumu: '',
  cepheYonu: [],
  esyali: false,
  krediyeUygun: false,
  asansor: false,
  fiyat: '',
  paraBirimi: 'TRY',
  tahminiKira: '',
  aidat: '',
  pazarlikPayi: false,
  ozet: '',
  aciklama: '',
  videoKaynagi: '',
  droneVideoYoutube: '',
  droneVideoId: '',
  sanalTurUrl: '',
  gizliPortfoy: false,
  oneCikan: false,
}

/** Otomatik kaydetme aralığı. */
const OTOMATIK_KAYIT_MS = 30_000

export interface MahalleSecenegi {
  id: string
  ad: string
}

export function PortfoySihirbazi({
  mahalleler,
  adminTemelAdresi,
}: {
  mahalleler: MahalleSecenegi[]
  /** Payload admin kök yolu — kayıt sonrası yönlendirme için. */
  adminTemelAdresi: string
}) {
  const [adimNo, setAdimNo] = useState(0)
  const [form, setForm] = useState<Form>(BASLANGIC)
  const [gorseller, setGorseller] = useState<YuklenmisGorsel[]>([])
  const [hatalar, setHatalar] = useState<Record<string, string>>({})
  const [genelHata, setGenelHata] = useState<string | null>(null)
  const [ilanId, setIlanId] = useState<string | null>(null)
  const [sonKayit, setSonKayit] = useState<string | null>(null)
  const [bitti, setBitti] = useState<{ id: string; baslik: string } | null>(null)
  const [oneriler, setOneriler] = useState<Oneri[]>([])
  const [kaydediliyor, basla] = useTransition()

  /**
   * ⚠️ "Kirli" bayrağı OTOMATİK KAYDETMENİN VE ÇIKIŞ UYARISININ ORTAK
   * ÖLÇÜSÜ. İkisi ayrı ayrı izlenseydi, kaydedilmiş bir formda uyarı
   * çıkabilir ya da kaydedilmemiş bir formda çıkmayabilirdi.
   */
  const [kirli, setKirli] = useState(false)
  /**
   * ⚠️ Ref'ler EFEKTTE güncelleniyor, render sırasında değil.
   *
   * Amaç: otomatik kaydetme zamanlayıcısı ateşlediğinde formun O ANKİ
   * hâlini görsün. Zamanlayıcıya `form`u kapatarak vermek, 30 saniye
   * önceki fotoğrafı kaydetmek olurdu.
   */
  const formRef = useRef(form)
  const gorselRef = useRef(gorseller)

  useEffect(() => {
    formRef.current = form
    gorselRef.current = gorseller
  }, [form, gorseller])

  const adim = ADIMLAR[adimNo]

  const yaz = useCallback((alan: string, deger: string | boolean | string[]): void => {
    setForm((onceki) => ({ ...onceki, [alan]: deger }))
    setKirli(true)
    // Kullanıcı düzeltmeye başlar başlamaz hata kalkar.
    setHatalar((onceki) => {
      if (onceki[alan] === undefined) return onceki
      const yeni = { ...onceki }
      delete yeni[alan]
      return yeni
    })
  }, [])

  /** EİDS değerlendirmesi — her tuşta, admin'dekiyle aynı motorla. */
  const eids = useMemo(
    () =>
      eidsDegerlendir({
        eidsDurum: eidsDurumuCoz(form.eidsDurum as string),
        tasinmazNo: (form.tasinmazNo as string) || undefined,
        ada: (form.ada as string) || undefined,
        parsel: (form.parsel as string) || undefined,
        eidsYetkiBaslangic: (form.eidsYetkiBaslangic as string) || undefined,
        eidsYetkiBitis: (form.eidsYetkiBitis as string) || undefined,
      }),
    [
      form.eidsDurum,
      form.tasinmazNo,
      form.ada,
      form.parsel,
      form.eidsYetkiBaslangic,
      form.eidsYetkiBitis,
    ],
  )

  /**
   * Yatırım göstergeleri önizlemesi — kaydetmeden görünsün.
   *
   * Motor aynı (`gostergeleriHesapla`), yani önizleme ile kayıtta yazılan
   * değerin ayrışması mümkün değil.
   */
  const gostergeler = useMemo(() => {
    const sonuc = gostergeleriHesapla({
      fiyat: sayiya(form.fiyat as string),
      tahminiKira: sayiya(form.tahminiKira as string),
    })
    return sonuc.kiraCarpani === null ? null : sonuc
  }, [form.fiyat, form.tahminiKira])

  /** Kaydetme — otomatik ve elle çağrılar aynı yolu kullanır. */
  const kaydet = useCallback(
    (secenek: { bitir?: boolean } = {}): void => {
      setGenelHata(null)
      basla(async () => {
        const gonderi = {
          ...formRef.current,
          gorseller: gorselRef.current.map((g) => g.id),
        }
        const cevap = await ilanTaslaginiKaydet(gonderi, ilanId)

        if (cevap.basarili && cevap.ilanId) {
          setIlanId(cevap.ilanId)
          setKirli(false)
          setSonKayit(new Date().toLocaleTimeString('tr-TR', { timeStyle: 'short' }))
          if (secenek.bitir) {
            setBitti({
              id: cevap.ilanId,
              baslik: cevap.ilanBasligi ?? (formRef.current.baslik as string),
            })
          }
          return
        }

        if (cevap.hatalar) {
          setHatalar(cevap.hatalar)
          const ilkAlan = Object.keys(cevap.hatalar)[0]
          const hedef = ADIMLAR.findIndex((a) => ilkAlan !== undefined && ilkAlan in a.sema.shape)
          if (hedef >= 0) setAdimNo(hedef)
        }
        setGenelHata(cevap.genelHata ?? null)
      })
    },
    [ilanId],
  )

  /**
   * Otomatik kaydetme — 30 saniyede bir.
   *
   * ─────────────────────────────────────────────────────────────────────
   * ⚠️ YALNIZCA DEĞİŞİKLİK VARSA VE MAHALLE SEÇİLİYSE.
   *
   * Mahalle, kaydı açmanın tek şartı (koleksiyonun kendi kuralı).
   * Seçilmeden atılan bir otomatik kayıt, her 30 saniyede bir aynı hatayı
   * gösterirdi — kullanıcı henüz hiçbir şey yapmamışken.
   *
   * ⚠️ Zamanlayıcı `kirli` değişince kuruluyor, her render'da değil:
   * aksi hâlde her tuş vuruşunda sıfırlanır ve hiç ateşlemezdi.
   * ─────────────────────────────────────────────────────────────────────
   */
  useEffect(() => {
    if (!kirli || bitti) return
    if ((formRef.current.mahalle as string) === '') return

    const zaman = setTimeout(() => kaydet(), OTOMATIK_KAYIT_MS)
    return () => clearTimeout(zaman)
  }, [kirli, bitti, kaydet])

  /**
   * Çıkış uyarısı.
   *
   * ⚠️ Yalnızca kaydedilmemiş değişiklik varken. Her ayrılışta soran bir
   * uyarı, birkaç kez sonra refleksle kapatılır ve gerçekten gerektiğinde
   * de kapatılır.
   */
  useEffect(() => {
    if (!kirli || bitti) return
    const uyar = (olay: BeforeUnloadEvent) => {
      olay.preventDefault()
      // Tarayıcılar kendi metnini gösteriyor; değer yalnızca "sor" demek.
      olay.returnValue = ''
    }
    window.addEventListener('beforeunload', uyar)
    return () => window.removeEventListener('beforeunload', uyar)
  }, [kirli, bitti])

  /** Adım değişiminde kaydet — talimat gereği. */
  function adimaGit(hedef: number): void {
    if (hedef === adimNo) return
    if (kirli && (form.mahalle as string) !== '') kaydet()
    setAdimNo(Math.min(Math.max(hedef, 0), ADIMLAR.length - 1))
  }

  function ilerle(): void {
    if (adim) {
      const bulunanlar = adimHatalari(adim.sema, form)
      if (Object.keys(bulunanlar).length > 0) {
        setHatalar(bulunanlar)
        return
      }
    }
    adimaGit(adimNo + 1)
  }

  /** Benzer ilanlardan öneri — mahalle seçilince bir kez sorulur. */
  useEffect(() => {
    const mahalle = form.mahalle as string
    let iptal = false

    const sor = async () => {
      const gelen =
        mahalle === ''
          ? []
          : await benzerIlanOnerileri({
              mahalleId: mahalle,
              kategori: (form.kategori as string) || undefined,
              odaSayisi: (form.odaSayisi as string) || undefined,
            })
      if (!iptal) setOneriler(gelen)
    }

    void sor()
    return () => {
      iptal = true
    }
  }, [form.mahalle, form.kategori, form.odaSayisi])

  function sifirla(): void {
    setForm(BASLANGIC)
    setGorseller([])
    setHatalar({})
    setGenelHata(null)
    setBitti(null)
    setIlanId(null)
    setSonKayit(null)
    setKirli(false)
    setAdimNo(0)
  }

  if (bitti) {
    return (
      <BasariEkrani
        ilanId={bitti.id}
        baslik={bitti.baslik}
        adminTemelAdresi={adminTemelAdresi}
        eidsHazir={eids.yayinlanabilir}
        onYeni={sifirla}
      />
    )
  }

  const doluluklar = ADIMLAR.map((a) => adimDolulugu(a, form, gorseller))
  const genelDoluluk = Math.round(doluluklar.reduce((a, b) => a + b, 0) / ADIMLAR.length)

  return (
    <div className="sihirbaz">
      <div className="sihirbaz-ilerleme" role="group" aria-label="İlerleme">
        <div className="sihirbaz-ilerleme-cubuk">
          <span style={{ width: `${genelDoluluk}%` }} />
        </div>
        <p className="sihirbaz-ilerleme-metin">
          %{genelDoluluk} dolduruldu
          {sonKayit ? ` · son kayıt ${sonKayit}` : ''}
          {kirli ? ' · kaydedilmemiş değişiklik var' : ''}
        </p>
      </div>

      {/* ⚠️ Adımlar BUTON: gezinme serbest. Sıralı zorlamak, "ada/parseli
          sonra bakarım" diyen kullanıcıyı formun ortasında bırakırdı. */}
      <ol className="sihirbaz-adimlar">
        {ADIMLAR.map((a, sira) => (
          <li key={a.anahtar} aria-current={sira === adimNo ? 'step' : undefined}>
            <button
              type="button"
              className={sira === adimNo ? 'etkin' : doluluklar[sira] === 100 ? 'tamam' : undefined}
              onClick={() => adimaGit(sira)}
            >
              <span className="sihirbaz-adim-no">{sira + 1}</span>
              <span className="sihirbaz-adim-ad">{a.baslik}</span>
              <span className="sihirbaz-adim-yuzde">%{doluluklar[sira]}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="sihirbaz-govde">
        <div className="sihirbaz-form">
          <h2 className="sihirbaz-baslik">{adim?.baslik}</h2>
          <p className="sihirbaz-aciklama">{adim?.aciklama}</p>

          {adim?.anahtar === 'temel' ? (
            <TemelAdimi form={form} hatalar={hatalar} yaz={yaz} mahalleler={mahalleler} />
          ) : null}
          {adim?.anahtar === 'tapu' ? (
            <TapuAdimi form={form} hatalar={hatalar} yaz={yaz} oneriler={oneriler} />
          ) : null}
          {adim?.anahtar === 'nitelikler' ? (
            <NitelikAdimi form={form} hatalar={hatalar} yaz={yaz} oneriler={oneriler} />
          ) : null}
          {adim?.anahtar === 'fiyat' ? (
            <FiyatAdimi form={form} hatalar={hatalar} yaz={yaz} gostergeler={gostergeler} />
          ) : null}
          {adim?.anahtar === 'gorseller' ? (
            <GorselAdimi
              gorseller={gorseller}
              onDegisim={(yeni) => {
                setGorseller(yeni)
                setKirli(true)
              }}
              baslik={form.baslik as string}
              mahalleAdi={mahalleAdiniBul(mahalleler, form.mahalle as string)}
            />
          ) : null}
          {adim?.anahtar === 'aciklama' ? (
            <AciklamaAdimi form={form} hatalar={hatalar} yaz={yaz} mahalleler={mahalleler} />
          ) : null}
          {adim?.anahtar === 'medya' ? (
            <MedyaAdimi form={form} hatalar={hatalar} yaz={yaz} />
          ) : null}
          {adim?.anahtar === 'yayin' ? (
            <YayinAdimi
              form={form}
              hatalar={hatalar}
              yaz={yaz}
              gorselSayisi={gorseller.length}
              eidsHazir={eids.yayinlanabilir}
              eidsEngelleri={eids.engeller.map((engel) => engel.mesaj)}
              mahalleler={mahalleler}
              gostergeler={gostergeler}
            />
          ) : null}

          {genelHata ? (
            <p className="sihirbaz-genel-hata" role="alert">
              {genelHata}
            </p>
          ) : null}

          <div className="sihirbaz-dugmeler">
            <button
              type="button"
              className="sihirbaz-dugme sessiz"
              onClick={() => adimaGit(adimNo - 1)}
              disabled={adimNo === 0 || kaydediliyor}
            >
              Geri
            </button>

            {/* ⚠️ "Taslak kaydet" HER ADIMDA. Sonu beklemek zorunda kalan
                kullanıcı, yarıda bırakmak istediğinde hiçbir şey
                kaydedememiş olurdu. */}
            <button
              type="button"
              className="sihirbaz-dugme sessiz"
              onClick={() => kaydet()}
              disabled={kaydediliyor || (form.mahalle as string) === ''}
            >
              {kaydediliyor ? 'Kaydediliyor…' : 'Taslak kaydet'}
            </button>

            {adimNo < ADIMLAR.length - 1 ? (
              <button type="button" className="sihirbaz-dugme" onClick={ilerle}>
                Devam
              </button>
            ) : (
              <button
                type="button"
                className="sihirbaz-dugme"
                onClick={() => kaydet({ bitir: true })}
                disabled={kaydediliyor || (form.mahalle as string) === ''}
              >
                {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet ve bitir'}
              </button>
            )}
          </div>

          {(form.mahalle as string) === '' ? (
            <p className="sihirbaz-ipucu">
              Kaydı açmak için önce mahalle seçin. Diğer alanların hepsini sonra doldurabilirsiniz —
              sihirbaz 30 saniyede bir kendiliğinden kaydeder.
            </p>
          ) : null}
        </div>

        <aside className="sihirbaz-yan">
          <EidsHazirlikPaneli degerlendirme={eids} />
        </aside>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Adımlar
// ═══════════════════════════════════════════════════════════════════════════

interface AdimOzellikleri {
  form: Form
  hatalar: Record<string, string>
  yaz: (alan: string, deger: string | boolean | string[]) => void
}

/**
 * Alan yardımı.
 *
 * ⚠️ "Ada/parsel tapu belgenizde yazar" gibi cümleler bir süs değil.
 * Sahada, telefonda, tapu fotokopisine bakan biri için bunlar formu
 * doldurulabilir kılan şeyler.
 */
function TemelAdimi({
  form,
  hatalar,
  yaz,
  mahalleler,
}: AdimOzellikleri & { mahalleler: MahalleSecenegi[] }) {
  return (
    <>
      <Alan etiket="İşlem türü">
        <Secim
          deger={form.tip as string}
          onDegisim={(deger) => yaz('tip', deger)}
          secenekler={ILAN_TIPLERI}
        />
      </Alan>

      <Alan etiket="Kategori">
        <Secim
          deger={form.kategori as string}
          onDegisim={(deger) => yaz('kategori', deger)}
          secenekler={ILAN_KATEGORILERI}
        />
      </Alan>

      <Alan
        etiket="Mahalle"
        gerekli
        hata={hatalar.mahalle}
        ipucu="Kaydı açmanın tek şartı. Mahalle; yatırım skorunu, haritayı ve eşleştirmeyi besliyor."
      >
        <Secim
          deger={form.mahalle as string}
          onDegisim={(deger) => yaz('mahalle', deger)}
          secenekler={mahalleler.map((m) => ({ value: m.id, label: m.ad }))}
          bosEtiket="— seçin —"
        />
      </Alan>

      <Alan
        etiket="İlan başlığı"
        hata={hatalar.baslik}
        ipucu="Boş bırakabilirsiniz; kayıt tarihli bir taslak adıyla açılır ve sonra değiştirilir."
      >
        <Metin
          deger={form.baslik as string}
          onDegisim={(deger) => yaz('baslik', deger)}
          yerTutucu="Örn: Muhittin Mahallesi'nde 3+1, asansörlü, otoparklı daire"
        />
      </Alan>
    </>
  )
}

function TapuAdimi({ form, hatalar, yaz, oneriler }: AdimOzellikleri & { oneriler: Oneri[] }) {
  const [konumDurumu, setKonumDurumu] = useState<string | null>(null)

  /**
   * ⚠️ GPS SAHA İÇİN. Taşınmazın önünde duran biri için koordinatı elle
   * girmek pratikte imkânsız; tarayıcı zaten soruyor ve izin vermeyen
   * kullanıcı için hiçbir şey değişmiyor.
   *
   * ⚠️ İkisi birden yazılıyor — tek koordinat haritada Gine Körfezi'ne
   * düşer.
   */
  function konumuAl(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setKonumDurumu('Bu tarayıcı konum vermiyor.')
      return
    }
    setKonumDurumu('Konum alınıyor…')
    navigator.geolocation.getCurrentPosition(
      (konum) => {
        yaz('boylam', String(konum.coords.longitude.toFixed(6)))
        yaz('enlem', String(konum.coords.latitude.toFixed(6)))
        setKonumDurumu(`Alındı (±${Math.round(konum.coords.accuracy)} m).`)
      },
      (hata) => setKonumDurumu(`Konum alınamadı: ${hata.message}`),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  return (
    <>
      <Alan etiket="Ada" hata={hatalar.ada} ipucu="Tapu belgenizde “Ada” satırında yazar.">
        <Metin deger={form.ada as string} onDegisim={(deger) => yaz('ada', deger)} />
      </Alan>

      <Alan etiket="Parsel" hata={hatalar.parsel} ipucu="Tapu belgenizde “Parsel” satırında yazar.">
        <Metin deger={form.parsel as string} onDegisim={(deger) => yaz('parsel', deger)} />
      </Alan>

      <Alan
        etiket="Tapu durumu"
        ipucu="Kat mülkiyeti mi, kat irtifakı mı — tapu belgesinin üst kısmında yazar."
      >
        <Secim
          deger={form.tapuDurumu as string}
          onDegisim={(deger) => yaz('tapuDurumu', deger)}
          secenekler={TAPU_DURUMLARI}
          bosEtiket="— seçilmedi —"
        />
      </Alan>

      <OneriSeridi oneriler={oneriler} alan="tapuDurumu" secenekler={TAPU_DURUMLARI} yaz={yaz} />

      <Alan
        etiket="EİDS yetki durumu"
        ipucu="Mülk sahibi e-Devlet üzerinden yetki verdiyse “Yetkili” seçin."
      >
        <Secim
          deger={form.eidsDurum as string}
          onDegisim={(deger) => yaz('eidsDurum', deger)}
          secenekler={EIDS_DURUMLARI.map((durum) => ({
            value: durum,
            label: EIDS_DURUM_ETIKETLERI[durum],
          }))}
          bosEtiket="— seçilmedi —"
        />
      </Alan>

      <Alan
        etiket="Taşınmaz numarası"
        hata={hatalar.tasinmazNo}
        ipucu="EİDS'te taşınmaza verilen numara. İlan sayfasında rozetle birlikte görünür."
      >
        <Metin deger={form.tasinmazNo as string} onDegisim={(deger) => yaz('tasinmazNo', deger)} />
      </Alan>

      <Alan etiket="Yetki başlangıcı" hata={hatalar.eidsYetkiBaslangic}>
        <Tarih
          deger={form.eidsYetkiBaslangic as string}
          onDegisim={(deger) => yaz('eidsYetkiBaslangic', deger)}
        />
      </Alan>

      <Alan
        etiket="Yetki bitişi"
        hata={hatalar.eidsYetkiBitis}
        ipucu="Süresi dolan yetki, ilanı otomatik olarak yayından kaldırır."
      >
        <Tarih
          deger={form.eidsYetkiBitis as string}
          onDegisim={(deger) => yaz('eidsYetkiBitis', deger)}
        />
      </Alan>

      <Alan etiket="Açık adres" ipucu="Siteye çıkmaz; yalnızca panelde görünür.">
        <Metin deger={form.adres as string} onDegisim={(deger) => yaz('adres', deger)} />
      </Alan>

      <div className="sihirbaz-alan">
        <button type="button" className="sihirbaz-dugme sessiz" onClick={konumuAl}>
          Konumu telefondan al (GPS)
        </button>
        <p className="sihirbaz-ipucu">
          {konumDurumu ??
            'Taşınmazın önündeyseniz koordinatı doğrudan alabilirsiniz; haritada bu nokta kullanılır.'}
        </p>
        {(form.boylam as string) !== '' && (form.enlem as string) !== '' ? (
          <p className="sihirbaz-ipucu">
            Kayıtlı koordinat: {form.enlem as string}, {form.boylam as string}
          </p>
        ) : null}
      </div>
    </>
  )
}

function NitelikAdimi({ form, hatalar, yaz, oneriler }: AdimOzellikleri & { oneriler: Oneri[] }) {
  const cepheler = (form.cepheYonu as string[]) ?? []

  return (
    <>
      <Alan etiket="Brüt m²" hata={hatalar.brutM2}>
        <Sayi deger={form.brutM2 as string} onDegisim={(deger) => yaz('brutM2', deger)} />
      </Alan>

      <Alan etiket="Net m²" hata={hatalar.netM2}>
        <Sayi deger={form.netM2 as string} onDegisim={(deger) => yaz('netM2', deger)} />
      </Alan>

      <Alan etiket="Oda sayısı">
        <Secim
          deger={form.odaSayisi as string}
          onDegisim={(deger) => yaz('odaSayisi', deger)}
          secenekler={ODA_SAYILARI}
          bosEtiket="— seçilmedi —"
        />
      </Alan>

      <Alan etiket="Banyo sayısı" hata={hatalar.banyoSayisi}>
        <Sayi deger={form.banyoSayisi as string} onDegisim={(deger) => yaz('banyoSayisi', deger)} />
      </Alan>

      <Alan etiket="Bulunduğu kat" ipucu="Örn: 3, Zemin, Bahçe katı">
        <Metin
          deger={form.bulunduguKat as string}
          onDegisim={(deger) => yaz('bulunduguKat', deger)}
        />
      </Alan>

      <Alan etiket="Toplam kat" hata={hatalar.toplamKat}>
        <Sayi deger={form.toplamKat as string} onDegisim={(deger) => yaz('toplamKat', deger)} />
      </Alan>

      <Alan etiket="Bina yaşı" hata={hatalar.binaYasi}>
        <Sayi deger={form.binaYasi as string} onDegisim={(deger) => yaz('binaYasi', deger)} />
      </Alan>

      <Alan etiket="Isıtma">
        <Secim
          deger={form.isinma as string}
          onDegisim={(deger) => yaz('isinma', deger)}
          secenekler={ISINMA_TIPLERI}
          bosEtiket="— seçilmedi —"
        />
      </Alan>

      <OneriSeridi oneriler={oneriler} alan="isinma" secenekler={ISINMA_TIPLERI} yaz={yaz} />

      <Alan etiket="Kullanım durumu">
        <Secim
          deger={form.kullanimDurumu as string}
          onDegisim={(deger) => yaz('kullanimDurumu', deger)}
          secenekler={BINA_KULLANIM_DURUMLARI}
          bosEtiket="— seçilmedi —"
        />
      </Alan>

      <OneriSeridi
        oneriler={oneriler}
        alan="kullanimDurumu"
        secenekler={BINA_KULLANIM_DURUMLARI}
        yaz={yaz}
      />

      {/* ⚠️ Cephe ÇOKLU ve boş bırakılabilir. "Muhtemelen güney" demek,
          alım kararı doğrudan buna dayandığı için uydurma veri yasağının
          en pahalı ihlali olurdu (kural 2). */}
      <Alan
        etiket=""
        ipucu="Cephe yönü — köşe daireler için birden fazla seçin. Bilmiyorsanız boş bırakın; güneş haritası boş durum gösterir."
      >
        <fieldset className="sihirbaz-secenekler">
          <legend className="sihirbaz-etiket">Cephe yönü</legend>
          {CEPHE_YONLERI.map((yon) => (
            <Onay
              key={yon.value}
              etiket={yon.label}
              secili={cepheler.includes(yon.value)}
              onDegisim={(secili) =>
                yaz(
                  'cepheYonu',
                  secili
                    ? [...cepheler, yon.value]
                    : cepheler.filter((deger) => deger !== yon.value),
                )
              }
            />
          ))}
        </fieldset>
      </Alan>

      <Onay
        etiket="Eşyalı"
        secili={form.esyali as boolean}
        onDegisim={(deger) => yaz('esyali', deger)}
      />
      <Onay
        etiket="Krediye uygun"
        secili={form.krediyeUygun as boolean}
        onDegisim={(deger) => yaz('krediyeUygun', deger)}
      />
      <Onay
        etiket="Asansör"
        secili={form.asansor as boolean}
        onDegisim={(deger) => yaz('asansor', deger)}
      />
    </>
  )
}

function FiyatAdimi({
  form,
  hatalar,
  yaz,
  gostergeler,
}: AdimOzellikleri & { gostergeler: IlanGostergeleri | null }) {
  const kiralik = (form.tip as string) === 'kiralik'

  return (
    <>
      <Alan
        etiket={kiralik ? 'Aylık kira bedeli' : 'Satış fiyatı'}
        hata={hatalar.fiyat}
        ipucu="Boş bırakabilirsiniz — fiyat konuşulmadan da taşınmazı sisteme girebilirsiniz."
      >
        <Sayi deger={form.fiyat as string} onDegisim={(deger) => yaz('fiyat', deger)} />
      </Alan>

      <Alan etiket="Para birimi">
        <Secim
          deger={form.paraBirimi as string}
          onDegisim={(deger) => yaz('paraBirimi', deger)}
          secenekler={[
            { value: 'TRY', label: '₺ Türk lirası' },
            { value: 'USD', label: '$ Dolar' },
            { value: 'EUR', label: '€ Euro' },
          ]}
        />
      </Alan>

      {kiralik ? null : (
        <Alan
          etiket="Tahmini aylık kira"
          hata={hatalar.tahminiKira}
          ipucu="Kira çarpanı ve brüt getiri bundan hesaplanır."
        >
          <Sayi
            deger={form.tahminiKira as string}
            onDegisim={(deger) => yaz('tahminiKira', deger)}
          />
        </Alan>
      )}

      <Alan etiket="Aidat" hata={hatalar.aidat}>
        <Sayi deger={form.aidat as string} onDegisim={(deger) => yaz('aidat', deger)} />
      </Alan>

      <Onay
        etiket="Pazarlık payı var"
        secili={form.pazarlikPayi as boolean}
        onDegisim={(deger) => yaz('pazarlikPayi', deger)}
      />

      {gostergeler ? (
        <div className="sihirbaz-gosterge">
          <p>
            Kira çarpanı <strong>{gostergeler.kiraCarpani?.toFixed(1)}</strong> yıl · brüt getiri{' '}
            <strong>%{gostergeler.brutGetiri?.toFixed(2)}</strong>
          </p>
          <p className="sihirbaz-ipucu">
            Bu bilgiler yatırım tavsiyesi niteliğinde değildir. Geçmiş veriler gelecekteki getiriyi
            garanti etmez.
          </p>
        </div>
      ) : null}
    </>
  )
}

/**
 * Görsel adımı — yükle, sırala, kapak seç.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KAPAK, AYRI BİR ALAN DEĞİL, SIRANIN BAŞI.
 *
 * Koleksiyon "ilk fotoğraf kapaktır" diyor. Ayrı bir "kapak" işareti
 * eklemek, iki kaynağın çeliştiği bir gün üretirdi: sırada birinci olan
 * fotoğrafla kapak işaretli fotoğraf farklı olduğunda hangisi doğru?
 *
 * ⚠️ ALT METİN BOŞ GEÇİLEMİYOR ve bu bilinçli: `medya` koleksiyonu onu
 * `required` yapmış, erişilebilirlik sonradan eklenen bir şey değil.
 * Bağlamdan bir taslak metin öneriliyor, kullanıcı ekranda görüp
 * düzeltiyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
function GorselAdimi({
  gorseller,
  onDegisim,
  baslik,
  mahalleAdi,
}: {
  gorseller: YuklenmisGorsel[]
  onDegisim: (yeni: YuklenmisGorsel[]) => void
  baslik: string
  mahalleAdi: string | null
}) {
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [suruklenen, setSuruklenen] = useState<number | null>(null)

  const taslakAlt = (sira: number): string => {
    const konu = baslik.trim() !== '' ? baslik.trim() : (mahalleAdi ?? 'taşınmaz')
    return `${konu} — fotoğraf ${sira}`
  }

  async function dosyalariYukle(dosyalar: FileList | null): Promise<void> {
    if (!dosyalar || dosyalar.length === 0) return
    setHata(null)
    setYukleniyor(true)

    const eklenen: YuklenmisGorsel[] = []
    for (const [sira, dosya] of [...dosyalar].entries()) {
      const alt = taslakAlt(gorseller.length + sira + 1)
      const form = new FormData()
      form.set('dosya', dosya)
      form.set('alt', alt)
      const cevap = await sihirbazGorseliYukle(form)
      if (cevap.basarili && cevap.id !== undefined) {
        eklenen.push({ id: cevap.id, url: cevap.url ?? '', ad: cevap.ad ?? dosya.name, alt })
      } else {
        setHata(cevap.genelHata ?? 'Görsel yüklenemedi.')
      }
    }

    if (eklenen.length > 0) onDegisim([...gorseller, ...eklenen])
    setYukleniyor(false)
  }

  function tasi(kaynak: number, hedef: number): void {
    if (kaynak === hedef) return
    const yeni = [...gorseller]
    const [alinan] = yeni.splice(kaynak, 1)
    if (!alinan) return
    yeni.splice(hedef, 0, alinan)
    onDegisim(yeni)
  }

  return (
    <>
      <Alan
        etiket="Fotoğraf ekle"
        ipucu="Birden fazla seçebilirsiniz. Telefonda kamera doğrudan açılır."
      >
        {/* ⚠️ `capture` YOK, `accept` VAR: `capture` yazmak galeriyi
            kapatıp yalnızca kamerayı açar. Sahada çekilen fotoğraf kadar,
            önceden çekilmiş fotoğraf da yükleniyor. */}
        <input
          type="file"
          className="sihirbaz-girdi"
          accept="image/*"
          multiple
          onChange={(olay) => void dosyalariYukle(olay.target.files)}
        />
      </Alan>

      {yukleniyor ? <p className="sihirbaz-ipucu">Yükleniyor…</p> : null}
      {hata ? (
        <p className="sihirbaz-genel-hata" role="alert">
          {hata}
        </p>
      ) : null}

      {gorseller.length === 0 ? (
        <p className="sihirbaz-ipucu">
          Henüz fotoğraf yok. Fotoğrafsız da kaydedebilirsiniz; ilan sayfası boş durum gösterir.
        </p>
      ) : (
        <ol className="sihirbaz-gorseller">
          {gorseller.map((gorsel, sira) => (
            <li
              key={gorsel.id}
              draggable
              onDragStart={() => setSuruklenen(sira)}
              onDragOver={(olay) => olay.preventDefault()}
              onDrop={() => {
                if (suruklenen !== null) tasi(suruklenen, sira)
                setSuruklenen(null)
              }}
              className={sira === 0 ? 'kapak' : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gorsel.url} alt="" width={96} height={72} />
              <div className="sihirbaz-gorsel-govde">
                <span className="sihirbaz-gorsel-ad">
                  {sira === 0 ? 'Kapak · ' : `${sira + 1}. · `}
                  {gorsel.ad}
                </span>
                <input
                  className="sihirbaz-girdi"
                  value={gorsel.alt}
                  aria-label={`${sira + 1}. fotoğrafın alternatif metni`}
                  onChange={(olay) =>
                    onDegisim(
                      gorseller.map((g) =>
                        g.id === gorsel.id ? { ...g, alt: olay.target.value } : g,
                      ),
                    )
                  }
                />
              </div>
              {/*
                ⚠️ SÜRÜKLE-BIRAK TEK YOL DEĞİL. Sürükleme klavyeyle
                kullanılamıyor; yukarı/aşağı düğmeleri aynı işi yapıyor ve
                dokunmatikte de daha güvenilir.
              */}
              <div className="sihirbaz-gorsel-dugmeler">
                <button
                  type="button"
                  onClick={() => tasi(sira, sira - 1)}
                  disabled={sira === 0}
                  aria-label={`${sira + 1}. fotoğrafı yukarı taşı`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => tasi(sira, sira + 1)}
                  disabled={sira === gorseller.length - 1}
                  aria-label={`${sira + 1}. fotoğrafı aşağı taşı`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onDegisim(gorseller.filter((g) => g.id !== gorsel.id))}
                  aria-label={`${sira + 1}. fotoğrafı listeden çıkar`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

/**
 * Açıklama şablonları.
 *
 * ⚠️ ŞABLON METNİ DOLDURMUYOR, İSKELET VERİYOR. İçine rakam ya da iddia
 * yazılmış bir şablon, kontrol edilmeden yayınlanan bir metin üretirdi.
 * Köşeli parantezler doldurulmadıkça metin açıkça yarım görünüyor.
 */
const ACIKLAMA_SABLONLARI = [
  {
    ad: 'Konut — genel',
    metin: [
      '[Mahalle] Mahallesi’nde, [kat]. katta [oda] daire.',
      '',
      'Konum: [yakındaki okul / market / durak] yürüme mesafesinde.',
      '',
      'Bina: [yaş] yaşında, [asansör/otopark durumu].',
      '',
      'Not: [öne çıkarmak istediğiniz özellik]',
    ].join('\n'),
  },
  {
    ad: 'Yatırım odaklı',
    metin: [
      '[Mahalle] Mahallesi’nde kiralık potansiyeli olan [oda] daire.',
      '',
      'Bölge: [değer sürücüsü — OSB, hastane, istasyon vb.] etkisinde.',
      '',
      'Mevcut durum: [boş / kiracılı, kira bedeli].',
      '',
      '⚠️ Getiri rakamları ilan sayfasında ayrıca gösteriliyor; metne rakam yazmayın.',
    ].join('\n'),
  },
  {
    ad: 'Ticari / işyeri',
    metin: [
      '[Mahalle] Mahallesi’nde [m²] m² [dükkân / ofis / depo].',
      '',
      'Cephe ve konum: [cadde adı], [yaya/araç trafiği hakkında bildiğiniz].',
      '',
      'Ruhsat ve kullanım: [mevcut ruhsat durumu].',
    ].join('\n'),
  },
] as const

function AciklamaAdimi({
  form,
  hatalar,
  yaz,
  mahalleler,
}: AdimOzellikleri & { mahalleler: MahalleSecenegi[] }) {
  const mahalleAdi = mahalleAdiniBul(mahalleler, form.mahalle as string)

  return (
    <>
      <Alan
        etiket="Kısa özet"
        hata={hatalar.ozet}
        ipucu="Kart ve arama sonuçlarında görünür. En fazla 400 karakter."
      >
        <Metin
          deger={form.ozet as string}
          onDegisim={(deger) => yaz('ozet', deger)}
          yerTutucu="Tek cümlede taşınmazın en belirleyici özelliği"
        />
      </Alan>

      <Alan
        etiket="İlan metni"
        hata={hatalar.aciklama}
        ipucu="Paragrafları boş satırla ayırın. Biçimlendirme (kalın, liste, başlık) için ilan panelde açılıp düzenlenir."
      >
        <textarea
          className="sihirbaz-girdi"
          rows={12}
          value={form.aciklama as string}
          onChange={(olay) => yaz('aciklama', olay.target.value)}
        />
      </Alan>

      <div className="sihirbaz-alan">
        <span className="sihirbaz-etiket">Şablon önerisi</span>
        <p className="sihirbaz-ipucu">
          İskelet verir, metni yazmaz. Köşeli parantezleri kendiniz doldurun — doldurulmamış bir
          parantez, yayına çıkmaması gerektiğini açıkça gösterir.
        </p>
        <div className="sihirbaz-sablonlar">
          {ACIKLAMA_SABLONLARI.map((sablon) => (
            <button
              key={sablon.ad}
              type="button"
              className="sihirbaz-dugme sessiz"
              onClick={() =>
                yaz('aciklama', sablon.metin.replaceAll('[Mahalle]', mahalleAdi ?? '[Mahalle]'))
              }
            >
              {sablon.ad}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function MedyaAdimi({ form, hatalar, yaz }: AdimOzellikleri) {
  const kaynak = form.videoKaynagi as string

  return (
    <>
      <Alan
        etiket="Video kaynağı"
        ipucu="Videolar sunucuda barındırılmaz; YouTube ya da Bunny Stream üzerinden yayınlanır."
      >
        <Secim
          deger={kaynak}
          onDegisim={(deger) => yaz('videoKaynagi', deger)}
          secenekler={[
            { value: 'yok', label: 'Video yok' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'bunny', label: 'Bunny Stream' },
          ]}
          bosEtiket="— seçilmedi —"
        />
      </Alan>

      {kaynak === 'youtube' ? (
        <Alan etiket="YouTube adresi" hata={hatalar.droneVideoYoutube}>
          <Metin
            deger={form.droneVideoYoutube as string}
            onDegisim={(deger) => yaz('droneVideoYoutube', deger)}
            yerTutucu="https://www.youtube.com/watch?v=…"
          />
        </Alan>
      ) : null}

      {kaynak === 'bunny' ? (
        <Alan etiket="Bunny video kimliği" hata={hatalar.droneVideoId}>
          <Metin
            deger={form.droneVideoId as string}
            onDegisim={(deger) => yaz('droneVideoId', deger)}
          />
        </Alan>
      ) : null}

      <Alan
        etiket="360° tur adresi"
        hata={hatalar.sanalTurUrl}
        ipucu="Tam adres (https://…). Boşsa tur bölümü ilan sayfasında hiç çizilmez."
      >
        <Metin
          deger={form.sanalTurUrl as string}
          onDegisim={(deger) => yaz('sanalTurUrl', deger)}
          yerTutucu="https://kuula.co/share/…"
        />
      </Alan>
    </>
  )
}

/**
 * Yayın adımı — KONTROL LİSTESİ, KAPI DEĞİL.
 *
 * ⚠️ BURADAN YAYINA ALINMIYOR. Kayıt daima taslak; yayına alma, EİDS
 * kancasının bulunduğu Payload admin'de bilinçli bir eylem olarak kalıyor.
 * Buradaki liste o kapının AYNASI: aynı motoru (`eidsDegerlendir`)
 * kullanıyor, kendi kuralını üretmiyor. İkinci bir kapı, ikisinin
 * ayrıştığı gün EİDS kuralını delerdi (CLAUDE.md kural 1).
 */
function YayinAdimi({
  form,
  yaz,
  gorselSayisi,
  eidsHazir,
  eidsEngelleri,
  mahalleler,
  gostergeler,
}: AdimOzellikleri & {
  gorselSayisi: number
  eidsHazir: boolean
  eidsEngelleri: readonly string[]
  mahalleler: MahalleSecenegi[]
  gostergeler: IlanGostergeleri | null
}) {
  const mahalleAdi = mahalleAdiniBul(mahalleler, form.mahalle as string)

  const liste = [
    { ad: 'Mahalle seçildi', tamam: mahalleAdi !== null, zorunlu: true },
    { ad: 'Başlık yazıldı', tamam: (form.baslik as string).trim() !== '', zorunlu: false },
    { ad: 'Fiyat girildi', tamam: (form.fiyat as string).trim() !== '', zorunlu: false },
    { ad: 'En az bir fotoğraf', tamam: gorselSayisi > 0, zorunlu: false },
    { ad: 'İlan metni yazıldı', tamam: (form.aciklama as string).trim() !== '', zorunlu: false },
    { ad: 'EİDS koşulları sağlandı', tamam: eidsHazir, zorunlu: true },
  ]

  return (
    <>
      <ul className="sihirbaz-kontrol">
        {liste.map((satir) => (
          <li
            key={satir.ad}
            className={satir.tamam ? 'tamam' : satir.zorunlu ? 'eksik' : undefined}
          >
            <span aria-hidden>{satir.tamam ? '✓' : '·'}</span> {satir.ad}
            {satir.zorunlu && !satir.tamam ? ' — yayın için gerekli' : ''}
          </li>
        ))}
      </ul>

      {!eidsHazir ? (
        <div className="sihirbaz-genel-hata" role="status">
          <p>
            <strong>Bu kayıt yayına alınamaz.</strong> EİDS koşulları sağlanmadan satılık taşınmaz
            ilanı yayınlanamaz — yasal zorunluluk, tercih değil.
          </p>
          <ul>
            {eidsEngelleri.map((engel) => (
              <li key={engel}>{engel}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="sihirbaz-ipucu">
          EİDS koşulları sağlanıyor. Kayıt yine de <strong>taslak</strong> olarak açılıyor; yayına
          almayı ilan sayfasından siz yaparsınız.
        </p>
      )}

      <Onay
        etiket="Gizli portföy (siteye çıkmaz, yalnızca sayısı gösterilir)"
        secili={form.gizliPortfoy as boolean}
        onDegisim={(deger) => yaz('gizliPortfoy', deger)}
      />
      <Onay
        etiket="Öne çıkan ilan"
        secili={form.oneCikan as boolean}
        onDegisim={(deger) => yaz('oneCikan', deger)}
      />

      {gostergeler ? (
        <p className="sihirbaz-ipucu">
          Kira çarpanı {gostergeler.kiraCarpani?.toFixed(1)} yıl · brüt getiri %
          {gostergeler.brutGetiri?.toFixed(2)}. Bu bilgiler yatırım tavsiyesi niteliğinde değildir.
        </p>
      ) : null}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Yardımcılar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Benzer ilanlardan öneri şeridi.
 *
 * ⚠️ ÖNERİ, DOLDURMA DEĞİL. Alan kendiliğinden dolmuyor; tıklanınca
 * doluyor. Sessizce dolan bir alan, kontrol edilmeden kaydedilen bir
 * alandır — "asansör var" yazan ama asansörü olmayan bir ilan hukuki risk.
 */
function OneriSeridi({
  oneriler,
  alan,
  secenekler,
  yaz,
}: {
  oneriler: Oneri[]
  alan: Oneri['alan']
  secenekler: readonly { readonly value: string; readonly label: string }[]
  yaz: (alan: string, deger: string) => void
}) {
  const oneri = oneriler.find((o) => o.alan === alan)
  if (!oneri) return null

  const etiket = secenekler.find((s) => s.value === oneri.deger)?.label ?? oneri.deger

  return (
    <p className="sihirbaz-oneri">
      Aynı mahalledeki benzer ilanların {oneri.adet}/{oneri.toplam} tanesinde{' '}
      <strong>{etiket}</strong>.{' '}
      <button type="button" className="sihirbaz-oneri-dugme" onClick={() => yaz(alan, oneri.deger)}>
        Uygula
      </button>
    </p>
  )
}

function BasariEkrani({
  ilanId,
  baslik,
  adminTemelAdresi,
  eidsHazir,
  onYeni,
}: {
  ilanId: string
  baslik: string
  adminTemelAdresi: string
  eidsHazir: boolean
  onYeni: () => void
}) {
  return (
    <div className="sihirbaz-basari">
      <h2>Taslak kaydedildi</h2>
      <p>
        <strong>{baslik}</strong> taslak olarak kaydedildi.
      </p>

      {eidsHazir ? (
        <p>
          EİDS koşulları sağlanıyor. Yayına almak için ilan sayfasını açıp durumu
          &quot;Yayında&quot; yapın.
        </p>
      ) : (
        <p>
          ⚠️ EİDS koşulları henüz sağlanmıyor; bu kayıt yayına alınamaz. Yetki bilgileri
          tamamlandığında ilan sayfasından yayınlayabilirsiniz.
        </p>
      )}

      <div className="sihirbaz-dugmeler">
        <a className="sihirbaz-dugme" href={`${adminTemelAdresi}/collections/ilanlar/${ilanId}`}>
          İlanı aç
        </a>
        <button type="button" className="sihirbaz-dugme sessiz" onClick={onYeni}>
          Yeni taşınmaz gir
        </button>
      </div>
    </div>
  )
}

/**
 * Bir adımın tamamlanma yüzdesi.
 *
 * ⚠️ BU BİR DOĞRULAMA DEĞİL, BİR GÖSTERGE. Hiçbir alan zorunlu değil;
 * yüzde yalnızca "burada doldurulacak ne kaldı" sorusuna cevap veriyor.
 * Adımın `alanlar` listesi paydayı belirliyor ve o liste `sema.ts`te —
 * arayüzle doğrulamanın aynı kaynaktan beslenmesi için.
 */
function adimDolulugu(
  adim: (typeof ADIMLAR)[number],
  form: Form,
  gorseller: YuklenmisGorsel[],
): number {
  if (adim.anahtar === 'gorseller') return gorseller.length > 0 ? 100 : 0
  if (adim.alanlar.length === 0) return 100

  const dolu = adim.alanlar.filter((alan) => {
    const deger = form[alan]
    if (Array.isArray(deger)) return deger.length > 0
    if (typeof deger === 'boolean') return deger
    return typeof deger === 'string' && deger.trim() !== ''
  }).length

  return Math.round((dolu / adim.alanlar.length) * 100)
}

function mahalleAdiniBul(mahalleler: MahalleSecenegi[], id: string): string | null {
  return mahalleler.find((mahalle) => mahalle.id === id)?.ad ?? null
}

function eidsDurumuCoz(deger: string): EidsDurum | undefined {
  return (EIDS_DURUMLARI as readonly string[]).includes(deger) ? (deger as EidsDurum) : undefined
}

function sayiya(metin: string): number | null {
  if (metin.trim() === '') return null
  const sayi = Number(metin)
  return Number.isFinite(sayi) ? sayi : null
}
