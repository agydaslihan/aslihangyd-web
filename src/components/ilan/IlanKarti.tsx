import Image from 'next/image'
import Link from 'next/link'

import { DogrulanmisIkon, KonumIkon, VeriBekleniyorIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { carpanYaz, m2Yaz, paraKisaYaz } from '@/lib/bicimlendirme'
import { etiketBul, ILAN_TIPLERI, ODA_SAYILARI } from '@/lib/secenekler'
import type { Ilanlar, Medya } from '@/payload-types'

/**
 * İlan kartı — listelerde ve ana sayfada kullanılan birim.
 *
 * Hiyerarşi kararı: **fiyat başlıktan büyük.** Yatırımcı listeyi tararken
 * önce rakama bakar, başlığı sonra okur. Emlak sitelerinin çoğu bunu ters
 * kurar ve kartı okunması gereken bir metin bloğuna çevirir.
 *
 * Kira çarpanı varsa rozet olarak gösterilir — bu, rakiplerin liste
 * kartlarında olmayan tek bilgi ve sitenin ayırt edici vaadi.
 */
export function IlanKarti({ ilan, oncelikli = false }: { ilan: Ilanlar; oncelikli?: boolean }) {
  const kapak = kapakGorseli(ilan)
  const mahalleAdi = typeof ilan.mahalle === 'object' ? ilan.mahalle?.ad : null
  const fiyat = paraKisaYaz(ilan.fiyat, ilan.paraBirimi ?? 'TRY')
  const carpan = carpanYaz(ilan.kiraCarpani)

  return (
    <article className="group border-cizgi bg-yuzey rounded-yumusak hover:shadow-kart focus-within:shadow-kart relative flex flex-col overflow-hidden border transition-shadow">
      <div className="bg-yuzey-2 relative aspect-4/3 overflow-hidden">
        {kapak?.url ? (
          <Image
            src={kapak.url}
            alt={kapak.alt ?? ilan.baslik}
            fill
            // Mobilde tam genişlik, tablette yarım, masaüstünde üçte bir.
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            priority={oncelikli}
          />
        ) : (
          <div className="text-murekkep-3 flex h-full flex-col items-center justify-center gap-2">
            <VeriBekleniyorIkon width={28} height={28} />
            <span className="text-mikro">Fotoğraf yakında</span>
          </div>
        )}

        {ilan.durum === 'rezerve' ? (
          <span className="absolute top-3 left-3">
            <Rozet ton="uyari">Rezerve</Rozet>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="rakam text-xl leading-none font-semibold sm:text-[1.375rem]">
            {fiyat ?? (
              <span className="text-murekkep-3 text-base font-normal">Fiyat görüşülür</span>
            )}
            {ilan.tip === 'kiralik' && fiyat ? (
              <span className="text-murekkep-3 text-sm font-normal"> / ay</span>
            ) : null}
          </p>

          {ilan.tasinmazNo ? (
            <span
              className="text-artis mt-0.5 shrink-0"
              title={`Doğrulanmış İlan — Taşınmaz no: ${ilan.tasinmazNo}`}
            >
              <DogrulanmisIkon width={18} height={18} />
              <span className="yalnizca-okuyucu">
                Doğrulanmış ilan. Taşınmaz numarası {ilan.tasinmazNo}
              </span>
            </span>
          ) : null}
        </div>

        <h3 className="font-sans text-[0.9375rem] leading-snug font-medium">
          {/* Tüm kart tıklanabilir olsun ama DOM'da tek bağlantı kalsın. */}
          <Link href={`/portfoy/${ilan.slug}`} className="after:absolute after:inset-0">
            {ilan.baslik}
          </Link>
        </h3>

        {mahalleAdi ? (
          <p className="text-murekkep-2 flex items-center gap-1.5 text-sm">
            <KonumIkon width={14} height={14} className="shrink-0" />
            {mahalleAdi} Mah., {ilan.ilce}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Rozet>{etiketBul(ILAN_TIPLERI, ilan.tip) ?? ilan.tip}</Rozet>
          {ilan.odaSayisi ? (
            <Rozet>{etiketBul(ODA_SAYILARI, ilan.odaSayisi) ?? ilan.odaSayisi}</Rozet>
          ) : null}
          {m2Yaz(ilan.brutM2) ? <Rozet>{m2Yaz(ilan.brutM2)}</Rozet> : null}
          {carpan ? <Rozet ton="pirinc">Kira çarpanı {carpan}</Rozet> : null}
        </div>
      </div>
    </article>
  )
}

function kapakGorseli(ilan: Ilanlar): Medya | null {
  const ilk = ilan.gorseller?.[0]?.gorsel
  return typeof ilk === 'object' && ilk !== null ? ilk : null
}

/** Yükleme iskeleti — kart ile aynı yüksekliği kaplar, düzen zıplamaz. */
export function IlanKartiIskeleti() {
  return (
    <div className="border-cizgi bg-yuzey rounded-yumusak overflow-hidden border">
      <div className="iskelet aspect-4/3 rounded-none" />
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="iskelet h-6 w-28" />
        <div className="iskelet h-4 w-full" />
        <div className="iskelet h-4 w-2/3" />
        <div className="flex gap-2 pt-1">
          <div className="iskelet h-6 w-16 rounded-full" />
          <div className="iskelet h-6 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}
