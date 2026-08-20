import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { BASLIK_EYLEMI } from '@/lib/gezinme'

import { ctaKenari } from './ctaKenari'
import { paletiDegerlendir } from './kontrastKapisi'
import { medyayiCoz } from './varliklar'
import { varsayilanPalet, YUVALAR, type Palet } from './yuvalar'

/**
 * Marka ayarlarının sunucuda okunması ve CSS'e çevrilmesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÇALIŞMA ZAMANI — DERLEME ANI DEĞİL. BU HATA BU PROJEDE YAŞANDI.
 *
 * 12 Ağustos 2026'da dokuz `NEXT_PUBLIC_*` değişkeni birden ölüydü: Next.js
 * onları derleme anında imaja gömüyor, imaj da CI'da o değerler tanımsızken
 * derleniyordu. Harita açılmıyor, bot koruması kapalı, analitik yüklenmiyor
 * ve hiçbiri hata vermiyordu.
 *
 * Renkler aynı tuzağa çok daha açık: `globals.css` derleme anında paketlenir.
 * Renkleri oraya yazsaydık Aslıhan panelde rengi değiştirir, kaydeder ve
 * **hiçbir şey olmazdı** — üstelik sebebini anlamasının hiçbir yolu olmazdı.
 *
 * Bu yüzden palet veritabanından OKUNUYOR ve `<head>` içine bir `<style>`
 * bloğu olarak, SUNUCUDA basılıyor. Sunucuda basılması FOUC'u da çözüyor:
 * ilk boyamada doğru renkler yerinde, sonradan sıçrama yok.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface MarkaAyarlari {
  siteAdi: string | null
  slogan: string | null
  /** Başlıktaki dolu eylem butonu — boşsa `gezinme.ts` yedeği kullanılır. */
  baslikEylemi: { ad: string; adres: string } | null
  logo: { url: string; alt: string; en: number | null; boy: number | null } | null
  logoKoyu: { url: string; alt: string; en: number | null; boy: number | null } | null
  ogGorseli: { url: string; en: number | null; boy: number | null } | null
  simgeVar: boolean
  acik: Palet
  koyu: Palet
}

function gorseliCoz(
  deger: unknown,
): { url: string; alt: string; en: number | null; boy: number | null } | null {
  const kayit = medyayiCoz(deger)
  if (!kayit || typeof kayit.url !== 'string' || kayit.url === '') return null

  return {
    url: kayit.url,
    alt: typeof kayit.alt === 'string' ? kayit.alt : '',
    en: typeof kayit.width === 'number' ? kayit.width : null,
    boy: typeof kayit.height === 'number' ? kayit.height : null,
  }
}

/**
 * Kaydedilmiş paleti okur; eksik ya da GEÇERSİZ ise varsayılana düşer.
 *
 * ⚠️ ÇALIŞMA ZAMANI DOĞRULAMASI — kapı zaten engelliyor ama yetmez.
 *
 * Panel kaydetmeyi kapatıyor, `beforeValidate` kancası veritabanını
 * koruyor. Yine de bir göç betiği, elle SQL ya da eski bir kayıt AA'nın
 * altında bir palet bırakabilir. O durumda siteyi okunmaz hâlde yayınlamak
 * yerine varsayılana düşüyoruz: **erişilebilirlik, kişiselleştirmeden
 * önce gelir.**
 */
export function paletiGuvenliOku(kaynak: unknown, tema: 'acik' | 'koyu'): Palet {
  const veri = (kaynak ?? {}) as Record<string, unknown>
  const palet: Palet = Object.fromEntries(
    YUVALAR.map((yuva) => [yuva.anahtar, String(veri[yuva.anahtar] ?? '')]),
  )

  return paletiDegerlendir(palet).gecti ? palet : varsayilanPalet(tema)
}

/** Marka ayarlarını okur. Hata durumunda varsayılanlara düşer, siteyi kırmaz. */
export async function markaAyarlari(): Promise<MarkaAyarlari> {
  try {
    const payload = await getPayload({ config })
    const marka = (await payload.findGlobal({
      slug: 'marka-gorunum',
      depth: 1,
    })) as unknown as Record<string, unknown>

    const siteAdi = typeof marka.siteAdi === 'string' ? marka.siteAdi.trim() : ''
    const slogan = typeof marka.slogan === 'string' ? marka.slogan.trim() : ''

    const eylemMetni =
      typeof marka.baslikEylemMetni === 'string' ? marka.baslikEylemMetni.trim() : ''
    const eylemAdresi =
      typeof marka.baslikEylemAdresi === 'string' ? marka.baslikEylemAdresi.trim() : ''

    return {
      siteAdi: siteAdi === '' ? null : siteAdi,
      slogan: slogan === '' ? null : slogan,
      /**
       * ⚠️ Metin boşsa eylem TÜMDEN yedeğe düşüyor — yarım değil.
       * Metni girip adresi boş bırakan biri için adres yedeği devreye
       * giriyor; ikisi de boşsa `gezinme.ts` kullanılıyor.
       */
      baslikEylemi:
        eylemMetni === ''
          ? null
          : { ad: eylemMetni, adres: eylemAdresi === '' ? BASLIK_EYLEMI.adres : eylemAdresi },
      logo: gorseliCoz(marka.logo),
      logoKoyu: gorseliCoz(marka.logoKoyu),
      ogGorseli: gorseliCoz(marka.ogGorseli),
      simgeVar: medyayiCoz(marka.simgeKaynak) !== null,
      acik: paletiGuvenliOku(marka.acikTema, 'acik'),
      koyu: paletiGuvenliOku(marka.koyuTema, 'koyu'),
    }
  } catch {
    /**
     * ⚠️ Veritabanı yoksa ya da göç henüz koşmadıysa site AÇILMALI.
     * Marka paneli bir süs değil ama sitenin varlık şartı da değil.
     */
    return {
      siteAdi: null,
      slogan: null,
      baslikEylemi: null,
      logo: null,
      logoKoyu: null,
      ogGorseli: null,
      simgeVar: false,
      acik: varsayilanPalet('acik'),
      koyu: varsayilanPalet('koyu'),
    }
  }
}

/**
 * Paletleri `<style>` içeriğine çevirir.
 *
 * ⚠️ Değerler `#rrggbb` olarak doğrulanmış olsa da burada bir kez daha
 * süzülüyor: bu dize doğrudan HTML'e basılıyor ve buraya sızacak bir
 * `</style>` ya da `expression(...)` bir enjeksiyon olurdu. "Zaten
 * doğrulandı" demek, savunmayı tek bir noktaya bağlamaktır.
 */
export function paletCss(acik: Palet, koyu: Palet): string {
  const gecerli = (deger: string | undefined): boolean => /^#[0-9a-f]{6}$/i.test(deger ?? '')

  const satirlar = (palet: Palet): string => {
    const jetonlar = YUVALAR.map((yuva) => {
      const deger = palet[yuva.anahtar]
      if (!gecerli(deger)) return ''
      return `${yuva.jeton}:${deger};`
    })
      .filter((satir) => satir !== '')
      .join('')

    /**
     * ⚠️ CTA KENARLIĞI YUVA DEĞİL, TÜRETİLMİŞ DEĞER.
     *
     * On birinci bir yuva açmak yerine hesaplanıyor çünkü bu bir tercih
     * değil bir zorunluluk: dolu butonun sınırı sayfadan 3:1 ayrışmak
     * zorunda (WCAG 1.4.11) ve altın zemin bunu tek başına sağlamıyor
     * (2,28:1). Panelde ayrı bir renk kutusu olsaydı yanlış doldurulabilir
     * ya da boş bırakılabilirdi. Gerekçesi `ctaKenari.ts` içinde.
     */
    const buton = palet.butonZemin ?? ''
    const zemin = palet.zemin ?? ''
    if (!gecerli(buton) || !gecerli(zemin)) return jetonlar
    return `${jetonlar}--color-aksan-kenar:${ctaKenari(buton, zemin)};`
  }

  return `:root{${satirlar(acik)}}:root[data-tema='koyu']{${satirlar(koyu)}}`
}
