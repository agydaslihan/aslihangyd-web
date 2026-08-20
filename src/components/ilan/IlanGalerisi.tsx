import { VeriBekleniyorIkon } from '@/components/ui/Ikon'
import type { Ilanlar, Medya } from '@/payload-types'
import { bulanikOzellikleri } from '@/lib/medya/bulanik'

import { GaleriIzgarasi } from './GaleriIzgarasi'

/**
 * İlan görselleri.
 *
 * Bilinçli olarak **karusel değil.** Karusel mobilde kaydırma çakışması
 * yaratır, ilk görsel dışındakiler nadiren görülür ve JavaScript gerektirir.
 * Bunun yerine: büyük kapak + yan ızgara, hepsi doğrudan görünür.
 *
 * İlk görsel `priority` ile yüklenir — sayfanın LCP öğesi odur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİLEŞEN SUNUCUDA KALIYOR, BÜYÜTME İSTEMCİYE İNİYOR.
 *
 * Payload kayıtları (`Medya`) istemciye gönderilecek veriden çok daha
 * büyük: her görselin tüm boyut varyantları, tarihleri, bütçe ölçümleri.
 * Burada yalnızca üç alan seçilip geçiliyor — RSC yükü buna göre küçülüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function IlanGalerisi({ ilan }: { ilan: Ilanlar }) {
  const gorseller = (ilan.gorseller ?? [])
    .map((satir) => satir.gorsel)
    .filter((gorsel): gorsel is Medya => typeof gorsel === 'object' && gorsel !== null)

  if (gorseller.length === 0) {
    return (
      <div className="bg-yuzey-2 border-kenar rounded-kart text-metin-3 flex aspect-16/9 flex-col items-center justify-center gap-3 border-[0.5px] border-dashed sm:aspect-21/9">
        <VeriBekleniyorIkon width={36} height={36} />
        <p className="text-govde-kucuk">Bu taşınmazın fotoğrafları henüz yüklenmedi.</p>
      </div>
    )
  }

  return (
    <GaleriIzgarasi
      baslik={ilan.baslik}
      gorseller={gorseller
        .filter((gorsel) => typeof gorsel.url === 'string' && gorsel.url !== '')
        .map((gorsel) => ({
          url: gorsel.url as string,
          alt: gorsel.alt ?? '',
          // ⚠️ Bulanık yer tutucu tek kaynaktan: `bulanikOzellikleri`.
          bulanik: bulanikOzellikleri(gorsel).blurDataURL,
        }))}
    />
  )
}
