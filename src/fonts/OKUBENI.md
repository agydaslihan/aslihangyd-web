# Fontlar — Türkçe alt kümeleri

Bu dizindeki `.woff2` dosyaları **elle düzenlenmez**, betikle üretilir:

```bash
pnpm font:altkume            # yeniden üret
pnpm font:altkume --kontrol  # yalnızca farkı bildir, dosya yazma
```

## Ne var burada

| Dosya                            | Aile              | Google Fonts sürümü | Font sürümü     | Boyut       |
| -------------------------------- | ----------------- | ------------------- | --------------- | ----------- |
| `manrope-turkce.woff2`           | Manrope           | v20                 | 4.504           | 28.296 bayt |
| `plus-jakarta-sans-turkce.woff2` | Plus Jakarta Sans | v12                 | 2.071 (gftools) | 29.236 bayt |

Kaynak: `https://fonts.googleapis.com/css2` alt küme API'si (`text=` parametresi).
Alınma tarihi: 20 Ağustos 2026.

⚠️ **Aileler Aurora Luxury ile değişti** (`docs/AURORA-LUXURY.md`). Önceki
çift Inter + Source Serif 4'tü ve **105.468 bayt** ediyordu; yeni çift
**57.532 bayt** — %45 daha hafif. Eski dosyalar silindi: ölü ağırlık
depoda durmaz.

⚠️ İkisi de SANS. Başlık fontunun serif olmaması bir eksiklik değil karar:
Aurora'da hiyerarşi biçimden değil ölçekten geliyor (72px başlık, 17px
gövde).

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

| Karakter                 | Plus Jakarta Sans (gövde) | Manrope (başlık) |
| ------------------------ | ------------------------- | ---------------- |
| `‑` U+2011 bölünmez tire | ✘ yok                     | ✔ var            |
| `ⁿ` U+207F üst simge n   | ✘ yok                     | ✘ yok            |
| `▾` U+25BE açılır oku    | ✘ yok                     | ✘ yok            |
| `⌖` U+2316 harita imleci | ✘ yok                     | ✘ yok            |
| `⌘` U+2318 Mac tuşu      | ✘ yok                     | ✘ yok            |
| `✓` U+2713 onay          | ✘ yok                     | ✘ yok            |
| `✗` U+2717 çarpı         | ✘ yok                     | ✘ yok            |

⚠️ **Liste eski çiftten UZUN ve bu bilinmesi gereken bir gerileme.** Inter
`⌘ ✗ ‑` gliflerini taşıyordu; Plus Jakarta Sans taşımıyor. Türkçe
karakterlerin tamamı iki ailede de var (fontkit ile doğrulandı: ğ Ğ ş Ş ı
İ ç Ç ö Ö ü Ü â Â î Î û Û — eksik YOK). Eksik olanların hepsi sembol.

⚠️ **Bu bir gerileme DEĞİL.** Beşi de `latin`/`latin-ext` unicode
bloklarının dışında; kendi barındırmaya geçmeden önce de yedek fonta
düşüyorlardı. Davranış aynı kaldı, `fallback` zinciri (bkz.
`src/app/(site)/layout.tsx`) bunları sistem fontuyla okunur biçimde
çiziyor.

Kalıcı çözüm istenirse doğru yol bu karakterleri metin yerine **SVG ikona**
çevirmek olur — o zaman her cihazda birebir aynı görünürler. Görünümü
etkileyen bir değişiklik olduğu için yapılmadı.

Geri kalan karakterlerin ikisinde de karşılığı var (fontkit ile
doğrulandı; yordam aşağıda). Doğrulama çıktısı:

```
Manrope            | eksik: 6  ⁿ ▾ ⌘ ⌖ ✓ ✗ | TÜRKÇE eksik: YOK
Plus Jakarta Sans  | eksik: 7  ‑ ⁿ ▾ ⌘ ⌖ ✓ ✗ | TÜRKÇE eksik: YOK
```

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
bırakıyor (Manrope 200–800, Plus Jakarta Sans 200–800 geliyor). Kazancın
tamamı glif alt kümesinden geliyor.

`@font-face` tarafında aralık yine de `400 500` olarak bildiriliyor:
tasarım sisteminde yalnızca bu iki ağırlık var ve aralık dışı bir değer
istendiğinde tarayıcı sentetik kalınlaştırma yapmak yerine 500'e kırpıyor.

## Lisans

İkisi de **SIL Open Font License 1.1** — barındırmaya, değiştirmeye ve alt
küme almaya izin veriyor; lisans metninin birlikte dağıtılmasını şart
koşuyor.

- `Manrope-OFL.txt` — Copyright 2018 The Manrope Project Authors
- `PlusJakartaSans-OFL.txt` — Copyright 2020 The Plus Jakarta Sans Project
  Authors

⚠️ İkisinin de OFL metninde **Reserved Font Name yok** — yani alt küme
alınmış sürüm kendi adıyla taşınabiliyor. Yine de dosya adları
`-turkce` ekiyle tutuluyor: depodaki dosyanın Google'ın yayımladığı tam
sürüm OLMADIĞI dosya adından anlaşılmalı.

## Yükseltme

Adım adım yordam: `docs/ISLETME-REHBERI.md` → "Font alt kümeleri".
