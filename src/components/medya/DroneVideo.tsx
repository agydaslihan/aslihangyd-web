import { DroneVideoOynatici } from '@/components/medya/DroneVideoOynatici'
import { bunnyAyarlari, bunnyGommeAdresi, bunnyKapakAdresi } from '@/lib/medya/bunny'
import { videoKaynaginiCoz, type VideoKaynagi } from '@/lib/medya/video'

/**
 * Drone videosu — Bunny Stream veya YouTube.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR SERVER COMPONENT VE BİLİNÇLİ.
 *
 * Bunny kimlikleri (`BUNNY_STREAM_LIBRARY_ID`, `BUNNY_STREAM_CDN_HOSTNAME`)
 * çalışma zamanında, sunucuda okunuyor. Önceden `NEXT_PUBLIC_` önekliydiler
 * ve doğrudan istemci bileşeninde okunuyorlardı; Next.js bu önekli
 * değişkenleri derleme anında gömdüğü ve üretim imajı onlar tanımlı değilken
 * derlendiği için değerler yayında BOŞTU — her drone videosu boş durumda
 * kalıyordu. Gerekçenin tamamı `lib/harita/sunucu.ts` içinde.
 *
 * Adresler burada kuruluyor, oynatıcıya prop olarak iniyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ÇÖZÜLEMEYEN VİDEODA SİTEDE HİÇBİR ŞEY GÖSTERİLMİYOR.
 *
 * Eskiden "Video oynatıcı henüz yapılandırılmadı." yazan gri bir kutu
 * çiziliyordu. 17 Ağustos 2026'da Google Drive linki verildiğinde tam olarak
 * bu kutu göründü ve mesaj hem genel hem YANLIŞTI: yapılandırma değil
 * kaynak sorunluydu.
 *
 * Doğru cevap mesajı iyileştirmek değil, YERİNİ değiştirmekti. Ziyaretçi
 * Bunny'yi yapılandıramaz, YouTube linki de veremez; ona söylenecek bir şey
 * yok. Bölüm hiç çizilmiyor. Teşhis panelde, hatayı yapan ve düzeltebilecek
 * kişinin gördüğü yerde: kaydetme doğrulaması + "Video durumu" göstergesi
 * (`lib/medya/videoAlanlari.ts`, `components/medya/VideoDurumu.tsx`).
 */
export function DroneVideo({
  kaynak,
  bunnyId,
  youtube,
  kapakUrl,
  baslik,
}: {
  kaynak?: VideoKaynagi | null
  bunnyId?: string | null
  youtube?: string | null
  /** Kullanıcının yüklediği kapak — varsa servisin kapağına düşülmez. */
  kapakUrl?: string | null
  baslik: string
}) {
  const sonuc = videoKaynaginiCoz({
    kaynak,
    bunnyId,
    youtube,
    kapakUrl,
    bunnyHazir: bunnyAyarlari() !== null,
    bunnyGomme: typeof bunnyId === 'string' ? bunnyGommeAdresi(bunnyId, true) : null,
    bunnyKapak: typeof bunnyId === 'string' ? bunnyKapakAdresi(bunnyId) : null,
    otomatikOynat: true,
  })

  if (sonuc.durum !== 'hazir') return null

  return (
    <DroneVideoOynatici
      gomme={sonuc.gomme}
      kapak={sonuc.kapak}
      baslik={baslik}
      saglayici={sonuc.saglayici}
    />
  )
}

/**
 * Videonun gösterilebilir olup olmadığı — sayfaların bölüm başlığını
 * çizip çizmemek için.
 *
 * ⚠️ Ayrı bir yardımcı olarak duruyor çünkü sayfa, videoyu saran başlığı ve
 * çerçeveyi de çiziyor. `DroneVideo` null dönse bile başlık kalırdı: "Drone
 * videosu" yazan ve altında hiçbir şey olmayan bir bölüm, gri kutudan daha
 * kötü görünür.
 */
export function videoGosterilebilirMi(girdi: {
  kaynak?: VideoKaynagi | null
  bunnyId?: string | null
  youtube?: string | null
}): boolean {
  return (
    videoKaynaginiCoz({
      ...girdi,
      bunnyHazir: bunnyAyarlari() !== null,
      bunnyGomme: typeof girdi.bunnyId === 'string' ? bunnyGommeAdresi(girdi.bunnyId, true) : null,
    }).durum === 'hazir'
  )
}
