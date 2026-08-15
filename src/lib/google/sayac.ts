import 'server-only'

import type { Payload } from 'payload'

import { ayAnahtari } from '@/lib/tarih'

/**
 * Google Places çağrı sayacı.
 *
 * ⚠️ Sayaç bir BÜTÇE SINIRI değil, bir GÖSTERGE. Otomatik kapatma bilinçli
 * olarak yok: bir eşikte kendiliğinden kapanan katman, sebebi görünmeden
 * yarım çalışan bir arayüz üretirdi. Kapatma kararı insanın ve Site
 * Bölümleri anahtarıyla tek tıkla veriliyor.
 *
 * ⚠️ Sayım kesin değil, yaklaşık: eşzamanlı iki çağrı aynı değeri okuyup
 * aynı değeri yazabilir ve sayaç bir eksik kalabilir. Maliyet göstergesi
 * için bu kabul edilebilir; kesinlik isteyen yer Google'ın kendi faturası.
 * Kilit koymak, bir gösterge uğruna her çağrıya gecikme eklerdi.
 */

export type CagriTuru = 'arama' | 'detay'

export interface AylikKullanim {
  ay: string
  aramaCagrisi: number
  detayCagrisi: number
  sonCagri: string | null
}

interface HamAy {
  ay?: unknown
  aramaCagrisi?: unknown
  detayCagrisi?: unknown
  sonCagri?: unknown
}

function sayi(deger: unknown): number {
  return typeof deger === 'number' && Number.isFinite(deger) ? deger : 0
}

function aylariCoz(ham: unknown): AylikKullanim[] {
  if (!Array.isArray(ham)) return []

  return ham
    .map((hamAy) => {
      const kayit = (hamAy ?? {}) as HamAy
      if (typeof kayit.ay !== 'string' || kayit.ay === '') return null
      return {
        ay: kayit.ay,
        aramaCagrisi: sayi(kayit.aramaCagrisi),
        detayCagrisi: sayi(kayit.detayCagrisi),
        sonCagri: typeof kayit.sonCagri === 'string' ? kayit.sonCagri : null,
      }
    })
    .filter((kayit): kayit is AylikKullanim => kayit !== null)
}

/** Aylık kullanım — en yeni ay başta. */
export async function kullanimiGetir(payload: Payload): Promise<AylikKullanim[]> {
  try {
    const kayit = (await payload.findGlobal({
      slug: 'google-places-kullanimi',
      overrideAccess: true,
      depth: 0,
    })) as unknown as { aylar?: unknown }

    return aylariCoz(kayit.aylar).sort((a, b) => b.ay.localeCompare(a.ay))
  } catch {
    // Sayaç okunamıyorsa özellik yine çalışmalı; maliyet göstergesi
    // eksik kalır, hizmet kesilmez.
    return []
  }
}

/**
 * Bir çağrıyı sayaca işler.
 *
 * ⚠️ `overrideAccess: true` — global salt okunur (`kimseDegistiremez`) ve
 * öyle kalmalı: sayacı elle düzenlenebilir yapmak onu bir maliyet ölçüsü
 * olmaktan çıkarır. Yazma yalnızca buradan, gerçek bir API çağrısının
 * ardından yapılıyor.
 *
 * ⚠️ Hata YUTULUYOR. Sayaç yazılamadı diye kullanıcının gördüğü bilgi
 * kaybolmamalı — çağrı zaten yapıldı ve parası zaten ödendi.
 */
export async function cagriyiSay(payload: Payload, tur: CagriTuru): Promise<void> {
  try {
    const mevcut = await kullanimiGetir(payload)
    const ay = ayAnahtari()
    const simdi = new Date().toISOString()

    const bulundu = mevcut.find((kayit) => kayit.ay === ay)

    const guncel: AylikKullanim = bulundu
      ? { ...bulundu, sonCagri: simdi }
      : { ay, aramaCagrisi: 0, detayCagrisi: 0, sonCagri: simdi }

    if (tur === 'arama') guncel.aramaCagrisi += 1
    else guncel.detayCagrisi += 1

    const aylar = [guncel, ...mevcut.filter((kayit) => kayit.ay !== ay)].sort((a, b) =>
      b.ay.localeCompare(a.ay),
    )

    await payload.updateGlobal({
      slug: 'google-places-kullanimi',
      data: { aylar },
      overrideAccess: true,
      depth: 0,
    })
  } catch {
    // Yukarıdaki gerekçe.
  }
}
