import Image from 'next/image'

import { EgilenKart } from '@/components/hareket/EgilenKart'
import { DogrulanmisIkon, KonumIkon } from '@/components/ui/Ikon'
import { carpanYaz, paraKisaYaz } from '@/lib/bicimlendirme'
import type { Ilanlar } from '@/payload-types'

/**
 * Vitrinin 3B katmanı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SAHNEDE STOK FOTOĞRAF YOK — GERÇEK PORTFÖY VAR.
 *
 * Referans tasarımdaki "kocaman şehir fotoğrafı" bu sitede kurulamıyordu:
 * elimizde Çorlu'nun telifli bir fotoğrafı yok ve başka bir şehrin
 * görselini Çorlu diye koymak CLAUDE.md kural 2'nin (uydurma veri yasak)
 * görsel karşılığı olurdu.
 *
 * Yerine konan şey daha iyi çıktı: sahnede yayındaki GERÇEK bir ilan
 * duruyor — kendi fotoğrafı, kendi fiyatı, kendi kira çarpanıyla. Vitrin
 * artık bir dekor değil, ürünün kendisi.
 *
 * ⚠️ İLAN YOKSA SAHNE HİÇ ÇİZİLMİYOR (`null`). Boş bir çerçeve, hiç
 * olmayan bir çerçeveden kötü görünür; hero o zaman metin hâline düşüyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ DERİNLİK `translateZ` İLE, GÖLGE TAKLİDİYLE DEĞİL.
 *
 * Katmanlar tek bir `perspective` içinde farklı Z'lerde duruyor; işaretçi
 * hareket ettiğinde yakın katman uzak katmandan DAHA ÇOK kayıyor. Paralaks
 * bu — ve gerçek 3B olduğu için gölgeyle sahtesini yapmaya gerek yok.
 */
export function VitrinSahnesi({ ilan }: { ilan: Ilanlar | null }) {
  if (ilan === null) return null

  const kapak = ilan.gorseller?.[0]?.gorsel
  const gorsel = typeof kapak === 'object' && kapak !== null ? kapak : null
  if (gorsel === null || typeof gorsel.url !== 'string') return null

  const fiyat = paraKisaYaz(ilan.fiyat, ilan.paraBirimi ?? 'TRY')
  const carpan = carpanYaz(ilan.kiraCarpani)
  const mahalle = typeof ilan.mahalle === 'object' ? (ilan.mahalle?.ad ?? null) : null

  return (
    <EgilenKart azamiAci={7} className="relative mx-auto w-full max-w-md lg:max-w-lg">
      {/* ── Zemin ışığı ────────────────────────────────────────────────
          ⚠️ `filter: blur` değil radyal degrade: blur, altındaki bütün
          katmanı her karede yeniden boyatır ve eğilme sırasında kare
          düşürür. Degrade bir kez boyanıyor. */}
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 rounded-[50%]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 55%, color-mix(in oklab, var(--color-gold-400) 26%, transparent), transparent 70%)',
        }}
      />

      {/* ── Ana kart ──────────────────────────────────────────────────
          ⚠️ `translateZ(0)` referans düzlem. Yüzen rozetler bunun ÖNÜNDE
          (pozitif Z), böylece eğilme sırasında karttan bağımsız kayıyorlar. */}
      <div
        className="border-kenar bg-yuzey shadow-kalkik overflow-hidden rounded-[1.75rem] border-[0.5px]"
        style={{ transform: 'translateZ(0px)' }}
      >
        <div className="relative aspect-[4/5]">
          <Image
            src={gorsel.url}
            alt={typeof gorsel.alt === 'string' && gorsel.alt !== '' ? gorsel.alt : ilan.baslik}
            fill
            /* ⚠️ LCP öğesi bu görsel: `priority` ve gerçek `sizes` zorunlu. */
            sizes="(min-width: 1024px) 32rem, 90vw"
            priority
            className="object-cover"
          />

          {/* Alt erime — üstündeki metnin kontrastı fotoğrafa bağlı kalmasın. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/5"
            style={{
              background:
                'linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-notr-900) 78%, transparent))',
            }}
          />

          <div className="absolute inset-x-0 bottom-0 p-5">
            {mahalle !== null ? (
              <p className="flex items-center gap-1.5 text-govde-kucuk font-medium text-[color:var(--color-notr-50)]">
                <KonumIkon width={14} height={14} className="shrink-0" />
                {mahalle}
              </p>
            ) : null}
            {fiyat !== null ? (
              <p className="mt-1 font-baslik text-baslik-2 font-medium text-[color:var(--color-notr-50)]">
                {fiyat}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Yüzen rozet 1: EİDS ───────────────────────────────────────
          ⚠️ `translateZ(48px)` — karttan ÖNDE. Eğilmede daha çok kayıyor
          ve derinlik hissi buradan geliyor. */}
      <div
        className="border-kenar bg-yuzey shadow-kart absolute -top-4 -left-3 flex items-center gap-2 rounded-full border-[0.5px] py-2 pr-4 pl-3 sm:-left-6"
        style={{ transform: 'translateZ(48px)' }}
      >
        <DogrulanmisIkon width={16} height={16} className="text-basari shrink-0" />
        <span className="text-metin text-mikro font-medium">EİDS doğrulamalı</span>
      </div>

      {/* ── Yüzen rozet 2: kira çarpanı ───────────────────────────────
          ⚠️ Çarpan YOKSA rozet hiç çizilmiyor. "—" yazan bir rozet,
          rakamın var olduğunu ama okunamadığını ima ederdi. */}
      {carpan !== null ? (
        <div
          className="border-kenar bg-yuzey shadow-kart absolute -right-3 -bottom-5 rounded-2xl border-[0.5px] px-4 py-3 sm:-right-6"
          style={{ transform: 'translateZ(72px)' }}
        >
          <p className="text-metin-3 text-mikro uppercase">Kira çarpanı</p>
          <p className="text-metin font-baslik text-baslik-3 font-medium">{carpan}</p>
        </div>
      ) : null}
    </EgilenKart>
  )
}
