import { NextResponse } from 'next/server'

/**
 * YouTube kapak görseli vekili.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VEKİL — TIKLAMADAN ÖNCE GOOGLE'A İSTEK GİTMESİN.
 *
 * Tıkla-oynat cephesinin bütün amacı üçüncü taraf çağrısını ziyaretçi
 * videoyu isteyene kadar ertelemek. Kapağı doğrudan `i.ytimg.com`'dan
 * çekmek bu amacı boşa çıkarırdı: sayfa açılır açılmaz Google'a bir istek
 * gider, ziyaretçinin IP'si ve `Referer` başlığı oraya ulaşır — hem de
 * hiçbir çerez onayı alınmadan.
 *
 * Bu uç araya giriyor: tarayıcı yalnızca bizim alan adımıza istek atıyor,
 * YouTube'a giden çağrıyı sunucu yapıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ÖNBELLEK ZORUNLU, SÜS DEĞİL. Vekil olmadan bu istek CDN'e giderdi;
 * vekille birlikte bizim sunucumuza geliyor. Önbelleklenmeseydi her sayfa
 * görüntülemesi 3,2 GB RAM'li sunucuda bir dış çağrı başlatırdı.
 */

/** YouTube kimliği: 11 karakter, sabit alfabe. */
const KIMLIK_DESENI = /^[\w-]{11}$/

/**
 * Kapak adayları — büyükten küçüğe.
 *
 * ⚠️ `maxresdefault` her videoda YOK: yalnızca yeterince yüksek çözünürlükte
 * yüklenmiş videolarda üretiliyor ve olmadığında YouTube 404 dönüyor. Tek
 * adaya güvenen bir vekil, eski telefonla çekilmiş bir videoda boş kapak
 * gösterirdi.
 */
const ADAYLAR = ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg'] as const

/** Bir gün — kapak görseli video değişmedikçe değişmiyor. */
const ONBELLEK_SANIYE = 86_400

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ kimlik: string }> },
): Promise<NextResponse> {
  const { kimlik } = await params

  /**
   * ⚠️ DOĞRULAMA GÜVENLİK MESELESİ, biçim titizliği değil.
   *
   * Kimlik doğrudan dış adrese giriyor. Süzülmeseydi `../` ya da tam bir
   * adres geçirilerek bu uç, isteyen herkesin istediği adrese istek attığı
   * bir vekile (SSRF) dönüşürdü.
   */
  if (!KIMLIK_DESENI.test(kimlik)) {
    return new NextResponse(null, { status: 404 })
  }

  for (const aday of ADAYLAR) {
    let yanit: Response
    try {
      yanit = await fetch(`https://i.ytimg.com/vi/${kimlik}/${aday}`, {
        next: { revalidate: ONBELLEK_SANIYE },
      })
    } catch {
      // Ağ hatası: sonraki adaya geçmenin anlamı yok, dış servis erişilemez.
      break
    }

    if (!yanit.ok) continue

    /**
     * ⚠️ Gelen şeyin gerçekten görsel olduğu doğrulanıyor.
     *
     * YouTube bulunmayan kapaklar için bazı durumlarda 200 ile bir
     * yer tutucu döndürüyor. İçerik türüne bakmadan geçirmek, `img`
     * etiketine HTML servis etmek olurdu.
     */
    const tur = yanit.headers.get('content-type') ?? ''
    if (!tur.startsWith('image/')) continue

    return new NextResponse(yanit.body, {
      status: 200,
      headers: {
        'content-type': tur,
        'cache-control': `public, max-age=${ONBELLEK_SANIYE}, s-maxage=${ONBELLEK_SANIYE}, stale-while-revalidate=604800`,
      },
    })
  }

  /**
   * Kapak bulunamadı — 404 dönüyor ve oynatıcı kapaksız duruma düşüyor.
   *
   * ⚠️ Yer tutucu bir görsel ÜRETİLMİYOR: "kapak yok" durumu oynatıcıda
   * zaten tasarlı (koyu zemin + oynat işareti). Buradan gri bir kutu
   * göndermek o tasarımı bozar ve hatayı gizler.
   */
  return new NextResponse(null, { status: 404 })
}
