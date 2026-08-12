import { KilitIkon } from '@/components/ui/Ikon'
import { YayinlanmayanRozeti } from '@/components/ui/Rozet'
import { carpanYaz } from '@/lib/bicimlendirme'
import { sinif } from '@/lib/sinif'

/**
 * Kilitli portföy kartı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ Görselin yerinde ÇAPRAZ ÇİZGİLİ DOKU var, bulanık fotoğraf değil.
 *
 * İki gerekçe, ikisi de bağlayıcı:
 *
 * 1. Anlam. Bulanıklık "saklıyoruz" der ve ucuz durur — kazınacak bir
 *    kaplama gibi. Doku "bu bilgi henüz size ait değil" der; bu bir
 *    engel değil, bir davet.
 * 2. Güvenlik. Bulanıklaştırılmış görsel yine de indirilir; CSS filtresi
 *    kaldırıldığında fotoğraf ortaya çıkar. Doku hiçbir görsel isteği
 *    yapmaz — gizlenen veri tarayıcıya hiç ulaşmaz.
 *
 * Maskeleme zaten sunucuda yapılır (`src/lib/veri/gizliPortfoy.ts`); bu
 * bileşen yalnızca sunucunun gönderdiği kadarını gösterir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kart, yayınlanan ilanların YANINDA aynı sırada durur. Ayrı bir bölüme
 * sürülseydi merak da ayrı bir bölümde kalırdı; asıl etki, tararken
 * aralarına karışmasından geliyor.
 */
export function KilitliKart({
  mahalleAdi,
  odaSayisi,
  m2Araligi,
  fiyatBandi,
  kiraCarpani,
  /** Erişim talebinin gideceği adres. */
  talepAdresi = '/gizli-portfoy',
  sinifAdi,
}: {
  mahalleAdi: string | null
  odaSayisi?: string | null
  m2Araligi: string | null
  fiyatBandi: string | null
  kiraCarpani: number | null
  talepAdresi?: string
  sinifAdi?: string
}) {
  const nitelikler = [odaSayisi, m2Araligi].filter(
    (parca): parca is string => typeof parca === 'string' && parca !== '',
  )

  return (
    <article
      className={sinif(
        'group bg-yuzey rounded-kart flex h-full flex-col overflow-hidden border-[0.5px] border-kenar',
        'transition-shadow duration-[200ms] ease-[cubic-bezier(0.2,0,0,1)] hover:shadow-kart',
        sinifAdi,
      )}
    >
      {/* Fotoğrafın yeri — dokuyla dolduruldu, görsel isteği yapılmaz. */}
      <div className="doku-kilit relative flex h-[124px] items-center justify-center" aria-hidden>
        <span className="bg-yuzey/85 text-metin-2 rounded-full p-2.5">
          <KilitIkon width={20} height={20} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <YayinlanmayanRozeti sinifAdi="self-start" />

        <p className="rakam text-baslik-3 font-medium">
          {fiyatBandi ?? <span className="text-metin-3 text-govde">Fiyat bandı hazırlanıyor</span>}
        </p>

        <p className="text-metin-2 text-govde-kucuk">
          {mahalleAdi ?? 'Mahalle bilgisi paylaşılmadı'} · Çorlu
        </p>

        {nitelikler.length > 0 ? (
          <p className="text-metin-3 text-mikro">{nitelikler.join(' · ')}</p>
        ) : null}

        {/* Kapanış satırı — kartın çağrısı. Bakır METİN, dolu zemin değil:
            dolu bakır yalnızca gerçek butonun rengi. */}
        <a
          href={talepAdresi}
          className="text-aksan-metin text-govde-kucuk mt-auto inline-flex min-h-11 items-center gap-1.5 font-medium"
        >
          Erişim talep et
          <span aria-hidden>→</span>
        </a>

        {typeof kiraCarpani === 'number' ? (
          <p className="border-kenar text-metin-2 text-mikro border-t-[0.5px] pt-2">
            Kira çarpanı <span className="rakam text-metin">{carpanYaz(kiraCarpani)}</span>
          </p>
        ) : null}
      </div>
    </article>
  )
}
