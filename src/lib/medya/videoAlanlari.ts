import type { Field } from 'payload'

import { DESTEKLENEN_KAYNAKLAR, desteklenmeyenSaglayici, youtubeKimligiCoz } from './video'

/**
 * Video kaynağı alanları — Mahalleler ve İlanlar'da ortak.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ İKİ KOLEKSİYONDA ELLE TEKRARLANMIYOR.
 *
 * Aynı üç alan iki yerde ayrı yazılsaydı yardım metni, doğrulama kuralı ve
 * seçenek listesi er geç ayrışırdı — ve ayrışan taraf, sorunu ilk yaşayan
 * kişinin baktığı taraf olmazdı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HATA KAYDETME ANINDA VERİLİYOR, SAYFADA DEĞİL.
 *
 * 17 Ağustos 2026'da Google Drive linki verildi ve site "Video oynatıcı
 * henüz yapılandırılmadı" dedi — mesaj hem genel hem YANLIŞTI. Doğru yer
 * burası: yanlış adres kaydedilemiyor ve sebebi, hatayı yapan kişinin
 * gördüğü anda söyleniyor.
 */

/** Kaynak seçimi + Bunny kimliği + YouTube adresi + kapak. */
export function videoAlanlari(baglam: 'mahalle' | 'ilan'): Field[] {
  const bosDurum =
    baglam === 'mahalle'
      ? 'Boşsa hero bölümü görsele düşer.'
      : 'Boşsa video bölümü hiç gösterilmez.'

  return [
    {
      name: 'videoKaynagi',
      type: 'select',
      label: 'Video kaynağı',
      defaultValue: 'yok',
      options: [
        { value: 'yok', label: 'Video yok' },
        { value: 'youtube', label: 'YouTube (şimdilik önerilen)' },
        { value: 'bunny', label: 'Bunny Stream (hesap geldiğinde)' },
      ],
      admin: {
        description:
          `Hangi servisten yayınlanacak. ${bosDurum} ` +
          'Bunny Stream hesabı gelene kadar YouTube kullanın; kayıt başına ' +
          'ayrı ayrı değiştirilebilir, toplu geçiş gerekmez.',
      },
    },

    {
      name: 'droneVideoYoutube',
      type: 'text',
      label: 'YouTube video adresi',
      admin: {
        condition: (_veri, kardes) => kardes?.videoKaynagi === 'youtube',
        description:
          'Adresi olduğu gibi yapıştırın — youtube.com/watch?v=…, youtu.be/… ve ' +
          '/embed/… biçimleri kabul edilir. Liste dışı (unlisted) videolar da çalışır. ' +
          DESTEKLENEN_KAYNAKLAR,
      },
      /**
       * ⚠️ ASIL KAPI BURASI.
       *
       * Desteklenmeyen bir adres kaydedilemiyor ve sebebi o anda okunuyor.
       * Yalnızca sayfada mesaj göstermek, hatayı yapıldığı yerden saatler
       * sonra ve yanlış kişiye söylemek olurdu.
       */
      validate: (deger: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        if (siblingData?.videoKaynagi !== 'youtube') return true
        if (typeof deger !== 'string' || deger.trim() === '') {
          return 'YouTube seçtiniz ama adres boş. Adresi yapıştırın ya da kaynağı "Video yok" yapın.'
        }

        const desteklenmeyen = desteklenmeyenSaglayici(deger)
        if (desteklenmeyen !== null) {
          return (
            `${desteklenmeyen.ad} linkleri video oynatıcıda çalışmaz — ${desteklenmeyen.neden}. ` +
            "Videoyu YouTube'a yükleyip linkini verin veya Bunny Stream kullanın."
          )
        }

        if (youtubeKimligiCoz(deger) === null) {
          return (
            'Video adresi okunamadı. Beklenen biçimler: ' +
            'youtube.com/watch?v=XXXXXXXXXXX, youtu.be/XXXXXXXXXXX veya ' +
            'youtube.com/embed/XXXXXXXXXXX'
          )
        }

        return true
      },
    },

    {
      name: 'droneVideoId',
      type: 'text',
      label: 'Bunny Stream video kimliği',
      admin: {
        condition: (_veri, kardes) => kardes?.videoKaynagi === 'bunny',
        description:
          'Bunny panelindeki video kimliği (8-4-4-4-12 haneli). ' +
          'Bunny hesabı henüz yoksa kaynağı YouTube yapın.',
      },
      validate: (deger: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) => {
        if (siblingData?.videoKaynagi !== 'bunny') return true
        if (typeof deger !== 'string' || deger.trim() === '') {
          return 'Bunny Stream seçtiniz ama kimlik boş.'
        }

        const desteklenmeyen = desteklenmeyenSaglayici(deger)
        if (desteklenmeyen !== null) {
          return (
            `Buraya ${desteklenmeyen.ad} adresi değil Bunny video KİMLİĞİ girilir. ` +
            'YouTube kullanmak istiyorsanız kaynağı "YouTube" yapın.'
          )
        }

        // ⚠️ Tam adres yapıştırma en sık hata; ayrıca söyleniyor.
        if (/^https?:\/\//i.test(deger.trim())) {
          return 'Buraya tam adres değil yalnızca video kimliği girilir.'
        }

        return true
      },
    },

    {
      name: 'droneVideoPosteri',
      type: 'upload',
      relationTo: 'medya',
      label: 'Video kapak görseli',
      admin: {
        condition: (_veri, kardes) => kardes?.videoKaynagi !== 'yok',
        description:
          'Video oynatılmadan önce görünen kare. Boş bırakırsanız servisin kendi kapağı ' +
          'kullanılır — ama kendi kapağınız daha iyi görünür. ⚠️ Sayfanın en büyük ' +
          "görseli budur; LCP'yi belirler.",
      },
    },

    {
      name: 'videoDurumu',
      type: 'ui',
      label: 'Video durumu',
      admin: {
        condition: (_veri, kardes) => kardes?.videoKaynagi !== 'yok',
        components: { Field: '@/components/medya/VideoDurumu#VideoDurumu' },
      },
    },
  ]
}
