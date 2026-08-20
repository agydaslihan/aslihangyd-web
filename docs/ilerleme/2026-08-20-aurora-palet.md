# Aurora Luxury — Adım 1: palet, tipografi ve altın kontrast kanıtı

**20 Ağustos 2026** · dal: `feature/aurora-palet`

Yeni şartname (`docs/AURORA-LUXURY.md`) önceki tasarım belgelerini geçersiz
kıldı. Bu, altı adımlık işin **birincisi**: renk ve yazı. Hareket
kütüphaneleri, yeni bileşenler ve ana sayfa bu PR'da YOK — şartname
"Adım 1'i yap ve DUR" diyor.

---

## 1. Şartnamenin altın uyarısı doğru çıktı

Şartname üç iddiayı ölçülmek üzere veriyordu. Üçü de doğrulandı; sapma
0,02'nin altında:

| İddia | Şartname | Ölçülen | Sonuç |
| --- | --- | --- | --- |
| Altın metin, arka plan üzerinde | 2,27 | **2,28** | ❌ |
| Beyaz metin, altın buton üzerinde | 2,34 | **2,36** | ❌ |
| Mürekkep metin, altın buton üzerinde | 6,9 | **7,20** | ✅ |

## 2. ⚠️ İKİ ÖNERİLEN DEĞER KULLANILMADI — ÜÇÜNCÜ YÜZEY YÜZÜNDEN

Şartname ölçümü iki yüzeyde düşünmüş: arka plan ve kart. Palette **üçüncü
bir yüzey** var ve sayfanın en çok kullanılan ikinci zemini: sıcak bej bant
(#F5F0E8).

| Öneri | Arka plan | Kart | **Bej** | Karar |
| --- | --- | --- | --- | --- |
| `--altin-metin` ≈ #8A6B2E | 4,80 ✅ | 4,97 ✅ | **4,38 ❌** | elendi |
| `--altin-baslik` ≈ #A8854A | 3,31 ✅ | 3,43 ✅ | **3,02** (pay 0,02) | elendi |
| İkincil metin #6B7280 | 4,67 ✅ | 4,83 ✅ | **4,26 ❌** | elendi |

Yerine konanlar üç yüzeyde de geçiyor:

- `--color-vurgu` = **#7A5E2E** → 5,85 · 6,05 · 5,33
- `--color-vurgu-baslik` = **#937442** → 4,21 · 4,35 · 3,84 (eşik 3)
- `--color-metin-2` = **#48433D** → 9,45 · 9,78 · 8,62
- `--color-metin-3` = **#696259** → 5,81 · 6,01 · 5,30

⚠️ İkincil metin ayrıca **soğuk griydi**: palet sıcakken tek başına maviye
çalıyor ve krem yüzeyde kirli görünüyordu. Sıcak nötr rampasına alındı.

## 3. ⚠️ Dolu altın butonun kenarlığı — süs değil, erişilebilirlik

Altın dolgu sayfa zeminden **2,28:1** ayrışıyor; WCAG 1.4.11 bileşen sınırı
için 3:1 istiyor. Yani kenarlıksız altın buton, ışık yansıyan bir telefon
ekranında nerede bittiği belli olmayan bir leke.

Koyu altın buton denendi (gold-700 + beyaz, 6,05:1) ve **reddedildi**:
kahverengiye düşüp şartnamenin istediği ışıltıyı öldürüyor.

Çözüm kenarlık — ama sabit bir kenarlık yetmez: marka paneli hem butonu hem
zemini değiştirebiliyor. Bu yüzden kenarlık **dolgudan türetiliyor**
(`lib/marka/ctaKenari.ts`): zeminden 3:1 + pay ayrışana kadar koyulaşıyor,
koyu zeminde açılıyor. Varsayılan palette 3,32:1.

⚠️ Bu, marka panelindeki kontrast kapısından bir çifti KALDIRDI ("buton
zemini / ana arka plan"). Kural gevşemedi, **taşıyıcısı değişti**: aksi
hâlde kapı, şartnamenin istediği rengi erişilebilirlik gerekçesiyle
yasaklıyordu — oysa aynı erişilebilirlik kenarlıkla sağlanıyor.

## 4. Fontlar — beklenenden hafif çıktı

| Aile | Rol | Alt küme |
| --- | --- | --- |
| Manrope | başlık | 28.296 bayt |
| Plus Jakarta Sans | gövde | 29.236 bayt |
| **Toplam** | | **57.532 bayt** |

Önceki çift (Inter + Source Serif 4) 105.468 baytdı. Şartname "106 kB'ı
aşarsa bildir" diyordu; **%45 azaldı**.

⚠️ **Hangi ailenin hangi işi yaptığı şartnamede yazmıyordu.** Manrope
başlığa, Plus Jakarta Sans gövdeye verildi: Manrope 72px'de dar ve
geometrik, Plus Jakarta Sans 17px'de daha okunur. Ters kurulum başlığı
sıradanlaştırırdı. **Bu bir yorum — ters çevirmek tek satırlık iş.**

⚠️ Türkçe kapsam **fontkit ile doğrulandı**, varsayılmadı:

```
Manrope            | eksik: 6  ⁿ ▾ ⌘ ⌖ ✓ ✗ | TÜRKÇE eksik: YOK
Plus Jakarta Sans  | eksik: 7  ‑ ⁿ ▾ ⌘ ⌖ ✓ ✗ | TÜRKÇE eksik: YOK
```

⚠️ **Küçük bir gerileme var ve saklanmıyor:** Inter `⌘ ✗ ‑` gliflerini
taşıyordu, Plus Jakarta Sans taşımıyor. Hepsi sembol; yedek font zinciri
devrede ve davranış eskiden beri aynı (o karakterler zaten `latin-ext`
dışında).

⚠️ `--font-serif` jetonu **kaldırıldı**: iki aile de sans; sans bir fontu
"serif" diye adlandırmak sessizce yanlış olurdu. 43 kullanım
`font-baslik`e taşındı.

## 5. ⚠️ Kayıtlı marka paleti de ezildi — yoksa dağıtım hiçbir şey değiştirmezdi

Marka paneli, `globals.css`teki anlamsal jetonları **çalışma zamanında**
eziyor: kayıtlı palet `<head>`e `<style>` olarak basılıyor. Yani
veritabanındaki bohem palet, yeni Aurora jetonlarını sessizce ezer ve site
dağıtımdan sonra **eski renklerde kalırdı** — hiçbir hata vermeden.

Göç (`20260820_163418_aurora_palet`) hem sütun varsayılanlarını hem KAYITLI
SATIRI güncelliyor. Elle seçilmiş renkler de eziliyor: bu bir renk
düzeltmesi değil, paletin tamamının değişmesi.

## 6. Üç rampa silindi, iki rampa kaldı

`kakao-*`, `terracotta-*`, `adacayi-*` gitti; `notr-*` (sıcak nötr) ve
`gold-*` (altın) kaldı. Önceki palette marka ve eylem ayrı renklerdi çünkü
marka rengi metin olarak kullanılamıyordu; Aurora'da ikisi de altın ve
rolleri **renk değil basamak** ayırıyor.

Bant adları da değişti: `zemin="kakao"` → `koyu`, `pudra` → `bej`,
`terracotta` → `altin`. Bir bant adının rengi söylemesi, yanlış rengi
söylemesinden iyidir.

⚠️ **Dolu bandın metni beyazdan mürekkebe döndü.** Aynı sınıfı taşımaya
devam etseydi bant sessizce okunmaz hâle gelirdi (beyaz altın üzerinde
2,36:1).

## 7. Testler kuralı değil, kuralın gerekçesini takip etti

- `kontrast.test.ts`: rampalar ikiye indi, taban renkler Aurora'ya
  bağlandı, "gold asla metin değil" kuralı **basamağa** bağlandı (açık
  temada ≥600, koyu temada ≤400)
- Yeni çift: mürekkep bantta altın eyebrow (9,05:1)
- Kaldırılan çift: "dolu vurgu butonu" — o buton artık yok (AI arama
  düğmesi mürekkebe geçti; eskiden metin jetonunu dolu zemin olarak
  kullanıyordu ve Aurora'da 2,81:1 veriyordu)
- `ctaKenari.test.ts`: türetilen kenarlık, panelden gelebilecek altı
  farklı renkte de eşiği tutturuyor

## Ölçümler

| Kapı | Durum |
| --- | --- |
| `pnpm typecheck` · `lint` · `build` | temiz |
| `pnpm test` | 92 dosya, **1910 test** yeşil |
| Kontrast (iki tema, tüm çiftler) | geçiyor |
| İstemci JS | `/` 206,2 kB · `/portfoy` 209,0 · `/araclar` 203,0 (eşik 320) |
| Font | 57,5 kB (önce 105,5 kB) |
| Duman testi | 14 sayfa 200 (`/stil-rehberi` üretimde 404 — tasarım gereği) |

⚠️ **Lighthouse bu PR'da ölçülmedi.** Şartnamenin mobil tabanı (75) hareket
kütüphaneleri geldikten sonra anlamlı; bu adımda sayfa yapısı değişmedi,
yalnızca renk ve yazı değişti. CI'daki ölçüm yine de koşuyor.

## Bundle dökümü (şartname §10 gereği)

Bu adımda **hiçbir kütüphane eklenmedi**. `framer-motion`, `gsap`, `lenis`
ve `lucide-react` Adım 2'nin işi. İstemci JS'i değişmedi; tek ağırlık
farkı fontlarda ve o da **48 kB azaldı**.

## Sırada — onay bekleyen üç şey

1. **Manrope başlık / Plus Jakarta Sans gövde** ayrımı doğru mu?
2. Şartnamenin üç renk önerisi ölçüm gerekçesiyle değiştirildi (§2) — kabul?
3. Kayıtlı marka paletinin ezilmesi (§5) — panelde elle seçtiğin renkler
   varsa gidecek.

Onay gelince Adım 2 (hareket altyapısı) başlar.
