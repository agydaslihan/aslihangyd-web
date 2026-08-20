# Logo ölçüleri, koyu zemin sorunu ve SVG temizliği

**20 Ağustos 2026** · dal: `feature/olcum-esikleri`

Üç şikâyet, üç farklı katmanda karşılık buldu: biri CSS, biri panel yardım
metni, biri güvenlik kancası.

---

## 1. Başlık logosu büyüdü, bant büyümedi

36 px'lik logo menü metninin yanında zayıf duruyordu; marka gezinme
öğelerinden güçlü olmalı. Yeni ölçü mobilde **40 px**, masaüstünde **48 px**.

⚠️ **Başlık bandı 72 px olarak kaldı.** Bandı büyütmek her sayfada ilk
ekrandan yer çalardı; 48 px logo 72 px bandın içinde 12 px payla oturuyor.

⚠️ **CLS 0:** yükseklik sınıfla sabit, genişlik `w-auto` ve `MarkaLogosu`
en/boy oranından ölçüyü hesaplayıp `<Image>`e yazıyor — yer görsel inmeden
ayrılıyor. Üretilen HTML'de doğrulandı: `width="160" height="48"`.

⚠️ **Genişlik tavanı eklendi** (`max-w`): çok geniş bir logo mobilde menü
düğmesini ekrandan itebiliyordu.

## 2. Altbilgi logosundaki hale — teşhis doğru, çözüm üç katmanlı

Belirti: koyu zeminde bulanık, kenarlarda açık renkli hale.

Sebep dosyanın kendisi: açık zemin için hazırlanmış bir PNG'nin kenar
pikselleri **açık renge göre yumuşatılmış** oluyor. Koyu zemine konduğunda
o yumuşatma bir hale olarak görünüyor. **Kod bunu düzeltemez.**

Yapılanlar:

- **Ölçü sınırlandı** (56 px yükseklik, 200 px genişlik tavanı,
  `object-contain`). Artefaktı yok etmiyor, görünür olmaktan çıkarıyor.
- **Panelde "Koyu tema logosu" alanı zaten vardı** — yardım metni yeniden
  yazıldı: koyu zemin için AÇIK RENKLİ (altın/beyaz) SVG; PNG kullanılacaksa
  şeffaf arka planlı ve en az 3x çözünürlükte.
- **Yedek zinciri belgelendi ve teste bağlandı:** koyu logo → ana logo →
  site adı yazıyla. Bozuk görsel hiçbir durumda gösterilmiyor.

## 3. ⚠️ SVG temizliği yanlış kancadaydı — ve hiçbir şey yapmıyordu

SVG yükleme zaten açıktı (`image/svg+xml` izinli). Temizleyici yazıldı ve
`beforeChange` kancasına kondu. **Hiçbir etkisi olmadı.**

Deneyle görüldü: uzak sunucuya işaret eden bir `<image href="https://…">`
taşıyan SVG yüklendi, 233 baytla kaydedildi ve dış referansı **olduğu gibi
servis edildi**.

Sebep sıra: Payload `generateFileData`yı `beforeChange`ten ÖNCE çalıştırıp
diske yazılacak tamponu orada hazırlıyor. Sonradan `req.file.data`yı
değiştirmek yazılan dosyayı değiştirmiyor.

Kanca `beforeOperation`a taşındı. Aynı dosya yeniden yüklendi:

```
[medya] SVG temizlendi (deneme-logo-2.svg): dış referanslar
yüklendi: deneme-logo-2.svg image/svg+xml 194 bayt
```

Servis edilen dosyada `href` yok, metin yerinde.

⚠️ **Kancanın yeri teste bağlandı.** Geri taşınırsa sessizce etkisiz kalır —
tam da bu projenin en sık gördüğü arıza türü.

### Payload'ın kendi kapısı da var

Denemenin ilk turunda `<script>` ve `onclick` taşıyan SVG **Payload
tarafından tümden reddedildi**: "SVG file contains potentially harmful
content". Yani temizleyici Payload'ın yerine geçmiyor, ONUN GEÇİRDİKLERİNİ
temizliyor — örneğin uzak bir sunucuya işaret eden `<image href>`, yani
logoyu ziyaretçinin IP'sini bildiren bir izleyiciye çeviren satır. Payload
onu zararlı saymıyor; biz istemiyoruz.

### Ne temizleniyor

`<script>` · `<foreignObject>` · `<iframe>` · `<embed>` · `<object>` ·
`on*` öznitelikleri · `javascript:` adresleri · dış referanslar ·
`@import` · `expression()`

⚠️ İç referanslara (`href="#gradyan"`) dokunulmuyor: onlar SVG'nin kendi
tanımına işaret ediyor ve kaldırmak logoyu bozar.

⚠️ **Bu tam bir XML ayrıştırıcısı değil ve olduğunu iddia etmiyor.** Tam
çözüm DOMPurify + jsdom; ikisi sunucuya ~10 MB ekliyor ve yalnızca yönetici
yükleme yolunda kullanılacaktı. Kalan risk bilinçli kabul ediliyor ve tek
başına taşınmıyor: Payload'ın kapısı önde, yükleme yalnızca yöneticide.

## Doğrulama

- Gerçek yükleme denemesi: kirli SVG reddedildi, izleyicili SVG temizlendi,
  temiz SVG değişmeden geçti
- Üretilen HTML'de logo ölçüleri doğrulandı (başlık 160×48, altbilgi 187×56)
- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 98 dosya, **1999 test** yeşil

⚠️ Deneme kayıtları ve marka bağlantısı sonunda temizlendi; geliştirme
veritabanında iz kalmadı.
