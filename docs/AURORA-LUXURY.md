# AURORA LUXURY — geçerli tasarım şartnamesi

**20 Ağustos 2026 itibarıyla tek geçerli tasarım şartnamesi budur.**

Geçersiz kılınan belgeler:

- `docs/FRONTEND-YENIDEN-TASARIM.md` — arşiv, uygulanmaz
- `SAYFA-YAPILARI-SIFIRDAN.md` ve `ANASAYFA-MOCKUP-SARTNAMESI.md` — depoda
  hiç olmadılar; şartnamede geçersiz sayıldıkları için burada da anılıyor

⚠️ İŞ MANTIĞI DEĞİŞMEZ. Görünümler değişir, varlıklar değişmez: EİDS rozeti
ve yayın engeli, kira çarpanı ve m² fiyatı, gizli portföy, duvarsız
değerleme, gözlem sayısı (n), yatırım tavsiyesi feragatleri, KVKK çerez
akışı, güneş haritası, yatırım filtreleri, altbilgideki yetki belgesi
numarası.

---

## 1. Palet — ölçülmüş değerler

Şartnamenin verdiği taban renkler:

| Rol | Değer | Jeton |
| --- | --- | --- |
| Arka plan | `#FCFBF8` | `--color-notr-50` |
| Kartlar | `#FFFFFF` | `--color-yuzey` |
| Sıcak bej | `#F5F0E8` | `--color-notr-100` |
| Kenarlıklar | `#ECE7DF` | `--color-notr-200` |
| Altın | `#C7A36B` | `--color-gold-400` |
| Ana metin | `#1C1C1C` | `--color-notr-900` |

Rampaların geri kalanı OKLab'de türetildi; çapalar birebir korundu.

### ⚠️ Altın kontrast sorunu — şartnamenin uyarısı doğru çıktı

| İddia | Şartname | Ölçülen | Sonuç |
| --- | --- | --- | --- |
| Altın metin, arka plan üzerinde | 2,27 | **2,28** | ❌ AA geçmiyor |
| Beyaz metin, altın buton üzerinde | 2,34 | **2,36** | ❌ AA geçmiyor |
| Mürekkep metin, altın buton üzerinde | 6,9 | **7,20** | ✅ |

Dolayısıyla altın **açık zeminde metin değildir** ve dolu altın butonun
üzerine **beyaz değil mürekkep** yazılır.

### Türetilen altın varyantları

Ölçüm üç açık yüzeyde birden yapıldı — arka plan, kart, **sıcak bej bant**.
Üçüncüsü belirleyici oldu:

| Jeton | Değer | Arka plan | Kart | Bej | Eşik |
| --- | --- | --- | --- | --- | --- |
| `--color-vurgu` (metin) | `#7A5E2E` | 5,85 | 6,05 | 5,33 | ✅ 4,5 |
| `--color-vurgu-baslik` (≥24px) | `#937442` | 4,21 | 4,35 | 3,84 | ✅ 3 |
| `--color-gold-cizgi` (dekoratif) | `#C7A36B` | 2,28 | 2,36 | 2,08 | eşik yok |
| `--color-gold-guclu` (anlamlı öğe) | `#937442` | 4,21 | 4,35 | 3,84 | ✅ 3 |

⚠️ **Şartnamenin önerdiği `#8A6B2E` kullanılmadı**: arka planda 4,80 ✅ ve
kartta 4,97 ✅ ama **sıcak bej bantta 4,38 ❌**. Bej, sayfanın en çok
kullanılan ikinci yüzeyi.

⚠️ **Şartnamenin önerdiği `#A8854A` (başlık) geçiyor** ama bejde payı 0,02
(3,02 / 3,00). Bir basamak koyusu alındı.

### ⚠️ İkincil metin `#6B7280` kullanılmadı

Şartnamenin ikincil metin rengi arka planda 4,67 ✅, kartta 4,83 ✅, **bej
bantta 4,26 ❌**. Ayrıca soğuk gri: paletin geri kalanı sıcakken maviye
çalıyor. Yerine sıcak nötr rampasının iki basamağı kullanılıyor —
`--color-metin-2` (9,45 · 9,78 · 8,62) ve `--color-metin-3`
(5,81 · 6,01 · 5,30).

### ⚠️ Dolu altın butonun kenarlığı zorunlu

Altın dolgu sayfa zemininden yalnızca **2,28:1** ayrışıyor; WCAG 1.4.11
bileşen sınırı için 3:1 istiyor. Koyu altın buton (gold-700 + beyaz, 6,05)
denendi ve reddedildi — kahverengiye düşüp ışıltıyı öldürüyor. Çözüm
kenarlık: `--color-aksan-kenar` = `#937442`, 4,21:1.

Marka panelinden gelen palet için kenarlık **dolgudan türetiliyor**
(`src/lib/marka/ctaKenari.ts`): zeminden 3:1 + pay ayrışana kadar
koyulaşıyor, koyu zeminde açılıyor. Varsayılan palette türetilen değer
`#A38658` (3,32:1); statik jeton `#937442` (4,21:1) kenarlığın panel
kapalıyken de doğru olmasını sağlıyor.

---

## 2. Tipografi

| Aile | Rol | Alt küme |
| --- | --- | --- |
| Manrope | Başlıklar (`--font-baslik`) | 28.296 bayt |
| Plus Jakarta Sans | Gövde ve arayüz (`--font-sans`) | 29.236 bayt |

Toplam **57.532 bayt** — önceki çift (Inter + Source Serif 4) 105.468 baytdı.
Alt küme kendi boru hattımızla üretiliyor (`pnpm font:altkume`), karakter
listesi `src/lib/tipografi/alfabe.ts`.

⚠️ **Hangi ailenin hangi işi yaptığı şartnamede yazmıyordu.** Manrope 72px'de
dar ve geometrik duruyor; Plus Jakarta Sans 17px gövdede daha okunur (açık
harf boşluğu, yüksek x-yüksekliği). Ters kurulum başlığı sıradanlaştırır.

⚠️ İkisi de sans. `--font-serif` jetonu kaldırıldı — sans bir fontu "serif"
diye adlandırmak sessizce yanlış olurdu.

### Ölçek

| Jeton | Masaüstü | Mobil |
| --- | --- | --- |
| `--text-hero` | 72 | 40 |
| `--text-baslik-1` | 56 | 34 |
| `--text-baslik-2` (bölüm) | 48 | 30 |
| `--text-baslik-3` | 24 | — |
| `--text-govde` | 17 / satır 1,7 | aynı |

Tüm rakamlarda `tabular-nums` (gövdede tanımlı, istisna yok).
Ağırlık yalnızca 400 ve 500.

Köşe yarıçapı 24px (`--radius-kart`, `--radius-buton`), gölgeler geniş
yayılımlı ve düşük opaklıkta.

---

## 3. Kapı — her aşamanın sonunda

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` → dördü de temiz
- Kontrast: AA her çiftte, **iki temada** (`src/lib/tasarim/kontrast.test.ts`)
- CLS 0,000 — hareket düzen kaydıramaz
- Bundle: ana sayfa ≤320 kB gzip · hareket kodu ≤120 kB gzip
- Lighthouse (3 koşum medyanı): masaüstü performans ≥90, mobil ≥75;
  erişilebilirlik ≥95, BP 100, SEO 100 (iki cihazda)

⚠️ Mobil taban 75 ve bu bilinçli bir indirim: üç hareket kütüphanesiyle
mobilde 95 gerçekçi değil. **75'in altına düşerse durulur ve bildirilir** —
hangi bölüm, hangi animasyon, kaç kB.

⚠️ Bir animasyon hedefi bozuyorsa animasyon değişir, hedef değil.

---

## 4. Çalışma sırası

1. **Palet + tipografi + altın kontrast kanıtı** ← bu adım tamamlandı, onay bekliyor
2. Hareket altyapısı (framer-motion, gsap, lenis) + bundle dökümü
3. Global UI (navbar, WhatsApp, geçişler, glassmorphism, mikro etkileşimler)
4. Ana sayfa — bölüm bölüm
5. Ölçüm + düzeltme
6. Diğer sayfalar

Her adım ayrı PR.

⚠️ **Verisi olmayan bölüm kuralı:** yüzen istatistik kartı, canlı piyasa
göstergesi ve referanslar bölümleri YAZILIR ama veri yokken RENDER EDİLMEZ.
Boş durum kartı gösterilmez — premium his orada ölür. Veri geldiğinde
kendiliğinden açılır.

⚠️ **Uydurma veri yasağı görsellere de uygulanır:** Çorlu'nun telifli
fotoğrafı yokken başka bir şehrin görselini "Çorlu" diye koymak kural 2'nin
görsel karşılığıdır.
