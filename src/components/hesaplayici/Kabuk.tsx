import type { ReactNode } from 'react'

import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { BilgiIkon } from '@/components/ui/Ikon'
import { tarihiYaz } from '@/lib/tarih'
import type { EksikBilgi } from '@/lib/hesaplayicilar/tipler'

/**
 * Hesaplayıcı sayfası kabuğu.
 *
 * Her hesaplayıcıda aynı üç şey zorunlu olduğu için tek yerde toplandı:
 *  1. "Veriler [tarih] itibarıyladır" ibaresi (CLAUDE.md kural 4)
 *  2. Yatırım tavsiyesi feragati (kural 5)
 *  3. Yöntemin açıklanması — kara kutu hesap güven kaybettirir
 */
export function HesaplayiciKabugu({
  baslik,
  aciklama,
  children,
  yontem,
  parametreTarihi,
  vergiIcerir = false,
}: {
  baslik: string
  aciklama: string
  children: ReactNode
  /** Hesabın nasıl yapıldığı — açılır bölümde gösterilir. */
  yontem: ReactNode
  /** Vergi parametrelerinin geçerlilik tarihi. */
  parametreTarihi?: string | null
  /** Vergi hesabı içeriyorsa mali müşavir ibaresi eklenir. */
  vergiIcerir?: boolean
}) {
  return (
    <div className="kapsayici py-10 sm:py-14">
      <header className="mb-8 flex max-w-2xl flex-col gap-3">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">{baslik}</h1>
        <p className="text-murekkep-2 leading-relaxed">{aciklama}</p>
      </header>

      {children}

      <div className="border-cizgi mt-10 max-w-2xl border-t pt-6">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium marker:content-none">
            <BilgiIkon width={16} height={16} className="text-murekkep-3" />
            Bu hesap nasıl yapılıyor?
            <span className="text-murekkep-3 ml-auto transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="text-murekkep-2 mt-3 space-y-3 text-sm leading-relaxed">{yontem}</div>
        </details>

        <div className="mt-6 flex flex-col gap-2">
          {parametreTarihi ? (
            <p className="text-murekkep-3 text-mikro">
              Vergi ve harç oranları <strong>{tarihiYaz(parametreTarihi)}</strong> itibarıyla
              güncellenmiştir.
            </p>
          ) : null}

          <Feragat
            ek={
              vergiIcerir
                ? 'Vergi hesabı basitleştirilmiştir ve kişisel durumunuza göre değişir; mali müşavirinize danışın.'
                : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Parametre eksik durumu.
 *
 * ⚠️ Bu ekran bir hata değil, bilinçli bir tasarım: oran girilmeden
 * hesaplayıcı çalışmaz. Yanlış bir vergi rakamı göstermektense hiç
 * göstermemeyi seçiyoruz.
 */
export function ParametreEksikUyarisi({ eksikler }: { eksikler: EksikBilgi[] }) {
  return (
    <div className="border-cizgi bg-uyari-acik rounded-yumusak border p-5">
      <h2 className="font-sans text-base font-semibold">Bu hesaplayıcı henüz hazır değil</h2>

      <p className="text-murekkep-2 mt-2 text-sm leading-relaxed">
        Hesaplama için gereken güncel oranlar sisteme henüz girilmedi. Tahmini bir rakam göstermek
        yerine beklemeyi tercih ediyoruz — yanlış bir vergi hesabı, hesap yapmamaktan çok daha
        zararlı olur.
      </p>

      <div className="mt-4">
        <p className="text-mikro font-medium">Eksik olanlar:</p>
        <ul className="text-murekkep-2 mt-1.5 list-disc space-y-1 pl-5 text-sm">
          {eksikler.map((eksik) => (
            <li key={eksik.anahtar}>{eksik.etiket}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <Buton href="/iletisim" gorunum="ikincil" boyut="kucuk">
          Hesabı bizden isteyin
        </Buton>
      </div>
    </div>
  )
}
