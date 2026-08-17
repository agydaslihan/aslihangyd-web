/**
 * Bunny Stream adresleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ VİDEO ASLA SELF-HOST EDİLMEZ (CLAUDE.md kod standardı).
 *
 * Sunucu 3,2 GB RAM ve sınırlı diskle çalışıyor. Bir drone videosu tek
 * başına o diskin anlamlı bir kısmını yer; üstelik Node üzerinden video
 * servis etmek bant genişliğini uygulama sunucusuna yıkar ve siteyi
 * yavaşlatır. Bunny Stream HLS ile uyarlanabilir kalite veriyor.
 *
 * ⚠️ Bu dosya SAF: ağ çağrısı yapmaz, yalnızca adres kurar. Böylece
 * kimlikler ve adres biçimi test edilebilir kalıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { ayar } from '@/lib/ayarlar'

/**
 * Kütüphane kimliği ve oynatma alan adı.
 *
 * ⚠️ İkisi de gizli DEĞİL — kurulan adreslerin içinde ziyaretçiye görünür.
 * Bunny'nin API anahtarı (yükleme yetkisi olan) buraya asla girmez;
 * o yalnızca sunucuda, `BUNNY_STREAM_API_KEY` olarak durur.
 *
 * ⚠️ GİZLİ OLMAMALARI, `NEXT_PUBLIC_` ÖNEKİNİ GEREKTİRMEZ.
 *
 * Eskiden öyleydiler ve bu, değerleri **derleme anına** bağlıyordu. Üretim
 * imajı GitHub Actions'ta bu değişkenler tanımlı değilken derlendiği için
 * yayındaki pakette ikisi de boş dizeydi; her drone videosu "oynatıcı
 * yapılandırılmadı" boş durumunda kalıyordu. Ön eksiz adlar çalışma
 * zamanında okunur — imajı yeniden derlemeden değiştirilebilirler.
 * Gerekçenin tamamı `lib/harita/sunucu.ts` içinde.
 *
 * ⚠️ Bu fonksiyon yalnızca SUNUCUDA çağrılmalı (`DroneVideo` sunucu
 * bileşeni). İstemci paketinde ön eksiz değişkenler `undefined` gelir.
 */
export function bunnyAyarlari(): { kutuphaneId: string; alanAdi: string } | null {
  const kutuphaneId = ayar('BUNNY_STREAM_LIBRARY_ID')
  const alanAdi = ayar('BUNNY_STREAM_CDN_HOSTNAME')

  if (kutuphaneId.trim() === '' || alanAdi.trim() === '') return null
  return { kutuphaneId: kutuphaneId.trim(), alanAdi: alanAdi.trim().replace(/^https?:\/\//, '') }
}

/**
 * Video kimliği geçerli mi.
 *
 * Bunny video kimlikleri UUID biçiminde. Doğrulama bilinçli: CMS'e
 * yapıştırılan bir tam adres ya da boşluklu bir metin, adres kurulumunu
 * sessizce bozar ve ziyaretçi boş bir çerçeve görür.
 *
 * ⚠️ Denetim `video.ts` içinde tanımlı ve buradan yeniden dışa aktarılıyor.
 * Sebebi tersi yön: `video.ts` panel bileşeninde de kullanılıyor ve bu
 * dosyayı içe aktarsaydı `ayar()` üzerinden sunucu yapılandırma adlarını
 * istemci paketine taşırdı. İki kopya düzenli ifade tutmak ise ilk
 * değişiklikte ayrışırdı.
 */
import { gecerliBunnyBicimiMi } from './video'

export { gecerliBunnyBicimiMi as gecerliVideoKimligi }

/**
 * Gömme (iframe) adresi.
 *
 * ⚠️ `preload=false` bilinçli: sayfa açılır açılmaz video indirmeye
 * başlamak, mobil trafiğin ~%75 olduğu bir sitede kullanıcının verisini
 * onun izni olmadan harcamak demektir. Ayrıca LCP hedefini doğrudan bozar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `otomatikOynat` "SAYFA AÇILINCA OYNAT" DEĞİLDİR.
 *
 * Bu iframe yalnızca ziyaretçi oynat düğmesine bastıktan SONRA DOM'a
 * giriyor (bkz. `DroneVideo`). O anda `autoplay=true` vermek, kullanıcıyı
 * ikinci kez tıklamaya zorlamamak demek — istenen davranış bu.
 * Sayfa açılışında otomatik oynatma hâlâ yasak ve mümkün değil: çerçeve
 * ortada yok.
 *
 * ⚠️ Parametre BURADA belirleniyor, çağıran tarafta adrese eklenmiyor.
 * Önceki hâlde bu fonksiyon `autoplay=false` yazıyor, bileşen sonuna
 * `&autoplay=true` ekliyordu; ortaya aynı parametreyi iki kez taşıyan bir
 * adres çıkıyordu ve hangisinin kazanacağı ayrıştırıcıya kalmıştı.
 * Tanımsız davranışa yaslanan bir video oynatıcı, sessizce ters çalışır.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function bunnyGommeAdresi(videoId: string, otomatikOynat = false): string | null {
  const ayar = bunnyAyarlari()
  if (ayar === null || !gecerliBunnyBicimiMi(videoId)) return null

  const adres = new URL(`https://iframe.mediadelivery.net/embed/${ayar.kutuphaneId}/${videoId}`)
  adres.searchParams.set('autoplay', otomatikOynat ? 'true' : 'false')
  adres.searchParams.set('preload', 'false')
  adres.searchParams.set('responsive', 'true')
  return adres.toString()
}

/**
 * Kapak görseli adresi.
 *
 * Bunny her video için otomatik bir kapak üretiyor. Bunu kullanmak,
 * ayrıca kapak yüklemek zorunda kalmamak demek — ve kapak olmadan
 * tıkla-oynat düzeni boş bir kutuya dönerdi.
 */
export function bunnyKapakAdresi(videoId: string): string | null {
  const ayar = bunnyAyarlari()
  if (ayar === null || !gecerliBunnyBicimiMi(videoId)) return null
  return `https://${ayar.alanAdi}/${videoId}/thumbnail.jpg`
}
