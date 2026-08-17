import { NextResponse, type NextRequest } from 'next/server'

import { CEREZ_ONAY_ADI, izinVarMi, onayCoz } from '@/lib/kvkk/onay'
import {
  rotaAnahtari,
  sayilirMi,
  ulkeKodu,
  utmOku,
  yonlendirenAlanAdi,
} from '@/lib/olcum/kimliksizlestirme'
import { onayliIstekSay, sayfaSay } from '@/lib/olcum/tampon'
import { cihazSinifi } from '@/lib/olcum/tipler'

/**
 * Katman A ölçümü — onay gerektirmeyen, çerezsiz, IP'siz sayaç.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BURADA ÇEREZ YAZILMIYOR, IP OKUNMUYOR, KİMLİK ÜRETİLMİYOR.
 *
 * Sunucu zaten her isteği görüyor; yapılan tek şey onu SAYMAK. Bu yüzden
 * onay gerekmiyor: kişisel veri işlenmiyor, toplulaştırılmış bir sayaç
 * artıyor.
 *
 * Bu dosyada bilinçli olarak BULUNMAYAN şeyler — eklenmesi KVKK kararını
 * bozar (CLAUDE.md kural 8 ve docs/KVKK-ANALITIK.md):
 *
 *   · `request.ip` / `x-forwarded-for` okuması
 *   · `response.cookies.set(...)` — hiçbir çerez yazılmıyor
 *   · rastgele/karma bir ziyaretçi ya da oturum kimliği
 *   · `User-Agent` başlığının saklanması (yalnızca mobil/masaüstü'ne çevriliyor)
 *   · yönlendiren TAM URL (yalnızca alan adı)
 *
 * ⚠️ Neden `proxy.ts`: yanıt süresi ve durum kodu ancak isteği SARAN bir
 * katmanda ölçülebilir. Sunucu bileşeninde sayılsaydı "sayfa ne kadar
 * sürdü" sorusu cevapsız kalırdı — teknik sağlık bölümünün tamamı bu iki
 * değere dayanıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Ölçüm hiçbir koşulda isteği düşürmemeli: gövde `try/catch` içinde ve
 * hata durumunda yanıt olduğu gibi geçiyor.
 */
export async function proxy(istek: NextRequest): Promise<NextResponse> {
  const baslangic = Date.now()
  const yanit = NextResponse.next()

  try {
    const yol = istek.nextUrl.pathname
    if (!sayilirMi(yol)) return yanit

    const basliklar = istek.headers
    const utm = utmOku(istek.nextUrl.searchParams)

    sayfaSay({
      rota: rotaAnahtari(yol),
      yonlendiren: yonlendirenAlanAdi(basliklar.get('referer'), istek.nextUrl.host),
      cihaz: cihazSinifi(basliklar.get('user-agent')),
      ulke: ulkeKodu(basliklar.get('cf-ipcountry')),
      utmKaynak: utm.kaynak,
      sureMs: Date.now() - baslangic,
      // Proxy katmanında sayfa henüz üretilmedi; hata sayımı
      // `instrumentation.ts` içindeki `onRequestError` ile yapılıyor.
      hataMi: false,
    })

    /**
     * ⚠️ Onay çerezi YALNIZCA OKUNUYOR, yazılmıyor.
     *
     * Amaç tek bir sayı: Katman B'yi kaç istek besliyor. Panelde "onay
     * oranı %X" olarak görünüyor — eksik veriyi gizlemek yanlış karar
     * aldırır, şartnamenin açık şartı.
     */
    const onay = onayCoz(istek.cookies.get(CEREZ_ONAY_ADI)?.value)
    if (izinVarMi(onay, 'analitik')) onayliIstekSay()
  } catch {
    // Ölçüm, ölçtüğü sistemi düşüremez.
  }

  return yanit
}

/**
 * ⚠️ Panel, API ve varlık yolları eşleşmenin DIŞINDA.
 *
 * `sayilirMi()` zaten süzüyor ama eşleşmeyi burada da daraltmak, o yollarda
 * proxy'nin hiç çalışmaması demek: Payload admin'inin her isteği için
 * gereksiz bir katman koşmuyor.
 */
export const config = {
  matcher: ['/((?!api|admin|_next/static|_next/image|favicon.ico).*)'],
}
