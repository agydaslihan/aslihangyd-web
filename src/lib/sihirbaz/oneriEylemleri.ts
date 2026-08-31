'use server'

import { headers } from 'next/headers'

import config from '@payload-config'
import { getPayload, type Where } from 'payload'

import { ASGARI_BENZER, type Oneri } from './oneriTipleri'

/**
 * Benzer ilanlardan otomatik doldurma önerisi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÖNERİ, DOLDURMA DEĞİL. Hiçbir alan kendiliğinden dolmuyor; ekranda
 * "aynı mahalledeki 3+1 dairelerde ısıtma genelde doğalgaz (kombi)" gibi
 * bir satır çıkıyor ve tıklanınca uygulanıyor.
 *
 * Otomatik doldurma cazipti ve yanlış olurdu: sessizce dolan bir alan,
 * kontrol edilmeden kaydedilen bir alandır. Bu bir ilan sitesi; "asansör
 * var" yazan ama asansörü olmayan bir ilan, hukuki risk.
 *
 * ⚠️ ÖNERİ YALNIZCA SEÇİM ALANLARINDAN. Fiyat, m² ve oda sayısı
 * önerilmiyor: bunlar taşınmazın kendi olguları ve komşu ilandan
 * kopyalanacak şeyler değil (CLAUDE.md kural 2).
 * ─────────────────────────────────────────────────────────────────────────
 */

export async function benzerIlanOnerileri(girdi: {
  mahalleId: string
  kategori?: string
  odaSayisi?: string
}): Promise<Oneri[]> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return []

  const mahalleId = Number(girdi.mahalleId)
  if (!Number.isInteger(mahalleId) || mahalleId <= 0) return []

  const kosullar: Where[] = [{ mahalle: { equals: mahalleId } }]
  if (girdi.kategori) kosullar.push({ kategori: { equals: girdi.kategori } })
  if (girdi.odaSayisi) kosullar.push({ odaSayisi: { equals: girdi.odaSayisi } })

  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: { and: kosullar },
    limit: 50,
    depth: 0,
    sort: '-createdAt',
    user,
    overrideAccess: false,
  })

  const kayitlar = sonuc.docs
  if (kayitlar.length < ASGARI_BENZER) return []

  const oneriler: Oneri[] = []

  for (const alan of ['isinma', 'kullanimDurumu', 'tapuDurumu'] as const) {
    const sayaclar = new Map<string, number>()
    for (const kayit of kayitlar) {
      const deger = (kayit as unknown as Record<string, unknown>)[alan]
      if (typeof deger !== 'string' || deger === '') continue
      sayaclar.set(deger, (sayaclar.get(deger) ?? 0) + 1)
    }

    const toplam = [...sayaclar.values()].reduce((a, b) => a + b, 0)
    if (toplam < ASGARI_BENZER) continue

    /**
     * ⚠️ Sıralama KARARLI: eşit sayıda görülen iki değer arasında
     * alfabetik sıra karar veriyor. Kararsız sıralama, aynı veriyle iki
     * kez açılan ekranda iki farklı öneri gösterirdi.
     */
    const [enSik] = [...sayaclar.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    if (!enSik) continue

    // Yarıdan azında görülen bir değer "genelde" sayılmaz.
    if (enSik[1] * 2 <= toplam) continue

    oneriler.push({
      alan,
      deger: enSik[0],
      etiket: enSik[0],
      adet: enSik[1],
      toplam,
    })
  }

  return oneriler
}
