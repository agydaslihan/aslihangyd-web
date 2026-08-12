import 'server-only'

/**
 * Harita stil adresi — çalışma zamanında, sunucuda kurulur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `NEXT_PUBLIC_` DEĞİL: HARİTA ÜRETİMDE HİÇ AÇILMIYORDU.
 *
 * Anahtar önce `NEXT_PUBLIC_MAPTILER_API_KEY` olarak okunuyordu. Next.js
 * `NEXT_PUBLIC_` önekli değişkenleri **derleme anında** paketin içine gömer;
 * çalışma zamanında verilen değer okunmaz.
 *
 * Üretim imajı GitHub Actions'ta derleniyor (`imaj.yml`) ve orada hiçbir
 * `build-arg` verilmiyordu. `Dockerfile`ın derleme aşamasında da bu
 * değişkenler tanımlı değildi. Sonuç: yayına giden pakette anahtar **boş
 * dizeydi.** `compose.prod.yml` onu çalışma zamanı `environment:` olarak
 * veriyordu ama çoktan derlenmiş bir pakete bunun hiçbir etkisi yok.
 *
 * Görünen sonuç: `/harita` sayfası üretimde kalıcı olarak "Etkileşimli
 * harita hazırlanıyor" boş durumunda kalıyordu. OSM'den içe aktarılan POI
 * verisinin görüneceği tek yer orasıydı.
 *
 * 12 Ağustos 2026'da bulundu. Aynı tuzağa dokuz değişken birden düşmüştü;
 * hepsi ön eksiz çalışma zamanı adlarına taşındı. Desen `src/lib/site.ts`
 * içinde `SITE_ADRESI` için zaten kurulmuştu — yalnızca yayılmamıştı.
 *
 * ⚠️ `import 'server-only'` bilinçli. Bu dosyayı bir istemci bileşeni
 * yanlışlıkla import ederse **derleme hata verir.** Öneki kaldırmak tek
 * başına yeterli değildi: ön eksiz bir değişken istemci paketinde sessizce
 * `undefined` olur ve harita yine açılmazdı — üstelik bu sefer sebebi
 * görünmeden. Hatanın sessiz kalması, hatanın kendisinden pahalı.
 * ─────────────────────────────────────────────────────────────────────────
 */

function maptilerAnahtari(): string {
  return (process.env.MAPTILER_ANAHTARI ?? '').trim()
}

/**
 * MapLibre'ye verilecek stil adresi; anahtar yoksa `null`.
 *
 * `null` dönmesi "harita gösterme" demek. Anahtarsız bir MapLibre örneği
 * boş gri bir dikdörtgen çizer ve bu, ziyaretçiye "site bozuk" dedirtir;
 * boş durum ise ne olduğunu açıkça söylüyor.
 */
export function haritaStilAdresi(): string | null {
  const anahtar = maptilerAnahtari()
  if (anahtar === '') return null

  // "streets-v2" dengeli bir taban; uydu görüntüsü mahalle sınırlarını
  // okumayı zorlaştırıyor, sade vektör harita veriyi öne çıkarıyor.
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(anahtar)}`
}
