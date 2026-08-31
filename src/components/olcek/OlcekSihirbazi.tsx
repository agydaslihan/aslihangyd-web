'use client'

import { useEffect, useState, useTransition } from 'react'

import {
  olcekDuzeltmesiUygula,
  olcekDuzeltmesiniGeriAl,
  olcekTaramasi,
} from '@/lib/veri/olcekEylemleri'
import type { SecilenAlan, TaramaSonucu, UygulamaSonucu } from '@/lib/veri/olcekTarama'

/**
 * Toplu ölçek düzeltme — tara, gör, onayla, gerekirse geri al.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜÇ KAPI ÜST ÜSTE, VE ÜÇÜ DE GEREKLİ.
 *
 * 1. **Önizleme.** Hangi kaydın hangi alanı neyden neye çevrilecek —
 *    tek tek yazılı. "26 mahalleyi düzelt" düğmesi, ne yapacağını
 *    göstermeden basıldığında bir düzeltme aracı değil bir kumar.
 * 2. **Onay.** Varsayılan olarak hepsi seçili DEĞİL — kullanıcı
 *    seçiyor. Toplu işlemde varsayılanın "hepsi" olması, gözden
 *    kaçan bir satırın da uygulanması demek.
 * 3. **Geri alma.** Parti eski değerleriyle kaydediliyor; geri alma
 *    bölerek değil, eski değeri YAZARAK çalışıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ DOĞRU DEĞERİ SİSTEM BİLMİYOR. ×1000 bir ÖNERİ; kaydın gerçek
 * rakamını bilen tek kişi Aslıhan. Ekran bunu yazıyor ve tek tek
 * onaylatıyor.
 */
export function OlcekSihirbazi() {
  const [tarama, setTarama] = useState<TaramaSonucu | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [secilenler, setSecilenler] = useState<Set<string>>(new Set())
  const [sonuc, setSonuc] = useState<UygulamaSonucu | null>(null)
  const [bekliyor, basla] = useTransition()

  const anahtar = (koleksiyon: string, kayitId: number, alan: string) =>
    `${koleksiyon}:${kayitId}:${alan}`

  const tara = () => {
    basla(async () => {
      setSonuc(null)
      setHata(null)
      const cevap = await olcekTaramasi()
      if ('hata' in cevap) {
        setHata(cevap.hata)
        setTarama(null)
        return
      }
      setTarama(cevap)
      // ⚠️ Seçim SIFIRLANIYOR: eski taramadan kalan bir seçim, artık
      // var olmayan bir alanı düzeltmeye çalışırdı.
      setSecilenler(new Set())
    })
  }

  /**
   * ⚠️ İlk tarama efektte ama setState EFEKT GÖVDESİNDE DEĞİL: geçiş
   * fonksiyonunun içinde. Efekt gövdesinde senkron setState, zincirleme
   * render üretiyor ve lint bunu haklı olarak reddediyor.
   */
  useEffect(() => {
    tara()
  }, [])

  const cevir = (a: string) =>
    setSecilenler((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(a)) yeni.delete(a)
      else yeni.add(a)
      return yeni
    })

  const uygula = () => {
    const liste: SecilenAlan[] = []
    for (const a of secilenler) {
      const [koleksiyon, kayitId, alan] = a.split(':')
      if (koleksiyon === undefined || kayitId === undefined || alan === undefined) continue
      liste.push({
        koleksiyon: koleksiyon as SecilenAlan['koleksiyon'],
        kayitId: Number(kayitId),
        alan: alan as SecilenAlan['alan'],
      })
    }

    basla(async () => {
      const cevap = await olcekDuzeltmesiUygula(liste)
      setSonuc(cevap)
      if (cevap.basarili) tara()
    })
  }

  const geriAl = (partiId: string) => {
    basla(async () => {
      const cevap = await olcekDuzeltmesiniGeriAl(partiId)
      setSonuc(cevap)
      if (cevap.basarili) tara()
    })
  }

  return (
    <>
      <section className="aktarim-adim">
        <h2>1 · Tarama</h2>

        {hata ? (
          <p className="aktarim-hata" role="alert">
            {hata}
          </p>
        ) : null}

        {tarama === null ? (
          <p className="aktarim-not">{bekliyor ? 'Taranıyor…' : 'Tarama yapılmadı.'}</p>
        ) : (
          <div className="aktarim-ozet">
            <span className="aktarim-rozet">{tarama.tarananKayit} kayıt tarandı</span>
            <span className="aktarim-rozet aktarim-rozet--korunacak">
              {tarama.supheliAlan} şüpheli alan
            </span>
            <span className="aktarim-rozet aktarim-rozet--yeni">{secilenler.size} seçili</span>
          </div>
        )}

        <button type="button" className="aktarim-buton" onClick={tara} disabled={bekliyor}>
          {bekliyor ? 'Çalışıyor…' : 'Yeniden tara'}
        </button>
      </section>

      {tarama !== null && tarama.satirlar.length === 0 ? (
        <section className="aktarim-adim">
          <p className="aktarim-basari">
            Ölçek şüphesi taşıyan alan bulunamadı. {tarama.tarananKayit} kayıt tarandı.
          </p>
        </section>
      ) : null}

      {tarama !== null && tarama.satirlar.length > 0 ? (
        <section className="aktarim-adim">
          <h2>2 · Önizleme ve seçim</h2>
          <p className="aktarim-not">
            ×1000 bir <strong>öneri</strong>. Doğru rakamı sistem bilmiyor — her satırı tek tek
            onaylayın. Seçmediğiniz hiçbir alana dokunulmaz.
          </p>

          <div className="aktarim-tablo-sarmal">
            <table className="aktarim-tablo">
              <thead>
                <tr>
                  <th scope="col">Düzelt</th>
                  <th scope="col">Kayıt</th>
                  <th scope="col">Alan</th>
                  <th scope="col">Şu an</th>
                  <th scope="col">Önerilen</th>
                  <th scope="col">Neden şüpheli</th>
                </tr>
              </thead>
              <tbody>
                {tarama.satirlar.flatMap((satir) =>
                  satir.supheler.map((suphe) => {
                    const a = anahtar(satir.koleksiyon, satir.kayitId, suphe.alan)
                    return (
                      <tr key={a} className={secilenler.has(a) ? 'aktarim-satir--yeni' : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={secilenler.has(a)}
                            onChange={() => cevir(a)}
                            aria-label={`${satir.kayitAdi} — ${suphe.etiket} alanını düzelt`}
                          />
                        </td>
                        <td>
                          {satir.kayitAdi}
                          <br />
                          <small>
                            {satir.koleksiyon} #{satir.kayitId}
                          </small>
                        </td>
                        <td>{suphe.etiket}</td>
                        <td>{suphe.deger.toLocaleString('tr-TR')}</td>
                        <td>
                          <strong>{suphe.onerilen.toLocaleString('tr-TR')}</strong>
                        </td>
                        <td style={{ whiteSpace: 'normal', minWidth: '22rem' }}>{suphe.mesaj}</td>
                      </tr>
                    )
                  }),
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="aktarim-buton"
            onClick={uygula}
            disabled={bekliyor || secilenler.size === 0}
          >
            {bekliyor ? 'Uygulanıyor…' : `${secilenler.size} alanı 1000 ile çarp`}
          </button>
        </section>
      ) : null}

      {sonuc ? (
        <section className="aktarim-adim">
          <h2>Sonuç</h2>
          {sonuc.basarili ? (
            <>
              <p className="aktarim-basari">
                {sonuc.degisen} alan güncellendi
                {sonuc.atlanan ? `, ${sonuc.atlanan} alan atlandı (artık şüpheli değil)` : ''}.
              </p>
              {sonuc.partiId ? (
                <button
                  type="button"
                  className="aktarim-buton"
                  onClick={() => geriAl(sonuc.partiId as string)}
                  disabled={bekliyor}
                >
                  Bu partiyi geri al
                </button>
              ) : null}
              <p className="aktarim-not">
                Geri alma, eski değerleri <strong>yazarak</strong> çalışır — bölerek değil. Parti
                kaydı <code>Ölçek düzeltmeleri</code> koleksiyonunda duruyor; oradan da geri
                alınabilir.
              </p>
            </>
          ) : (
            <p className="aktarim-hata">{sonuc.genelHata}</p>
          )}

          {(sonuc.hatalar?.length ?? 0) > 0 ? (
            <ul className="aktarim-hata-liste">
              {sonuc.hatalar?.map((h) => (
                <li key={h.kayitAdi}>
                  {h.kayitAdi}: {h.mesaj}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
