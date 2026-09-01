'use client'

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Sihirbaz modalı — sayfadan çıkmadan ilan verme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MODAL, SİHİRBAZIN İKİNCİ BİR KOPYASI DEĞİL, İKİNCİ BİR KABUĞU.
 *
 * İçindeki `PortfoySihirbazi` sayfadakiyle aynı bileşen: aynı şema, aynı
 * sunucu eylemi, aynı EİDS motoru. İkinci bir sihirbaz yazmak, EİDS
 * kapısının ve otomatik kaydetmenin iki ayrı kopyasını doğururdu ve
 * ikisinin ayrıştığı gün hangisinin doğru olduğu sorulamazdı.
 *
 * `/admin/portfoy-sihirbazi` rotası duruyor: derin bağlantı, yer imi ve
 * yeni sekmede açma çalışmaya devam ediyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ODAK TUZAĞI ELLE KURULDU. `<dialog>`un yerleşik `showModal()`i odağı
 * kendisi tutuyor ama Payload panelinin kendi katman yönetimiyle
 * çakışıyor; burada odak döngüsü açıkça yazılı ve test edilebilir.
 *
 * ⚠️ ESC KAPATIYOR AMA ÖNCE SORUYOR. Kaydedilmemiş bir formda ESC'ye
 * yanlışlıkla basmak, yarım saatlik bir girişi silerdi.
 */

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function SihirbazModali({
  acik,
  onKapat,
  kapatmadanOnceSor,
  baslik,
  children,
}: {
  acik: boolean
  onKapat: () => void
  /** `true` dönerse kapatma onaylanır. */
  kapatmadanOnceSor: () => boolean
  baslik: string
  children: ReactNode
}) {
  const kapRef = useRef<HTMLDivElement | null>(null)
  const oncekiOdakRef = useRef<HTMLElement | null>(null)
  const basligiId = useId()

  const kapat = useCallback(() => {
    if (!kapatmadanOnceSor()) return
    onKapat()
  }, [kapatmadanOnceSor, onKapat])

  /** Odağı içeri al, çıkışta geri ver. */
  useEffect(() => {
    if (!acik) return

    oncekiOdakRef.current = document.activeElement as HTMLElement | null
    const kap = kapRef.current
    kap?.querySelector<HTMLElement>(ODAKLANABILIR)?.focus()

    return () => {
      // ⚠️ Odak geri verilmezse ekran okuyucu kullanan kişi sayfanın
      // başına düşer ve nerede kaldığını kaybeder.
      oncekiOdakRef.current?.focus()
    }
  }, [acik])

  /** Arka planın kaymasını kilitle. */
  useEffect(() => {
    if (!acik) return
    const onceki = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = onceki
    }
  }, [acik])

  /** ESC ve odak döngüsü. */
  useEffect(() => {
    if (!acik) return

    const tus = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        olay.preventDefault()
        kapat()
        return
      }

      if (olay.key !== 'Tab') return

      const kap = kapRef.current
      if (kap === null) return
      const ogeler = [...kap.querySelectorAll<HTMLElement>(ODAKLANABILIR)].filter(
        (oge) => oge.offsetParent !== null,
      )
      if (ogeler.length === 0) return

      const ilk = ogeler[0]
      const son = ogeler[ogeler.length - 1]
      if (ilk === undefined || son === undefined) return

      // ⚠️ Döngü iki yönde de kapalı: Shift+Tab ilkten sona döner.
      if (olay.shiftKey && document.activeElement === ilk) {
        olay.preventDefault()
        son.focus()
      } else if (!olay.shiftKey && document.activeElement === son) {
        olay.preventDefault()
        ilk.focus()
      }
    }

    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [acik, kapat])

  if (!acik) return null

  return (
    <div
      className="sihirbaz-modal-ortu"
      onMouseDown={(olay) => {
        // ⚠️ Yalnızca ÖRTÜYE basıldığında kapanıyor; içeriden başlayıp
        // dışarıda biten bir sürükleme (metin seçimi) kapatmamalı.
        if (olay.target === olay.currentTarget) kapat()
      }}
    >
      <div
        ref={kapRef}
        className="sihirbaz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={basligiId}
      >
        <header className="sihirbaz-modal-baslik">
          <h2 id={basligiId}>{baslik}</h2>
          <button
            type="button"
            className="sihirbaz-modal-kapat"
            onClick={kapat}
            aria-label="Sihirbazı kapat"
          >
            {/*
              ⚠️ SVG, KARAKTER DEĞİL. "✕" (U+2715) font alt kümemizde yok
              ve `lib/tipografi/alfabe.test.ts` bunu yakaladı: alt kümede
              olmayan bir karakter, tarayıcıda yedek fontla çizilir ve
              düğme başka bir yazı tipiyle görünür.
            */}
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="sihirbaz-modal-govde">{children}</div>
      </div>
    </div>
  )
}
