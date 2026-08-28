import 'server-only'

import type { Payload } from 'payload'

import {
  ilanaUygunTalepler,
  talebeUygunIlanlar,
  type Eslesme,
  type IlanOzeti,
  type TalepProfili,
  type TersEslesme,
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

/**
 * TERS YÖN — bir ilan için açık talepleri getirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KAPANMIŞ TALEPLER HAVUZA GİRMEZ.
 *
 * "Kazanıldı" ve "kaybedildi" durumundaki kayıtlar artık aranacak kişiler
 * değil. Havuza katılsalardı liste her ay biraz daha uzar, en üstteki
 * öneri altı ay önce evini almış birini gösterirdi — ve ekran bir kez
 * yanlış kişiyi gösterdiğinde bir daha açılmaz.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Kişisel alanlar (ad, telefon) burada okunuyor ÇÜNKÜ ekranın işi tam
 * olarak "kimi arayacağım" sorusuna cevap vermek. Eşleştirme MOTORU
 * yine onları görmüyor — `talepProfiliCikar` sadece ölçüt alanlarını
 * alıyor; motorun girdisinde olmayan bir veri çıktısını etkileyemez.
 */

/** Havuz üst sınırı — talep sayısı bunu aşarsa liste zaten okunmaz. */
const TALEP_HAVUZ_SINIRI = 500

/** Aranmayacak durumlar: iş kapanmış. */
const KAPALI_DURUMLAR = ['kazanildi', 'kaybedildi'] as const

export interface TersEslestirmeSonucu {
  eslesmeler: (TersEslesme & {
    adSoyad: string | null
    telefon: string | null
    durum: string | null
    skor: number | null
  })[]
  /** Havuza kaç açık talep girdi — "hiç eşleşme yok" ile "hiç talep yok" ayrı. */
  havuzBoyutu: number
}

export async function ilanaEslestir(
  payload: Payload,
  ilan: {
    id?: unknown
    baslik?: string | null
    tip?: string | null
    kategori?: string | null
    fiyat?: number | null
    mahalle?: unknown
    odaSayisi?: string | null
    brutM2?: number | null
  },
  adet = 8,
): Promise<TersEslestirmeSonucu> {
  const sonuc = await payload.find({
    collection: 'talepler',
    where: { durum: { not_in: [...KAPALI_DURUMLAR] } },
    select: {
      adSoyad: true,
      telefon: true,
      durum: true,
      skor: true,
      tip: true,
      butceMin: true,
      butceMax: true,
      ilgiliMahalle: true,
      ilgiliIlan: true,
      mesaj: true,
    },
    depth: 0,
    limit: TALEP_HAVUZ_SINIRI,
    pagination: false,
    overrideAccess: true,
  })

  const havuz = sonuc.docs.map((talep) => ({
    id: talep.id,
    profil: talepProfiliCikar(talep),
    adSoyad: typeof talep.adSoyad === 'string' ? talep.adSoyad : null,
    telefon: typeof talep.telefon === 'string' ? talep.telefon : null,
    durum: typeof talep.durum === 'string' ? talep.durum : null,
    skor: typeof talep.skor === 'number' ? talep.skor : null,
  }))

  const ozet: IlanOzeti = {
    id: typeof ilan.id === 'number' ? ilan.id : 0,
    baslik: ilan.baslik ?? '',
    tip: (ilan.tip ?? 'satilik') as IlanOzeti['tip'],
    kategori: (ilan.kategori ?? 'konut') as IlanOzeti['kategori'],
    fiyat: ilan.fiyat ?? null,
    mahalleId: kimlik(ilan.mahalle),
    mahalleAdi: ad(ilan.mahalle),
    odaSayisi: (ilan.odaSayisi ?? null) as IlanOzeti['odaSayisi'],
    brutM2: ilan.brutM2 ?? null,
  }

  const kisiler = new Map(havuz.map((t) => [t.id, t]))

  return {
    eslesmeler: ilanaUygunTalepler(
      ozet,
      havuz.map(({ id, profil }) => ({ id, profil })),
      adet,
    ).map((eslesme) => {
      const kisi = kisiler.get(eslesme.talepId)
      return {
        ...eslesme,
        adSoyad: kisi?.adSoyad ?? null,
        telefon: kisi?.telefon ?? null,
        durum: kisi?.durum ?? null,
        skor: kisi?.skor ?? null,
      }
    }),
    havuzBoyutu: havuz.length,
  }
}
