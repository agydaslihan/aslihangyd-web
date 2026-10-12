import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { GozlemGunluk as GozlemGunlukKaydi } from '@/payload-types'

import { botAnahtariniCoz } from './bot'
import {
  bosalt,
  olayAnahtariniCoz,
  vitalAnahtariniCoz,
  type SureOzeti,
  type TamponIcerigi,
} from './tampon'

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
/**
 * Sayı alanlarının birleştirme kipi.
 *
 * ⚠️ `enBuyuk` ve `enKucuk` TOPLANMAZ. `enYavasMs` toplanırsa "en yavaş
 * istek" diye bir şey kalmaz; `ilkMs` toplanırsa ilk tarama zamanı 1970'in
 * katlarına çıkar. Kip bu yüzden alan adıyla değil AÇIKÇA geçiriliyor:
 * hangi alanın nasıl birleştiğini, birleştirmeyi çağıran kod söylüyor.
 *
 * ⚠️ Eskiden kural tek bir satırdı: `ad === 'enYavasMs' ? max : topla`.
 * Bot sayfalarının ilk/son tarama zamanı eklenince o satır üç kipi birden
 * taşımak zorunda kalacaktı; alan adına gömülü bir kural, dördüncü alanda
 * sessizce yanlış toplar.
 */
type BirlesimKipi = 'topla' | 'enBuyuk' | 'enKucuk'

function birlestir(
  mevcut: unknown,
  yeni: Record<string, unknown>[],
  anahtarlar: readonly string[],
  sayilar: readonly string[],
  kipler: Readonly<Record<string, BirlesimKipi>> = { enYavasMs: 'enBuyuk' },
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
      const kip = kipler[ad] ?? 'topla'
      if (kip === 'enBuyuk') {
        once[ad] = Math.max(a, b)
      } else if (kip === 'enKucuk') {
        /**
         * ⚠️ SIFIR "YOK" DEMEK, "EN KÜÇÜK" DEMEK DEĞİL. Alan eksikse `a`
         * sıfır oluyor ve düz bir `Math.min` ilk tarama zamanını 0 yapardı
         * — panelde 1 Ocak 1970 yazardı. Sıfır olmayanlar arasından
         * seçiliyor.
         */
        const adaylar = [a, b].filter((deger) => deger > 0)
        once[ad] = adaylar.length === 0 ? 0 : Math.min(...adaylar)
      } else {
        once[ad] = a + b
      }
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
      girisSayfalari: birlestir(
        eski?.girisSayfalari,
        kovaDizisi(icerik.girisSayfasi, 'rota'),
        ['rota'],
        ['adet'],
      ),
      /**
       * ⚠️ Saat SAYI olarak yazılıyor, dizge olarak değil: panelde 0–23
       * sıralanacak ve `'10' < '9'` dizge karşılaştırması grafiği bozardı.
       */
      saatler: birlestir(
        eski?.saatler,
        [...icerik.saat.entries()].map(([saat, adet]) => ({ saat: Number(saat), adet })),
        ['saat'],
        ['adet'],
      ),
      tarayicilar: birlestir(
        eski?.tarayicilar,
        kovaDizisi(icerik.tarayici, 'aile'),
        ['aile'],
        ['adet'],
      ),
      sehirler: birlestir(eski?.sehirler, kovaDizisi(icerik.sehir, 'ad'), ['ad'], ['adet']),
      cihazlar: birlestir(
        eski?.cihazlar,
        kovaDizisi(icerik.cihaz as Map<string, number>, 'sinif'),
        ['sinif'],
        ['adet'],
      ),
      olaylar: birlestir(eski?.olaylar, olayDizisi(icerik), ['ad', 'ayrinti'], ['adet']),
      /**
       * ⚠️ Birleştirme anahtarı üç alan: aynı gün içinde iki boşaltma
       * olduğunda "LCP/mobil/kova 4" satırı ikiye bölünmemeli, sayacı
       * toplanmalı.
       */
      vitaller: birlestir(eski?.vitaller, vitalDizisi(icerik), ['ad', 'cihaz', 'kova'], ['adet']),

      /* ── Bot trafiği — AYNI SATIR, AYRI SÜTUNLAR ────────────────────────
       *
       * ⚠️ İnsan sayaçlarıyla aynı gün satırına yazılıyor ve aynı
       * boşaltmada gidiyor: bot istekleri için AYRI BİR DB YAZMASI YOK.
       * Eklenen şey yeni bir yol değil, yeni bir boyut.
       * ──────────────────────────────────────────────────────────────── */
      botToplamIstek: Number(eski?.botToplamIstek ?? 0) + icerik.botToplam,
      botIstekleri: birlestir(eski?.botIstekleri, botDizisi(icerik), ['tur', 'ad'], ['adet']),
      botSayfalari: birlestir(
        eski?.botSayfalari,
        botSayfaDizisi(icerik),
        ['rota'],
        ['adet', 'ilkMs', 'sonMs'],
        // ⚠️ İlk tarama en KÜÇÜK, son tarama en BÜYÜK zaman; ikisi de toplanmaz.
        { ilkMs: 'enKucuk', sonMs: 'enBuyuk' },
      ),
      botDurumlari: birlestir(
        eski?.botDurumlari,
        [...icerik.botDurum.entries()].map(([kod, adet]) => ({ kod, adet })),
        ['kod'],
        ['adet'],
      ),
      /**
       * ⚠️ BU BAYRAK BİR DÜRÜSTLÜK ŞARTI, BİR ÖZELLİK DEĞİL.
       *
       * 11 Ekim 2026'dan ÖNCE yazılan gün satırlarında insan sayaçları bot
       * trafiğini de içeriyordu ve `User-Agent` hiçbir yere kaydedilmediği
       * için geriye dönük ayrıştırmak İMKÂNSIZ. Bayrağı taşımayan satırlar
       * panelde "bu günlerin insan sayıları bot trafiğini içeriyor" uyarısı
       * olarak görünüyor. Uyarıyı kaldırmak, karşılaştırmayı sessizce
       * yanlış yapmak olurdu.
       */
      botAyrimi: true,
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
 * Vital histogram anahtarını satıra çevirir.
 *
 * ⚠️ Bölme kuralı burada DEĞİL, `tampon.ts` içinde — `olayDizisi` ile aynı
 * gerekçe: anahtarı kuran ve bölen kod aynı dosyada durmalı.
 */
function vitalDizisi(icerik: TamponIcerigi): Record<string, unknown>[] {
  return [...icerik.vital.entries()].flatMap(([anahtar, adet]) => {
    const cozulmus = vitalAnahtariniCoz(anahtar)
    // ⚠️ Çözülemeyen anahtar sessizce ATILIYOR: bozuk bir satır yazmak,
    // histogramı okunamaz hâle getirirdi.
    return cozulmus === null ? [] : [{ ...cozulmus, adet }]
  })
}

/**
 * Bot sayaçlarını satıra çevirir.
 *
 * ⚠️ Anahtarı kuran ve bölen kod `bot.ts` içinde; burada yalnızca çözülmüş
 * hâli satıra yazılıyor — `olayDizisi` ile aynı disiplin.
 */
function botDizisi(icerik: TamponIcerigi): Record<string, unknown>[] {
  return [...icerik.botIstek.entries()].map(([anahtar, adet]) => {
    const { sinif, ad } = botAnahtariniCoz(anahtar)
    return { tur: sinif, ad, adet }
  })
}

function botSayfaDizisi(icerik: TamponIcerigi): Record<string, unknown>[] {
  return [...icerik.botSayfa.entries()].map(([rota, ozet]) => ({
    rota,
    adet: ozet.adet,
    ilkMs: ozet.ilkMs,
    sonMs: ozet.sonMs,
  }))
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
