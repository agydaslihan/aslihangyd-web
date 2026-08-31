'use client'

import { useState, useTransition } from 'react'

import { ALAN_TANIMLARI, ornekCsv, type SutunEslemesi } from '@/lib/rayic/iceAktarma'
import { rayicIceAktar, rayicOnizle } from '@/lib/rayic/eylemler'
import type { IceAktarmaSonucu, OnizlemeSonucu } from '@/lib/rayic/iceAktarmaCekirdegi'
import { RAYIC_KAYNAKLARI, type RayicKaynagi } from '@/lib/rayic/tipler'

/**
 * Rayiç bedel CSV sihirbazı — önce gör, sonra yaz.
 *
 * ⚠️ Sütun eşlemesi TAHMİN edilir ve kullanıcıya gösterilir. Belediye
 * tablolarının başlıkları standart değil; sabit bir düzen dayatmak içe
 * aktarmayı hiç kullanılmayacak bir özelliğe çevirirdi.
 *
 * ⚠️ Hatalı satır sessizce atlanmaz: sebebi yazılır ve sayılır.
 */
export function RayicSihirbazi() {
  const [csvMetni, setCsvMetni] = useState('')
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null)
  const [yil, setYil] = useState<number>(new Date().getFullYear())
  const [kaynak, setKaynak] = useState<RayicKaynagi>('belediye')
  const [tabloTarihi, setTabloTarihi] = useState('')

  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null)
  const [eslesme, setEslesme] = useState<SutunEslemesi | null>(null)
  const [atlanacak, setAtlanacak] = useState<Set<number>>(new Set())
  const [sonuc, setSonuc] = useState<IceAktarmaSonucu | null>(null)
  const [bekliyor, basla] = useTransition()

  const ayarlar = {
    varsayilanYil: yil,
    varsayilanKaynak: kaynak,
    guncellemeTarihi: tabloTarihi === '' ? null : tabloTarihi,
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
      const cevap = await rayicOnizle({
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
      const cevap = await rayicIceAktar({
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
   *
   * ⚠️ BOM (`\ufeff`) şart: Excel BOM'suz UTF-8 dosyayı Latin-1 sanıp
   * Türkçe karakterleri bozuyor ve indirdiği örneği açan kişi "Muhittin"
   * yerine "MuhÄ±ttÄ±n" görüyor.
   */
  function ornegiIndir(): void {
    const bag = URL.createObjectURL(
      new Blob(['\ufeff' + ornekCsv()], { type: 'text/csv;charset=utf-8' }),
    )
    const a = document.createElement('a')
    a.href = bag
    a.download = 'rayic-bedel-ornek.csv'
    a.click()
    URL.revokeObjectURL(bag)
  }

  const yazilacak = (onizleme?.satirlar ?? []).filter(
    (satir) => satir.veri !== null && !atlanacak.has(satir.satirNo),
  ).length

  return (
    <>
      <section className="aktarim-adim">
        <h2>1 · Dosya</h2>

        <p className="aktarim-not">
          Sütun adlarının nasıl yazılması gerektiğini görmek için örnek dosyayı indirin; başlıkları
          değiştirmeden kendi rakamlarınızı yazabilirsiniz. Sayılar <code>12.500,50</code> ya da{' '}
          <code>12,500.50</code> biçiminde olabilir — ikisi de okunur.
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
            Excel çıktısı da okunur.
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
              'Mahalle;Sokak;Bina m² rayiç;Arsa m² rayiç\nMuhittin;Atatürk Cad.;9.500;6.200'
            }
          />
        </label>

        {dosyaAdi ? <p className="aktarim-not">Seçilen dosya: {dosyaAdi}</p> : null}

        <h3>Varsayılanlar</h3>
        <p className="aktarim-not">
          Dosyada karşılığı olan sütun yoksa ya da hücre boşsa bu değerler kullanılır.
        </p>

        <label className="aktarim-alan">
          <span>Yıl</span>
          <input
            type="number"
            min={1990}
            max={2100}
            value={yil}
            onChange={(olay) => setYil(Number(olay.target.value))}
          />
          <em>Rayiç bedelin ait olduğu vergi yılı. Yılsız rakam anlamsızdır.</em>
        </label>

        <label className="aktarim-alan">
          <span>Kaynak</span>
          <select value={kaynak} onChange={(olay) => setKaynak(olay.target.value as RayicKaynagi)}>
            {RAYIC_KAYNAKLARI.map((secenek) => (
              <option key={secenek.value} value={secenek.value}>
                {secenek.label}
              </option>
            ))}
          </select>
          <em>Sitede rakamın yanında aynen gösterilir.</em>
        </label>

        <label className="aktarim-alan">
          <span>Tabloyu aldığınız tarih (isteğe bağlı)</span>
          <input
            type="date"
            value={tabloTarihi}
            onChange={(olay) => setTabloTarihi(olay.target.value)}
          />
          <em>&quot;Veriler [tarih] itibarıyladır&quot; ibaresi bundan üretilir.</em>
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
              {onizleme.uyariliSayisi} uyarılı
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
                  <th scope="col">Sokak</th>
                  <th scope="col">Yıl</th>
                  <th scope="col">Bina ₺/m²</th>
                  <th scope="col">Arsa ₺/m²</th>
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
                    <td>{satir.veri?.sokak ?? '—'}</td>
                    <td>{satir.veri?.yil ?? '—'}</td>
                    <td>{satir.veri?.metrekareRayicBedel?.toLocaleString('tr-TR') ?? '—'}</td>
                    <td>{satir.veri?.arsaRayicBedel?.toLocaleString('tr-TR') ?? '—'}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: '20rem' }}>
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
            {bekliyor ? 'Aktarılıyor…' : `${yazilacak} satırı aktar`}
          </button>
        </section>
      ) : null}

      {sonuc ? (
        <section className="aktarim-adim">
          <h2>Sonuç</h2>
          {sonuc.basarili ? (
            <p className="aktarim-basari">
              {sonuc.olusturulan} yeni kayıt açıldı, {sonuc.guncellenen} kayıt güncellendi,{' '}
              {sonuc.atlanan} satır elendi, {sonuc.hatali} satır hatalı olduğu için aktarılmadı.
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
