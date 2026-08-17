'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Katman B olay toplayıcısı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİLEŞEN YALNIZCA ANALİTİK ONAYI VARSA RENDER EDİLİYOR.
 *
 * Karar sunucuda veriliyor (`KatmanB.tsx`). Onay yoksa bileşen hiç
 * çalışmıyor: dinleyici takılmıyor, `window.__gozlemOlay` tanımlanmıyor,
 * tek bir istek atılmıyor.
 *
 * ⚠️ Modülün BAYTLARI yine de inebiliyor — ölçüldü, `KatmanB.tsx` içinde
 * yazılı. Turbopack bu modülü çerez bandıyla aynı parçaya koyuyor.
 * Belirleyici olan bayt değil davranış.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ OTURUM KİMLİĞİ SUNUCUYA HİÇ GİTMİYOR.
 *
 * Huni aşamalarının kişi başına bir kez sayılması gerekiyor. Bunun olağan
 * yolu bir oturum kimliği üretip sunucuya göndermek — ve tam da bunu
 * yapmıyoruz. Tekilleştirme TARAYICIDA, `sessionStorage` içinde yapılıyor;
 * sunucuya yalnızca "bu aşamaya ulaşıldı" bilgisi gidiyor. Böylece
 * veritabanında birleştirilebilecek bir kimlik hiç oluşmuyor.
 *
 * ⚠️ Kaydırma derinliği ve süre BANT olarak gönderiliyor (%25/50/75/100,
 * 60+ sn). Ham değer, mahalle ve zamanla birleştiğinde ayırt edici
 * olabilirdi.
 */

const UC = '/api/olcum/olay'

interface Olay {
  ad: string
  ayrinti?: string
}

/** Bir oturumda tekrarlanmayacak olaylar için işaret deposu. */
function birKezMi(anahtar: string): boolean {
  try {
    if (sessionStorage.getItem(anahtar) !== null) return false
    sessionStorage.setItem(anahtar, '1')
    return true
  } catch {
    // Gizli sekmede erişim istisna atabiliyor; ölçüm yüzünden sayfa kırılmaz.
    return true
  }
}

export function OlayIzleyici(): null {
  const yol = usePathname()
  const kuyruk = useRef<Olay[]>([])
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    /**
     * ⚠️ Olaylar TOPLU gönderiliyor. Tıklama başına ayrı istek, mobil
     * bağlantıda hem pil hem gecikme maliyeti demek — ve ölçüm, ölçtüğü
     * deneyimi bozmamalı.
     */
    const gonder = () => {
      const paket = kuyruk.current
      kuyruk.current = []
      if (paket.length === 0) return

      const govde = JSON.stringify(paket)
      // `sendBeacon` sayfa kapanırken bile gidiyor; yoksa fetch'e düşülüyor.
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(UC, new Blob([govde], { type: 'application/json' }))
        return
      }
      void fetch(UC, {
        method: 'POST',
        body: govde,
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      }).catch(() => {})
    }

    const ekle = (olay: Olay) => {
      kuyruk.current.push(olay)
      if (zamanlayici.current !== null) clearTimeout(zamanlayici.current)
      zamanlayici.current = setTimeout(gonder, 2000)
    }

    /**
     * ⚠️ Tıklamalar DELEGE ediliyor, bileşenlere kanca takılmıyor.
     *
     * Her düğmeye `onClick` eklemek, ölçümü ürün kodunun içine yayardı ve
     * kaldırılması imkânsız hâle gelirdi. `data-gozlem` özniteliği tek
     * dokunuş: işaretlemeyi görmek için `grep data-gozlem` yetiyor.
     */
    const tiklama = (olayNesnesi: MouseEvent) => {
      const hedef = olayNesnesi.target
      if (!(hedef instanceof Element)) return
      const dugum = hedef.closest<HTMLElement>('[data-gozlem]')
      if (dugum === null) return

      const ad = dugum.dataset.gozlem
      if (ad === undefined || ad === '') return
      ekle({ ad, ayrinti: dugum.dataset.gozlemAyrinti })
    }

    /** Kaydırma derinliği — dörtlük bantlar, oturum başına bir kez. */
    let sonBant = 0
    const kaydirma = () => {
      const belge = document.documentElement
      const toplam = belge.scrollHeight - belge.clientHeight
      if (toplam <= 0) return
      const oran = (belge.scrollTop / toplam) * 100
      const bant = oran >= 100 ? 100 : oran >= 75 ? 75 : oran >= 50 ? 50 : oran >= 25 ? 25 : 0
      if (bant > sonBant) {
        sonBant = bant
        if (birKezMi(`gz-kaydirma-${yol}-${bant}`)) {
          ekle({ ad: 'kaydirma_derinligi', ayrinti: `${bant}` })
        }
      }
    }

    /**
     * ⚠️ Diğer bileşenler buradan geçiyor (`lib/gozlem/istemci.ts`).
     *
     * Küresel bir fonksiyon çirkin görünüyor ama alternatifi daha kötü:
     * her bileşen kendi `fetch`'ini yazsaydı ölçüm kodu onay vermeyen
     * ziyaretçinin paketine de girer ve onay kapısı onlarca yere dağılırdı.
     * Fonksiyon YOKSA olay gitmiyor — kapı, varlığın kendisi.
     */
    window.__gozlemOlay = (ad: string, ayrinti?: string) => ekle({ ad, ayrinti })

    document.addEventListener('click', tiklama, { passive: true })
    window.addEventListener('scroll', kaydirma, { passive: true })
    window.addEventListener('pagehide', gonder)

    /**
     * ⚠️ İlan sayfasında 60 saniye — yüksek niyet işareti.
     *
     * Sayfa arka plana alınırsa sayaç durmuyor; `visibilitychange` ile
     * duraklatmak daha doğru olurdu ama "sekmeyi açık unutma" ile "gerçekten
     * okuma" ayrımı, ölçümün karmaşıklığını kazandırdığı bilgiden fazla
     * artırıyor. Eşik bu yüzden cömert değil (60 sn) ve tek sayım.
     */
    let sure: ReturnType<typeof setTimeout> | null = null
    if (yol.startsWith('/portfoy/') && yol !== '/portfoy') {
      sure = setTimeout(() => {
        if (birKezMi(`gz-uzun-${yol}`)) ekle({ ad: 'ilan_uzun_okuma' })
      }, 60_000)
    }

    return () => {
      delete window.__gozlemOlay
      document.removeEventListener('click', tiklama)
      window.removeEventListener('scroll', kaydirma)
      window.removeEventListener('pagehide', gonder)
      if (sure !== null) clearTimeout(sure)
      if (zamanlayici.current !== null) clearTimeout(zamanlayici.current)
      gonder()
    }
  }, [yol])

  return null
}
