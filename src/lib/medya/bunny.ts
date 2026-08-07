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

/**
 * Kütüphane kimliği ve oynatma alan adı.
 *
 * ⚠️ İkisi de `NEXT_PUBLIC_` — istemcide görünür ve gizli DEĞİLLER.
 * Bunny'nin API anahtarı (yükleme yetkisi olan) buraya asla girmez;
 * o yalnızca sunucuda, ön eksiz `BUNNY_STREAM_API_KEY` olarak durur.
 */
export function bunnyAyarlari(): { kutuphaneId: string; alanAdi: string } | null {
  const kutuphaneId = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID ?? ''
  const alanAdi = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME ?? ''

  if (kutuphaneId.trim() === '' || alanAdi.trim() === '') return null
  return { kutuphaneId: kutuphaneId.trim(), alanAdi: alanAdi.trim().replace(/^https?:\/\//, '') }
}

/**
 * Video kimliği geçerli mi.
 *
 * Bunny video kimlikleri UUID biçiminde. Doğrulama bilinçli: CMS'e
 * yapıştırılan bir tam adres ya da boşluklu bir metin, adres kurulumunu
 * sessizce bozar ve ziyaretçi boş bir çerçeve görür.
 */
export function gecerliVideoKimligi(deger: string | null | undefined): deger is string {
  if (typeof deger !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deger.trim())
}

/**
 * Gömme (iframe) adresi.
 *
 * ⚠️ `autoplay=false` ve `preload=false` bilinçli: sayfa açılır açılmaz
 * video indirmeye başlamak, mobil trafiğin ~%75 olduğu bir sitede
 * kullanıcının verisini onun izni olmadan harcamak demektir. Ayrıca
 * LCP hedefini (< 2,5 sn) doğrudan bozar.
 */
export function bunnyGommeAdresi(videoId: string): string | null {
  const ayar = bunnyAyarlari()
  if (ayar === null || !gecerliVideoKimligi(videoId)) return null

  const adres = new URL(`https://iframe.mediadelivery.net/embed/${ayar.kutuphaneId}/${videoId}`)
  adres.searchParams.set('autoplay', 'false')
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
  if (ayar === null || !gecerliVideoKimligi(videoId)) return null
  return `https://${ayar.alanAdi}/${videoId}/thumbnail.jpg`
}
