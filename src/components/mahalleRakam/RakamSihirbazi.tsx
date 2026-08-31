'use client'

import { useState, useTransition } from 'react'

import { mahalleRakamlariniAktar, mahalleRakamlariniOnizle } from '@/lib/mahalle/rakamEylemleri'
import { ALAN_TANIMLARI, ornekCsv, type SutunEslemesi } from '@/lib/mahalle/rakamIceAktarma'
import type { IceAktarmaSonucu, OnizlemeSonucu } from '@/lib/mahalle/rakamIceAktarmaCekirdegi'

/**
 * Mahalle rakamları CSV sihirbazı — önce gör, sonra yaz.
 *
 * ⚠️ Sütun eşlemesi TAHMİN edilir ve kullanıcıya gösterilir. Elle tutulan
 * tabloların başlıkları standart değil; sabit bir düzen dayatmak içe
 * aktarmayı hiç kullanılmayacak bir özelliğe çevirirdi.
 *
 * ⚠️ Uyarılı satır AKTARILIR. Gözlem sayısı eşiğin altındaki bir mahalle
 * engellenmiyor — Aslıhan bilerek girebilir. Ama görmeden giremez: satır
 * sarı işaretleniyor, sebebi yazılıyor ve rakam sitede "tahmini" olarak
 * görünüyor.
 */
export function RakamSihirbazi() {
  const [csvMetni, setCsvMetni] = useState('')
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null)
  const [tarih, setTarih] = useState('')
  const [kaynak, setKaynak] = useState('')

  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null)
  const [eslesme, setEslesme] = useState<SutunEslemesi | null>(null)
  const [atlanacak, setAtlanacak] = useState<Set<number>>(new Set())
  const [sonuc, setSonuc] = useState<IceAktarmaSonucu | null>(null)
  const [bekliyor, basla] = useTransition()

  const ayarlar = {
    varsayilanTarih: tarih === '' ? null : tarih,
    varsayilanKaynak: kaynak.trim() === '' ? null : kaynak.trim(),
  }

  async function dosyaSecildi(dosya: File | undefined): Promise<void> {
    if (!dosya) return
    setDosyaAdi(dosya.name)
    setCsvMetni(await dosya.text())
    setOnizleme(null)
    setEslesme(null)
    setSonuc(null)
  }

  function onizle(yeniEslesme?: SutunEslemesi): void {
    setSonuc(null)
    basla(async () => {
      const cevap = await mahalleRakamlariniOnizle({
        csvMetni,
        ayarlar,
        eslesme: yeniEslesme ?? eslesme ?? undefined,
      })
      setOnizleme(cevap)
      if (cevap.eslesme) setEslesme(cevap.eslesme)
    })
  }

  function aktar(): void {
    basla(async () => {
      const cevap = await mahalleRakamlariniAktar({
        csvMetni,
        ayarlar,
        eslesme: eslesme ?? undefined,
        atlanacakSatirlar: [...atlanacak],
      })
      setSonuc(cevap)
      if (cevap.basarili) setOnizleme(null)
    })
  }

  function sutunuDegistir(anahtar: string, deger: string): void {
    const yeni: SutunEslemesi = {
      ...(eslesme ?? {}),
      [anahtar]: deger === '' ? null : Number(deger),
    }
    setEslesme(yeni)
    onizle(yeni)
  }

  function satiriDegistir(satirNo: number): void {
    setAtlanacak((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(satirNo)) yeni.delete(satirNo)
      else yeni.add(satirNo)
      return yeni
    })
  }

  /**
   * Örnek dosyayı yerinde üretip indirir.
   *
   * ⚠️ Sunucudan çekilmiyor: içerik zaten kodda ve tek doğru kaynak
   * `ornekCsv()`. Ayrı bir uç eklemek, örnek dosyanın sütun adlarıyla
   * ayrıştırıcının tanıdığı adların ayrışmasına kapı açardı.
   */
  function ornegiIndir(): void {
    const bag = URL.createObjectURL(
      new Blob(['﻿' + ornekCsv()], { type: 'text/csv;charset=utf-8' }),
    )
    const a = document.createElement('a')
    a.href = bag
    a.download = 'mahalle-rakamlari-ornek.csv'
    a.click()
    URL.revokeObjectURL(bag)
  }

  const yazilacak = (onizleme?.satirlar ?? []).filter(
    (satir) => satir.veri !== null && !atlanacak.has(satir.satirNo),
  ).length

  const sayiYaz = (deger: number | null | undefined) =>
    typeof deger === 'number' ? deger.toLocaleString('tr-TR') : '—'

  return (
    <>
      <section className="aktarim-adim">
        <h2>1 · Dosya</h2>

        <p className="aktarim-not">
          Hangi sütun adlarının tanındığını görmek için örnek dosyayı indirin; başlıkları
          değiştirmeden kendi rakamlarınızı yazabilirsiniz.
        </p>

        <button type="button" className="aktarim-buton" onClick={ornegiIndir}>
          Örnek CSV indir
        </button>

        <label className="aktarim-alan">
          <span>CSV dosyası</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(olay) => void dosyaSecildi(olay.target.files?.[0])}
          />
          <em>
            Excel&apos;de &quot;Farklı Kaydet → CSV UTF-8&quot;. Noktalı virgülle ayrılmış Türkçe
            Excel çıktısı da okunur. Sayılar <code>1.234,56</code> ya da <code>1,234.56</code>{' '}
            biçiminde olabilir — ikisi de tanınır.
          </em>
        </label>

        <label className="aktarim-alan">
          <span>…ya da içeriği buraya yapıştırın</span>
          <textarea
            value={csvMetni}
            onChange={(olay) => {
              setCsvMetni(olay.target.value)
              setDosyaAdi(null)
            }}
            placeholder={
              'Mahalle;Ortalama m² satış;Ortalama kira;Gözlem sayısı\nMuhittin;32.500;12.400;24'
            }
          />
        </label>

        {dosyaAdi ? <p className="aktarim-not">Seçilen dosya: {dosyaAdi}</p> : null}

        <h3>Varsayılanlar</h3>
        <p className="aktarim-not">
          Dosyada karşılığı olan sütun yoksa ya da hücre boşsa bu değerler kullanılır.
        </p>

        <label className="aktarim-alan">
          <span>Veriler hangi tarih itibarıyla</span>
          <input type="date" value={tarih} onChange={(olay) => setTarih(olay.target.value)} />
          <em>
            &quot;Veriler [tarih] itibarıyladır&quot; ibaresi bundan üretilir. Tarihsiz bir
            ortalama, ne zamanın ortalaması olduğu bilinmeyen bir rakamdır.
          </em>
        </label>

        <label className="aktarim-alan">
          <span>Veri kaynağı</span>
          <input
            type="text"
            value={kaynak}
            onChange={(olay) => setKaynak(olay.target.value)}
            placeholder="Örn. Kendi gözlemlerimiz, Ağustos 2026"
          />
          <em>Mahalle sayfasında rakamların yanında aynen gösterilir.</em>
        </label>

        <button
          type="button"
          className="aktarim-buton"
          onClick={() => onizle()}
          disabled={bekliyor || csvMetni.trim() === ''}
        >
          {bekliyor ? 'Okunuyor…' : 'Önizle'}
        </button>
      </section>

      {onizleme && !onizleme.basarili ? <p className="aktarim-hata">{onizleme.genelHata}</p> : null}

      {onizleme?.basarili && onizleme.satirlar ? (
        <section className="aktarim-adim">
          <h2>2 · Sütun eşlemesi</h2>
          <p className="aktarim-not">
            Ayırıcı: <code>{onizleme.ayirici}</code>. Tahmin yanlışsa aşağıdan düzeltin.
          </p>

          <div className="aktarim-tablo-sarmal">
            <table className="aktarim-tablo">
              <thead>
                <tr>
                  <th scope="col">Alan</th>
                  <th scope="col">CSV sütunu</th>
                  <th scope="col">İpucu</th>
                </tr>
              </thead>
              <tbody>
                {ALAN_TANIMLARI.map((tanim) => (
                  <tr key={tanim.anahtar}>
                    <td>
                      {tanim.etiket}
                      {tanim.zorunlu ? ' *' : ''}
                    </td>
                    <td>
                      <select
                        value={String(eslesme?.[tanim.anahtar] ?? '')}
                        onChange={(olay) => sutunuDegistir(tanim.anahtar, olay.target.value)}
                      >
                        <option value="">— eşlenmedi —</option>
                        {(onizleme.basliklar ?? []).map((baslik, sira) => (
                          <option key={`${sira}-${baslik}`} value={String(sira)}>
                            {sira + 1}. {baslik}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{tanim.ipucu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(onizleme.eksikAlanlar?.length ?? 0) > 0 ? (
            <p className="aktarim-hata">
              Şu zorunlu alanlar bir sütuna bağlanmadı: {onizleme.eksikAlanlar?.join(', ')}.
            </p>
          ) : null}

          {(onizleme.kullanilmayanSutunlar?.length ?? 0) > 0 ? (
            <p className="aktarim-not">
              Kullanılmayan sütunlar:{' '}
              {onizleme.kullanilmayanSutunlar?.map((s) => s.baslik).join(', ')}. Bunlar sessizce
              atılmıyor — burada görüyorsunuz.
            </p>
          ) : null}

          <h3>Önizleme</h3>
          <div className="aktarim-ozet">
            <span className="aktarim-rozet aktarim-rozet--yeni">{onizleme.hazirSayisi} hazır</span>
            <span className="aktarim-rozet aktarim-rozet--korunacak">
              {onizleme.uyariliSayisi} uyarılı (aktarılır, işaretlenir)
            </span>
            <span className="aktarim-rozet">{onizleme.hataliSayisi} hatalı (aktarılmayacak)</span>
          </div>

          <div className="aktarim-tablo-sarmal">
            <table className="aktarim-tablo">
              <thead>
                <tr>
                  <th scope="col">Satır</th>
                  <th scope="col">Aktar</th>
                  <th scope="col">Mahalle</th>
                  <th scope="col">m² satış</th>
                  <th scope="col">Kira</th>
                  <th scope="col">Çarpan</th>
                  <th scope="col">Değişim</th>
                  <th scope="col">Nüfus</th>
                  <th scope="col">n</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {onizleme.satirlar.slice(0, 300).map((satir) => (
                  <tr
                    key={satir.satirNo}
                    className={
                      satir.veri === null
                        ? 'aktarim-satir--hatali'
                        : satir.uyarilar.length > 0
                          ? 'aktarim-satir--korunacak'
                          : 'aktarim-satir--yeni'
                    }
                  >
                    <td>{satir.satirNo}</td>
                    <td>
                      {satir.veri === null ? (
                        '—'
                      ) : (
                        <input
                          type="checkbox"
                          checked={!atlanacak.has(satir.satirNo)}
                          onChange={() => satiriDegistir(satir.satirNo)}
                          aria-label={`${satir.satirNo}. satırı aktar`}
                        />
                      )}
                    </td>
                    <td>{satir.veri?.mahalleAdi ?? '—'}</td>
                    <td>{sayiYaz(satir.veri?.ortalamaM2Satis)}</td>
                    <td>{sayiYaz(satir.veri?.ortalamaKira)}</td>
                    <td>{sayiYaz(satir.veri?.kiraCarpani)}</td>
                    <td>{sayiYaz(satir.veri?.degisim12Ay)}</td>
                    <td>{sayiYaz(satir.veri?.nufus)}</td>
                    <td>{sayiYaz(satir.veri?.gozlemSayisi)}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: '22rem' }}>
                      {[...satir.hatalar, ...satir.uyarilar].join(' ') || 'hazır'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {onizleme.satirlar.length > 300 ? (
            <p className="aktarim-not">
              İlk 300 satır gösteriliyor; {onizleme.satirlar.length} satırın tamamı işlenecek.
            </p>
          ) : null}

          <button
            type="button"
            className="aktarim-buton"
            onClick={aktar}
            disabled={bekliyor || yazilacak === 0 || (onizleme.eksikAlanlar?.length ?? 0) > 0}
          >
            {bekliyor ? 'Aktarılıyor…' : `${yazilacak} mahalleyi güncelle`}
          </button>
        </section>
      ) : null}

      {sonuc ? (
        <section className="aktarim-adim">
          <h2>Sonuç</h2>
          {sonuc.basarili ? (
            <p className="aktarim-basari">
              {sonuc.guncellenen} mahalle güncellendi, {sonuc.atlanan} satır elendi, {sonuc.hatali}{' '}
              satır hatalı olduğu için aktarılmadı.
            </p>
          ) : (
            <p className="aktarim-hata">{sonuc.genelHata}</p>
          )}

          {(sonuc.yazmaHatalari?.length ?? 0) > 0 ? (
            <ul className="aktarim-hata-liste">
              {sonuc.yazmaHatalari?.map((hata) => (
                <li key={hata.satirNo}>
                  {hata.satirNo}. satır: {hata.mesaj}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
