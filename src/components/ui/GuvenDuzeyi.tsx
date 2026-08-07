import { YATIRIM_FERAGATI } from '@/components/ui/Feragat'
import { sinif } from '@/lib/sinif'

/**
 * Güven düzeyi göstergesi.
 *
 * ⚠️ Düşük güven GİZLENMEZ. Bir değerleme az gözleme dayanıyorsa iki şey
 * birden olur: aralık genişler ve bu gösterge "düşük" der. Alternatif —
 * dar bir aralığı kendinden eminmiş gibi göstermek — sitenin tek gerçek
 * sermayesini, güvenilirliğini harcar.
 *
 * Renk tek başına bilgi taşımaz (WCAG 1.4.1): kademe hem dolu kutucuk
 * sayısıyla hem de metinle anlatılır.
 */

export type GuvenKademesi = 'dusuk' | 'orta' | 'yuksek'

const KADEMELER: Record<GuvenKademesi, { dolu: number; etiket: string; renk: string }> = {
  dusuk: { dolu: 1, etiket: 'Düşük güven', renk: 'bg-uyari' },
  orta: { dolu: 2, etiket: 'Orta güven', renk: 'bg-gosterge' },
  yuksek: { dolu: 3, etiket: 'Yüksek güven', renk: 'bg-basari' },
}

const ACIKLAMALAR: Record<GuvenKademesi, string> = {
  dusuk:
    'Az sayıda gözleme dayanıyor. Aralık bilinçli olarak geniş tutuldu; ' +
    'tek başına karar dayanağı olarak kullanmayın.',
  orta: 'Gözlem sayısı makul. Aralık, yerinde görülmemiş bir tahminin doğal payını içerir.',
  yuksek: 'Katmanda yeterli gözlem var. Aralık daraltıldı.',
}

export function GuvenDuzeyi({
  kademe,
  gozlemSayisi,
  /** Bağlama özel ek ibare (örn. SPK raporu yerine geçmez). */
  ek,
  sinifAdi,
}: {
  kademe: GuvenKademesi
  gozlemSayisi: number | null
  ek?: string
  sinifAdi?: string
}) {
  const { dolu, etiket, renk } = KADEMELER[kademe]

  return (
    <div className={sinif('flex flex-col gap-2', sinifAdi)}>
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center gap-1"
          role="img"
          aria-label={`${etiket} — üç kademeden ${dolu}.`}
        >
          {[1, 2, 3].map((basamak) => (
            <span
              key={basamak}
              className={sinif('h-1.5 w-6 rounded-rozet', basamak <= dolu ? renk : 'bg-kenar')}
            />
          ))}
        </span>
        <span className="text-govde-kucuk font-medium">{etiket}</span>
      </div>

      <p className="text-metin-2 text-yardimci olcu leading-normal">{ACIKLAMALAR[kademe]}</p>

      <p className="text-metin-3 text-mikro">
        {gozlemSayisi === null ? (
          'Gözlem sayısı bilinmiyor.'
        ) : (
          <>
            <span className="rakam">{gozlemSayisi}</span> gözleme dayanıyor.
          </>
        )}{' '}
        {YATIRIM_FERAGATI}
        {ek ? ` ${ek}` : null}
      </p>
    </div>
  )
}
