# Fontlar — Türkçe alt kümeleri

Bu dizindeki `.woff2` dosyaları **elle düzenlenmez**, betikle üretilir:

```bash
pnpm font:altkume            # yeniden üret
pnpm font:altkume --kontrol  # yalnızca farkı bildir, dosya yazma
```

## Ne var burada

| Dosya                         | Aile           | Google Fonts sürümü | Font sürümü           | Boyut       |
| ----------------------------- | -------------- | ------------------- | --------------------- | ----------- |
| `inter-turkce.woff2`          | Inter          | v20                 | 4.001 (git-66647c0bb) | 51.260 bayt |
| `source-serif-4-turkce.woff2` | Source Serif 4 | v14                 | 4.004                 | 54.208 bayt |

Kaynak: `https://fonts.googleapis.com/css2` alt küme API'si (`text=` parametresi).
Alınma tarihi: 8 Ağustos 2026.

SHA-256 özetleri:

```
Güncel özetler: src/fonts/uretim.json
```

## Neden kendi barındırıyoruz

Google'ın hazır `latin` + `latin-ext` alt kümeleri iki aile için **226.684
bayt** ediyordu ve mobil sayfa ağırlığının **%51'i** buydu — mobil LCP 3,8 sn
ile 2,5 sn hedefinin çok üstündeydi.

`latin-ext` bloğundan bize lazım olan yalnızca **beş harf**: İ ğ Ğ ş Ş.
Gerisi Latin Extended-A/B, IPA fonetik alfabesi ve Latin Extended
Additional — hiçbiri kullanılmıyor. (ç Ç ö Ö ü Ü ı zaten `latin`
bloğunda.)

`next/font/google` özel alt küme üretemiyor: `subsets` seçeneği yalnızca
Google'ın hazır unicode-range bloklarından seçim yaptırıyor. Bu yüzden alt
küme burada üretilip dosyalar depoya konuyor ve `next/font/local` ile
yükleniyor.

## Alt kümeye ne giriyor

Karakter listesi **`src/lib/tipografi/alfabe.ts`** dosyasında — tek gerçek
kaynak. Üretim betiği de, içerik denetleyen test de aynı listeyi okuyor.

⚠️ **Alfabeye göre kesildi, metne göre değil.** İçerik CMS'ten geliyor;
yarın ne yazılacağı bilinmiyor. "Sitede şu an geçen karakterler" diye bir
alt küme, ilk yeni cümlede eksik glif üretirdi ve eksik glif tarayıcıda
"tofu" (boş kutu) olarak görünür — fark edilmesi aylar alır.

## Bilinen eksikler — yedek fonta düşen karakterler

Alfabede 193 karakter var; birkaçının **fontun kendisinde** karşılığı yok.
Alt küme almakla ilgisi yok, Google'ın tam sürümünde de yoklar.

| Karakter                 | Inter (gövde) | Source Serif 4 (başlık) |
| ------------------------ | ------------- | ----------------------- |
| `‑` U+2011 bölünmez tire | ✔ var         | ✘ yok                   |
| `▾` U+25BE açılır oku    | ✘ yok         | ✘ yok                   |
| `⌖` U+2316 harita imleci | ✘ yok         | ✘ yok                   |
| `⌘` U+2318 Mac tuşu      | ✔ var         | ✘ yok                   |
| `✗` U+2717 çarpı         | ✔ var         | ✘ yok                   |

⚠️ **Bu bir gerileme DEĞİL.** Beşi de `latin`/`latin-ext` unicode
bloklarının dışında; kendi barındırmaya geçmeden önce de yedek fonta
düşüyorlardı. Davranış aynı kaldı, `fallback` zinciri (bkz.
`src/app/(site)/layout.tsx`) bunları sistem fontuyla okunur biçimde
çiziyor.

Kalıcı çözüm istenirse doğru yol bu karakterleri metin yerine **SVG ikona**
çevirmek olur — o zaman her cihazda birebir aynı görünürler. Görünümü
etkileyen bir değişiklik olduğu için yapılmadı.

Geri kalan 188 karakterin ikisinde de karşılığı var (fontkit ile
doğrulandı; yordam aşağıda).

## Kapsamı doğrulama

Alt küme değiştiğinde gliflerin gerçekten geldiğini sınamak için:

```bash
# Geçici, kalıcı bağımlılık değil
mkdir -p /tmp/font-kontrol && cd /tmp/font-kontrol
npm init -y >/dev/null && npm install fontkit >/dev/null

node -e "
const fk = require('fontkit')
const { readFileSync } = require('node:fs')
const font = fk.openSync(process.argv[1])
const alfabe = [...new Set(readFileSync(process.argv[2], 'utf8'))]
const eksik = alfabe.filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)))
console.log(font.fullName, '→', eksik.length, 'eksik:', eksik.join(' '))
" <woff2-yolu> <alfabe-metni>
```

Alfabe metnini şöyle dışa alabilirsin:

```bash
node --experimental-strip-types -e "
import { ALFABE } from './src/lib/tipografi/alfabe.ts'
import { writeFileSync } from 'node:fs'
writeFileSync('/tmp/alfabe.txt', ALFABE)
"
```

## Ağırlık ekseni

Daraltılamıyor. `wght@400;500` istemek dosyayı küçültmüyor — Google
değişken fontu gliflere göre alt kümeliyor ama `wght` eksenini olduğu gibi
bırakıyor (Inter 100–900, Source Serif 200–900 geliyor). Kazancın tamamı
glif alt kümesinden geliyor.

`@font-face` tarafında aralık yine de `400 500` olarak bildiriliyor:
tasarım sisteminde yalnızca bu iki ağırlık var ve aralık dışı bir değer
istendiğinde tarayıcı sentetik kalınlaştırma yapmak yerine 500'e kırpıyor.

## Lisans

İkisi de **SIL Open Font License 1.1** — barındırmaya, değiştirmeye ve alt
küme almaya izin veriyor; lisans metninin birlikte dağıtılmasını şart
koşuyor.

- `Inter-OFL.txt` — Copyright (c) 2016 The Inter Project Authors
- `SourceSerif4-OFL.txt` — Copyright 2014–2023 Adobe, "Source" ayrılmış
  font adıdır

⚠️ OFL'in ayrılmış font adı (Reserved Font Name) kuralı gereği, değiştirilmiş
bir sürüm **"Source" adıyla dağıtılamaz**. Alt küme almak fontu değiştirmek
sayıldığından, dosya adı `source-serif-4-turkce` olarak tutuluyor ve
yalnızca bu sitede kullanılıyor; üçüncü taraflara font olarak dağıtılmıyor.

## Yükseltme

Adım adım yordam: `docs/ISLETME-REHBERI.md` → "Font alt kümeleri".
