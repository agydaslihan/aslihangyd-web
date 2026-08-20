# Font ön yüklemesi — Next'in bastığı `<link>` HTML'de değildi

**20 Ağustos 2026** · dal: `feature/font-onyukleme`

Sitede tek bir `<link rel="preload" as="font">` yoktu — hiçbir sayfada.
Sebebi bulundu, ölçüldü ve düzeltildi.

---

## Belirti

`/portfoy` yeniden tasarımından sonra mobil LCP 2,8 s → 3,6 s'ye çıktı
(bkz. `2026-08-20-portfoy-mahalle-tasarim.md`). LCP öğesi bir **metin**
bloğu; metin LCP'sinin en bilinen frenlerinden biri font.

Üretilen HTML'de bakıldı: font ön yüklemesi **yok**.

## Aramanın seyri — ve iki yanlış hipotez

| Hipotez | Nasıl test edildi | Sonuç |
| --- | --- | --- |
| `preload: true` yazılmamış | `localFont` çağrısına açıkça eklendi, yeniden derlendi | **değil** — hiçbir şey değişmedi |
| `output: standalone` + `next start` uyumsuz | gerçek üretim sunucusuyla (`node .next/standalone/server.js`) tekrarlandı | **değil** — orada da yok |

Sonra veriye bakıldı ve Next'in her adımı doğru çalışıyordu:

- Derleme çıktısındaki dosya adı ön yükleme işaretini taşıyor:
  `inter_turkce-s.p.0-….woff2` (`.p.` = preload).
- `next-font-manifest.json` **33 sayfanın hepsi** için doğru iki dosyayı
  listeliyor.
- `getPreloadableFonts` doğrudan çağrılıp denendi: isabet ediyor.

## Kesin sebep — çalışma zamanına sonda konarak

Next'in derlenmiş çalışma zamanına (`app-page-turbo.runtime.prod.js`) geçici
bir sonda konup gerçek bir istek atıldı:

```
[PROBE] yol= …/(site)/layout.tsx        → bulundu= false
[PROBE] yol= …/(site)/portfoy/page.tsx  → bulundu= TRUE
```

Yani arama isabet ediyor ve `ReactDOM.preload` **gerçekten çağrılıyor**.

Ama React bunu sunucu bileşeni render'ı içinde alıyor ve HTML `<head>`ine
değil, **RSC akışına bir ipucu** olarak yazıyor. Üretilen sayfada aynen şu
duruyor:

```
:HL["/_next/static/media/inter_turkce-s.p.0-….woff2","font",{"crossOrigin":…}]
```

`<link>` öğesini bu ipucundan **istemci çalışma zamanı** üretiyor. Yani font
isteği ancak paket inip akış ayrıştırıldıktan **sonra** başlıyor — ön
yüklemenin bütün amacı olan "HTML ayrıştırılırken başlat" kazancı kayboluyor.

⚠️ Bu bir yapılandırma hatası değil, Next 16 + Turbopack davranışı. Kendi
head'imize basmak dışında bir kolumuz yok.

## Düzeltme

`src/lib/yazi/onyukleme.ts` — manifest sunucuda okunuyor, gövde fontunun
adresi çözülüyor, düzen onu gerçek bir `<link>` olarak `<head>`e basıyor.

⚠️ **Yalnızca gövde fontu (Inter), ikisi birden değil.** İki font ~105 kB
ediyor ve mobilde ön yükleme LCP görseliyle aynı bant genişliği için
yarışıyor. Metin LCP'sini geciktiren de gövde fontu; başlıklar daha küçük
alan kaplıyor. Serif font `@font-face` sırasında iniyor ve `display: swap`
sayesinde metin zaten yedek fontla boyanıyor.

⚠️ **`crossOrigin` şart.** Font istekleri CORS modunda yapılır; öznitelik
olmadan tarayıcı dosyayı **iki kez** indirir (biri ön yükleme, biri
`@font-face`) ve ön yükleme kazanç yerine 50 kB'lık kayıp olur.

⚠️ **Sessizce başarısız olur.** Manifest bulunamazsa `null` dönüyor ve
hiçbir şey basılmıyor: ön yükleme bir iyileştirme, varlık şartı değil.

⚠️ **Birden çok aday çıkarsa hiçbiri seçilmiyor.** Yanlış dosyayı ön
yüklemek, hiç yüklememekten kötü.

## Doğrulama — gerçek üretim imajında

Bu projede "yerelde çalıştı, imajda ölüydü" geçmişi var (`NEXT_PUBLIC_`
olayı, 12 Ağustos). Bu yüzden `--target calistirici` imajı derlenip
çalıştırıldı:

```
/uygulama/.next/server/next-font-manifest.json   → var (6.313 bayt)
aday sayısı: 1 → static/media/inter_turkce-s.p.0-_av450ok1_1.woff2
HTTP 200
<link rel="preload" as="font" type="font/woff2"
      href="/_next/static/media/inter_turkce-s.p.0-_av450ok1_1.woff2"
      crossorigin="anonymous"/>
```

Ayrıca CSS'in `@font-face` adresi ile ön yükleme adresi **birebir aynı**
olduğu doğrulandı — çift indirme yok. Dosya `HTTP 200`, 51.260 bayt.

## Kalıcı denetim

`src/lib/yazi/onyukleme.test.ts`. Modül bilerek sessizce başarısız olduğu
için tehlikeli bir yan etkisi var: Next dosyanın yerini değiştirirse ön
yükleme sessizce ölür. Projede bu kalıptan **dört tane** yaşandı; test
beşinciyi engelliyor.

⚠️ Manifest testi **koşullu** ve sebebi CI sırası: `pnpm test`, `pnpm build`
ten önce koşuyor. Derleme çıktısına koşulsuz bağlanan bir test CI'da daima
kırmızı olurdu — bu tuzağa MapLibre worker testinde bir kez düşülmüştü.
Manifest yoksa modülün **çökmediği**, varsa çözümlemenin gerçekten
**çalıştığı** doğrulanıyor.
