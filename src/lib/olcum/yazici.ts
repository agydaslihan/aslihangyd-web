import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { GozlemGunluk as GozlemGunlukKaydi } from '@/payload-types'

import { bosalt, olayAnahtariniCoz, type SureOzeti, type TamponIcerigi } from './tampon'

/**
 * Tamponu veritabanına yazar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ GÜN BAŞINA TEK SATIR, BEŞ DAKİKADA BİR TEK YAZMA.
 *
 * Sayfa görüntüleme başına `INSERT` yok (şartnamenin sert kuralı). Bunun
 * yerine gün satırı okunuyor, bellekteki sayaçlar üstüne EKLENİYOR ve tek
 * bir `update` ile yazılıyor.
 *
 * ⚠️ Okuma-birleştirme-yazma sırası tek süreçte güvenli: uygulama tek
 * kapsayıcı ve bu fonksiyon aynı anda iki kez çalışmıyor (`yaziliyor`
 * kilidi). Yatay ölçeklenirse burası kayıp üretir — o gün gelirse çözüm
 * `bosalt()` arayüzünü koruyarak Redis'e taşımaktır.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HATA YUTULUYOR VE BU BİLİNÇLİ. Ölçüm, ölçtüğü sistemi düşüremez:
 * bir yazma hatası yüzünden istek işleyen süreç ölürse site gider, karşılığı
 * bir kaç sayaç olur.
 */

/** Aynı anda iki boşaltma çalışmasın. */
let yaziliyor = false

/**
 * ⚠️ Payload'ın `create`/`update` tipleri koleksiyonun ÜRETİLMİŞ tipini
 * bekliyor; burada alanlar dinamik olarak birleştirildiği için gevşek bir
 * kayıt kullanılıyor ve yazma anında daraltılıyor. `any` değil `unknown`
 * tabanlı: alan adları yine de yanlış yazılamıyor çünkü hepsi bu dosyada
 * tek yerde kuruluyor.
 */
/**
 * Bileşik anahtar ayırıcısı.
 *
 * ⚠️ NUL SEÇİLDİ VE KAÇIŞ DİZİSİYLE YAZILDI.
 *
 * Ayırıcı, birleştirilen alan değerlerinin hiçbirinde geçemeyecek bir
 * karakter olmalı; boşluk kullanılsaydı `ad` ve `ayrinti` alanları
 * boşluk içerdiğinde iki farklı satır aynı anahtara düşer ve sayaçlar
 * sessizce toplanırdı. NUL bu değerlerden hiçbirinde bulunamaz.
 *
 * ⚠️ HAM BAYT OLARAK YAZILAMAZ. Bir kez yazıldı ve `kaynakHijyeni` testi
 * yakaladı: ham kontrol karakteri taşıyan dosyayı `grep` İKİLİ sayıp
 * tamamını sessizce atlıyor — arama "eşleşme yok" diyor, oysa dosya hiç
 * okunmamış oluyor. Aynı tuzağa `Harita3B.tsx` içinde de düşülmüştü.
 */
const BILESIK_AYIRICI = '\u0000'

type Satir = Record<string, unknown>

/**
 * Yazılacak gövdenin tipi — üretilmiş koleksiyon tipinden türetiliyor.
 *
 * ⚠️ Alanlar dinamik olarak birleştirildiği için gövde `Satir` olarak
 * kuruluyor; yazma anında üretilmiş tipe daraltılıyor. Böylece alan adı
 * hatası derlemede yakalanmaya devam ediyor.
 */
type GozlemVerisi = Omit<GozlemGunlukKaydi, 'id' | 'createdAt' | 'updatedAt'>

function kovaDizisi(
  kova: Map<string, number>,
  anahtarAdi: string,
  adetAdi = 'adet',
): Record<string, unknown>[] {
  return [...kova.entries()].map(([anahtar, adet]) => ({ [anahtarAdi]: anahtar, [adetAdi]: adet }))
}

/**
 * İki diziyi anahtar üzerinden toplar.
 *
 * ⚠️ Üzerine YAZMIYOR, TOPLUYOR. Üzerine yazsaydı beş dakikada bir çalışan
 * boşaltma günün önceki sayaçlarını siler ve panel yalnızca son beş dakikayı
 * gösterirdi — hem de hatasız görünerek.
 */
function birlestir(
  mevcut: unknown,
  yeni: Record<string, unknown>[],
  anahtarlar: readonly string[],
  sayilar: readonly string[],
): Record<string, unknown>[] {
  const harita = new Map<string, Record<string, unknown>>()

  const anahtarla = (satir: Record<string, unknown>): string =>
    anahtarlar.map((ad) => String(satir[ad] ?? '')).join(BILESIK_AYIRICI)

  for (const satir of Array.isArray(mevcut) ? (mevcut as Record<string, unknown>[]) : []) {
    // Payload dizileri `id` alanı taşıyor; toplarken taşınmıyor.
    const { id: _id, ...temiz } = satir
    void _id
    harita.set(anahtarla(temiz), { ...temiz })
  }

  for (const satir of yeni) {
    const anahtar = anahtarla(satir)
    const once = harita.get(anahtar)
    if (once === undefined) {
      harita.set(anahtar, { ...satir })
      continue
    }
    for (const ad of sayilar) {
      const a = typeof once[ad] === 'number' ? (once[ad] as number) : 0
      const b = typeof satir[ad] === 'number' ? (satir[ad] as number) : 0
      // `enYavasMs` toplanmaz, en büyüğü alınır.
      once[ad] = ad === 'enYavasMs' ? Math.max(a, b) : a + b
    }
  }

  return [...harita.values()]
}

function sayfaDizisi(sure: Map<string, SureOzeti>, icerik: TamponIcerigi) {
  const rotalar = new Set<string>([...icerik.sayfaGoruntuleme.keys(), ...sure.keys()])
  return [...rotalar].map((rota) => {
    const s = sure.get(rota)
    return {
      rota,
      goruntuleme: icerik.sayfaGoruntuleme.get(rota) ?? 0,
      hata: icerik.hata.get(rota) ?? 0,
      toplamMs: s?.toplamMs ?? 0,
      enYavasMs: s?.enYavasMs ?? 0,
    }
  })
}

export async function tamponuYaz(): Promise<boolean> {
  if (yaziliyor) return false
  const icerik = bosalt()
  if (icerik === null) return false

  yaziliyor = true
  try {
    const payload = await getPayload({ config })

    const mevcut = await payload.find({
      collection: 'gozlem-gunluk',
      where: { gun: { equals: icerik.gun } },
      limit: 1,
      overrideAccess: true,
    })

    const eski = (mevcut.docs[0] ?? null) as Satir | null

    const veri: Satir = {
      gun: icerik.gun,
      toplamIstek: Number(eski?.toplamIstek ?? 0) + icerik.toplamIstek,
      onayliIstek: Number(eski?.onayliIstek ?? 0) + icerik.onayliIstek,
      sayfalar: birlestir(
        eski?.sayfalar,
        sayfaDizisi(icerik.sure, icerik),
        ['rota'],
        ['goruntuleme', 'hata', 'toplamMs', 'enYavasMs'],
      ),
      kaynaklar: birlestir(
        eski?.kaynaklar,
        kovaDizisi(icerik.yonlendiren, 'alan'),
        ['alan'],
        ['adet'],
      ),
      utmKaynaklar: birlestir(
        eski?.utmKaynaklar,
        kovaDizisi(icerik.utmKaynak, 'kaynak'),
        ['kaynak'],
        ['adet'],
      ),
      ulkeler: birlestir(eski?.ulkeler, kovaDizisi(icerik.ulke, 'kod'), ['kod'], ['adet']),
      cihazlar: birlestir(
        eski?.cihazlar,
        kovaDizisi(icerik.cihaz as Map<string, number>, 'sinif'),
        ['sinif'],
        ['adet'],
      ),
      olaylar: birlestir(eski?.olaylar, olayDizisi(icerik), ['ad', 'ayrinti'], ['adet']),
    }

    if (eski === null) {
      await payload.create({
        collection: 'gozlem-gunluk',
        data: veri as unknown as GozlemVerisi,
        overrideAccess: true,
      })
    } else {
      await payload.update({
        collection: 'gozlem-gunluk',
        id: eski.id as string | number,
        data: veri as unknown as GozlemVerisi,
        overrideAccess: true,
      })
    }

    return true
  } catch (hata) {
    // ⚠️ Sessiz değil, görünür: günlüğe yazılıyor. Sessiz yutma, ölçümün
    // ne zaman durduğunu bilinmez yapardı.
    console.error('[gozlem] tampon yazılamadı:', hata)
    return false
  } finally {
    yaziliyor = false
  }
}

/**
 * Olay kovası anahtarını satıra çevirir.
 *
 * ⚠️ Bölme kuralı burada DEĞİL, `tampon.ts` içinde: anahtarı kuran ve
 * bölen kod aynı dosyada durmalı. Ayrı yazılsalardı ayırıcı değiştiğinde
 * biri güncellenir, diğeri sessizce yanlış ayrıştırırdı.
 */
function olayDizisi(icerik: TamponIcerigi): Record<string, unknown>[] {
  return [...icerik.olay.entries()].map(([anahtar, adet]) => ({
    ...olayAnahtariniCoz(anahtar),
    adet,
  }))
}
