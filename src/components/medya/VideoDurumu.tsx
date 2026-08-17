'use client'

import { useFormFields } from '@payloadcms/ui'

import { gecerliBunnyBicimiMi, videoDurumMesaji, videoKaynaginiCoz } from '@/lib/medya/video'

/**
 * Panelde video durumu göstergesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEŞHİS SİTEDE DEĞİL PANELDE — VE BU BİLİNÇLİ BİR TERCİH.
 *
 * "Bunny Stream yapılandırılmamış" cümlesi ziyaretçiye hiçbir şey
 * söylemiyor: ziyaretçi Bunny'yi yapılandıramaz, YouTube linki de veremez.
 * Aynı cümleyi kamuya açık sayfada göstermek hem iç jargon sızdırmak hem de
 * mesajı yanlış kişiye vermek olurdu.
 *
 * Sitede kırık bir çerçeve ya da açıklama YOK: video çözülemiyorsa bölüm
 * hiç çizilmiyor. Teşhis, hatayı düzeltebilecek kişinin çalıştığı yerde.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Bu bileşen ortam değişkenine BAKMIYOR — istemcide okunamaz ve okunmaya
 * çalışılması `NEXT_PUBLIC_` tuzağının tekrarı olurdu. Bunny'nin gerçekten
 * yapılandırılıp yapılandırılmadığı sayfa çiziminde belli oluyor; burada
 * yalnızca GİRDİNİN biçimi denetleniyor, ki hataların tamamı orada.
 */
export function VideoDurumu() {
  const alanlar = useFormFields(([alanlar]) => alanlar)

  const oku = (ad: string): string => {
    const deger = alanlar?.[ad]?.value
    return typeof deger === 'string' ? deger : ''
  }

  const kaynak = oku('videoKaynagi')
  if (kaynak === '' || kaynak === 'yok') return null

  /**
   * ⚠️ METİNLER BURADA YAZILMIYOR — `videoDurumMesaji()` tek kaynak.
   *
   * İlk hâlde aynı cümleler hem burada hem `video.ts` içinde duruyordu.
   * İki kopya, ilk düzeltmede ayrışır: panelde bir şey yazarken kaydetme
   * doğrulaması başka bir şey söylerdi ve hangisinin doğru olduğu
   * anlaşılmazdı.
   *
   * ⚠️ `bunnyHazir: true` veriliyor çünkü İSTEMCİDE bilinemez — sunucu
   * ortam değişkenleri burada okunamaz (ve okunmaya çalışılması
   * `NEXT_PUBLIC_` tuzağının tekrarı olurdu). Bu yüzden Bunny seçiliyken
   * biçim doğru olsa bile "yapılandırılmamış olabilir" uyarısı ayrıca
   * ekleniyor: eksik bilgiyi gizlemek yerine söylüyoruz.
   */
  const sonuc = videoKaynaginiCoz({
    kaynak: kaynak === 'youtube' || kaynak === 'bunny' ? kaynak : 'yok',
    bunnyId: oku('droneVideoId'),
    youtube: oku('droneVideoYoutube'),
    bunnyHazir: true,
    bunnyGomme: 'yer-tutucu',
  })

  const bunnyBiciminiGecti =
    kaynak === 'bunny' && gecerliBunnyBicimiMi(oku('droneVideoId')) && sonuc.durum === 'hazir'

  const ton: 'iyi' | 'uyari' | 'hata' =
    sonuc.durum === 'desteklenmeyen_kaynak' ||
    sonuc.durum === 'gecersiz_youtube' ||
    sonuc.durum === 'gecersiz_bunny'
      ? 'hata'
      : sonuc.durum === 'yok' || bunnyBiciminiGecti
        ? 'uyari'
        : 'iyi'

  const metin = bunnyBiciminiGecti
    ? 'Kimlik biçimi doğru. ⚠️ Bunny Stream sunucu tarafında yapılandırılmamışsa video ' +
      'yine görünmez — hesap henüz bağlanmadıysa kaynağı YouTube yapın.'
    : videoDurumMesaji(sonuc)

  const durum = { ton, metin }

  const renk =
    durum.ton === 'iyi'
      ? 'var(--theme-success-500)'
      : durum.ton === 'hata'
        ? 'var(--theme-error-500)'
        : 'var(--theme-warning-500)'

  return (
    <div
      style={{
        borderLeft: `3px solid ${renk}`,
        padding: '.6rem .85rem',
        background: 'var(--theme-elevation-50)',
        borderRadius: '.25rem',
        fontSize: '.8125rem',
        lineHeight: 1.55,
      }}
    >
      {durum.metin}
    </div>
  )
}
