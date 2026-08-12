'use server'

import { headers } from 'next/headers'

import { hizSinirindaMi, istemciAnahtari, type HizSiniriAyari } from '@/lib/guvenlik/hizSiniri'
import { mahalleleriGetir } from '@/lib/veri/mahalleler'

import { sorguyuFiltreyeCevir, type AramaSonucu } from './motor'

/**
 * AI doğal dil aramasının sunucu eylemi.
 *
 * ⚠️ Hız sınırı burada **maliyet** koruması: her arama Anthropic'e ücretli
 * bir istek demek. Form gönderimlerinden farklı olarak arama tekrar tekrar
 * denenen bir eylemdir; pencere daha kısa, hak daha bol tutuldu.
 */

/** Dakikada 10 arama: gerçek bir ziyaretçiyi hiç rahatsız etmez, betiği durdurur. */
const ARAMA_SINIRI: HizSiniriAyari = { adet: 10, pencereMs: 60_000 }

export async function akilliAramaCoz(sorgu: unknown): Promise<AramaSonucu> {
  const basliklar = await headers()
  const sinirAnahtari = istemciAnahtari(basliklar, 'ai-arama')

  if (sinirAnahtari === null) {
    // Aynı gerekçe `danisman-ol/eylemler.ts` içinde ayrıntılı: IP başlığı
    // yoksa herkesi tek kovaya koymak aramayı herkese kapatırdı.
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[guvenlik] İstemci IP başlığı yok — AI arama hız sınırı uygulanamadı. ' +
          'Caddy trusted_proxies / header_up yapılandırmasını kontrol edin.',
      )
    }
  } else {
    const sinir = hizSinirindaMi(sinirAnahtari, ARAMA_SINIRI)
    if (!sinir.gecebilir) {
      return {
        durum: 'hata',
        mesaj: `Çok fazla arama yaptınız. ${sinir.yenidenDeneSaniye} saniye sonra tekrar deneyin.`,
      }
    }
  }

  // Mahalle listesi istemciden DEĞİL sunucudan gelir: modelin eşleştirme
  // yapabileceği geçerli slug kümesini istemcinin belirlemesi, uydurma bir
  // mahallenin doğrulamayı geçmesine kapı açardı.
  const mahalleler = await mahalleleriGetir()

  return sorguyuFiltreyeCevir(
    sorgu,
    mahalleler
      .filter((m): m is typeof m & { slug: string } => typeof m.slug === 'string')
      .map((m) => ({ slug: m.slug, ad: m.ad })),
  )
}
