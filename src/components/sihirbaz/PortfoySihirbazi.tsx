'use client'

import { useMemo, useState, useTransition } from 'react'

import { eidsDegerlendir, EIDS_DURUMLARI, EIDS_DURUM_ETIKETLERI, type EidsDurum } from '@/lib/eids'
import { gostergeleriHesapla, type IlanGostergeleri } from '@/lib/ilan/hesaplamalar'
import { ilanTaslagiOlustur } from '@/lib/sihirbaz/eylemler'
import { ADIMLAR, adimHatalari } from '@/lib/sihirbaz/sema'
import {
  ILAN_KATEGORILERI,
  ILAN_TIPLERI,
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
 * Sihirbazın varlık sebebi "admin çirkin" değil. Üç somut sorunu çözüyor:
 *
 * 1. **Sıra belirsizliği.** Admin'de 6 sekme var ve hangisinden
 *    başlanacağı, hangisinin zorunlu olduğu görünmüyor. Sihirbaz doğal
 *    sırayı dayatır.
 *
 * 2. **EİDS geri bildirimi geç geliyor.** Admin'de eksik EİDS ancak
 *    "Yayında" denemesinde hata olarak çıkar — yani tüm veri girildikten
 *    sonra. Sihirbaz **her tuşta** değerlendirir ve neyin eksik olduğunu
 *    baştan söyler. Aynı motor (`eidsDegerlendir`), aynı kurallar.
 *
 * 3. **Göstergeler kaydetmeden görünmüyor.** Kira çarpanı ve brüt getiri
 *    admin'de kaydetme sonrası hesaplanır. Burada anında görünür; fiyat
 *    ya da kira yanlış girilmişse kullanıcı hemen fark eder.
 *
 * ⚠️ Sihirbaz admin'in YERİNE geçmez. Medya, zengin metin açıklama, SEO
 * alanları ve **yayına alma** admin'de kalır. Kayıt daima `taslak`.
 * ─────────────────────────────────────────────────────────────────────────
 */

type Form = Record<string, string | boolean>

const BASLANGIC: Form = {
  baslik: '',
  tip: 'satilik',
  kategori: 'konut',
  ozet: '',
  il: VARSAYILAN_IL,
  ilce: VARSAYILAN_ILCE,
  mahalle: '',
  adres: '',
  ada: '',
  parsel: '',
  tapuDurumu: '',
  fiyat: '',
  paraBirimi: 'TRY',
  tahminiKira: '',
  aidat: '',
  brutM2: '',
  netM2: '',
  odaSayisi: '',
  bulunduguKat: '',
  toplamKat: '',
  binaYasi: '',
  eidsDurum: '',
  tasinmazNo: '',
  eidsYetkiBaslangic: '',
  eidsYetkiBitis: '',
  gizliPortfoy: false,
}

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
  const [hatalar, setHatalar] = useState<Record<string, string>>({})
  const [genelHata, setGenelHata] = useState<string | null>(null)
  const [sonuc, setSonuc] = useState<{ id: string; baslik: string } | null>(null)
  const [kaydediliyor, basla] = useTransition()

  const adim = ADIMLAR[adimNo]

  function yaz(alan: string, deger: string | boolean): void {
    setForm((onceki) => ({ ...onceki, [alan]: deger }))
    // Kullanıcı düzeltmeye başlar başlamaz hata kalkar; yazarken kırmızı
    // metnin altında kalmak caydırıcı.
    setHatalar((onceki) => {
      if (onceki[alan] === undefined) return onceki
      const yeni = { ...onceki }
      delete yeni[alan]
      return yeni
    })
  }

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
   * Admin'de bu değerler ancak kaydettikten sonra hesaplanır; yanlış girilen
   * bir fiyat ya da kira orada bir kayıt döngüsü sonra fark edilir.
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

  function ilerle(): void {
    if (adim?.sema) {
      const bulunanlar = adimHatalari(adim.sema, form)
      if (Object.keys(bulunanlar).length > 0) {
        setHatalar(bulunanlar)
        return
      }
    }
    setAdimNo(Math.min(adimNo + 1, ADIMLAR.length - 1))
  }

  function kaydet(): void {
    setGenelHata(null)
    basla(async () => {
      const cevap = await ilanTaslagiOlustur(form)

      if (cevap.basarili && cevap.ilanId) {
        setSonuc({ id: cevap.ilanId, baslik: cevap.ilanBasligi ?? (form.baslik as string) })
        return
      }

      if (cevap.hatalar) {
        setHatalar(cevap.hatalar)
        // Hatalı alan hangi adımdaysa oraya dön — kullanıcıyı hatayı
        // göremediği bir ekranda bırakmak, sihirbazın en can sıkıcı hâli.
        const ilkAlan = Object.keys(cevap.hatalar)[0]
        const hedef = ADIMLAR.findIndex(
          (a) => a.sema !== null && ilkAlan !== undefined && ilkAlan in a.sema.shape,
        )
        if (hedef >= 0) setAdimNo(hedef)
      }
      setGenelHata(cevap.genelHata ?? null)
    })
  }

  function sifirla(): void {
    setForm(BASLANGIC)
    setHatalar({})
    setGenelHata(null)
    setSonuc(null)
    setAdimNo(0)
  }

  if (sonuc) {
    return (
      <BasariEkrani
        ilanId={sonuc.id}
        baslik={sonuc.baslik}
        adminTemelAdresi={adminTemelAdresi}
        eidsHazir={eids.yayinlanabilir}
        onYeni={sifirla}
      />
    )
  }

  return (
    <div className="sihirbaz">
      <ol className="sihirbaz-adimlar">
        {ADIMLAR.map((a, sira) => (
          <li
            key={a.anahtar}
            className={sira === adimNo ? 'etkin' : sira < adimNo ? 'tamam' : undefined}
            aria-current={sira === adimNo ? 'step' : undefined}
          >
            <span className="sihirbaz-adim-no">{sira + 1}</span>
            {a.baslik}
          </li>
        ))}
      </ol>

      <div className="sihirbaz-govde">
        <div className="sihirbaz-form">
          {adim?.anahtar === 'temel' ? (
            <TemelAdimi form={form} hatalar={hatalar} yaz={yaz} />
          ) : null}
          {adim?.anahtar === 'konum' ? (
            <KonumAdimi form={form} hatalar={hatalar} yaz={yaz} mahalleler={mahalleler} />
          ) : null}
          {adim?.anahtar === 'rakamlar' ? (
            <RakamlarAdimi form={form} hatalar={hatalar} yaz={yaz} gostergeler={gostergeler} />
          ) : null}
          {adim?.anahtar === 'eids' ? <EidsAdimi form={form} hatalar={hatalar} yaz={yaz} /> : null}
          {adim?.anahtar === 'ozet' ? (
            <OzetAdimi form={form} mahalleler={mahalleler} gostergeler={gostergeler} />
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
              onClick={() => setAdimNo(Math.max(adimNo - 1, 0))}
              disabled={adimNo === 0 || kaydediliyor}
            >
              Geri
            </button>

            {adimNo < ADIMLAR.length - 1 ? (
              <button type="button" className="sihirbaz-dugme" onClick={ilerle}>
                Devam
              </button>
            ) : (
              <button
                type="button"
                className="sihirbaz-dugme"
                onClick={kaydet}
                disabled={kaydediliyor}
              >
                {kaydediliyor ? 'Kaydediliyor…' : 'Taslak olarak kaydet'}
              </button>
            )}
          </div>
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
  yaz: (alan: string, deger: string | boolean) => void
}

function TemelAdimi({ form, hatalar, yaz }: AdimOzellikleri) {
  return (
    <>
      <h2 className="sihirbaz-baslik">Temel bilgiler</h2>
      <p className="sihirbaz-aciklama">
        Bu bilgiler ilan sayfasının ve arama sonuçlarının iskeletini oluşturur. Uzun açıklamayı ve
        fotoğrafları sonra, ilan kaydedildikten sonra ekleyeceksiniz.
      </p>

      <Alan etiket="İlan başlığı" hata={hatalar.baslik} gerekli>
        <Metin
          deger={form.baslik as string}
          onDegisim={(d) => yaz('baslik', d)}
          yerTutucu="Muhittin Mahallesi'nde 3+1 bahçe katı"
        />
      </Alan>

      <div className="sihirbaz-satir">
        <Alan etiket="İlan tipi" hata={hatalar.tip} gerekli>
          <Secim
            deger={form.tip as string}
            onDegisim={(d) => yaz('tip', d)}
            secenekler={ILAN_TIPLERI}
          />
        </Alan>
        <Alan etiket="Kategori" hata={hatalar.kategori} gerekli>
          <Secim
            deger={form.kategori as string}
            onDegisim={(d) => yaz('kategori', d)}
            secenekler={ILAN_KATEGORILERI}
          />
        </Alan>
      </div>

      <Alan
        etiket="Kısa özet"
        hata={hatalar.ozet}
        ipucu="Liste kartlarında görünür. Boş bırakabilirsiniz."
      >
        <Metin
          deger={form.ozet as string}
          onDegisim={(d) => yaz('ozet', d)}
          cokSatirli
          yerTutucu="Okula ve çarşıya yürüme mesafesinde, güneydoğu cepheli…"
        />
      </Alan>

      <Alan
        etiket=""
        ipucu="İşaretlenirse ilanın adresi, fotoğrafları ve detayları sitede gizlenir; yalnızca mahalle, kategori, m² aralığı ve fiyat bandı görünür."
      >
        <Onay
          etiket="Gizli portföy (off-market)"
          secili={form.gizliPortfoy === true}
          onDegisim={(d) => yaz('gizliPortfoy', d)}
        />
      </Alan>
    </>
  )
}

function KonumAdimi({
  form,
  hatalar,
  yaz,
  mahalleler,
}: AdimOzellikleri & { mahalleler: MahalleSecenegi[] }) {
  return (
    <>
      <h2 className="sihirbaz-baslik">Konum ve tapu</h2>
      <p className="sihirbaz-aciklama">
        <strong>Ada ve parsel EİDS için gereklidir.</strong> Şimdi girmezseniz ilan taslak olarak
        kaydedilir ama yayına alınamaz.
      </p>

      <div className="sihirbaz-satir">
        <Alan etiket="İl" hata={hatalar.il} gerekli>
          <Metin deger={form.il as string} onDegisim={(d) => yaz('il', d)} />
        </Alan>
        <Alan etiket="İlçe" hata={hatalar.ilce} gerekli>
          <Metin deger={form.ilce as string} onDegisim={(d) => yaz('ilce', d)} />
        </Alan>
      </div>

      <Alan
        etiket="Mahalle"
        hata={hatalar.mahalle}
        gerekli
        ipucu={
          mahalleler.length === 0
            ? 'Henüz mahalle kaydı yok. Önce Mahalleler koleksiyonuna en az bir mahalle ekleyin.'
            : undefined
        }
      >
        <Secim
          deger={form.mahalle as string}
          onDegisim={(d) => yaz('mahalle', d)}
          bosEtiket="Mahalle seçin"
          secenekler={mahalleler.map((m) => ({ value: m.id, label: m.ad }))}
        />
      </Alan>

      <Alan etiket="Açık adres" ipucu="Sitede yayınlanmaz; yalnızca iç kullanım.">
        <Metin deger={form.adres as string} onDegisim={(d) => yaz('adres', d)} />
      </Alan>

      <div className="sihirbaz-satir">
        <Alan etiket="Ada" hata={hatalar.ada} ipucu="EİDS için gerekli">
          <Metin deger={form.ada as string} onDegisim={(d) => yaz('ada', d)} />
        </Alan>
        <Alan etiket="Parsel" hata={hatalar.parsel} ipucu="EİDS için gerekli">
          <Metin deger={form.parsel as string} onDegisim={(d) => yaz('parsel', d)} />
        </Alan>
      </div>

      <Alan etiket="Tapu durumu" hata={hatalar.tapuDurumu}>
        <Secim
          deger={form.tapuDurumu as string}
          onDegisim={(d) => yaz('tapuDurumu', d)}
          bosEtiket="Belirtilmedi"
          secenekler={TAPU_DURUMLARI}
        />
      </Alan>
    </>
  )
}

function RakamlarAdimi({
  form,
  hatalar,
  yaz,
  gostergeler,
}: AdimOzellikleri & { gostergeler: IlanGostergeleri | null }) {
  const konut = form.kategori === 'konut'
  const satilik = form.tip === 'satilik'

  return (
    <>
      <h2 className="sihirbaz-baslik">Rakamlar</h2>
      <p className="sihirbaz-aciklama">
        <strong>Bilmediğiniz alanı boş bırakın.</strong> Tahmini rakam yazmak, sitede uydurma veri
        göstermek demektir — göstergeler boş kalsın, daha dürüst olur.
      </p>

      <div className="sihirbaz-satir">
        <Alan
          etiket="Fiyat"
          hata={hatalar.fiyat}
          ipucu={satilik ? undefined : 'Kiralıkta aylık kira bedeli'}
        >
          <Sayi deger={form.fiyat as string} onDegisim={(d) => yaz('fiyat', d)} birim="₺" />
        </Alan>
        <Alan etiket="Para birimi">
          <Secim
            deger={form.paraBirimi as string}
            onDegisim={(d) => yaz('paraBirimi', d)}
            secenekler={[
              { value: 'TRY', label: 'Türk lirası (₺)' },
              { value: 'USD', label: 'ABD doları ($)' },
              { value: 'EUR', label: 'Euro (€)' },
            ]}
          />
        </Alan>
      </div>

      {satilik ? (
        <Alan
          etiket="Tahmini aylık kira"
          hata={hatalar.tahminiKira}
          ipucu="Yatırım göstergelerini bu alan besler. Bilmiyorsanız boş bırakın."
        >
          <Sayi
            deger={form.tahminiKira as string}
            onDegisim={(d) => yaz('tahminiKira', d)}
            birim="₺"
          />
        </Alan>
      ) : null}

      {gostergeler ? (
        <div className="sihirbaz-gostergeler">
          <p className="sihirbaz-gostergeler-baslik">Yatırım göstergeleri (önizleme)</p>
          <dl>
            <div>
              <dt>Kira çarpanı</dt>
              <dd>{gostergeler.kiraCarpani?.toLocaleString('tr-TR') ?? '—'}</dd>
            </div>
            <div>
              <dt>Brüt getiri</dt>
              <dd>%{gostergeler.brutGetiri?.toLocaleString('tr-TR') ?? '—'}</dd>
            </div>
            <div>
              <dt>Amortisman</dt>
              <dd>{gostergeler.amortismanYili?.toLocaleString('tr-TR') ?? '—'} yıl</dd>
            </div>
          </dl>
          <p className="sihirbaz-gostergeler-not">
            Kaydettiğinizde bu değerler otomatik hesaplanır; elle girilemez.
          </p>
        </div>
      ) : null}

      <div className="sihirbaz-satir">
        <Alan etiket="Brüt m²" hata={hatalar.brutM2}>
          <Sayi deger={form.brutM2 as string} onDegisim={(d) => yaz('brutM2', d)} birim="m²" />
        </Alan>
        <Alan etiket="Net m²" hata={hatalar.netM2}>
          <Sayi deger={form.netM2 as string} onDegisim={(d) => yaz('netM2', d)} birim="m²" />
        </Alan>
      </div>

      {konut ? (
        <Alan etiket="Oda sayısı" hata={hatalar.odaSayisi}>
          <Secim
            deger={form.odaSayisi as string}
            onDegisim={(d) => yaz('odaSayisi', d)}
            bosEtiket="Belirtilmedi"
            secenekler={ODA_SAYILARI}
          />
        </Alan>
      ) : null}

      <div className="sihirbaz-satir">
        <Alan etiket="Bulunduğu kat" ipucu="Örn: 3, Zemin, Bahçe katı">
          <Metin deger={form.bulunduguKat as string} onDegisim={(d) => yaz('bulunduguKat', d)} />
        </Alan>
        <Alan etiket="Toplam kat" hata={hatalar.toplamKat}>
          <Sayi deger={form.toplamKat as string} onDegisim={(d) => yaz('toplamKat', d)} />
        </Alan>
        <Alan etiket="Bina yaşı" hata={hatalar.binaYasi}>
          <Sayi deger={form.binaYasi as string} onDegisim={(d) => yaz('binaYasi', d)} />
        </Alan>
      </div>

      <Alan etiket="Aylık aidat" hata={hatalar.aidat}>
        <Sayi deger={form.aidat as string} onDegisim={(d) => yaz('aidat', d)} birim="₺" />
      </Alan>
    </>
  )
}

function EidsAdimi({ form, hatalar, yaz }: AdimOzellikleri) {
  return (
    <>
      <h2 className="sihirbaz-baslik">EİDS yetkisi</h2>
      <p className="sihirbaz-aciklama">
        Mülk sahibi e-Devlet üzerinden &quot;EİDS Taşınmaz İlanı Yetkilendirme İşlemleri&quot; ile
        işletmeyi yetkilendirir. <strong>Yetki yoksa ilan yayınlanamaz</strong> — bu yasal bir
        zorunluluktur ve devre dışı bırakılamaz.
      </p>
      <p className="sihirbaz-aciklama">
        Yetkiyi henüz almadıysanız sorun değil: ilanı şimdi taslak olarak kaydedip yetki geldiğinde
        tamamlayabilirsiniz.
      </p>

      <Alan etiket="Yetki durumu" hata={hatalar.eidsDurum}>
        <Secim
          deger={form.eidsDurum as string}
          onDegisim={(d) => yaz('eidsDurum', d)}
          bosEtiket="Belirtilmedi"
          secenekler={EIDS_DURUMLARI.map((value) => ({
            value,
            label: EIDS_DURUM_ETIKETLERI[value],
          }))}
        />
      </Alan>

      <Alan
        etiket="EİDS taşınmaz numarası"
        hata={hatalar.tasinmazNo}
        ipucu="İlan sayfasında 'Doğrulanmış İlan' rozetiyle birlikte gösterilir."
      >
        <Metin deger={form.tasinmazNo as string} onDegisim={(d) => yaz('tasinmazNo', d)} />
      </Alan>

      <div className="sihirbaz-satir">
        <Alan etiket="Yetki başlangıcı" hata={hatalar.eidsYetkiBaslangic}>
          <Tarih
            deger={form.eidsYetkiBaslangic as string}
            onDegisim={(d) => yaz('eidsYetkiBaslangic', d)}
          />
        </Alan>
        <Alan etiket="Yetki bitişi" hata={hatalar.eidsYetkiBitis} ipucu="Yetki en az 3 ay verilir.">
          <Tarih
            deger={form.eidsYetkiBitis as string}
            onDegisim={(d) => yaz('eidsYetkiBitis', d)}
          />
        </Alan>
      </div>
    </>
  )
}

function OzetAdimi({
  form,
  mahalleler,
  gostergeler,
}: {
  form: Form
  mahalleler: MahalleSecenegi[]
  gostergeler: IlanGostergeleri | null
}) {
  const mahalleAdi = mahalleler.find((m) => m.id === form.mahalle)?.ad ?? '—'
  const tipEtiketi = ILAN_TIPLERI.find((t) => t.value === form.tip)?.label ?? '—'
  const kategoriEtiketi = ILAN_KATEGORILERI.find((k) => k.value === form.kategori)?.label ?? '—'

  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: 'Başlık', deger: (form.baslik as string) || '—' },
    { etiket: 'Tip / kategori', deger: `${tipEtiketi} · ${kategoriEtiketi}` },
    { etiket: 'Mahalle', deger: mahalleAdi },
    { etiket: 'Ada / parsel', deger: `${form.ada || '—'} / ${form.parsel || '—'}` },
    {
      etiket: 'Fiyat',
      deger: form.fiyat ? `${Number(form.fiyat).toLocaleString('tr-TR')} ${form.paraBirimi}` : '—',
    },
    { etiket: 'Brüt m²', deger: (form.brutM2 as string) || '—' },
    { etiket: 'Kira çarpanı', deger: gostergeler?.kiraCarpani?.toLocaleString('tr-TR') ?? '—' },
    { etiket: 'Gizli portföy', deger: form.gizliPortfoy === true ? 'Evet' : 'Hayır' },
  ]

  return (
    <>
      <h2 className="sihirbaz-baslik">Özet ve kayıt</h2>
      <p className="sihirbaz-aciklama">
        İlan <strong>taslak olarak</strong> kaydedilecek. Fotoğraf, uzun açıklama ve SEO alanları
        için kayıttan sonra ilan sayfasına yönlendirileceksiniz.
      </p>

      <dl className="sihirbaz-ozet">
        {satirlar.map((satir) => (
          <div key={satir.etiket}>
            <dt>{satir.etiket}</dt>
            <dd>{satir.deger}</dd>
          </div>
        ))}
      </dl>
    </>
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
      <h2 className="sihirbaz-baslik">Taslak oluşturuldu</h2>
      <p className="sihirbaz-aciklama">
        <strong>{baslik}</strong> portföye taslak olarak eklendi.
      </p>

      <p className="sihirbaz-aciklama">
        {eidsHazir ? (
          <>
            EİDS koşulları sağlanıyor. İlanı yayına almak için ilan sayfasındaki{' '}
            <strong>Yayın durumu</strong> alanını &quot;Yayında&quot; yapmanız yeterli.
          </>
        ) : (
          <>
            <strong>İlan henüz yayına alınamaz</strong> — EİDS koşulları tamamlanmadı. Eksikleri
            ilan sayfasından tamamlayabilirsiniz.
          </>
        )}
      </p>

      <div className="sihirbaz-dugmeler">
        <a className="sihirbaz-dugme" href={`${adminTemelAdresi}/collections/ilanlar/${ilanId}`}>
          İlanı aç ve tamamla
        </a>
        <button type="button" className="sihirbaz-dugme sessiz" onClick={onYeni}>
          Yeni ilan gir
        </button>
      </div>
    </div>
  )
}

/**
 * Form değerini `EidsDurum`a daraltır.
 *
 * Seçim listesi zaten yalnızca geçerli değerleri üretiyor; buradaki kontrol
 * o varsayımı tipe bağlıyor. Tanınmayan bir değer `undefined`'a düşer ve
 * EİDS motoru "durum seçilmemiş" der — sessizce geçerli sayılmaz.
 */
function eidsDurumuCoz(deger: string): EidsDurum | undefined {
  return EIDS_DURUMLARI.find((durum) => durum === deger)
}

/** Metin girdisini sayıya çevirir. Boş veya geçersizse `null`. */
function sayiya(metin: string): number | null {
  if (metin.trim() === '') return null
  const sayi = Number(metin)
  return Number.isFinite(sayi) ? sayi : null
}
