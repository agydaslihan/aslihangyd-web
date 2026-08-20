'use client'

import { useSyncExternalStore } from 'react'

import { AyIkon, GunesIkon } from '@/components/ui/Ikon'

/**
 * Tema anahtarı — açık / koyu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ VARSAYILAN DAİMA AÇIK. İşletim sistemi tercihi OKUNMAZ.
 *
 * Site önce `@media (prefers-color-scheme: dark)` kullanıyordu ve OS koyu
 * moddaysa kendiliğinden koyuya geçiyordu. Ziyaretçilerin çoğu siteyi
 * lacivert zeminde görüyordu; oysa şartname §1 kırık beyazı ANA ARKA PLAN
 * olarak tanımlıyor ve palet o eksende kuruldu.
 *
 * "Sistemim koyu" ile "bu siteyi koyu istiyorum" aynı şey değil. İkincisi
 * bir tercih ve yalnızca burada, açıkça yapılıyor.
 *
 * ⚠️ TERCİH `localStorage`'DA, ÇEREZDE DEĞİL.
 *
 * Çerez sunucuya gider ve KVKK kapsamında bir tercih çerezi olurdu —
 * onay bandına yeni bir kategori eklemek gerekirdi. Tema sunucuda hiç
 * bilinmiyor; `localStorage` cihazdan çıkmıyor ve hiçbir onay gerektirmiyor.
 *
 * ⚠️ Bu yüzden ilk render SUNUCUDA daima açık tema. Titremeyi önleyen
 * satır `layout.tsx` içindeki `<script>`: paint'ten önce özniteliği
 * yazıyor. O script olmadan koyu tema seçen kullanıcı her sayfa
 * geçişinde bir kare beyaz görürdü.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const TEMA_ANAHTARI = 'aslihangyd-tema'

type Tema = 'acik' | 'koyu'

/**
 * Tema değişimini dinleyenler.
 *
 * ⚠️ `useState` + efekt yerine `useSyncExternalStore` kullanılıyor.
 *
 * Efekt içinde senkron `setState` çağırmak zincirleme render tetikliyor
 * (lint kuralı da bunu reddediyor). Asıl mesele daha derin: temanın gerçek
 * kaynağı React state'i DEĞİL, `<html>` üzerindeki öznitelik — onu paint'ten
 * önce `layout.tsx` içindeki script yazıyor. React'e ikinci bir kopya
 * tutturmak, iki kaynağın ayrışması demekti.
 *
 * `useSyncExternalStore` tam bu iş için: DOM'u okuyor, sunucuda `'acik'`
 * dönüyor ve hidrasyon uyuşmazlığı çıkmıyor.
 */
const dinleyiciler = new Set<() => void>()

function abone(dinleyici: () => void) {
  dinleyiciler.add(dinleyici)
  return () => dinleyiciler.delete(dinleyici)
}

function anlikDeger(): Tema {
  return document.documentElement.getAttribute('data-tema') === 'koyu' ? 'koyu' : 'acik'
}

/** Sunucuda tema daima açık — tercih yalnızca cihazda biliniyor. */
function sunucuDegeri(): Tema {
  return 'acik'
}

export function TemaAnahtari() {
  const tema = useSyncExternalStore(abone, anlikDeger, sunucuDegeri)

  function degistir() {
    const yeni: Tema = tema === 'koyu' ? 'acik' : 'koyu'

    if (yeni === 'koyu') document.documentElement.setAttribute('data-tema', 'koyu')
    else document.documentElement.removeAttribute('data-tema')

    try {
      window.localStorage.setItem(TEMA_ANAHTARI, yeni)
    } catch {
      // Gizli sekmede localStorage erişimi istisna fırlatabiliyor.
      // Tema yine de değişsin; yalnızca kalıcı olmaz.
    }

    /**
     * ⚠️ Adres çubuğu rengi de güncelleniyor.
     *
     * `themeColor` meta etiketi statik; tema artık işletim sistemi
     * tercihine bağlı olmadığı için etiket tek başına yanlış kalırdı —
     * koyu temaya geçen kullanıcı açık renk bir adres çubuğu görürdü.
     */
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta !== null) {
      meta.setAttribute('content', yeni === 'koyu' ? '#1c1c1c' : '#fcfbf8')
    }

    for (const dinleyici of dinleyiciler) dinleyici()
  }

  const koyuMu = tema === 'koyu'

  return (
    <button
      type="button"
      onClick={degistir}
      // ⚠️ `aria-pressed` değil `aria-label`: bu bir açma/kapama değil,
      // iki durum arasında geçiş. Etiket ne olacağını söylüyor.
      aria-label={koyuMu ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={koyuMu ? 'Açık temaya geç' : 'Koyu temaya geç'}
      className="hover:bg-yuzey-2 rounded-buton inline-flex size-11 items-center justify-center transition-colors"
    >
      {koyuMu ? <GunesIkon width={18} height={18} /> : <AyIkon width={18} height={18} />}
    </button>
  )
}
