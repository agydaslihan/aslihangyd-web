'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { TemaAnahtari } from '@/components/duzen/TemaAnahtari'
import { KapatIkon, MenuIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { BASLIK_EYLEMI, type UstMenuOgesi } from '@/lib/gezinme'
import { BaglantiIsigi } from '@/components/hareket/BaglantiIsigi'
import { sinif } from '@/lib/sinif'
import { MarkaLogosu } from '@/components/marka/MarkaLogosu'
import type { MarkaAyarlari } from '@/lib/marka/sunucu'
import { SITE_ADI, whatsappMesaji } from '@/lib/site'

/**
 * Site başlığı — kurumsal, yapışkan, mega menülü.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MENÜ VERİSİ SUNUCUDAN İNİYOR.
 *
 * Bazı menü öğeleri site bölümü anahtarına bağlı (örn. Endeks, veri
 * eşikleri sağlanana kadar `notFound()` dönüyor). Bölüm durumunu istemcide
 * çözmek, kapalı bir bağlantının ilk karede görünmesi ve tıklanabilmesi
 * demekti — ziyaretçi 404'e giderdi. Süzme sunucuda yapılıyor
 * (`menuyuSuz`), bileşen hazır listeyi alıyor.
 *
 * ⚠️ İstemci bileşeni olmasının sebepleri: mobil menü, mega menü açılışı
 * ve kaydırma gölgesi. Üçü de etkileşim.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function Baslik({
  menu,
  whatsapp,
  marka,
}: {
  menu: readonly UstMenuOgesi[]
  whatsapp: string | null
  marka: MarkaAyarlari
}) {
  /**
   * ⚠️ Eylem metni CMS'ten; boşsa koddaki yedek.
   *
   * Yedek kodda kalıyor çünkü veritabanı okunamasa bile başlıktaki eylem
   * görünmeli — marka sesi içerik, ama butonun varlığı işlev.
   */
  const eylem = marka.baslikEylemi ?? BASLIK_EYLEMI

  const [acik, setAcik] = useState(false)
  /** Kapanışta odak buraya döner — klavye kullanıcısı yerini kaybetmesin. */
  const dugmeRef = useRef<HTMLButtonElement>(null)
  const [acikMega, setAcikMega] = useState<string | null>(null)
  const [kaydirildi, setKaydirildi] = useState(false)
  const yol = usePathname()

  // Sayfa değişince menüler kapansın.
  //
  // Efekt yerine render sırasında: efektle yazmak fazladan bir render turu
  // doğurur ve menü bir kare boyunca açık görünür.
  const [oncekiYol, setOncekiYol] = useState(yol)
  if (yol !== oncekiYol) {
    setOncekiYol(yol)
    setAcik(false)
    setAcikMega(null)
  }

  useEffect(() => {
    if (!acik) return

    const kapat = (olay: KeyboardEvent) => {
      if (olay.key !== 'Escape') return
      setAcik(false)
      // ⚠️ Odak açan düğmeye dönmeli: aksi hâlde Escape'ten sonra odak
      // gövdeye düşer ve klavye kullanıcısı menüye baştan gezinmek zorunda
      // kalır.
      dugmeRef.current?.focus()
    }
    document.addEventListener('keydown', kapat)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', kapat)
      document.body.style.overflow = ''
    }
  }, [acik])

  /**
   * Kaydırma gölgesi.
   *
   * ⚠️ `passive: true` bilinçli: kaydırma dinleyicisi varsayılan olarak
   * tarayıcının kaydırmayı ertelemesine sebep olabiliyor ve INP hedefini
   * (200ms) doğrudan etkiliyor. Dinleyici hiçbir şeyi iptal etmiyor.
   */
  useEffect(() => {
    const olcum = () => setKaydirildi(window.scrollY > 8)
    olcum()
    window.addEventListener('scroll', olcum, { passive: true })
    return () => window.removeEventListener('scroll', olcum)
  }, [])

  const whatsappAdresi = whatsappBaglantisi(whatsapp, whatsappMesaji())

  return (
    <>
      <header
        data-yazdirma="gizle"
        onMouseLeave={() => setAcikMega(null)}
        className={sinif(
          'sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter]',
          'duration-[var(--sure-katman)] ease-[var(--cikis)]',
          /**
           * ⚠️ TEPEDE SAYDAM, KAYDIRINCA CAM.
           *
           * Şartname §5 "yapışkan saydam navbar, kaydırınca blur" istiyor.
           * Sayfanın ilk ekranında başlık zemine karışıyor; içerik altına
           * girmeye başlayınca cam yüzey ve gölge beliriyor.
           *
           * ⚠️ Kenarlık yerine gölge: yapışkan başlıkta sabit bir çizgi
           * sayfanın üstünü ikiye böler ve "uygulama" hissi verir.
           *
           * ⚠️ Cam sınıfı mobilde otomatik olarak DÜZ RENGE düşüyor
           * (globals.css `.cam`): `backdrop-filter` telefonda her karede
           * arkasını yeniden bulanıklaştırıyor.
           */
          kaydirildi ? 'cam shadow-kart' : 'border-transparent bg-transparent',
        )}
      >
        <div className="kapsayici flex h-18 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center"
            aria-label={`${marka?.siteAdi ?? SITE_ADI} ana sayfa`}
          >
            {/* ⚠️ Logo yoksa metin yedeği devreye giriyor — site logosuz kırılmaz. */}
            <MarkaLogosu
              marka={marka}
              sinif="h-9 w-auto"
              metinSinifi="font-baslik text-baslik-3 tracking-tight whitespace-nowrap"
              vurguSinifi="text-vurgu"
            />
          </Link>

          {/* ── Masaüstü gezinme ── */}
          <nav aria-label="Ana gezinme" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {menu.map((oge) => (
                <li
                  key={oge.adres}
                  className="relative"
                  onMouseEnter={() => setAcikMega(oge.mega ? oge.adres : null)}
                >
                  <MenuBaglantisi oge={oge} aktif={yolAktifMi(yol, oge.adres)} />

                  {oge.mega && oge.mega.length > 0 && acikMega === oge.adres ? (
                    <MegaMenu ogeler={oge.mega} onKapat={() => setAcikMega(null)} />
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <TemaAnahtari />

            {/*
              ⚠️ Dolu altın — şartnamedeki iki eylemden biri. Üçüncü bir
              yerde kullanılırsa disiplin testi kırılır.

              ⚠️ METİN `text-white` DEĞİL, JETON — ve bu bir düzeltme.
              Aurora'da dolu zemin altın; beyaz metin orada 2,36:1 veriyor
              (ağır ihlal), mürekkep 7,20:1. Eski palette adaçayı zemin
              üzerinde beyaz doğru cevaptı ve sınıf öyle kalmıştı: renk
              değişti, metin değişmedi — sessiz erişilebilirlik hatası.

              ⚠️ Kenarlık da zorunlu: altın dolgu sayfa zemininden yalnızca
              2,28:1 ayrışıyor, WCAG 1.4.11 bileşen sınırı için 3:1 istiyor.
            */}
            <Link
              href={eylem.adres}
              className="bg-aksan hover:bg-aksan-koyu rounded-buton border-aksan-kenar relative hidden min-h-11 items-center border-[0.5px] px-5 text-govde-kucuk font-medium text-[color:var(--color-aksan-uzeri)] transition-colors lg:inline-flex"
            >
              {eylem.ad}
              <BaglantiIsigi />
            </Link>

            <button
              ref={dugmeRef}
              type="button"
              onClick={() => setAcik((onceki) => !onceki)}
              aria-expanded={acik}
              aria-controls="mobil-gezinme"
              className="hover:bg-yuzey-2 rounded-buton -mr-2 inline-flex size-11 items-center justify-center lg:hidden"
            >
              {acik ? <KapatIkon /> : <MenuIkon />}
              <span className="yalnizca-okuyucu">{acik ? 'Menüyü kapat' : 'Menüyü aç'}</span>
            </button>
          </div>
        </div>
      </header>

      {/*
        ⚠️ PANEL HEADER'IN DIŞINDA — VE BU BİR DÜZELTME, TERCİH DEĞİL.

        Panel `position: fixed`. Header ise kaydırınca `cam` sınıfını (yani
        `backdrop-filter`) taşıyor,
        `backdrop-filter` uyguluyor — ve `backdrop-filter` uygulayan bir
        öğe, `fixed` konumlu TORUNLARI için İÇEREN BLOK oluyor (`filter`
        ve `transform` ile aynı davranış).

        Panel header'ın içindeyken `top-18 bottom-0` görüntü alanına değil
        72 piksellik HEADER kutusuna göre çözülüyordu:

            top: 72px, bottom: 0, içeren blok yüksekliği 72px  →  yükseklik 0

        Yani düğme çalışıyor, durum değişiyor, panel DOM'a giriyor ve
        yüksekliği sıfır olduğu için görünmüyordu. Mobil ziyaretçi sitede
        hiçbir yere gidemiyordu.

        ⚠️ Header'dan `backdrop-blur` kaldırmak da çözerdi ama yanlış
        çözüm olurdu: bulanıklık yapışkan başlığın okunurluğunu sağlıyor.
        Doğru olan, `fixed` paneli o içeren bloğun dışına çıkarmak.
      */}
      {acik ? (
        <MobilMenu
          menu={menu}
          yol={yol}
          whatsappAdresi={whatsappAdresi}
          eylem={eylem}
          onKapat={() => setAcik(false)}
          acanDugme={dugmeRef}
        />
      ) : null}
    </>
  )
}

/**
 * Masaüstü menü bağlantısı.
 *
 * ⚠️ Aktif sayfa GOLD 2px alt çizgiyle işaretli (şartname §4).
 * Çizgi tek taşıyıcı değil: `aria-current="page"` da veriliyor ve metin
 * rengi koyulaşıyor. Gold'un kırık beyaz üzerindeki kontrastı 2,06:1 —
 * tek başına bilgi taşısaydı erişilebilirlik ihlali olurdu.
 */
function MenuBaglantisi({ oge, aktif }: { oge: UstMenuOgesi; aktif: boolean }) {
  return (
    <Link
      href={oge.adres}
      aria-current={aktif ? 'page' : undefined}
      className={sinif(
        'relative flex min-h-11 items-center px-3 text-govde-kucuk transition-colors',
        aktif ? 'text-metin font-medium' : 'text-metin-2 hover:text-metin',
      )}
    >
      {oge.ad}
      {/* Basılan bağlantının kendi yükleme çizgisi — ilk yüklemede yok. */}
      <BaglantiIsigi />
      {aktif ? (
        <span
          aria-hidden="true"
          className="bg-gold-cizgi absolute inset-x-3 bottom-2.5 h-0.5 rounded-full"
        />
      ) : null}
    </Link>
  )
}

/**
 * Mega menü.
 *
 * ⚠️ Yalnızca masaüstünde: dokunmatik ekranda "üzerine gelme" yok ve
 * mobilde tüm öğeler zaten tam ekran menüde düz liste olarak duruyor.
 *
 * Klavye: bağlantılar normal sekme sırasında; panel `onMouseLeave` ile
 * kapanıyor ama odak dışarı çıktığında da kapanmalı — `onBlur` yerine
 * kapsayıcıdaki `onMouseLeave` ve Escape yeterli, çünkü panel odak tuzağı
 * değil ve içindeki her bağlantı doğrudan gezilebiliyor.
 */
function MegaMenu({
  ogeler,
  onKapat,
}: {
  ogeler: readonly { ad: string; adres: string; aciklama: string }[]
  onKapat: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const kapat = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') onKapat()
    }
    document.addEventListener('keydown', kapat)
    return () => document.removeEventListener('keydown', kapat)
  }, [onKapat])

  return (
    <div
      ref={ref}
      className="border-kenar bg-yuzey rounded-kart shadow-kalkik absolute top-full left-0 z-50 w-[26rem] border-[0.5px] p-2"
    >
      <ul className="flex flex-col">
        {ogeler.map((alt) => (
          <li key={alt.adres}>
            <Link
              href={alt.adres}
              className="hover:bg-yuzey-2 rounded-kucuk flex flex-col gap-0.5 px-3 py-2.5 transition-colors"
            >
              <span className="text-govde-kucuk text-metin font-medium">{alt.ad}</span>
              <span className="text-metin-3 text-mikro">{alt.aciklama}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Mobil tam ekran menü.
 *
 * ⚠️ Mega menü öğeleri burada DÜZLEŞTİRİLİYOR, gizlenmiyor. Telefonda
 * açılır-kapanır ikinci seviye, tek elle kullanımda fazladan iki dokunuş
 * demek; bütün yollar tek listede duruyor ve grup başlığıyla ayrılıyor.
 */
function MobilMenu({
  menu,
  yol,
  whatsappAdresi,
  eylem,
  onKapat,
  acanDugme,
}: {
  menu: readonly UstMenuOgesi[]
  yol: string | null
  whatsappAdresi: string | null
  eylem: { ad: string; adres: string }
  onKapat: () => void
  acanDugme: RefObject<HTMLButtonElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  /**
   * ⚠️ ODAK TUZAĞI — açık bir örtü menüsünde zorunlu.
   *
   * Panel görüntü alanının tamamını kaplıyor ve arkasındaki sayfa
   * `overflow: hidden` ile kilitli. Odak tuzağı olmasaydı Tab tuşu
   * ziyaretçiyi GÖRÜNMEYEN bağlantılar arasında dolaştırırdı: ekran
   * okuyucu "portföy bağlantısı" der, ekranda menü vardır ve o bağlantı
   * görünmez. Klavye kullanıcısı için menü kapalıya eşdeğer olurdu.
   *
   * ⚠️ Odak açılışta panele TAŞINIYOR. Taşınmasaydı odak hâlâ düğmede
   * kalır ve Tab, menünün ilk bağlantısına değil sayfanın başına giderdi.
   */
  useEffect(() => {
    const panel = panelRef.current
    if (panel === null) return

    // ⚠️ Temizlikte kullanılacak düğüm ETKİNİN İÇİNDE kopyalanıyor: temizlik
    // çalıştığında `ref.current` çoktan değişmiş olabilir.
    const acan = acanDugme.current

    const odaklanabilirler = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(
        (dugum) => dugum.offsetParent !== null || dugum === document.activeElement,
      )

    odaklanabilirler()[0]?.focus()

    const tuzak = (olay: KeyboardEvent) => {
      if (olay.key !== 'Tab') return

      const liste = odaklanabilirler()
      if (liste.length === 0) return

      const ilk = liste[0]
      const son = liste[liste.length - 1]
      if (ilk === undefined || son === undefined) return

      // ⚠️ Sarma iki yönde de gerekli: Shift+Tab ilk öğeden sona dönmeli.
      if (olay.shiftKey && document.activeElement === ilk) {
        olay.preventDefault()
        son.focus()
      } else if (!olay.shiftKey && document.activeElement === son) {
        olay.preventDefault()
        ilk.focus()
      }
    }

    document.addEventListener('keydown', tuzak)
    return () => {
      document.removeEventListener('keydown', tuzak)
      // Kapanışta odak açan düğmeye döner.
      acan?.focus()
    }
  }, [acanDugme])

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Site menüsü"
      id="mobil-gezinme"
      className="border-kenar bg-zemin fixed inset-x-0 top-18 bottom-0 z-40 overflow-y-auto border-t-[0.5px] lg:hidden"
    >
      {/*
        ⚠️ KAPATMA DÜĞMESİ PANELİN İÇİNDE OLMAK ZORUNDA.
        
        Başlıktaki X düğmesi panelin DIŞINDA kaldı ve odak tuzağı Tab'ı panel
        içinde döndürüyor: klavye kullanıcısı o düğmeye artık ulaşamaz.
        Escape bir çıkış yolu ama tek çıkış yolu olamaz — dokunmatik ekran
        okuyucu kullanan biri Escape tuşuna basamaz.
      */}
      <div className="kapsayici flex justify-end pt-3">
        <button
          type="button"
          onClick={onKapat}
          className="hover:bg-yuzey-2 rounded-buton text-metin-2 inline-flex min-h-11 items-center gap-2 px-3 text-govde-kucuk"
        >
          <KapatIkon />
          Menüyü kapat
        </button>
      </div>

      <nav aria-label="Mobil gezinme" className="kapsayici py-4">
        <ul className="flex flex-col">
          {menu.map((oge) => (
            <li key={oge.adres} className="border-kenar border-b-[0.5px] last:border-0">
              <Link
                href={oge.adres}
                aria-current={yolAktifMi(yol, oge.adres) ? 'page' : undefined}
                className={sinif(
                  'flex min-h-14 items-center text-govde',
                  yolAktifMi(yol, oge.adres) ? 'text-metin font-medium' : 'text-metin',
                )}
              >
                {oge.ad}
              </Link>

              {oge.mega && oge.mega.length > 0 ? (
                <ul className="border-kenar mb-3 ml-3 flex flex-col border-l-[0.5px] pl-3">
                  {oge.mega.map((alt) => (
                    <li key={alt.adres}>
                      <Link
                        href={alt.adres}
                        className="text-metin-2 flex min-h-12 items-center text-govde-kucuk"
                      >
                        {alt.ad}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>

        <Link
          href={eylem.adres}
          className="bg-aksan border-aksan-kenar rounded-buton mt-6 flex min-h-13 w-full items-center justify-center border-[0.5px] font-medium text-[color:var(--color-aksan-uzeri)]"
        >
          {eylem.ad}
        </Link>

        {whatsappAdresi ? (
          <a
            href={whatsappAdresi}
            data-gozlem="whatsapp_tikla"
            target="_blank"
            rel="noopener noreferrer"
            className="border-kenar-guclu rounded-buton mt-3 flex min-h-13 w-full items-center justify-center gap-2 border-[0.5px] font-medium"
          >
            <WhatsappIkon width={18} height={18} />
            WhatsApp&apos;tan yazın
          </a>
        ) : null}
      </nav>
    </div>
  )
}

/** Alt sayfalarda da üst menü öğesi aktif görünsün (/portfoy/xyz → Portföy). */
function yolAktifMi(mevcutYol: string | null, adres: string): boolean {
  if (!mevcutYol) return false
  // Sorgu parametreli mega öğeleri (?tip=satilik) yol karşılaştırmasına girmez.
  const temiz = adres.split('?')[0] ?? adres
  if (temiz === '/') return mevcutYol === '/'
  return mevcutYol === temiz || mevcutYol.startsWith(`${temiz}/`)
}

/** Klavye kullanıcıları için "içeriğe atla" bağlantısı. */
export function IcerigeAtla() {
  return (
    <a
      href="#icerik"
      className="bg-koyu-bant rounded-kart sr-only z-50 px-4 py-2 text-koyu-bant-metin focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
    >
      İçeriğe atla
    </a>
  )
}
