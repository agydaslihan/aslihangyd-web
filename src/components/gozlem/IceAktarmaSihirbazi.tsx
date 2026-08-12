'use client'

import { useRef, useState, useTransition } from 'react'

import type { Ayirici } from '@/lib/csv/ayristir'
import { GOZLEM_KAYNAKLARI, GUVEN_SEVIYELERI } from '@/lib/endeks/tipler'
import { gozlemOnizlemesiHazirla, gozlemleriIceAktar } from '@/lib/gozlem/eylemler'
import type { IceAktarmaSonucu, OnizlemeSonucu } from '@/lib/gozlem/iceAktarmaCekirdegi'
import { ALAN_TANIMLARI, type AlanAnahtari, type SutunEslemesi } from '@/lib/gozlem/iceAktarma'

/**
 * Gözlem CSV içe aktarma sihirbazı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ ADIM: ÖNCE GÖR, SONRA YAZ
 *
 * "Dosyayı seç, içe aktar" tek adımlı bir akış olsaydı, 400 satırlık bir
 * dosyadaki tarih biçimi hatası ancak veri girdikten sonra fark edilirdi ve
 * temizlemek elle silmek anlamına gelirdi.
 *
 * Bu yüzden önizleme zorunlu bir adım: her satır ne olarak okunduğuyla
 * birlikte gösterilir, hatalılar ayrılır, kullanıcı istemediği satırı
 * eler — ve ancak ondan sonra yazma başlar.
 * ─────────────────────────────────────────────────────────────────────────
 */

const AYIRICILAR: { deger: Ayirici; etiket: string }[] = [
  { deger: ';', etiket: 'Noktalı virgül ( ; )' },
  { deger: ',', etiket: 'Virgül ( , )' },
  { deger: '\t', etiket: 'Sekme' },
  { deger: '|', etiket: 'Dik çizgi ( | )' },
]

export function IceAktarmaSihirbazi({ mahalleSayisi }: { mahalleSayisi: number }) {
  const [csvMetni, setCsvMetni] = useState('')
  const [ayirici, setAyirici] = useState<Ayirici | ''>('')
  const [eslesme, setEslesme] = useState<SutunEslemesi | null>(null)
  const [varsayilanKaynak, setVarsayilanKaynak] = useState<string>('portal_ilan')
  const [varsayilanGuven, setVarsayilanGuven] = useState<string>('dusuk')
  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null)
  const [sonuc, setSonuc] = useState<IceAktarmaSonucu | null>(null)
  const [atlanacak, setAtlanacak] = useState<Set<number>>(new Set())
  const [kodlamaNotu, setKodlamaNotu] = useState<string | null>(null)
  const [bekliyor, basla] = useTransition()

  const dosyaGirdisi = useRef<HTMLInputElement>(null)

  const ayarlar = () => ({
    varsayilanKaynak: varsayilanKaynak as (typeof GOZLEM_KAYNAKLARI)[number]['value'],
    varsayilanGuven: varsayilanGuven as (typeof GUVEN_SEVIYELERI)[number]['value'],
  })

  /**
   * Dosya okuma.
   *
   * ⚠️ Türkçe Excel dosyayı sık sık Windows-1254 ile yazar. UTF-8 olarak
   * okunursa "Şeyhsinan" bozulur ve mahalle eşleşmez. Önce UTF-8 denenir;
   * çıktıda değiştirme karakteri (U+FFFD) varsa Windows-1254'e düşülür ve
   * bu KULLANICIYA SÖYLENİR — sessiz bir tahmin, sonradan anlaşılmaz bir
   * bozulmaya dönüşür.
   */
  async function dosyaSecildi(dosya: File): Promise<void> {
    const tampon = await dosya.arrayBuffer()

    // U+FFFD (değiştirme karakteri) kaçış dizisiyle yazılıyor: kaynak
    // dosyaya doğrudan konursa font alt kümesi denetimi haklı olarak
    // "bu karakter fontta yok" diye uyarır.
    const DEGISTIRME_KARAKTERI = '\uFFFD'

    const utf8 = new TextDecoder('utf-8').decode(tampon)
    if (!utf8.includes(DEGISTIRME_KARAKTERI)) {
      setCsvMetni(utf8)
      setKodlamaNotu(`${dosya.name} · UTF-8 olarak okundu`)
    } else {
      const tr = new TextDecoder('windows-1254').decode(tampon)
      setCsvMetni(tr)
      setKodlamaNotu(
        `${dosya.name} · UTF-8 çözülemedi, Windows-1254 kullanıldı. ` +
          'Türkçe karakterler aşağıdaki önizlemede doğru görünüyor mu, kontrol edin.',
      )
    }

    setOnizleme(null)
    setSonuc(null)
    setEslesme(null)
  }

  function onizle(): void {
    setSonuc(null)
    basla(async () => {
      const cikti = await gozlemOnizlemesiHazirla({
        csvMetni,
        ayirici: ayirici === '' ? undefined : ayirici,
        eslesme: eslesme ?? undefined,
        ayarlar: ayarlar(),
      })
      setOnizleme(cikti)
      if (cikti.eslesme) setEslesme(cikti.eslesme)
      if (cikti.ayirici && ayirici === '') setAyirici(cikti.ayirici)
      setAtlanacak(new Set())
    })
  }

  function iceAktar(): void {
    basla(async () => {
      const cikti = await gozlemleriIceAktar({
        csvMetni,
        ayirici: ayirici === '' ? undefined : ayirici,
        eslesme: eslesme ?? undefined,
        ayarlar: ayarlar(),
        atlanacakSatirlar: [...atlanacak],
      })
      setSonuc(cikti)
      if (cikti.basarili) setOnizleme(null)
    })
  }

  function satiriDegistir(satirNo: number): void {
    setAtlanacak((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(satirNo)) yeni.delete(satirNo)
      else yeni.add(satirNo)
      return yeni
    })
  }

  const eksikAlanVar = (onizleme?.eksikAlanlar?.length ?? 0) > 0
  const aktarilabilir = (onizleme?.satirlar ?? []).filter(
    (satir) => satir.veri !== null && !atlanacak.has(satir.satirNo),
  ).length

  return (
    <div className="ice-aktar">
      {mahalleSayisi === 0 ? (
        <div className="ice-aktar-bos">
          <p>
            <strong>Önce mahalle kaydı gerekiyor.</strong> Gözlemler mahalleye bağlanır; sistemde
            hiç mahalle yokken CSV&apos;deki hiçbir satır eşleşemez.
          </p>
        </div>
      ) : null}

      {/* ── 1. Dosya ── */}
      <section className="ice-aktar-adim">
        <h2>1 · Dosya</h2>

        <div className="ice-aktar-satir">
          <label className="ice-aktar-dosya">
            <input
              ref={dosyaGirdisi}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(olay) => {
                const dosya = olay.target.files?.[0]
                if (dosya) void dosyaSecildi(dosya)
              }}
            />
          </label>
        </div>

        {kodlamaNotu ? <p className="ice-aktar-not">{kodlamaNotu}</p> : null}

        <label className="ice-aktar-alan">
          <span>veya içeriği buraya yapıştırın</span>
          <textarea
            value={csvMetni}
            onChange={(olay) => {
              setCsvMetni(olay.target.value)
              setOnizleme(null)
              setSonuc(null)
              setEslesme(null)
            }}
            rows={6}
            spellCheck={false}
            placeholder={
              'Tarih;Mahalle;Tip;Oda;m²;Fiyat\n03.08.2026;Muhittin;Satılık;3+1;135;4.300.000'
            }
          />
        </label>

        <div className="ice-aktar-secimler">
          <label className="ice-aktar-alan">
            <span>Ayırıcı</span>
            <select value={ayirici} onChange={(olay) => setAyirici(olay.target.value as Ayirici)}>
              <option value="">Kendisi bulsun</option>
              {AYIRICILAR.map((secenek) => (
                <option key={secenek.deger} value={secenek.deger}>
                  {secenek.etiket}
                </option>
              ))}
            </select>
          </label>

          <label className="ice-aktar-alan">
            <span>Kaynak sütunu boşsa</span>
            <select
              value={varsayilanKaynak}
              onChange={(olay) => setVarsayilanKaynak(olay.target.value)}
            >
              {GOZLEM_KAYNAKLARI.map((secenek) => (
                <option key={secenek.value} value={secenek.value}>
                  {secenek.label}
                </option>
              ))}
            </select>
          </label>

          <label className="ice-aktar-alan">
            <span>Güven sütunu boşsa</span>
            <select
              value={varsayilanGuven}
              onChange={(olay) => setVarsayilanGuven(olay.target.value)}
            >
              {GUVEN_SEVIYELERI.map((secenek) => (
                <option key={secenek.value} value={secenek.value}>
                  {secenek.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="ice-aktar-not">
          Güven varsayılanı bilerek <strong>Düşük</strong>: CSV ile gelen kayıtlar çoğunlukla geriye
          dönüktür ve metodoloji bunların düşük güvenle işaretlenmesini şart koşuyor
          (ENDEKS-VERI-YONETIMI.md §5). Grafikte kesikli çizgiyle gösterilir, gerçek zamanlı
          gözlemle karışmaz. Dosyanız güncel gözlemlerse buradan değiştirin.
        </p>

        <button
          type="button"
          className="ice-aktar-buton"
          onClick={onizle}
          disabled={bekliyor || csvMetni.trim() === ''}
        >
          {bekliyor ? 'Okunuyor…' : 'Önizle'}
        </button>
      </section>

      {/* ── 2. Eşleme ── */}
      {onizleme?.basarili && onizleme.basliklar ? (
        <section className="ice-aktar-adim">
          <h2>2 · Sütun eşlemesi</h2>
          <p className="ice-aktar-not">
            Tahminleri kontrol edin. Yanlışsa düzeltip yeniden önizleyin.{' '}
            {onizleme.ayirici ? (
              <>
                Ayırıcı olarak{' '}
                <strong>
                  {AYIRICILAR.find((a) => a.deger === onizleme.ayirici)?.etiket ?? onizleme.ayirici}
                </strong>{' '}
                kullanıldı.
              </>
            ) : null}
          </p>

          <div className="ice-aktar-eslesme">
            {ALAN_TANIMLARI.map((tanim) => (
              <label key={tanim.anahtar} className="ice-aktar-alan">
                <span>
                  {tanim.etiket}
                  {tanim.zorunlu ? <em className="ice-aktar-zorunlu"> · zorunlu</em> : null}
                </span>
                <select
                  value={String(eslesme?.[tanim.anahtar] ?? '')}
                  onChange={(olay) => {
                    const deger = olay.target.value
                    setEslesme((onceki) => ({
                      ...(onceki ?? {}),
                      [tanim.anahtar as AlanAnahtari]: deger === '' ? null : Number(deger),
                    }))
                  }}
                >
                  <option value="">— yok —</option>
                  {onizleme.basliklar?.map((baslik, sira) => (
                    <option key={`${baslik}-${sira}`} value={sira}>
                      {baslik || `(${sira + 1}. sütun)`}
                    </option>
                  ))}
                </select>
                <em className="ice-aktar-ipucu">{tanim.ipucu}</em>
              </label>
            ))}
          </div>

          {eksikAlanVar ? (
            <p className="ice-aktar-hata">
              Şu zorunlu alanlar bir sütuna bağlanmadı: {onizleme.eksikAlanlar?.join(', ')}.
            </p>
          ) : null}

          {(onizleme.kullanilmayanSutunlar?.length ?? 0) > 0 ? (
            <p className="ice-aktar-not">
              Kullanılmayan sütunlar:{' '}
              {onizleme.kullanilmayanSutunlar?.map((s) => s.baslik).join(', ')}. Bunlar içe
              aktarılmayacak — sessizce atılmadığını bilesiniz diye yazıyoruz.
            </p>
          ) : null}

          <button
            type="button"
            className="ice-aktar-buton ice-aktar-buton--ikincil"
            onClick={onizle}
            disabled={bekliyor}
          >
            Eşlemeyi uygula
          </button>
        </section>
      ) : null}

      {/* ── 3. Önizleme ── */}
      {onizleme?.basarili && onizleme.satirlar ? (
        <section className="ice-aktar-adim">
          <h2>3 · Önizleme</h2>

          <div className="ice-aktar-ozet">
            <span className="ice-aktar-rozet ice-aktar-rozet--hazir">
              {onizleme.hazirSayisi} hazır
            </span>
            <span className="ice-aktar-rozet ice-aktar-rozet--uyari">
              {onizleme.uyariliSayisi} uyarılı
            </span>
            <span className="ice-aktar-rozet ice-aktar-rozet--hata">
              {onizleme.hataliSayisi} hatalı
            </span>
            {(onizleme.atlananBosSatir ?? 0) > 0 ? (
              <span className="ice-aktar-rozet">{onizleme.atlananBosSatir} boş satır atlandı</span>
            ) : null}
          </div>

          <p className="ice-aktar-not">
            Hatalı satırlar içe aktarılmaz; sebepleri aşağıda yazıyor. Uyarılı satırlar aktarılır —
            istemediğinizi kutucuğundan çıkarın.
          </p>

          <div className="ice-aktar-tablo-sarmal">
            <table className="ice-aktar-tablo">
              <thead>
                <tr>
                  <th scope="col">Al</th>
                  <th scope="col">Satır</th>
                  <th scope="col">Mahalle</th>
                  <th scope="col">Tip · Oda</th>
                  <th scope="col">m²</th>
                  <th scope="col">Fiyat</th>
                  <th scope="col">m² fiyatı</th>
                  <th scope="col">Tarih</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {onizleme.satirlar.map((satir) => {
                  const durum =
                    satir.veri === null ? 'hata' : satir.uyarilar.length > 0 ? 'uyari' : 'hazir'

                  return (
                    <tr key={satir.satirNo} className={`ice-aktar-satir--${durum}`}>
                      <td>
                        {satir.veri === null ? (
                          <span aria-hidden>—</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={!atlanacak.has(satir.satirNo)}
                            onChange={() => satiriDegistir(satir.satirNo)}
                            aria-label={`${satir.satirNo}. satırı içe aktar`}
                          />
                        )}
                      </td>
                      <td className="ice-aktar-sayi">{satir.satirNo}</td>
                      <td>{satir.veri?.mahalleAdi ?? '—'}</td>
                      <td>{satir.veri ? `${satir.veri.tip} · ${satir.veri.odaTipi}` : '—'}</td>
                      <td className="ice-aktar-sayi">{satir.veri?.m2 ?? '—'}</td>
                      <td className="ice-aktar-sayi">
                        {satir.veri ? satir.veri.fiyat.toLocaleString('tr-TR') : '—'}
                      </td>
                      <td className="ice-aktar-sayi">
                        {satir.veri ? Math.round(satir.veri.m2Fiyati).toLocaleString('tr-TR') : '—'}
                      </td>
                      <td className="ice-aktar-sayi">{satir.veri?.gozlemTarihi ?? '—'}</td>
                      <td className="ice-aktar-durum">
                        {satir.hatalar.map((mesaj) => (
                          <span key={mesaj} className="ice-aktar-durum-hata">
                            {mesaj}
                          </span>
                        ))}
                        {satir.uyarilar.map((mesaj) => (
                          <span key={mesaj} className="ice-aktar-durum-uyari">
                            {mesaj}
                          </span>
                        ))}
                        {durum === 'hazir' ? (
                          <span className="ice-aktar-durum-ok">Hazır</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="ice-aktar-buton"
            onClick={iceAktar}
            disabled={bekliyor || eksikAlanVar || aktarilabilir === 0}
          >
            {bekliyor ? 'Aktarılıyor…' : `${aktarilabilir} satırı içe aktar`}
          </button>
        </section>
      ) : null}

      {onizleme && !onizleme.basarili ? (
        <p className="ice-aktar-hata">{onizleme.genelHata}</p>
      ) : null}

      {/* ── Sonuç ── */}
      {sonuc ? (
        <section className="ice-aktar-adim">
          <h2>Sonuç</h2>
          {sonuc.basarili ? (
            <>
              <p className="ice-aktar-basari">
                {sonuc.olusturulan} gözlem kaydedildi.
                {(sonuc.atlanan ?? 0) > 0 ? ` ${sonuc.atlanan} satırı siz elediniz.` : ''}
                {(sonuc.hatali ?? 0) > 0
                  ? ` ${sonuc.hatali} satır hatalı olduğu için aktarılmadı.`
                  : ''}
              </p>
              {(sonuc.yazmaHatalari?.length ?? 0) > 0 ? (
                <ul className="ice-aktar-yazma-hatalari">
                  {sonuc.yazmaHatalari?.map((hata) => (
                    <li key={hata.satirNo}>
                      {hata.satirNo}. satır: {hata.mesaj}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="ice-aktar-hata">{sonuc.genelHata}</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
