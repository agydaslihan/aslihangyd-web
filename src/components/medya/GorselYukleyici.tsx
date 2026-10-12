'use client'

import { useState, useTransition } from 'react'

import { gorselAltMetniniKaydet, gorselYukle } from '@/lib/medya/eylemler'

import './gorselYukleyici.css'

/**
 * Toplu fotoğraf yükleyici — SİHİRBAZIN VE İLAN DÜZENLEME EKRANININ AYNI BİLEŞENİ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN SİHİRBAZDAN ÇIKARILDI.
 *
 * 31 Ağustos 2026'da toplu yükleme sihirbaza eklendi (PR #108) ama
 * `PortfoySihirbazi.tsx` içinde yerel bir fonksiyon olarak kaldı. Sonucu
 * şuydu: **yeni** ilana yirmi fotoğraf sürüklenebiliyordu, **mevcut** bir
 * ilana tek yol Payload'ın dizi alanıydı — her fotoğraf için satır ekle,
 * çekmeceyi aç, dosya seç, çekmeceyi kapat. Yirmi fotoğraf, yirmi kez.
 *
 * İkinci bir yükleme yolu yazmak yerine bu bileşen çıkarıldı: iki ekran da
 * aynı sürükle-bırak alanını, aynı ilerleme göstergesini, aynı sıralama
 * düğmelerini ve aynı bütçe uyarısını kullanıyor. Bir düzeltme ikisine de
 * iniyor.
 *
 * ⚠️ SINIFLAR `sihirbaz-*` DEĞİL `gorsel-*`. Bileşen artık sihirbaza ait
 * değil; stilini kendi dosyası taşıyor (`gorselYukleyici.css`) ve Payload
 * admin'inin CSS değişkenleriyle yazılmış — iki çağıran da admin içinde.
 *
 * ⚠️ TASARIM KARARLARI (PR #108'den DEĞİŞMEDEN taşındı):
 *  · sürükle-bırak alanı dosya seçicinin YERİNE değil YANINDA — sürükleme
 *    dokunmatikte ve klavyeyle yok;
 *  · sıralama sürüklemeyle VE yukarı/aşağı düğmeleriyle — ikisi birden;
 *  · kapak sıranın başı ve bu ekranda görünür bir işaret taşıyor;
 *  · bütçe uyarısı bir engel değil, görünür bir sınır.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface YuklenmisGorsel {
  id: number
  url: string
  ad: string
  alt: string
}

/**
 * Kaç fotoğraftan sonra uyarılır.
 *
 * ⚠️ ENGEL DEĞİL, SINIR. Yirmi fotoğraflı bir ilan sayfası mobilde LCP
 * hedefini tek başına bozabiliyor; ama kaç fotoğrafın gerektiğini bilen
 * kişi Aslıhan.
 */
export const GORSEL_UYARI_ESIGI = 15

export interface GorselYukleyiciOzellikleri {
  gorseller: YuklenmisGorsel[]
  onDegisim: (yeni: YuklenmisGorsel[]) => void
  /** Salt okunur bağlam (yetkisi olmayan kullanıcı, kilitli form). */
  kilitli?: boolean
  /** Hiç fotoğraf yokken gösterilecek metin — bağlama göre değişiyor. */
  bosMetin?: string
}

export default function GorselYukleyici({
  gorseller,
  onDegisim,
  kilitli = false,
  bosMetin = 'Henüz fotoğraf yok. Fotoğrafsız da kaydedebilirsiniz; ilan sayfası boş durum gösterir.',
}: GorselYukleyiciOzellikleri) {
  const [hata, setHata] = useState<string | null>(null)
  const [suruklenen, setSuruklenen] = useState<number | null>(null)
  const [suruklemeUstunde, setSuruklemeUstunde] = useState(false)
  /** Yüklenen / toplam — ilerleme göstergesi. */
  const [ilerleme, setIlerleme] = useState<{ biten: number; toplam: number } | null>(null)
  const [secilenler, setSecilenler] = useState<Set<number>>(new Set())
  const [altKaydediliyor, altGecisi] = useTransition()

  /**
   * ⚠️ ALT METİN YÜKLEMEDE BOŞ GÖNDERİLİYOR — VE BU BİLİNÇLİ.
   *
   * Sahada yirmi fotoğraf çeken kişi yirmi kez metin yazamıyor. `medya`
   * koleksiyonu boş alt metni dosya adından türetiyor ve "otomatik"
   * işaretini koyuyor; panel kaç görselin gerçek metne ihtiyacı olduğunu
   * sayıyor. Otomatik metin, boş alt metinden iyidir.
   */
  async function dosyalariYukle(dosyalar: FileList | File[] | null): Promise<void> {
    if (kilitli) return
    const liste = dosyalar === null ? [] : [...dosyalar]
    if (liste.length === 0) return
    setHata(null)
    setIlerleme({ biten: 0, toplam: liste.length })

    const eklenen: YuklenmisGorsel[] = []
    for (const [sira, dosya] of liste.entries()) {
      const form = new FormData()
      form.set('dosya', dosya)
      // Boş: sunucu dosya adından türetiyor ve "otomatik" işaretliyor.
      form.set('alt', '')
      const cevap = await gorselYukle(form)
      if (cevap.basarili && cevap.id !== undefined) {
        eklenen.push({
          id: cevap.id,
          url: cevap.url ?? '',
          ad: cevap.ad ?? dosya.name,
          alt: '',
        })
      } else {
        setHata(cevap.genelHata ?? 'Görsel yüklenemedi.')
      }
      setIlerleme({ biten: sira + 1, toplam: liste.length })
    }

    if (eklenen.length > 0) onDegisim([...gorseller, ...eklenen])
    setIlerleme(null)
  }

  const secimiCevir = (id: number) =>
    setSecilenler((onceki) => {
      const yeni = new Set(onceki)
      if (yeni.has(id)) yeni.delete(id)
      else yeni.add(id)
      return yeni
    })

  function tasi(kaynak: number, hedef: number): void {
    if (kilitli || kaynak === hedef) return
    const yeni = [...gorseller]
    const [alinan] = yeni.splice(kaynak, 1)
    if (!alinan) return
    yeni.splice(hedef, 0, alinan)
    onDegisim(yeni)
  }

  /**
   * Alt metni medyaya yazar.
   *
   * ⚠️ İLAN FORMUYLA BİRLİKTE DEĞİL, ODAK ÇIKIŞINDA. Alt metin medya
   * kaydına ait; ilan formu kaydedilmeden de kalıcı olmalı. Eskiden
   * hiçbir yere yazılmıyordu — yazılan metin sessizce kayboluyordu.
   */
  function altMetniniYaz(gorsel: YuklenmisGorsel): void {
    if (kilitli) return
    altGecisi(async () => {
      const cevap = await gorselAltMetniniKaydet(gorsel.id, gorsel.alt)
      if (!cevap.basarili) setHata(cevap.genelHata ?? 'Alt metin kaydedilemedi.')
    })
  }

  return (
    <div className="gorsel-yukleyici">
      {/*
        ⚠️ SÜRÜKLE-BIRAK ALANI DOSYA SEÇİCİNİN YERİNE DEĞİL, YANINDA.
        Sürükleme dokunmatikte ve klavyeyle yok; tek yol yapmak masaüstü
        dışındaki herkesi dışarıda bırakırdı.
      */}
      <div
        onDragOver={(olay) => {
          olay.preventDefault()
          setSuruklemeUstunde(true)
        }}
        onDragLeave={() => setSuruklemeUstunde(false)}
        onDrop={(olay) => {
          olay.preventDefault()
          setSuruklemeUstunde(false)
          void dosyalariYukle(olay.dataTransfer.files)
        }}
        className={`gorsel-birakma${suruklemeUstunde ? ' uzerinde' : ''}`}
      >
        <p>Fotoğrafları buraya sürükleyin</p>
        <p className="gorsel-ipucu">
          ya da aşağıdan seçin. Birden fazla dosya seçebilirsiniz; telefonda kamera da açılır.
        </p>
      </div>

      <label className="gorsel-secici">
        <span className="gorsel-secici-etiket">Fotoğraf ekle</span>
        {/* ⚠️ `capture` YOK, `accept` VAR: `capture` yazmak galeriyi
            kapatıp yalnızca kamerayı açar. Sahada çekilen fotoğraf kadar,
            önceden çekilmiş fotoğraf da yükleniyor. */}
        <input
          type="file"
          className="gorsel-girdi"
          accept="image/*"
          multiple
          disabled={kilitli}
          onChange={(olay) => void dosyalariYukle(olay.target.files)}
        />
        <span className="gorsel-ipucu">
          Alt metin ZORUNLU DEĞİL — boş bırakırsanız dosya adından geçici bir metin üretilir ve
          panelde “eksik” olarak işaretlenir.
        </span>
      </label>

      {ilerleme !== null ? (
        <div className="gorsel-ilerleme" role="status" aria-live="polite">
          <div className="gorsel-ilerleme-cubuk">
            <span style={{ width: `${Math.round((ilerleme.biten / ilerleme.toplam) * 100)}%` }} />
          </div>
          <p className="gorsel-ilerleme-metin">
            {ilerleme.biten}/{ilerleme.toplam} fotoğraf yüklendi
          </p>
        </div>
      ) : null}
      {hata ? (
        <p className="gorsel-hata" role="alert">
          {hata}
        </p>
      ) : null}

      {gorseller.length === 0 ? (
        <p className="gorsel-ipucu">{bosMetin}</p>
      ) : (
        <>
          <div className="gorsel-arac">
            <span className="gorsel-ipucu">
              {gorseller.length} fotoğraf · ilk sıradaki kapak
              {secilenler.size > 0 ? ` · ${secilenler.size} seçili` : ''}
              {altKaydediliyor ? ' · alt metin kaydediliyor…' : ''}
            </span>
            <button
              type="button"
              className="gorsel-dugme"
              onClick={() => {
                onDegisim(gorseller.filter((g) => !secilenler.has(g.id)))
                setSecilenler(new Set())
              }}
              disabled={kilitli || secilenler.size === 0}
            >
              Seçilenleri kaldır
            </button>
          </div>

          {/*
            ⚠️ BOYUT BÜTÇESİ UYARISI — SAYFA HIZI BİR TASARIM KISITI.
            Yirmi fotoğraflı bir ilan sayfası, mobilde ölçülen LCP
            hedefini tek başına bozabiliyor. Sayı bir engel değil,
            görünür bir sınır.
          */}
          {gorseller.length > GORSEL_UYARI_ESIGI ? (
            <p className="gorsel-ipucu">
              ⚠️ {gorseller.length} fotoğraf yüklendi. {GORSEL_UYARI_ESIGI}&apos;den sonrası sayfayı
              ağırlaştırıyor; en iyi {GORSEL_UYARI_ESIGI} tanesini bırakmayı düşünün. Görseller
              sunucuda küçültülüyor ama indirilecek dosya sayısı yine de artıyor.
            </p>
          ) : null}

          <ol className="gorsel-liste">
            {gorseller.map((gorsel, sira) => (
              <li
                key={gorsel.id}
                draggable={!kilitli}
                onDragStart={() => setSuruklenen(sira)}
                onDragOver={(olay) => olay.preventDefault()}
                onDrop={() => {
                  if (suruklenen !== null) tasi(suruklenen, sira)
                  setSuruklenen(null)
                }}
                className={sira === 0 ? 'kapak' : undefined}
              >
                <input
                  type="checkbox"
                  checked={secilenler.has(gorsel.id)}
                  disabled={kilitli}
                  onChange={() => secimiCevir(gorsel.id)}
                  aria-label={`${sira + 1}. fotoğrafı seç`}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gorsel.url} alt="" width={96} height={72} />
                <div className="gorsel-govde">
                  <span className="gorsel-ad">
                    {sira === 0 ? 'Kapak · ' : `${sira + 1}. · `}
                    {gorsel.ad}
                  </span>
                  <input
                    className="gorsel-girdi"
                    value={gorsel.alt}
                    placeholder="Alt metin (isteğe bağlı)"
                    aria-label={`${sira + 1}. fotoğrafın alternatif metni (isteğe bağlı)`}
                    disabled={kilitli}
                    onChange={(olay) =>
                      onDegisim(
                        gorseller.map((g) =>
                          g.id === gorsel.id ? { ...g, alt: olay.target.value } : g,
                        ),
                      )
                    }
                    onBlur={() => altMetniniYaz(gorsel)}
                  />
                </div>
                {/*
                  ⚠️ SÜRÜKLE-BIRAK TEK YOL DEĞİL. Sürükleme klavyeyle
                  kullanılamıyor; yukarı/aşağı düğmeleri aynı işi yapıyor ve
                  dokunmatikte de daha güvenilir.
                */}
                <div className="gorsel-dugmeler">
                  <button
                    type="button"
                    onClick={() => tasi(sira, sira - 1)}
                    disabled={kilitli || sira === 0}
                    aria-label={`${sira + 1}. fotoğrafı yukarı taşı`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => tasi(sira, sira + 1)}
                    disabled={kilitli || sira === gorseller.length - 1}
                    aria-label={`${sira + 1}. fotoğrafı aşağı taşı`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onDegisim(gorseller.filter((g) => g.id !== gorsel.id))}
                    disabled={kilitli}
                    aria-label={`${sira + 1}. fotoğrafı listeden çıkar`}
                  >
                    {/*
                      ⚠️ `×` (U+00D7), `✕` (U+2715) DEĞİL — ve bu bir hata
                      düzeltmesi. Sihirbazda `✕` kullanılıyordu ve o karakter
                      font alt kümesinde YOK: tarayıcı sessizce yedek fonta
                      düşüyor, düğme başka bir tipografiyle çiziliyordu.
                      `alfabe.test.ts` bunu yakalamıyordu çünkü aynı dosyadaki
                      `accept="image/*"` dizesi yorum soyucusunu yanıltıp o
                      bölgeyi yutuyordu (soyucu da bu PR'da düzeltildi).
                    */}
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
