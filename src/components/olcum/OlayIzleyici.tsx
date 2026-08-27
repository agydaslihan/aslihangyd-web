'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { derinlikBandi, ekranBandi, yolDizisi } from '@/lib/olcum/bantlar'
import { ROTA_AYRINTILI_OLAYLAR } from '@/lib/olcum/sozluk'

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

      /**
       * ⚠️ "WhatsApp tıklamalarının KAYNAĞI" burada doluyor.
       *
       * Ayrıntı elle verilmemişse ve olay rota-ayrıntılı olaylardan biriyse,
       * bulunulan rota ayrıntı olarak konuyor. Alternatif her WhatsApp
       * bağlantısına elle öznitelik yazmaktı — biri unutulduğunda o kaynak
       * sessizce kaybolurdu. Kural tek yerde: `ROTA_AYRINTILI_OLAYLAR`.
       */
      const ayrinti =
        dugum.dataset.gozlemAyrinti ?? (ROTA_AYRINTILI_OLAYLAR.includes(ad) ? yol : undefined)

      ekle({ ad, ayrinti })
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

    /**
     * ─────────────────────────────────────────────────────────────────────
     * ⚠️ GEZİNME DİZİSİ SEKMEDE KALIYOR, SUNUCUYA GİTMİYOR.
     *
     * Sunucuya giden tek şey, sekme kapanırken hesaplanan ÜÇ ADIMLIK bir
     * dizge (`"/ > /portfoy > /portfoy/[slug]"`) ve bir sayaç. Sıranın
     * kendisi `sessionStorage`ta, yani ziyaretçinin kendi tarayıcısında;
     * biz onu hiç görmüyoruz, yalnızca özetini alıyoruz.
     *
     * ⚠️ Kimlik üretilmiyor: bu dizge kime ait olduğunu söylemiyor ve
     * veritabanında birleştirilebileceği bir alan yok.
     * ─────────────────────────────────────────────────────────────────────
     */
    const IZ_ANAHTARI = 'gz-iz'

    const iziOku = (): string[] => {
      try {
        const ham = sessionStorage.getItem(IZ_ANAHTARI)
        const cozulmus: unknown = ham === null ? [] : JSON.parse(ham)
        return Array.isArray(cozulmus)
          ? cozulmus.filter((x): x is string => typeof x === 'string')
          : []
      } catch {
        return []
      }
    }

    const izeEkle = (rota: string): string[] => {
      // ⚠️ Aynı rota art arda iki kez sayılmıyor: React yeniden bağlanması
      // ya da sorgu değişimi gezinme değildir.
      const iz = izeUygunMu(rota) ? [...iziOku(), rota] : iziOku()
      try {
        // ⚠️ Yalnızca son adımlar tutuluyor. Uzun bir sıra, tek bir ziyarete
        // ait olacak kadar seyrekleşir ve toplulaştırılmış olmaktan çıkar.
        sessionStorage.setItem(IZ_ANAHTARI, JSON.stringify(iz.slice(-8)))
      } catch {
        // Gizli sekmede yazma istisna atabiliyor; ölçüm sayfayı kırmaz.
      }
      return iz
    }

    function izeUygunMu(rota: string): boolean {
      const iz = iziOku()
      return iz[iz.length - 1] !== rota
    }

    const iz = izeEkle(yol)

    // Ekran bandı — oturumda bir kez.
    if (birKezMi('gz-ekran')) {
      ekle({ ad: 'ekran_bandi', ayrinti: ekranBandi(window.innerWidth) })
    }

    /**
     * Sekme kapanırken: çıkış sayfası, yol dizisi ve derinlik bandı.
     *
     * ⚠️ `pagehide` SEÇİLDİ, `beforeunload` DEĞİL. Mobil Safari
     * `beforeunload` olayını çoğu zaman hiç tetiklemiyor; ölçümün mobilde
     * susması, trafiğin dörtte üçünü görmemek demekti.
     *
     * ⚠️ Site içi geçişte de tetikleniyor — ama o durumda `persisted`
     * olmayan bir kapanış olmadığı için son rota yine doğru: her geçişte
     * yeniden hesaplanıyor ve son gönderilen kazanıyor. Sunucu tarafında
     * aynı sayaç arttığı için tekrar sayım paneli bozmuyor; gerçek olan
     * en son gönderilen çıkış rotası.
     */
    const kapanis = () => {
      ekle({ ad: 'cikis_sayfasi', ayrinti: yol })
      const dizi = yolDizisi(iz)
      if (dizi !== null) ekle({ ad: 'sayfa_yolu', ayrinti: dizi })
      ekle({ ad: 'oturum_derinligi', ayrinti: derinlikBandi(iz.length) })
      gonder()
    }

    document.addEventListener('click', tiklama, { passive: true })
    window.addEventListener('scroll', kaydirma, { passive: true })
    window.addEventListener('pagehide', kapanis)

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
      window.removeEventListener('pagehide', kapanis)
      if (sure !== null) clearTimeout(sure)
      if (zamanlayici.current !== null) clearTimeout(zamanlayici.current)
      gonder()
    }
  }, [yol])

  return null
}
