'use client'

import { useEffect, useState } from 'react'

import { WhatsappIkon } from '@/components/ui/Ikon'

/**
 * Yüzen WhatsApp düğmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İLK EKRANDA GÖRÜNMÜYOR VE BU BİLİNÇLİ.
 *
 * Hero'nun üstünde asılı duran bir düğme, sayfanın ilk cümlesiyle yarışır.
 * Ziyaretçi kaydırmaya başladığında — yani içeriği okumaya karar
 * verdiğinde — beliriyor. Şartname §5 "yüzen WhatsApp butonu" diyor;
 * ne zaman görüneceğini söylemiyor, o karar burada.
 *
 * ⚠️ ÇEREZ BANNERİYLE ÇAKIŞMIYOR: banner `z-50` ve tam genişlikte alt
 * şeritte duruyor; düğme `z-30` ve onay verilene kadar bannerin üstüne
 * çıkmıyor. Onay bandı kapanınca düğme kendi yerinde kalıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ NUMARA YOKSA HİÇ ÇİZİLMİYOR. Kurumsal bilgiler girilmeden çalışan bir
 * WhatsApp düğmesi, tıklayan ziyaretçiyi boş bir sohbete götürürdü.
 *
 * ⚠️ Dokunma hedefi 56 px — 44 px sınırının üstünde; tek elle
 * kullanılabilirlik için başparmağın rahat ulaştığı köşede.
 */
const ESIK_PX = 420

export function YuzenWhatsapp({ adres }: { adres: string | null }) {
  const [gorunur, setGorunur] = useState(false)

  useEffect(() => {
    if (adres === null) return

    const olcum = () => setGorunur(window.scrollY > ESIK_PX)
    olcum()
    // ⚠️ `passive: true`: dinleyici hiçbir şeyi iptal etmiyor ve pasif
    // olmayan bir kaydırma dinleyicisi INP'yi doğrudan etkiliyor.
    window.addEventListener('scroll', olcum, { passive: true })
    return () => window.removeEventListener('scroll', olcum)
  }, [adres])

  if (adres === null) return null

  return (
    <a
      href={adres}
      target="_blank"
      rel="noopener noreferrer"
      data-yazdirma="gizle"
      aria-hidden={!gorunur}
      tabIndex={gorunur ? 0 : -1}
      className={[
        'cam text-metin fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center',
        'rounded-rozet shadow-kart transition-[opacity,transform] duration-[var(--sure-katman)]',
        'ease-[var(--cikis)] sm:right-6 sm:bottom-6',
        gorunur ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
      <WhatsappIkon width={24} height={24} />
      <span className="yalnizca-okuyucu">WhatsApp&apos;tan yazın</span>
    </a>
  )
}
