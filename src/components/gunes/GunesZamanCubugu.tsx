'use client'

import { useMemo, useState } from 'react'

import { sinif } from '@/lib/sinif'
import { cepheGunu, saatYaz, type CepheYonu } from '@/lib/gunes/cephe'
import {
  anBasligi,
  cepheCizelgeleri,
  cizelgeOzeti,
  durumEtiketi,
  gunesliAraliklar,
  MEVSIMLER,
  mevsimIfadesi,
  mevsimTarihi,
  zamanPenceresi,
  type MevsimAnahtari,
  type SaatDurumu,
  type SaatHucresi,
} from '@/lib/gunes/zamanCubugu'

/**
 * Güneş zaman çubuğu — saat saat, hangi saatte bu cephe güneş alıyor?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN GÜN TOPLAMI YETMİYOR.
 *
 * "Güney cephe ~8 saat güneş alıyor" doğru ama eksik: o sekiz saatin
 * sabah mı akşam mı olduğu, oturma odasının ne zaman ısınacağını
 * belirliyor. Doğu ve batı cepheler gün toplamında neredeyse eşit —
 * yaşarken hiç değiller. Çubuk tam olarak bu farkı gösteriyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ İSTEMCİ BİLEŞENİ — mevsim seçimi ve saat okuması etkileşimli.
 *
 * Hesap saf ve bağımlılıksız (NOAA formülleri); ziyaretçi mevsim
 * değiştirdiğinde sunucuya gitmeden yeniden hesaplanıyor. Ek kütüphane
 * YOK: çubuk düz HTML/CSS, grafik kütüphanesi eklenmiyor.
 *
 * ⚠️ MALİYETİ ÖLÇÜLDÜ: **10,9 kB gzip**.
 *
 * Yöntem: bileşen bağlıyken ve bağlı değilken iki üretim derlemesi
 * alınıp `.next/static/chunks` toplam gzip boyutu karşılaştırıldı.
 * Önce yorumda "~3 kB" yazıyordu — tahmindi ve yanlıştı; bu projede
 * ölçülmemiş bir rakamı yorumda bırakmak, ekranda uydurma veri
 * göstermekle aynı sınıfta.
 *
 * Bu maliyet YALNIZCA ilan ve mahalle detay sayfalarına biniyor; ana
 * sayfa ve listeleme sayfaları bu bileşeni hiç yüklemiyor ve JS
 * bütçeleri değişmedi (ölçüm docs/ILERLEME.md içinde).
 *
 * ⚠️ RENK TEK BAŞINA BİLGİ TAŞIMIYOR (WCAG 1.4.1).
 *
 * Gold dolgu krem üzerinde 1,89:1 — blokları ayırt etmek için yeterli bir
 * oran DEĞİL ve zaten dekoratif gold kuralı gereği olamaz. Bu yüzden aynı
 * bilgi üç yerde daha var: her çubuğun altındaki özet cümlesi, seçilen
 * saatin metin okuması, ve çubuğun `aria-label`ındaki saat aralıkları.
 * Ayrıca "kısmen" durumu YARIM YÜKSEKLİK, "gece" ise TARAMA deseniyle
 * ayrılıyor — yani dört durum renkten bağımsız olarak da farklı.
 */

/** Saat etiketleri kaç saatte bir yazılıyor — mobilde çakışmasın diye. */
const ETIKET_ARALIGI = 3

export function GunesZamanCubugu({
  enlem,
  boylam,
  cepheler,
}: {
  enlem: number
  boylam: number
  /** Boş dizi = cephe yönü girilmemiş. Bu bileşen o zaman hiç basılmaz. */
  cepheler: readonly CepheYonu[]
}) {
  const [mevsim, setMevsim] = useState<MevsimAnahtari>('bugun')
  const [seciliSaat, setSeciliSaat] = useState<number | null>(null)

  /**
   * ⚠️ `new Date()` render sırasında okunuyor ve bu bilinçli.
   *
   * "Bugün" seçeneğinin bugünü göstermesi gerekiyor. Sunucu ve istemci
   * arasında gün farkı oluşursa hidrasyon uyuşmazlığı çıkabilirdi — bu
   * yüzden bileşen istemci tarafında ve `useMemo` boş bağımlılıkla bir
   * kez hesaplıyor.
   */
  const veri = useMemo(() => {
    const bugun = new Date()
    const pencere = zamanPenceresi(enlem, boylam, bugun)
    const tarih = mevsimTarihi(mevsim, bugun)

    return {
      pencere,
      cizelgeler: cepheCizelgeleri(enlem, boylam, tarih, cepheler, pencere),
      /**
       * Yaz ve kış toplamları özet cümlesinde sabit kalıyor: ziyaretçi
       * hangi günü seçerse seçsin "yazın ~X, kışın ~Y" aynı çapayı
       * gösteriyor. Mevsime göre değişselerdi karşılaştırma anlamsızlaşırdı.
       */
      uclar: cepheler.map((yon) => ({
        yon,
        yaz: cepheGunu(enlem, boylam, mevsimTarihi('yaz', bugun), yon).dakika,
        kis: cepheGunu(enlem, boylam, mevsimTarihi('kis', bugun), yon).dakika,
      })),
    }
  }, [enlem, boylam, cepheler, mevsim])

  if (veri.cizelgeler.length === 0) return null

  const { ilk, son } = veri.pencere
  const saatler = Array.from({ length: son - ilk + 1 }, (_, i) => ilk + i)

  // Seçili saat yoksa okuma satırı öğle vaktini gösteriyor — boş bırakmak,
  // etkileşimi keşfetmeyen ziyaretçiye hiçbir şey vermemek olurdu.
  const okunanSaat = seciliSaat ?? Math.min(Math.max(12, ilk), son)
  const ornekHucre = veri.cizelgeler[0]!.hucreler.find((h) => h.saat === okunanSaat)

  return (
    <div className="border-kenar bg-yuzey rounded-kart mt-3 border-[0.5px] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-govde font-medium">Saat saat güneş</h3>
        <MevsimSecici secili={mevsim} onSec={setMevsim} />
      </div>

      <div className="flex flex-col gap-6">
        {veri.cizelgeler.map((cizelge) => {
          const uc = veri.uclar.find((u) => u.yon === cizelge.yon)
          return (
            <div key={cizelge.yon}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-metin text-govde-kucuk font-medium">
                  {cizelge.etiket} cephe
                </span>
                <span className="text-metin-3 text-mikro rakam">
                  {saatYaz(cizelge.toplamDakika)}
                </span>
              </div>

              <Cubuk
                hucreler={cizelge.hucreler}
                etiket={cizelge.etiket}
                gunEtiketi={MEVSIMLER.find((m) => m.anahtar === mevsim)!.etiket}
                seciliSaat={okunanSaat}
                onSec={setSeciliSaat}
              />

              <p className="text-metin-2 text-govde-kucuk mt-2">
                {cizelgeOzeti(
                  mevsimIfadesi(mevsim),
                  cizelge.toplamDakika,
                  uc?.yaz ?? 0,
                  uc?.kis ?? 0,
                )}
              </p>
            </div>
          )
        })}
      </div>

      <SaatEkseni saatler={saatler} />

      {/* ── Seçili saatin metin okuması ── */}
      {ornekHucre !== undefined ? (
        <SaatOkumasi
          hucre={ornekHucre}
          cizelgeler={veri.cizelgeler}
          ilk={ilk}
          son={son}
          onDegistir={setSeciliSaat}
        />
      ) : null}

      <Efsane />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Mevsim seçici
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ Yaz/kış farkı Türkiye'de alım kararının merkezinde: aynı daire yazın
 * ve kışın bambaşka davranıyor. Seçici bu farkı tek tıkla görünür kılıyor.
 */
function MevsimSecici({
  secili,
  onSec,
}: {
  secili: MevsimAnahtari
  onSec: (anahtar: MevsimAnahtari) => void
}) {
  return (
    <div role="group" aria-label="Gün seçimi" className="flex flex-wrap gap-1.5">
      {MEVSIMLER.map((mevsim) => {
        const aktif = mevsim.anahtar === secili
        return (
          <button
            key={mevsim.anahtar}
            type="button"
            aria-pressed={aktif}
            onClick={() => onSec(mevsim.anahtar)}
            className={sinif(
              'rounded-rozet text-mikro min-h-9 border-[0.5px] px-2.5 font-medium transition-colors',
              aktif
                ? 'border-transparent bg-vurgu-zemin text-vurgu'
                : 'border-kenar text-metin-2 hover:text-vurgu',
            )}
          >
            {mevsim.etiket}
            {mevsim.aciklama !== null ? (
              <span className="yalnizca-okuyucu"> — {mevsim.aciklama}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Çubuk
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ HÜCRELER DÜĞME DEĞİL, ÇUBUK BİR GRAFİK.
 *
 * 16 saatlik bir eksende hücreler telefonda ~18px genişliğe düşüyor ve
 * WCAG 2.2'nin 24×24 dokunma hedefi sınırının altında kalırdı. Hücreleri
 * 3'er saatlik gruplara indirmek sınırı çözerdi ama üç farklı durumu tek
 * kutuya sıkıştırırdı — yani çubuğun anlatmak istediği şeyi silerdi.
 *
 * Çözüm rolleri ayırmak: çubuk `role="img"`, gerçek denetim ise altındaki
 * saat okuması ve onun ok düğmeleri (44px). Fare ve dokunmayla hücre
 * seçmek bunun üstüne binen bir kısa yol; klavye ve ekran okuyucu için
 * hiçbir şey kaybolmuyor.
 */
function Cubuk({
  hucreler,
  etiket,
  gunEtiketi,
  seciliSaat,
  onSec,
}: {
  hucreler: SaatHucresi[]
  etiket: string
  gunEtiketi: string
  seciliSaat: number
  onSec: (saat: number) => void
}) {
  const araliklar = gunesliAraliklar(hucreler)
  const aciklama =
    araliklar.length === 0
      ? `${etiket} cephe, ${gunEtiketi}: gün boyunca doğrudan güneş almıyor.`
      : `${etiket} cephe, ${gunEtiketi}: doğrudan güneş ${araliklar.join(', ')} saatlerinde.`

  return (
    <div
      role="img"
      aria-label={aciklama}
      className="border-kenar flex h-10 w-full overflow-hidden rounded-kucuk border-[0.5px]"
    >
      {hucreler.map((hucre) => (
        <span
          key={hucre.saat}
          onPointerEnter={() => onSec(hucre.saat)}
          onPointerDown={() => onSec(hucre.saat)}
          className={sinif(
            'border-kenar relative flex-1 border-r-[0.5px] last:border-r-0',
            hucre.saat === seciliSaat && 'ring-vurgu z-10 ring-2 ring-inset',
          )}
        >
          <Dolgu durum={hucre.durum} />
        </span>
      ))}
    </div>
  )
}

/**
 * Bir saatin dolgusu.
 *
 * ⚠️ DÖRT DURUM, DÖRT AYRI BİÇİM — renkten bağımsız olarak da ayrışıyor:
 *   · doğrudan → tam yükseklik gold
 *   · kısmen   → YARIM yükseklik gold (biçim farkı)
 *   · gölge    → boş krem
 *   · gece     → çapraz TARAMA (desen farkı)
 *
 * Gold'un krem üzerindeki oranı 1,89:1 ve bu bir "zayıf kontrast" değil,
 * dekoratif gold kuralının kendisi: gold hiçbir zaman tek başına bilgi
 * taşımaz. Bilginin metin karşılığı çubuğun `aria-label`ında ve alttaki
 * özet cümlesinde duruyor.
 */
function Dolgu({ durum }: { durum: SaatDurumu }) {
  if (durum === 'dogrudan') {
    return <span className="bg-gold-zemin block h-full w-full" />
  }

  if (durum === 'sinirda') {
    return (
      <span className="bg-yuzey-2 block h-full w-full">
        <span className="bg-gold-zemin absolute inset-x-0 bottom-0 block h-1/2" />
      </span>
    )
  }

  if (durum === 'gece') {
    return <span className="doku-gece block h-full w-full" />
  }

  return <span className="bg-yuzey-2 block h-full w-full" />
}

/* ══════════════════════════════════════════════════════════════════════════
   Saat ekseni
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ Etiketler 3 saatte bir. Her saati yazmak telefonda rakamları
 * üst üste bindiriyordu; çubuk tam genişlikte kalıyor ve yatay kaydırma
 * hiçbir ekran boyutunda oluşmuyor.
 */
function SaatEkseni({ saatler }: { saatler: number[] }) {
  return (
    <div aria-hidden="true" className="mt-1.5 flex w-full">
      {saatler.map((saat) => (
        <span key={saat} className="text-metin-3 text-minik rakam flex-1 text-center">
          {saat % ETIKET_ARALIGI === 0 ? String(saat).padStart(2, '0') : ''}
        </span>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Saat okuması
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Seçili saatin metin okuması ve gerçek denetimi.
 *
 * ⚠️ Azimut ve yükseklik CEPHEDEN BAĞIMSIZ: gökyüzü tek. Köşe dairede
 * başlık bir kez yazılıp altına cephe cephe durum listeleniyor.
 *
 * ⚠️ `aria-live="polite"`: ok düğmesine basan ekran okuyucu kullanıcısı
 * değişen değeri duymalı. `assertive` olsaydı her adımda sözü keserdi.
 */
function SaatOkumasi({
  hucre,
  cizelgeler,
  ilk,
  son,
  onDegistir,
}: {
  hucre: SaatHucresi
  cizelgeler: { yon: string; etiket: string; hucreler: SaatHucresi[] }[]
  ilk: number
  son: number
  onDegistir: (saat: number) => void
}) {
  const oncekiVar = hucre.saat > ilk
  const sonrakiVar = hucre.saat < son

  return (
    <div className="border-kenar bg-zemin rounded-kucuk mt-4 flex items-center gap-2 border-[0.5px] p-2">
      <OkDugmesi yon="onceki" pasif={!oncekiVar} onClick={() => onDegistir(hucre.saat - 1)} />

      <div aria-live="polite" className="min-w-0 flex-1">
        <p className="text-metin text-govde-kucuk rakam">{anBasligi(hucre)}</p>
        <ul className="text-metin-2 text-mikro mt-0.5 flex flex-wrap gap-x-4">
          {cizelgeler.map((cizelge) => {
            const kendi = cizelge.hucreler.find((h) => h.saat === hucre.saat)
            return (
              <li key={cizelge.yon}>
                {cizelge.etiket} cephe: {kendi === undefined ? '—' : durumEtiketi(kendi.durum)}
              </li>
            )
          })}
        </ul>
      </div>

      <OkDugmesi yon="sonraki" pasif={!sonrakiVar} onClick={() => onDegistir(hucre.saat + 1)} />
    </div>
  )
}

function OkDugmesi({
  yon,
  pasif,
  onClick,
}: {
  yon: 'onceki' | 'sonraki'
  pasif: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pasif}
      aria-label={yon === 'onceki' ? 'Bir saat geri' : 'Bir saat ileri'}
      className={sinif(
        'border-kenar rounded-kucuk flex size-11 shrink-0 items-center justify-center border-[0.5px] transition-colors',
        pasif ? 'text-metin-pasif cursor-not-allowed' : 'text-metin-2 hover:text-vurgu',
      )}
    >
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true" fill="none">
        <path
          d={yon === 'onceki' ? 'M9 2 4 7l5 5' : 'M5 2l5 5-5 5'}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Efsane
   ══════════════════════════════════════════════════════════════════════════ */

function Efsane() {
  return (
    <ul className="text-metin-3 text-mikro mt-3 flex flex-wrap gap-x-4 gap-y-1">
      <EfsaneOgesi durum="dogrudan" metin="doğrudan güneş" />
      <EfsaneOgesi durum="sinirda" metin="saatin bir kısmı" />
      <EfsaneOgesi durum="golge" metin="gölgede" />
      <EfsaneOgesi durum="gece" metin="güneş ufkun altında" />
    </ul>
  )
}

function EfsaneOgesi({ durum, metin }: { durum: SaatDurumu; metin: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="border-kenar relative block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] border-[0.5px]"
      >
        <Dolgu durum={durum} />
      </span>
      {metin}
    </li>
  )
}
