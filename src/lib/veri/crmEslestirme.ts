import 'server-only'

import type { Payload } from 'payload'

import {
  talebeUygunIlanlar,
  type Eslesme,
  type IlanOzeti,
  type TalepProfili,
} from '@/lib/crm/eslestirme'
import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'

/**
 * CRM eşleştirmesi için sorgu katmanı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YALNIZCA YAYINDAKİ İLANLAR HAVUZA GİRER.
 *
 * Taslak, satılmış ya da yetkisi bitmiş bir ilanı öneri olarak göstermek,
 * Aslıhan'ın müşteriye var olmayan bir şey anlatmasına yol açardı.
 * `HERKESE_ACIK_DURUMLAR` aynı listeyi EİDS kurallarıyla paylaşıyor —
 * yayın tanımı tek yerde.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Havuz üst sınırı. Portföy bu sayıyı aşarsa eşleştirme daraltılmalı. */
const HAVUZ_SINIRI = 500

function kimlik(deger: unknown): number | null {
  if (typeof deger === 'number') return deger
  if (typeof deger === 'object' && deger !== null && 'id' in deger) {
    const id = (deger as { id: unknown }).id
    return typeof id === 'number' ? id : null
  }
  return null
}

function ad(deger: unknown): string | null {
  if (typeof deger === 'object' && deger !== null && 'ad' in deger) {
    const a = (deger as { ad: unknown }).ad
    return typeof a === 'string' ? a : null
  }
  return null
}

/**
 * Talep kaydını eşleştirme profiline çevirir.
 *
 * ⚠️ Kişisel alanlar (ad, telefon, e-posta) BİLİNÇLİ OLARAK alınmıyor.
 * Eşleştirme onlara bakmaz ve bakmamalı: motorun girdisinde olmayan bir
 * veri, motorun çıktısını etkileyemez.
 */
export function talepProfiliCikar(talep: {
  tip?: string | null
  butceMin?: number | null
  butceMax?: number | null
  ilgiliMahalle?: unknown
  ilgiliIlan?: unknown
  mesaj?: string | null
}): TalepProfili {
  return {
    tip: (talep.tip ?? 'genel') as TalepProfili['tip'],
    butceMin: talep.butceMin ?? null,
    butceMax: talep.butceMax ?? null,
    mahalleId: kimlik(talep.ilgiliMahalle),
    ilanId: kimlik(talep.ilgiliIlan),
    mesaj: talep.mesaj ?? null,
  }
}

/**
 * Yayındaki ilanları eşleştirme özetine indirger.
 *
 * `depth: 1` gerekiyor: mahalle adı gerekçe metninde geçiyor ve kimlikle
 * ikinci bir sorgu açmak, tek satırlık bir bilgi için israf olurdu.
 */
async function havuzGetir(payload: Payload): Promise<IlanOzeti[]> {
  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
    select: {
      baslik: true,
      tip: true,
      kategori: true,
      fiyat: true,
      mahalle: true,
      odaSayisi: true,
      brutM2: true,
    },
    depth: 1,
    limit: HAVUZ_SINIRI,
    pagination: false,
  })

  return sonuc.docs.map((ilan) => ({
    id: ilan.id,
    baslik: ilan.baslik,
    tip: ilan.tip,
    kategori: ilan.kategori,
    fiyat: ilan.fiyat ?? null,
    mahalleId: kimlik(ilan.mahalle),
    mahalleAdi: ad(ilan.mahalle),
    odaSayisi: ilan.odaSayisi ?? null,
    brutM2: ilan.brutM2 ?? null,
  }))
}

export interface EslestirmeSonucu {
  eslesmeler: Eslesme[]
  /** Havuza kaç yayındaki ilan girdi — "hiç eşleşme yok" ile "hiç ilan yok" ayrı. */
  havuzBoyutu: number
}

/**
 * Bir talep için en uygun ilanları getirir.
 *
 * ⚠️ Boş sonuç iki farklı şey olabilir ve panelde ayrı gösterilmeli:
 * portföyde hiç yayındaki ilan olmaması (yapılacak iş: ilan gir) ile
 * hiçbirinin uymaması (yapılacak iş: talebi başka türlü değerlendir).
 * Havuz boyutu bu ayrımı taşıyor.
 */
export async function talebeEslestir(
  payload: Payload,
  talep: Parameters<typeof talepProfiliCikar>[0],
  adet = 5,
): Promise<EslestirmeSonucu> {
  const havuz = await havuzGetir(payload)
  const profil = talepProfiliCikar(talep)

  return {
    eslesmeler: talebeUygunIlanlar(profil, havuz, adet),
    havuzBoyutu: havuz.length,
  }
}
