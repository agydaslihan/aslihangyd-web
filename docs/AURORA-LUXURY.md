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
| Plus Jakarta Sans | Başlıklar (`--font-baslik`) | 29.236 bayt |
| Manrope | Gövde, arayüz ve veri (`--font-sans`) | 28.296 bayt |

Toplam **57.532 bayt** — önceki çift (Inter + Source Serif 4) 105.468 baytdı.
Alt küme kendi boru hattımızla üretiliyor (`pnpm font:altkume`), karakter
listesi `src/lib/tipografi/alfabe.ts`.

⚠️ **Hangi ailenin hangi işi yaptığı şartnamede yazmıyordu; ölçümle
belirlendi.** Düz `n` / yuvarlak `o` genişliği: Manrope %57,3 / %57,4
(geometrik), Plus Jakarta Sans %57,3 / %65,5 (hümanist). 72px'de geometrik
oran "teknoloji girişimi" hissi veriyor. Büyük harf yüksekliği de aynı
yönde: 72px'de Manrope 51,8 px, Plus Jakarta Sans 53,6 px.

⚠️ **Tabular rakam ikisinde de var** — `tnum` özelliği iki ailede de
rakamları eşitliyor (Manrope 0,620 em, Plus Jakarta Sans 0,600 em). Veri
gövdesi Manrope'ta: rakamları bir tık geniş ve sütunda daha rahat okunuyor.

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

## 3. Hareket kütüphaneleri — ölçümden sonraki durum

| Kütüphane | Durum | Nerede |
| --- | --- | --- |
| GSAP + ScrollTrigger | **kullanılıyor** | §6.6 yatay anlatı (kaydırmaya bağlı `scrub`) |
| Lenis | **kullanılıyor** | Masaüstü yumuşak kaydırma |
| framer-motion | **düşürüldü** | Sıfır kullanım; 52,7 kB bütçenin yarısıydı |

⚠️ **framer-motion ölçümle düşürüldü.** Adım 2'de eklendi, Adım 3 ve 4'te
hiç kullanılmadı: hover, fade, basma, alt çizgi, yavaş zoom ve sayfa geçişi
CSS'te; kaydırma anlatısı GSAP'ta. Geri gelmesi için üç gerekçeden biri
gerekiyor — paylaşılan düzen geçişi, sürükleme jesti, CSS'in taşıyamadığı
yay fiziği. Bağımlılığın yokluğu `hareketYukleme.test.ts` içinde
denetleniyor.

⚠️ Yükleme sözleşmesi değişmedi: her iki kütüphane de LCP'den sonra,
yalnızca gereken sayfada ve `prefers-reduced-motion` kapalıyken iniyor.

---

## 4. Kapı — ölçülen sonuçlar

Son ölçüm (CI, 3 koşum medyanı, 2 cihaz × 3 sayfa):

| | Masaüstü | Mobil |
| --- | --- | --- |
| Performans | 100 · 100 · 100 | 91 · 92 · 89 |
| Erişilebilirlik | 100 | 100 |
| En iyi uygulamalar | 100 | 100 |
| SEO | 100 | 100 |
| CLS | 0,000 | 0,000 |

Ana sayfa 210,6 kB gzip (bütçe 320) · hareket kodu 50,3 kB (bütçe 120).

⚠️ Mobil LCP raporda 3,2–3,7 sn görünüyor ve bu bir MODEL: aynı raporun ham
metriği `observedLargestContentfulPaint = 276 ms`. Gerçek sayı alan
verisinden gelecek (panelde Core Web Vitals bölümü).

### Kapının kendisi

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

## 5. Çalışma sırası

1. ✅ Palet + tipografi + altın kontrast kanıtı
2. ✅ Hareket altyapısı + bundle dökümü
3. ✅ Global UI (navbar, WhatsApp, geçişler, glassmorphism, mikro etkileşimler)
4. ✅ Ana sayfa — bölüm bölüm
5. ✅ Ölçüm + düzeltme — kapının tamamı geçildi
6. ✅ Diğer sayfalar — 13 sayfa, 5 PR

**Aurora Luxury uygulaması tamamlandı.** Kalan iş koddan değil veriden
geliyor: Çorlu'nun havadan fotoğrafı, Aslıhan'ın portresi, koyu zemin için
açık renkli logo. Üçü de `docs/SENDEN-BEKLENENLER.md` içinde.

Her adım ayrı PR.

⚠️ **Verisi olmayan bölüm kuralı:** yüzen istatistik kartı, canlı piyasa
göstergesi ve referanslar bölümleri YAZILIR ama veri yokken RENDER EDİLMEZ.
Boş durum kartı gösterilmez — premium his orada ölür. Veri geldiğinde
kendiliğinden açılır.

⚠️ **Uydurma veri yasağı görsellere de uygulanır:** Çorlu'nun telifli
fotoğrafı yokken başka bir şehrin görselini "Çorlu" diye koymak kural 2'nin
görsel karşılığıdır.
