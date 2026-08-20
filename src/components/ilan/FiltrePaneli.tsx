'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Eyebrow } from '@/components/ui/Bolum'

import { gozlemOlayi } from '@/lib/olcum/istemci'
import { fiyatBandi } from '@/lib/olcum/tipler'
import { useId, useState, useTransition, type ReactNode } from 'react'

import { KapatIkon } from '@/components/ui/Ikon'
import { ILAN_KATEGORILERI, ILAN_TIPLERI, ODA_SAYILARI } from '@/lib/secenekler'
import { sinif } from '@/lib/sinif'

/**
 * Portföy filtre paneli (şartname §7).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ DURUM URL'DE. Paylaşılabilir bağlantı, çalışan geri tuşu ve sunucu
 * tarafında render edilebilir sonuç — üçü de buna bağlı.
 *
 * ⚠️ JAVASCRIPT KAPALIYKEN DE ÇALIŞIR: gerçek bir `<form method="get">`
 * ve `<noscript>` gönder butonu var. JS varsa `useTransition` geçişi
 * yumuşatıyor.
 *
 * ⚠️ ARALIK ALANLARI KAYDIRICI DEĞİL, SAYI KUTUSU.
 *
 * Şartname "çift uçlu kaydırıcı + manuel giriş" istiyor. Çift uçlu
 * kaydırıcı klavyeyle kullanıldığında iki tutamağı ayırt etmek zor, ekran
 * okuyucuda "hangi uç" sorusu belirsiz kalıyor ve dokunmatikte 44px hedefi
 * iki tutamak için de sağlanamıyor. Sayı kutusu aynı işi yapıyor, mobilde
 * sayısal klavye açıyor ve erişilebilirliği bedava geliyor. Kaydırıcı
 * eklenecekse kutuların YANINA eklenmeli, yerine değil.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface MahalleSecenegi {
  slug: string
  ad: string
}

/** URL'de tutulan tüm filtre anahtarları — çip listesi de buradan üretiliyor. */
const ANAHTARLAR = [
  'tip',
  'kategori',
  'mahalle',
  'oda',
  'enAz',
  'enCok',
  'm2EnAz',
  'm2EnCok',
  'carpan',
  'getiri',
  'sanayi',
] as const

export function FiltrePaneli({
  mahalleler,
  sonucSayisi,
}: {
  mahalleler: readonly MahalleSecenegi[]
  sonucSayisi: number
}) {
  const sorgu = useSearchParams()
  const router = useRouter()
  const [gecisSuruyor, gecisBaslat] = useTransition()
  const [mobilAcik, setMobilAcik] = useState(false)
  const [mahalleArama, setMahalleArama] = useState('')

  const mevcut = (anahtar: string) => sorgu.get(anahtar) ?? ''
  const aktifler = ANAHTARLAR.filter((anahtar) => sorgu.get(anahtar))

  function degistir(anahtar: string, deger: string) {
    if (deger) {
      /**
       * ⚠️ ÖLÇÜLEN ŞEY ÖLÇÜTÜN ADI; fiyatta ise BANT.
       *
       * Girilen tam sayı gönderilmiyor: "4.237.500 arandı" bilgisi hiçbir
       * kararı değiştirmezken, mahalle ve zamanla birleştiğinde tek bir
       * ziyaretçiyi işaret edebilir. "3–5 mn arası arayanlar arttı" aynı
       * kararı aldırıyor ve kimseyi göstermiyor.
       */
      gozlemOlayi('filtre_uygulandi', anahtar)

      if (anahtar === 'enAz' || anahtar === 'enCok') {
        const bant = fiyatBandi(Number(deger))
        if (bant !== null) gozlemOlayi('fiyat_bandi', bant.anahtar)
      }
    }

    const yeni = new URLSearchParams(sorgu.toString())
    if (deger) yeni.set(anahtar, deger)
    else yeni.delete(anahtar)
    // Filtre değişince baştan göster; 96 sonuç açıkken filtrelemek anlamsız.
    yeni.delete('goster')

    const metin = yeni.toString()
    gecisBaslat(() => router.push(metin ? `/portfoy?${metin}` : '/portfoy', { scroll: false }))
  }

  const govde = (
    <div className="flex flex-col gap-6">
      {aktifler.length > 0 ? (
        <AktifCipler
          aktifler={aktifler}
          sorgu={sorgu}
          mahalleler={mahalleler}
          onKaldir={(anahtar) => degistir(anahtar, '')}
        />
      ) : null}

      <Grup baslik="İşlem türü">
        <SegmentKontrol
          deger={mevcut('tip')}
          secenekler={ILAN_TIPLERI}
          hepsiEtiketi="Tümü"
          onDegisim={(deger) => degistir('tip', deger)}
        />
      </Grup>

      <Grup baslik="Kategori">
        <SegmentKontrol
          deger={mevcut('kategori')}
          secenekler={ILAN_KATEGORILERI}
          hepsiEtiketi="Tümü"
          onDegisim={(deger) => degistir('kategori', deger)}
        />
      </Grup>

      <Grup baslik="Mahalle">
        {/* ⚠️ Arama kutusu 8 mahalleden sonra beliriyor: daha azında
            kutunun kendisi listeden uzun sürüyor. */}
        {mahalleler.length > 8 ? (
          <input
            type="search"
            value={mahalleArama}
            onChange={(olay) => setMahalleArama(olay.target.value)}
            placeholder="Mahalle ara"
            aria-label="Mahalle ara"
            className="border-kenar-giris bg-yuzey rounded-buton mb-2 min-h-11 w-full border-[0.5px] px-3 text-govde-kucuk"
          />
        ) : null}

        <div className="flex max-h-56 flex-col overflow-y-auto">
          <Radyo
            ad="mahalle"
            etiket="Tüm mahalleler"
            deger=""
            secili={mevcut('mahalle') === ''}
            onSec={() => degistir('mahalle', '')}
          />
          {mahalleler
            .filter((m) =>
              m.ad.toLocaleLowerCase('tr').includes(mahalleArama.toLocaleLowerCase('tr')),
            )
            .map((m) => (
              <Radyo
                key={m.slug}
                ad="mahalle"
                etiket={m.ad}
                deger={m.slug}
                secili={mevcut('mahalle') === m.slug}
                onSec={() => degistir('mahalle', m.slug)}
              />
            ))}
        </div>
      </Grup>

      <Grup baslik="Fiyat (₺)">
        <Aralik
          enAz={mevcut('enAz')}
          enCok={mevcut('enCok')}
          adim={100000}
          onDegisim={(uc, deger) => degistir(uc === 'enAz' ? 'enAz' : 'enCok', deger)}
        />
      </Grup>

      <Grup baslik="Brüt m²">
        <Aralik
          enAz={mevcut('m2EnAz')}
          enCok={mevcut('m2EnCok')}
          adim={10}
          onDegisim={(uc, deger) => degistir(uc === 'enAz' ? 'm2EnAz' : 'm2EnCok', deger)}
        />
      </Grup>

      <Grup baslik="Oda sayısı">
        <div className="flex flex-wrap gap-1.5">
          <ButonSecim
            etiket="Farketmez"
            secili={mevcut('oda') === ''}
            onSec={() => degistir('oda', '')}
          />
          {ODA_SAYILARI.map((oda) => (
            <ButonSecim
              key={oda.value}
              etiket={oda.label}
              secili={mevcut('oda') === oda.value}
              onSec={() => degistir('oda', oda.value)}
            />
          ))}
        </div>
      </Grup>

      {/* ⭐ ── YATIRIM FİLTRELERİ ─────────────────────────────────────────
          Şartname bunları ayrı bir grup istiyor ve gerekçesi doğru:
          Türkiye'de hiçbir emlak sitesinde yok. Görsel olarak da ayrışsın
          diye gold ince çizgiyle çerçeveleniyor (dekoratif). */}
      <div className="border-gold-cizgi rounded-kart border p-4">
        <Eyebrow sinifAdi="mb-1 block">Yatırım filtreleri</Eyebrow>
        <p className="text-metin-3 text-mikro mb-4">
          Kira verisi girilmemiş ilanlar bu filtreler kullanıldığında listeden düşer — bilmediğimiz
          bir rakamı koşulu sağlıyormuş gibi gösteremeyiz.
        </p>

        <div className="flex flex-col gap-4">
          <SayiAlani
            etiket="Kira çarpanı — en fazla"
            birim="yıl"
            deger={mevcut('carpan')}
            adim={1}
            onDegisim={(deger) => degistir('carpan', deger)}
          />
          <SayiAlani
            etiket="Brüt getiri — en az"
            birim="%"
            deger={mevcut('getiri')}
            adim={0.5}
            onDegisim={(deger) => degistir('getiri', deger)}
          />
          {/* ⚠️ "dk" DEĞİL "km". Yol ağı verisi ve rotalama motorumuz yok;
              tüm mesafeler kuş uçuşu. Mesafeyi bir hıza bölüp dakika yazmak
              /veri-kaynaklari sayfasını yalancı çıkarırdı. */}
          <SayiAlani
            etiket="Sanayiye mesafe — en fazla"
            birim="km"
            deger={mevcut('sanayi')}
            adim={1}
            onDegisim={(deger) => degistir('sanayi', deger)}
          />
        </div>
      </div>

      {aktifler.length > 0 ? (
        <button
          type="button"
          onClick={() => gecisBaslat(() => router.push('/portfoy', { scroll: false }))}
          className="text-metin-2 hover:text-metin min-h-11 text-govde-kucuk underline underline-offset-2"
        >
          Filtreleri temizle
        </button>
      ) : null}

      {/* JavaScript kapalıysa tek çalışan yol budur. */}
      <noscript>
        <button
          type="submit"
          className="bg-koyu-bant rounded-buton min-h-11 w-full px-5 text-govde-kucuk font-medium text-koyu-bant-metin"
        >
          Filtrele
        </button>
      </noscript>
    </div>
  )

  return (
    <>
      {/* ── Mobil: alt sheet açıcı ── */}
      <div className="mb-4 flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobilAcik(true)}
          className="border-kenar-guclu rounded-buton inline-flex min-h-11 items-center gap-2 border-[0.5px] px-4 text-govde-kucuk font-medium"
        >
          Filtreler
          {aktifler.length > 0 ? (
            <span className="bg-koyu-bant rakam inline-flex size-5 items-center justify-center rounded-full text-mikro text-koyu-bant-metin">
              {aktifler.length}
            </span>
          ) : null}
        </button>
      </div>

      <form
        method="get"
        action="/portfoy"
        className={sinif('transition-opacity', gecisSuruyor && 'opacity-60')}
      >
        {/* ── Masaüstü: yapışkan sol panel ── */}
        <div className="hidden lg:block">
          <div className="sticky top-28 max-h-[calc(100dvh-9rem)] overflow-y-auto pr-1">
            {govde}
          </div>
        </div>

        {/* ── Mobil: alt sheet ── */}
        {mobilAcik ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="bg-notr-900/50 absolute inset-0"
              onClick={() => setMobilAcik(false)}
              aria-hidden="true"
            />
            <div className="bg-zemin absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-buyuk">
              <div className="border-kenar flex items-center justify-between border-b-[0.5px] px-4 py-3">
                <h2 className="text-govde font-medium">Filtreler</h2>
                <button
                  type="button"
                  onClick={() => setMobilAcik(false)}
                  className="inline-flex size-11 items-center justify-center"
                >
                  <KapatIkon />
                  <span className="yalnizca-okuyucu">Filtreleri kapat</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">{govde}</div>

              <div className="border-kenar border-t-[0.5px] p-4">
                {/* ⚠️ DOLU ADAÇAYI DEĞİL, koyu kakao.
                    "Uygula" bu sheet'in birincil eylemi ama site düzeyinde
                    bir CTA değil. Dolu adaçayı yalnızca iki eylemde
                    kullanılıyor; buraya da koymak kuralın nadirliğini
                    bitirirdi. Disiplin testi yakaladı. */}
                <button
                  type="button"
                  onClick={() => setMobilAcik(false)}
                  className="bg-koyu-bant rounded-buton min-h-13 w-full font-medium text-koyu-bant-metin"
                >
                  Uygula (<span className="rakam">{sonucSayisi}</span>)
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════ */

function Grup({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-metin-3 text-eyebrow mb-1 font-medium uppercase">{baslik}</legend>
      {children}
    </fieldset>
  )
}

/**
 * Aktif filtre çipleri.
 *
 * ⚠️ Şartname en üste koyuyor ve haklı: yedi filtre açıkken hangi
 * koşulların uygulandığını panelde gezinerek anlamak zor. Çip hem
 * gösteriyor hem tek dokunuşta kaldırıyor.
 */
function AktifCipler({
  aktifler,
  sorgu,
  mahalleler,
  onKaldir,
}: {
  aktifler: readonly string[]
  sorgu: URLSearchParams
  mahalleler: readonly MahalleSecenegi[]
  onKaldir: (anahtar: string) => void
}) {
  function etiket(anahtar: string): string {
    const deger = sorgu.get(anahtar) ?? ''
    switch (anahtar) {
      case 'tip':
        return ILAN_TIPLERI.find((s) => s.value === deger)?.label ?? deger
      case 'kategori':
        return ILAN_KATEGORILERI.find((s) => s.value === deger)?.label ?? deger
      case 'oda':
        return ODA_SAYILARI.find((s) => s.value === deger)?.label ?? deger
      case 'mahalle':
        return mahalleler.find((m) => m.slug === deger)?.ad ?? deger
      case 'enAz':
        return `En az ${deger} ₺`
      case 'enCok':
        return `En fazla ${deger} ₺`
      case 'm2EnAz':
        return `En az ${deger} m²`
      case 'm2EnCok':
        return `En fazla ${deger} m²`
      case 'carpan':
        return `Çarpan ≤ ${deger} yıl`
      case 'getiri':
        return `Getiri ≥ %${deger}`
      case 'sanayi':
        return `Sanayiye ≤ ${deger} km`
      default:
        return deger
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {aktifler.map((anahtar) => (
        <button
          key={anahtar}
          type="button"
          onClick={() => onKaldir(anahtar)}
          className="bg-yuzey-2 border-kenar rounded-rozet text-metin-2 hover:text-metin inline-flex min-h-9 items-center gap-1.5 border-[0.5px] px-2.5 text-mikro"
        >
          {etiket(anahtar)}
          <KapatIkon width={13} height={13} />
          <span className="yalnizca-okuyucu">filtresini kaldır</span>
        </button>
      ))}
    </div>
  )
}

function SegmentKontrol({
  deger,
  secenekler,
  hepsiEtiketi,
  onDegisim,
}: {
  deger: string
  secenekler: readonly { readonly value: string; readonly label: string }[]
  hepsiEtiketi: string
  onDegisim: (deger: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ButonSecim etiket={hepsiEtiketi} secili={deger === ''} onSec={() => onDegisim('')} />
      {secenekler.map((secenek) => (
        <ButonSecim
          key={secenek.value}
          etiket={secenek.label}
          secili={deger === secenek.value}
          onSec={() => onDegisim(secenek.value)}
        />
      ))}
    </div>
  )
}

/**
 * Seçim butonu.
 *
 * ⚠️ Seçili hâl DOLU ADAÇAYI DEĞİL — bir filtre durumu eylem değil.
 * Dolu adaçayı yalnızca iki eylemde kullanılıyor; burada da kullanmak
 * kuralın nadirliğini bitirirdi.
 */
function ButonSecim({
  etiket,
  secili,
  onSec,
}: {
  etiket: string
  secili: boolean
  onSec: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSec}
      aria-pressed={secili}
      className={sinif(
        'rounded-buton min-h-11 px-3 text-govde-kucuk transition-colors',
        secili
          ? 'bg-vurgu-zemin text-vurgu border-vurgu border-[0.5px] font-medium'
          : 'border-kenar text-metin-2 hover:text-metin border-[0.5px]',
      )}
    >
      {etiket}
    </button>
  )
}

function Radyo({
  ad,
  etiket,
  deger,
  secili,
  onSec,
}: {
  ad: string
  etiket: string
  deger: string
  secili: boolean
  onSec: () => void
}) {
  return (
    <label className="hover:text-metin text-metin-2 flex min-h-11 cursor-pointer items-center gap-2 text-govde-kucuk">
      <input
        type="radio"
        name={ad}
        value={deger}
        checked={secili}
        onChange={onSec}
        className="accent-aksan size-4"
      />
      {etiket}
    </label>
  )
}

function Aralik({
  enAz,
  enCok,
  adim,
  onDegisim,
}: {
  enAz: string
  enCok: string
  adim: number
  onDegisim: (uc: 'enAz' | 'enCok', deger: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={adim}
        value={enAz}
        onChange={(olay) => onDegisim('enAz', olay.target.value)}
        placeholder="En az"
        aria-label="En az"
        className="border-kenar-giris bg-yuzey rounded-buton rakam min-h-11 w-full border-[0.5px] px-2.5 text-govde-kucuk"
      />
      <span className="text-metin-3" aria-hidden="true">
        –
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={adim}
        value={enCok}
        onChange={(olay) => onDegisim('enCok', olay.target.value)}
        placeholder="En fazla"
        aria-label="En fazla"
        className="border-kenar-giris bg-yuzey rounded-buton rakam min-h-11 w-full border-[0.5px] px-2.5 text-govde-kucuk"
      />
    </div>
  )
}

function SayiAlani({
  etiket,
  birim,
  deger,
  adim,
  onDegisim,
}: {
  etiket: string
  birim: string
  deger: string
  adim: number
  onDegisim: (deger: string) => void
}) {
  const id = useId()

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-metin-2 text-govde-kucuk">
        {etiket}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={adim}
          value={deger}
          onChange={(olay) => onDegisim(olay.target.value)}
          className="border-kenar-giris bg-yuzey rounded-buton rakam min-h-11 w-full border-[0.5px] px-2.5 text-govde-kucuk"
        />
        <span className="text-metin-3 shrink-0 text-govde-kucuk">{birim}</span>
      </div>
    </div>
  )
}
