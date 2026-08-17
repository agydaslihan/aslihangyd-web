import Image from 'next/image'
import Link from 'next/link'

import { DogrulanmisIkon, FotografIkon, TurIkon, VeriBekleniyorIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { carpanYaz, m2Yaz, paraKisaYaz, paraYaz } from '@/lib/bicimlendirme'
import { etiketBul, ODA_SAYILARI } from '@/lib/secenekler'
import { sinif } from '@/lib/sinif'
import type { Ilanlar, Medya } from '@/payload-types'
import { bulanikOzellikleri } from '@/lib/medya/bulanik'
import { KART_SIZES } from '@/lib/medya/boyutlar'

/**
 * İlan kartı — listelerin ve tema sıralarının birimi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Hiyerarşi, yatırımcının okuma sırasına göre kuruldu:
 *
 *   1. Fiyat            — 18px, hizalı rakam
 *   2. m² fiyatı        — 11px. ⚠️ Rakiplerde YOK ve yatırımcının ilk
 *                          yaptığı hesap tam olarak bu. Kartta olması,
 *                          15 ilanı tararken kafadan bölme yapmayı bitirir.
 *   3. Başlık           — cümle düzeninde, iki satır
 *   4. Mahalle          — konum bağlamı
 *   5. Nitelik etiketleri
 *   6. Kapanış: kira çarpanı
 *
 * ⚠️ EN ÖNEMLİ RAKAM KAPANIŞ SATIRINDA: kira çarpanı. Türkiye'de hiçbir
 * emlak sitesi bunu liste kartında göstermiyor. Yatırımcı 15 ilanı
 * tararken hangisinin bakılmaya değer olduğunu bir bakışta anlamalı.
 *
 * ⚠️ BÜYÜK HARF BAŞLIK YASAK. "SATILIK 4+1 DAİRE !!" değil, "Asansörlü,
 * otoparklı ara kat daire". Büyük harf bağırmaktır ve okuma hızını
 * düşürür; ünlem ise güven değil aciliyet satar.
 * ─────────────────────────────────────────────────────────────────────────
 */

export function IlanKarti({
  ilan,
  oncelikli = false,
  sinifAdi,
}: {
  ilan: Ilanlar
  oncelikli?: boolean
  sinifAdi?: string
}) {
  const kapak = kapakGorseli(ilan)
  const mahalleAdi = typeof ilan.mahalle === 'object' ? ilan.mahalle?.ad : null
  const fiyat = paraKisaYaz(ilan.fiyat, ilan.paraBirimi ?? 'TRY')
  const carpan = carpanYaz(ilan.kiraCarpani)
  const m2Fiyati = birimFiyat(ilan)
  const fotografSayisi = ilan.gorseller?.length ?? 0
  const turVar = typeof ilan.sanalTurUrl === 'string' && ilan.sanalTurUrl.trim() !== ''

  const nitelikler = [
    ilan.odaSayisi ? (etiketBul(ODA_SAYILARI, ilan.odaSayisi) ?? ilan.odaSayisi) : null,
    m2Yaz(ilan.brutM2),
    katYaz(ilan.bulunduguKat),
  ].filter((parca): parca is string => typeof parca === 'string' && parca !== '')

  return (
    <article
      className={sinif(
        'group bg-yuzey rounded-kart relative flex h-full flex-col overflow-hidden border-[0.5px] border-kenar',
        'transition-shadow duration-[200ms] ease-[cubic-bezier(0.2,0,0,1)] hover:shadow-kart focus-within:shadow-kart',
        sinifAdi,
      )}
    >
      {/* ── Görsel ── */}
      <div className="bg-yuzey-2 relative aspect-[4/3] overflow-hidden">
        {kapak?.url ? (
          <Image
            src={kapak.url}
            alt={kapak.alt ?? ilan.baslik}
            fill
            // Yatay sırada kart sabit genişlikte; ızgarada esner.
            // Değer `boyutlar.ts`ten geliyor — bütçe rozeti de aynı dizeden
            // türetiliyor, ikisi ayrışamaz.
            sizes={KART_SIZES}
            className="object-cover"
            priority={oncelikli}
            {...bulanikOzellikleri(kapak)}
          />
        ) : (
          <div className="text-metin-3 flex h-full flex-col items-center justify-center gap-1.5">
            <VeriBekleniyorIkon width={24} height={24} />
            <span className="text-minik">Fotoğraf yakında</span>
          </div>
        )}

        {/* ⚠️ Doğrulanmış rozeti yasal bir beyandır; taşınmaz numarası
            yoksa hiç gösterilmez (CLAUDE.md kural 1). */}
        {ilan.tasinmazNo ? (
          <span
            className="bg-yuzey/94 text-aksan-metin absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-rozet px-2 py-1"
            title={`Doğrulanmış İlan — Taşınmaz no: ${ilan.tasinmazNo}`}
          >
            <DogrulanmisIkon width={13} height={13} />
            <span className="text-minik font-medium">Doğrulanmış</span>
            <span className="yalnizca-okuyucu">ilan, taşınmaz numarası {ilan.tasinmazNo}</span>
          </span>
        ) : null}

        {ilan.durum === 'rezerve' ? (
          <span className="absolute top-2 right-2">
            <Rozet ton="uyari">Rezerve</Rozet>
          </span>
        ) : null}

        {/* Medya sayacı — sağ altta, tıklamadan önce ne kadar içerik
            olduğunu söyler. */}
        {turVar || fotografSayisi > 0 ? (
          <span className="bg-yuzey/94 text-metin-2 text-minik absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-rozet px-1.5 py-1">
            {turVar ? (
              <>
                <TurIkon width={12} height={12} />
                360° tur
              </>
            ) : (
              <>
                <FotografIkon width={12} height={12} />
                <span className="rakam">{fotografSayisi}</span> fotoğraf
              </>
            )}
          </span>
        ) : null}
      </div>

      {/* ── Gövde ── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="rakam text-kart-fiyat leading-none font-medium">
          {fiyat ?? <span className="text-metin-3 text-govde-kucuk">Fiyat görüşülür</span>}
          {ilan.tip === 'kiralik' && fiyat ? (
            <span className="text-metin-3 text-mikro font-normal"> / ay</span>
          ) : null}
        </p>

        {/* ⚠️ Yatırımcının ilk hesabı. Fiyat ve m² varsa daima gösterilir. */}
        <p className="text-metin-3 text-mikro">{m2Fiyati ?? 'm² fiyatı için brüt m² gerekiyor'}</p>

        {/* Başlık cümle düzeninde, iki satırda kırpılır. */}
        <h3 className="text-govde leading-snug font-normal">
          {/* Tüm kart tıklanabilir olsun ama DOM'da tek bağlantı kalsın. */}
          <Link
            href={`/portfoy/${ilan.slug}`}
            data-gozlem="ilan_karti_tikla"
            className="line-clamp-2 after:absolute after:inset-0"
          >
            {ilan.baslik}
          </Link>
        </h3>

        <p className="text-metin-2 text-govde-kucuk">
          {mahalleAdi ? `${mahalleAdi} · ${ilan.ilce}` : ilan.ilce}
        </p>

        {nitelikler.length > 0 ? (
          <p className="text-metin-3 text-mikro">{nitelikler.join(' · ')}</p>
        ) : null}

        {/* ── Kapanış satırı — kartın en önemli rakamı ──
            ⚠️ Ayraç GOLD ve bu şartnamenin gold'a ayırdığı üç yerden biri
            (§6). Çizgi dekoratif: satırın kendisi zaten "Kira çarpanı"
            yazıyor, renk tek taşıyıcı değil. */}
        <p className="border-gold-cizgi text-govde-kucuk mt-auto border-t pt-2.5">
          {carpan ? (
            <>
              <span className="text-metin-2">Kira çarpanı </span>
              <span className="rakam text-metin font-medium">{carpan} yıl</span>
            </>
          ) : (
            <span className="text-metin-3">Kira çarpanı için tahmini kira gerekiyor</span>
          )}
        </p>
      </div>
    </article>
  )
}

function kapakGorseli(ilan: Ilanlar): Medya | null {
  const ilk = ilan.gorseller?.[0]?.gorsel
  return typeof ilk === 'object' && ilk !== null ? ilk : null
}

/**
 * m² başına fiyat.
 *
 * ⚠️ Kiralık ilanda hesaplanmaz: aylık kirayı m²'ye bölmek, satış m²
 * fiyatıyla aynı satırda göründüğünde yanıltıcı bir karşılaştırma üretir.
 */
function birimFiyat(ilan: Ilanlar): string | null {
  if (ilan.tip !== 'satilik') return null
  if (typeof ilan.fiyat !== 'number' || typeof ilan.brutM2 !== 'number') return null
  if (ilan.brutM2 <= 0 || ilan.fiyat <= 0) return null

  const birim = paraYaz(Math.round(ilan.fiyat / ilan.brutM2), ilan.paraBirimi ?? 'TRY')
  return birim === null ? null : `${birim} / m²`
}

function katYaz(kat: unknown): string | null {
  if (typeof kat !== 'number' || !Number.isFinite(kat)) return null
  if (kat === 0) return 'Zemin kat'
  if (kat < 0) return `${Math.abs(kat)}. bodrum`
  return `${kat}. kat`
}

/** Yükleme iskeleti — kart ile aynı yüksekliği kaplar, düzen zıplamaz. */
export function IlanKartiIskeleti() {
  return (
    <div className="bg-yuzey rounded-kart overflow-hidden border-[0.5px] border-kenar" aria-hidden>
      <div className="iskelet aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <div className="iskelet h-5 w-24" />
        <div className="iskelet h-3 w-20" />
        <div className="iskelet h-3.5 w-full" />
        <div className="iskelet h-3 w-2/3" />
        <div className="iskelet mt-1 h-3 w-1/2" />
      </div>
    </div>
  )
}
