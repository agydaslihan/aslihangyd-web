import type { Payload } from 'payload'

/**
 * Şema bütünlüğü denetimi — sessiz arızaya karşı kalıcı kapı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: ÖLÜ BİR ÖZELLİK İKİ GÜN BOYUNCA CANLI GÖRÜNDÜ.
 *
 * 18–20 Ağustos 2026: sayfa içerikleri sürümü dağıtıldı ama göç adımı
 * atlandı. `sayfa_icerikleri`, `altbilgi_ayarlari` ve `danisman_ol`ın yeni
 * sütunları veritabanında yoktu.
 *
 * Site hiç bozulmadı: bütün sayfalar 200 döndü, sağlık ucu "saglikli"
 * dedi, 24 saatte tek hata satırı yoktu. Sebebi, içerik okuyucularındaki
 * `try/catch` bloklarıydı — eksik tabloyu yakalayıp koddaki varsayılan
 * metne düşüyorlardı.
 *
 * O geri düşüşler DOĞRUYDU (ziyaretçi bir göç yüzünden 500 görmemeli) ama
 * bir yan etkileri vardı: gürültülü bir arızayı SESSİZ bir özellik kaybına
 * çevirdiler. Panelde "Sayfa İçerikleri" ekranı açılıp kaydedilseydi hata
 * verecekti; kimse denemediği için iki gün fark edilmedi.
 *
 * ⚠️ BU PROJEDEKİ DÖRDÜNCÜ SESSİZ ARIZA:
 *   1. Kullanıcı rolü okunamıyordu → yetki kontrolü sessizce geçiyordu
 *   2. OSM "elle düzenlendi" koruması çalışmıyordu
 *   3. Turnstile site anahtarı boştu → formlar bot korumasız
 *   4. Göç uygulanmadı → yeni özellikler ölü, site "sağlıklı"
 *
 * Dördünün ortak yanı: hata YOK, davranış yanlış. Bu modül o sınıfın
 * şema ayağını kapatıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ UYGULAMAYI ÇÖKERTMEZ. Denetim başarısız olsa da, eksik tablo bulsa da
 * yalnızca RAPOR eder. Bir bütünlük kontrolünün siteyi düşürmesi, korumaya
 * çalıştığı şeyden büyük zarar olurdu.
 */

export interface SemaDurumu {
  /** Kodun beklediği ama veritabanında olmayan tablolar. */
  eksikTablolar: string[]
  /** Beklenen toplam tablo sayısı — oranı görmek için. */
  beklenenSayi: number
  /** Denetimin çalıştığı an (ISO). Hiç çalışmadıysa `null`. */
  kontrolZamani: string | null
  /** Denetim yapılamadıysa sebebi. */
  hata: string | null
}

/**
 * ⚠️ Modül düzeyinde durum, `globalThis` üzerinden.
 *
 * Geliştirmede Next modülleri sıcak yeniden yüklüyor; sade bir modül
 * değişkeni her yeniden yüklemede sıfırlanır ve panel "hiç denetlenmedi"
 * derdi. Ölçüm tamponundaki gerekçenin aynısı.
 */
const KUTU = globalThis as typeof globalThis & { __semaDurumu?: SemaDurumu }

/** Panelin okuduğu son sonuç. Hiç denetlenmediyse `null`. */
export function semaDurumu(): SemaDurumu | null {
  return KUTU.__semaDurumu ?? null
}

/** Yalnızca test için. */
export function semaDurumunuAyarla(durum: SemaDurumu | undefined): void {
  KUTU.__semaDurumu = durum
}

/**
 * Kodun beklediği tabloları veritabanındakilerle karşılaştırır.
 *
 * ⚠️ BEKLENEN LİSTE ELLE YAZILMIYOR. Payload'ın kendi tablo kaydından
 * (`payload.db.tables`) geliyor — yani koleksiyon ya da global eklendiğinde
 * liste kendiliğinden büyüyor. Elle tutulan bir liste, tam da denetlemek
 * istediğimiz şeyi (birinin bir adımı atlaması) kendi içinde tekrarlardı.
 */
export async function semayiDenetle(payload: Payload): Promise<SemaDurumu> {
  const simdi = new Date().toISOString()

  try {
    const tablolar = (payload.db as unknown as { tables?: Record<string, unknown> }).tables
    const beklenen = Object.keys(tablolar ?? {})

    if (beklenen.length === 0) {
      const durum: SemaDurumu = {
        eksikTablolar: [],
        beklenenSayi: 0,
        kontrolZamani: simdi,
        hata: 'Payload tablo kaydı okunamadı; denetim yapılamadı.',
      }
      KUTU.__semaDurumu = durum
      return durum
    }

    /**
     * ⚠️ Tek sorgu, parametreli.
     *
     * Tablo başına ayrı sorgu 63 gidiş-dönüş demek olurdu; açılışta
     * gereksiz yük. Adlar parametre olarak geçiyor — CLAUDE.md kod
     * standardı (SQL enjeksiyonuna karşı) ve adlar Payload'dan gelse bile
     * kural kuraldır.
     */
    const { sql } = await import('@payloadcms/db-postgres')
    const drizzle = (
      payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
    ).drizzle

    const sonuc = (await drizzle.execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    )) as { rows?: { tablename?: unknown }[] } | { tablename?: unknown }[]

    const satirlar = Array.isArray(sonuc) ? sonuc : (sonuc.rows ?? [])
    const mevcut = new Set(
      satirlar
        .map((satir) => (satir as { tablename?: unknown }).tablename)
        .filter((ad): ad is string => typeof ad === 'string'),
    )

    const eksikTablolar = beklenen.filter((ad) => !mevcut.has(ad)).sort()

    const durum: SemaDurumu = {
      eksikTablolar,
      beklenenSayi: beklenen.length,
      kontrolZamani: simdi,
      hata: null,
    }
    KUTU.__semaDurumu = durum
    return durum
  } catch (hata) {
    const durum: SemaDurumu = {
      eksikTablolar: [],
      beklenenSayi: 0,
      kontrolZamani: simdi,
      hata: hata instanceof Error ? hata.message : 'Şema denetimi başarısız',
    }
    KUTU.__semaDurumu = durum
    return durum
  }
}

/**
 * Sonucu sunucu günlüğüne yazar.
 *
 * ⚠️ Günlüğe yazmak TEK BAŞINA yetmez — bu projenin bildirim motorunun ilk
 * cümlesi zaten "günlük dosyasına yazılan uyarıyı kimse okumaz". Panel
 * şeridi asıl kanal; günlük, sunucuya bakan kişi için ikinci kanal.
 */
export function semayiGunlukleYaz(durum: SemaDurumu): void {
  if (durum.hata !== null) {
    console.warn(`[sema] Denetim yapılamadı: ${durum.hata}`)
    return
  }

  if (durum.eksikTablolar.length === 0) {
    console.log(`[sema] ${durum.beklenenSayi} tablonun tamamı yerinde.`)
    return
  }

  console.error(
    `[sema] ⚠️ ${durum.eksikTablolar.length}/${durum.beklenenSayi} TABLO EKSİK — ` +
      'göç uygulanmamış olabilir. Eksikler: ' +
      durum.eksikTablolar.join(', ') +
      '\n[sema] Çözüm: docker compose --profile gocmen run --rm gocmen',
  )
}
