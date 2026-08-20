import { PostaIkon, TelefonIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { whatsappMesaji } from '@/lib/site'

/**
 * Header'ın üstündeki ince koyu kakao şerit — telefon, e-posta, WhatsApp.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KOYU KAKAO ZEMİN İKİ TEMADA DA AYNI — tema jetonu kullanılmıyor.
 *
 * Şerit kurumsal kimliğin bir parçası ve koyu temada açılması gerekmiyor;
 * zaten koyu. Ama zemin sabitse üzerindeki metin de sabit olmalı:
 * `--color-metin` koyu temada kırık beyaza dönüyor ve açık temada
 * antrasite — ikincisi koyu kakao üzerinde okunmazdı. Aynı tuzağa gold
 * rozetinde düşülmüştü; kontrast testi yakalamıştı.
 *
 * Ölçüm: kırık beyaz (notr-50) notr-900 üzerinde 12,69:1.
 * Çiftler `kontrast.test.ts` içinde sabit renk olarak sınanıyor.
 *
 * ⚠️ Şerit MOBİLDE GİZLİ. 12px'lik bir bilgi çubuğu telefonda hem dokunma
 * hedefi kuralını (44px) karşılayamıyor hem de ekranın üstünden yer
 * çalıyor; aynı bilgiler mobil menüde tam boyutta duruyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function UstSerit({
  telefon,
  eposta,
  whatsapp,
}: {
  telefon: string | null
  eposta: string | null
  whatsapp: string | null
}) {
  const whatsappAdresi = whatsappBaglantisi(whatsapp, whatsappMesaji())

  // Hiçbir iletişim bilgisi yoksa boş bir şerit basmanın anlamı yok.
  if (telefon === null && eposta === null && whatsappAdresi === null) return null

  return (
    <div data-yazdirma="gizle" className="bg-notr-900 hidden lg:block">
      <div className="kapsayici flex h-9 items-center justify-end gap-6">
        {telefon ? (
          <a
            href={`tel:${telefon.replace(/\s/g, '')}`}
            data-gozlem="telefon_tikla"
            className="text-notr-50/85 hover:text-notr-50 inline-flex items-center gap-1.5 text-mikro transition-colors"
          >
            <TelefonIkon width={13} height={13} className="shrink-0" />
            <span className="rakam">{telefon}</span>
          </a>
        ) : null}

        {eposta ? (
          <a
            href={`mailto:${eposta}`}
            className="text-notr-50/85 hover:text-notr-50 inline-flex items-center gap-1.5 text-mikro transition-colors"
          >
            <PostaIkon width={13} height={13} className="shrink-0" />
            {eposta}
          </a>
        ) : null}

        {whatsappAdresi ? (
          <a
            href={whatsappAdresi}
            data-gozlem="whatsapp_tikla"
            target="_blank"
            rel="noopener noreferrer"
            className="text-notr-50/85 hover:text-notr-50 inline-flex items-center gap-1.5 text-mikro transition-colors"
          >
            <WhatsappIkon width={13} height={13} className="shrink-0" />
            WhatsApp
            <span className="yalnizca-okuyucu">(yeni sekmede açılır)</span>
          </a>
        ) : null}
      </div>
    </div>
  )
}
