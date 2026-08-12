import { DroneVideoOynatici } from '@/components/medya/DroneVideoOynatici'
import { bunnyGommeAdresi, bunnyKapakAdresi } from '@/lib/medya/bunny'

/**
 * Drone videosu — Bunny Stream üzerinden.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR SERVER COMPONENT VE BİLİNÇLİ.
 *
 * Bunny kimlikleri (`BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_CDN_HOSTNAME`)
 * çalışma zamanında, sunucuda okunuyor. Önceden `NEXT_PUBLIC_` önekliydiler
 * ve doğrudan istemci bileşeninde okunuyorlardı; Next.js bu önekli
 * değişkenleri derleme anında gömdüğü ve üretim imajı onlar tanımlı değilken
 * derlendiği için değerler yayında BOŞTU — her drone videosu "oynatıcı
 * yapılandırılmadı" boş durumunda kalıyordu. Gerekçenin tamamı
 * `lib/harita/sunucu.ts` içinde (aynı hata dokuz değişkeni birden vurdu).
 *
 * Adresler burada kuruluyor, oynatıcıya prop olarak iniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function DroneVideo({ videoId, baslik }: { videoId: string; baslik: string }) {
  const gomme = bunnyGommeAdresi(videoId, true)
  const kapak = bunnyKapakAdresi(videoId)

  /**
   * ⚠️ Yapılandırma eksikse kırık oynatıcı gösterilmez.
   *
   * Kimlikler girilmemişse ya da video kimliği geçersizse adres kurulamaz.
   * Boş bir iframe göstermek ziyaretçiye "video var ama bozuk" dedirtirdi;
   * oysa durum "CDN henüz bağlanmadı".
   */
  if (gomme === null) {
    return (
      <div className="cerceve bg-yuzey-2 text-metin-3 flex aspect-video items-center justify-center px-6 text-center text-mikro">
        Video oynatıcı henüz yapılandırılmadı.
      </div>
    )
  }

  return <DroneVideoOynatici gomme={gomme} kapak={kapak} baslik={baslik} />
}
