'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

import { KapatIkon, OkIkon } from '@/components/ui/Ikon'

/**
 * İlan galerisi — ızgara + büyütme (lightbox).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BÜYÜTME NATIVE `<dialog>` İLE, KÜTÜPHANE İLE DEĞİL.
 *
 * Tarayıcının kendi modal'ı üç şeyi bedavaya veriyor: odak tuzağı, Escape
 * ile kapanma ve arka planın erişilebilirlik ağacından düşmesi. Bir
 * lightbox kütüphanesi bunları yeniden yazıp 15–30 kB ekliyor.
 *
 * Aynı disiplin framer-motion'ı düşürürken de uygulandı: önce "tarayıcı
 * bunu yapıyor mu?" diye soruluyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ IZGARA SUNUCUDA BASILIYOR, BÜYÜTME İSTEMCİDE AÇILIYOR.
 *
 * Görsellerin tamamı ilk HTML'de: arama motoru ve JavaScript'siz ziyaretçi
 * hiçbir şey kaybetmiyor. Büyütme bir ek — çalışmazsa galeri yine galeri.
 *
 * ⚠️ Büyütülen görsel ANCAK AÇILINCA render ediliyor. Hepsini baştan
 * basmak, ilan sayfasına görünmeyen 10 tam boy görsel eklerdi.
 */

export interface GaleriGorseli {
  url: string
  alt: string
  bulanik?: string
}

export function GaleriIzgarasi({
  gorseller,
  baslik,
}: {
  gorseller: readonly GaleriGorseli[]
  baslik: string
}) {
  const [acikSira, setAcikSira] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  const kapat = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  const git = useCallback(
    (yon: 1 | -1) => {
      setAcikSira((onceki) => {
        if (onceki === null) return null
        // ⚠️ Dairesel: son görselden sonra başa dönüyor. Uçta durup hiçbir
        // şey yapmayan bir düğme, bozuk sanılıyor.
        return (onceki + yon + gorseller.length) % gorseller.length
      })
    },
    [gorseller.length],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (acikSira === null) {
      if (dialog.open) dialog.close()
      return
    }

    if (!dialog.open) dialog.showModal()

    const tus = (olay: KeyboardEvent) => {
      if (olay.key === 'ArrowRight') git(1)
      if (olay.key === 'ArrowLeft') git(-1)
    }

    dialog.addEventListener('keydown', tus)
    return () => dialog.removeEventListener('keydown', tus)
  }, [acikSira, git])

  const acik = acikSira === null ? null : gorseller[acikSira]

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr] sm:gap-3">
        <GaleriDugmesi
          gorsel={gorseller[0]!}
          sira={0}
          toplam={gorseller.length}
          onAc={setAcikSira}
          baslik={baslik}
          sinif="aspect-4/3 sm:aspect-3/2"
          boyutlar="(max-width: 640px) 100vw, 66vw"
          oncelikli
        />

        {gorseller.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3">
            {gorseller.slice(1, 5).map((gorsel, sira) => (
              <GaleriDugmesi
                key={gorsel.url}
                gorsel={gorsel}
                sira={sira + 1}
                toplam={gorseller.length}
                onAc={setAcikSira}
                baslik={baslik}
                sinif="aspect-square"
                boyutlar="(max-width: 640px) 25vw, 17vw"
                /**
                 * ⚠️ Beşinci karede kalan sayı yazıyor. Ziyaretçi kaç
                 * fotoğraf olduğunu görmeden büyütmeye tıklamıyor.
                 */
                kalan={sira === 3 ? gorseller.length - 5 : 0}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/*
        ⚠️ `<dialog>` DAİMA DOM'DA, içeriği koşullu.

        Öğeyi koşullu render etmek `showModal()` çağrısını bir kare
        geciktiriyor ve odak yönetimi ıskalanıyordu. Boş bir `<dialog>`
        görünmez ve erişilebilirlik ağacına girmiyor.
      */}
      <dialog
        ref={dialogRef}
        onClose={() => setAcikSira(null)}
        onClick={(olay) => {
          // Arka plana tıklayınca kapansın; içeriğe tıklayınca kapanmasın.
          if (olay.target === dialogRef.current) kapat()
        }}
        className="bg-transparent backdrop:bg-[color:var(--color-notr-900)]/85 max-h-dvh max-w-dvw p-0"
      >
        {acik ? (
          <div className="flex max-h-dvh w-dvw max-w-6xl flex-col gap-3 p-3 sm:p-5">
            <div className="relative aspect-4/3 w-full sm:aspect-16/9">
              <Image
                src={acik.url}
                alt={acik.alt || baslik}
                fill
                sizes="100vw"
                className="rounded-kart object-contain"
                placeholder={acik.bulanik ? 'blur' : 'empty'}
                blurDataURL={acik.bulanik}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-koyu-bant-metin rakam text-govde-kucuk">
                {(acikSira ?? 0) + 1} / {gorseller.length}
              </p>

              <div className="flex items-center gap-2">
                {gorseller.length > 1 ? (
                  <>
                    <GaleriKumandasi etiket="Önceki fotoğraf" onBas={() => git(-1)} yon="sol" />
                    <GaleriKumandasi etiket="Sonraki fotoğraf" onBas={() => git(1)} yon="sag" />
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={kapat}
                  className="text-koyu-bant-metin flex size-11 items-center justify-center rounded-rozet bg-white/15 transition-colors hover:bg-white/25"
                >
                  <KapatIkon width={20} height={20} />
                  <span className="yalnizca-okuyucu">Kapat</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  )
}

function GaleriDugmesi({
  gorsel,
  sira,
  toplam,
  onAc,
  baslik,
  sinif,
  boyutlar,
  oncelikli = false,
  kalan = 0,
}: {
  gorsel: GaleriGorseli
  sira: number
  toplam: number
  onAc: (sira: number) => void
  baslik: string
  sinif: string
  boyutlar: string
  oncelikli?: boolean
  kalan?: number
}) {
  return (
    <button
      type="button"
      onClick={() => onAc(sira)}
      className={`zoom-kabi bg-yuzey-2 rounded-kart group relative block w-full overflow-hidden ${sinif}`}
    >
      <Image
        src={gorsel.url}
        alt={gorsel.alt || baslik}
        fill
        sizes={boyutlar}
        className="object-cover"
        priority={oncelikli}
        placeholder={gorsel.bulanik ? 'blur' : 'empty'}
        blurDataURL={gorsel.bulanik}
      />

      {kalan > 0 ? (
        <span className="text-koyu-bant-metin absolute inset-0 flex items-center justify-center bg-[color:var(--color-notr-900)]/55 text-govde font-medium">
          +{kalan}
        </span>
      ) : null}

      {/*
        ⚠️ ERİŞİLEBİLİR AD SIRAYI TAŞIYOR.

        Beş düğmenin beşi de "Fotoğrafı büyüt" deseydi ekran okuyucu
        kullanan biri listede hangisinde olduğunu bilemezdi — görsel
        kullanan biri bunu bakışla çözüyor.
      */}
      <span className="yalnizca-okuyucu">
        Fotoğrafı büyüt — {sira + 1} / {toplam}
      </span>
    </button>
  )
}

function GaleriKumandasi({
  etiket,
  onBas,
  yon,
}: {
  etiket: string
  onBas: () => void
  yon: 'sol' | 'sag'
}) {
  return (
    <button
      type="button"
      onClick={onBas}
      className="text-koyu-bant-metin flex size-11 items-center justify-center rounded-rozet bg-white/15 transition-colors hover:bg-white/25"
    >
      <OkIkon width={20} height={20} className={yon === 'sol' ? 'rotate-180' : undefined} />
      <span className="yalnizca-okuyucu">{etiket}</span>
    </button>
  )
}
