# Aurora Adım 5 — ölçüm: kapı geçildi, iki şey düzeltildi

**20 Ağustos 2026** · dal: `feature/aurora-palet`

Şartname §10'un kapısı gerçek Lighthouse koşumuyla ölçüldü (CI, üç koşum
medyanı, iki cihaz, üç sayfa). **Kapının tamamı geçildi.**

---

## Sonuçlar

### Masaüstü — hedef: performans ≥90, erişilebilirlik ≥95, BP 100, SEO 100

| Sayfa | Performans | Erişilebilirlik | En iyi uygulamalar | SEO |
| --- | --- | --- | --- | --- |
| anasayfa | ✅ 100 | ✅ 100 | ✅ 100 | ✅ 100 |
| mahalleler | ✅ 100 | ✅ 100 | ✅ 100 | ✅ 100 |
| portfoy | ✅ 100 | ✅ 100 | ✅ 100 | ✅ 100 |

### Mobil — hedef: performans ≥75, erişilebilirlik ≥95, BP 100, SEO 100

| Sayfa | Performans | Erişilebilirlik | En iyi uygulamalar | SEO |
| --- | --- | --- | --- | --- |
| anasayfa | ✅ 91 | ✅ 100 | ✅ 100 | ✅ 100 |
| mahalleler | ✅ 92 | ✅ 100 | ✅ 100 | ✅ 100 |
| portfoy | ✅ 89 | ✅ 100 | ✅ 100 | ✅ 100 |

Mobil taban 75'ti; en düşük sayfa 89 — **14 puan pay var.** Üç hareket
kütüphanesiyle 95'in gerçekçi olmadığı varsayımıyla indirilen taban,
kütüphanelerden biri düşünce fazlasıyla karşılandı.

### Core Web Vitals

| Cihaz | LCP | CLS | TBT |
| --- | --- | --- | --- |
| Masaüstü | 0,7–0,8 sn | **0,000** | 0–2 ms |
| Mobil | 3,2–3,7 sn | **0,000** | 64–116 ms |

⚠️ **CLS üç sayfada da 0,000** — şartnamenin sıfır toleranslı tek sayısı.
Hareketin tamamı `transform`/`opacity` üzerinden olduğu için düzen hiç
kaymıyor.

⚠️ **Mobil LCP yine "3,3 sn" diyor ve yine bir model.** Aynı rapordan ham
metrik: `observedLargestContentfulPaint = 276 ms`. Yani sayfa gerçekte 276
ms'de boyanıyor; 3,3 sn onun simüle edilmiş 4G telefona yansıtılmış hâli.
Gerçek sayı, alan verisi biriktikçe panelde görünecek (20 Ağustos'ta
kurulan Core Web Vitals ölçümü).

## Bundle — §10 bütçesi

| Rota | gzip | Bütçe |
| --- | ---: | ---: |
| `/` | **210,6 kB** | 320 |
| `/portfoy` | 210,7 kB | — |
| `/portfoy/[slug]` | 213,9 kB | — |
| `/mahalleler` · `/araclar` · `/hakkimizda` · `/ticari` | 204,7 kB | — |
| `/harita` | 451,4 kB | ⚠️ bilinçli, aşağıda |

**Hareket kodu: 50,3 kB** (GSAP 27,3 + ScrollTrigger 17,5 + Lenis 5,5) —
bütçe 120 kB. framer-motion düşünce %86'dan %42'ye indi.

⚠️ `/harita` MapLibre taşıyor ve tek başına 451 kB. Bütçe yalnızca ana
sayfa için tanımlı; harita bir uygulama yüzeyi ve kütüphane başka hiçbir
rotaya girmiyor — ana sayfadaki harita bölümü de görünene kadar inmiyor.

## Düzeltilen iki şey

**1. Aynı hero fotoğrafı sayfada iki kez basılıyordu.** Üretilen HTML'de
görüldü: biri vitrinin tam ekran zemini (`priority`), biri slider bandının
ilk slaydı (`lazy`). Ziyaretçi için tekrar, ağ için ikinci istek. Slider
artık ikinci slayttan başlıyor.

⚠️ Bu, Lighthouse skorunda görünmüyordu — ikinci görsel tembel yükleniyor.
HTML'e bakmadan bulunamazdı.

**2. Lighthouse özet betiğinin eşikleri eskiydi.** Betik hâlâ eski
şartnamenin sayılarını kullanıyordu (her cihazda performans ≥90) ve
`/portfoy` mobili 89 ile ⚠️ işaretliyordu — oysa Aurora'nın mobil tabanı 75.
Eşikler cihaza bağlandı: masaüstü 90, mobil 75, BP ve SEO 100.

⚠️ Yanlış eşik, doğru ölçümden daha zararlı: her koşumda kırmızı gören
bir kapı, kısa sürede görmezden gelinen bir kapıya dönüşür.

## Ölçümden ÇIKMAYAN iş

Lighthouse'un tek somut önerisi `unused-javascript` (28 KiB) ve kaynağına
bakıldığında React'in kendi çalışma zamanı çıktı — ilk boyamada
kullanılmayan kısmı. Kırpılabilir bir şey değil; "öneri var" diye
dokunmak, ölçüme değil listeye çalışmak olurdu.

## Doğrulama

- Lighthouse: CI, 3 koşum medyanı, 2 cihaz × 3 sayfa (runner benchmarkIndex
  medyanı 2293, yayılım %19 — karşılaştırılabilir)
- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 95 dosya, **1967 test** yeşil

⚠️ Chrome yerel ortamda açılmıyor (paylaşılan kütüphaneler eksik), bu yüzden
ölçüm CI'da yapıldı ve rapor dosyaları oradan indirilip özetlendi.
