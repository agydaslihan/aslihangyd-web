import { NextResponse, type NextRequest } from 'next/server'

import { CEREZ_ONAY_ADI, izinVarMi, onayCoz } from '@/lib/kvkk/onay'
import { BOT_EK_YOLLARI, botKimligi } from '@/lib/olcum/bot'
import {
  girisMi,
  rotaAnahtari,
  saatKovasi,
  sayilirMi,
  sehirAdi,
  tarayiciAilesi,
  ulkeKodu,
  utmOku,
  yonlendirenAlanAdi,
} from '@/lib/olcum/kimliksizlestirme'
import { botSay, onayliIstekSay, sayfaSay } from '@/lib/olcum/tampon'
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
    const basliklar = istek.headers

    /**
     * ─────────────────────────────────────────────────────────────────────
     * ⚠️ BOT İSTEĞİ İNSAN SAYAÇLARINA HİÇ GİRMİYOR — ERKEN DÖNÜŞLE.
     *
     * 11 Ekim 2026'ya kadar böyle değildi ve sonucu ölçüldü: Googlebot'un
     * `User-Agent` dizesi "Chrome" ve "Mobile" kelimelerini taşıyor, yani
     * `tarayiciAilesi()` onu CHROME, `cihazSinifi()` onu MOBİL sayıyordu.
     * "Trafiğin %75'i mobil" varsayımını doğrulamak için bakılan grafik,
     * Googlebot'un mobil tarayıcısını ziyaretçi sanıyordu; dönüşüm oranının
     * paydası da şişiyordu (talep sabit, görüntüleme fazla → oran
     * olduğundan küçük).
     *
     * ⚠️ İKİSİ BİRDEN SAYILMIYOR. `return` şart: aşağıdaki `sayfaSay()`
     * çağrısına düşen bir bot isteği, düzeltilen hatanın ta kendisidir.
     *
     * ⚠️ Bot ölçümü Katman A ve onay gerektirmiyor; bot kişi değil. Çerez
     * yazılmıyor, IP okunmuyor, ham `User-Agent` kaydedilmiyor.
     * ─────────────────────────────────────────────────────────────────────
     */
    const bot = botKimligi(basliklar.get('user-agent'))
    if (bot !== null) {
      /**
       * ⚠️ BOT SÜZGECİ İNSANINKİNDEN GENİŞ: `robots.txt` ve `sitemap.xml`
       * insan için ziyaret değil, bot için en doğrudan SEO sinyali —
       * "Googlebot site haritasını en son ne zaman çekti" sorusunun
       * cevabı yalnızca o iki istekte var.
       */
      if (sayilirMi(yol) || BOT_EK_YOLLARI.includes(rotaAnahtari(yol))) {
        botSay({ rota: rotaAnahtari(yol), kimlik: bot })
      }
      return yanit
    }

    if (!sayilirMi(yol)) return yanit

    const utm = utmOku(istek.nextUrl.searchParams)

    /**
     * ─────────────────────────────────────────────────────────────────────
     * ⚠️ KENDİ ALAN ADIMIZ `Host` BAŞLIĞINDAN, `nextUrl.host`TAN DEĞİL.
     *
     * `next start` `nextUrl.host` değerini yapılandırılmış ana bilgisayar
     * adından üretiyor (`localhost:3210`), isteğin gerçekte hangi adrese
     * yapıldığından bağımsız. Ziyaretçi `127.0.0.1` üzerinden bağlandığında
     * yönlendiren `127.0.0.1`, karşılaştırılan değer `localhost` oluyor ve
     * SİTE İÇİ her geçiş dış yönlendiren sanılıyor.
     *
     * Ölçümle yakalandı: yerelde site içi dört geçişin dördü de "giriş
     * sayfası" sayıldı. Üretimde ikisi aynı olduğu için görünmüyordu —
     * yani hata tam da sayıları doğrulamaya çalıştığımız ortamda çıkıyordu.
     *
     * `Host` başlığı tarayıcının GERÇEKTEN kullandığı adres; yönlendiren de
     * aynı adresten üretiliyor. Vekil arkasında da doğru değer bu.
     * ─────────────────────────────────────────────────────────────────────
     */
    const kendiHost = basliklar.get('host') ?? istek.nextUrl.host

    sayfaSay({
      rota: rotaAnahtari(yol),
      yonlendiren: yonlendirenAlanAdi(basliklar.get('referer'), kendiHost),
      cihaz: cihazSinifi(basliklar.get('user-agent')),
      ulke: ulkeKodu(basliklar.get('cf-ipcountry')),
      utmKaynak: utm.kaynak,
      sureMs: Date.now() - baslangic,
      // Proxy katmanında sayfa henüz üretilmedi; hata sayımı
      // `instrumentation.ts` içindeki `onRequestError` ile yapılıyor.
      hataMi: false,
      /**
       * ⚠️ Giriş sayfası ölçümü OTURUM KİMLİĞİ ÜRETMEDEN yapılıyor:
       * yönlendiren bizden değilse bu istek bir giriştir. Gerekçe ve
       * yaklaşıklığın sınırı `girisMi` içinde yazılı.
       */
      girisMi: girisMi(basliklar.get('referer'), kendiHost),
      saat: saatKovasi(),
      /**
       * ⚠️ Ham `User-Agent` HİÇBİR YERE YAZILMIYOR — burada altı kaba
       * kovadan birine çevrilip atılıyor. Sürüm numarası alınmıyor:
       * sürüm + çözünürlük + saat, tarayıcı parmak izinin ta kendisi.
       */
      tarayici: tarayiciAilesi(basliklar.get('user-agent')),
      /**
       * ⚠️ IP yine okunmuyor; Cloudflare şehri çözmüş hâlde gönderiyor.
       * Şehir ülkeden riskli olduğu için raporda ayrıca k-anonimlik
       * eşiğinden geçiyor (`ASGARI_SEHIR`).
       */
      sehir: sehirAdi(basliklar.get('cf-ipcity')),
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
 *
 * ⚠️ `robots.txt` ve `sitemap.xml` BİLİNÇLİ OLARAK EŞLEŞMENİN İÇİNDE.
 * `sayilirMi()` onları insan sayacından düşürüyor; bot sayacı ise tam o
 * iki isteği arıyor (`BOT_EK_YOLLARI`). Desene eklenen bir dışlama,
 * "Googlebot site haritasını çekiyor mu" sorusunu cevapsız bırakırdı.
 */
export const config = {
  matcher: ['/((?!api|admin|_next/static|_next/image|favicon.ico).*)'],
}
