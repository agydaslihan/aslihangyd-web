# 14 Eylül 2026 — Ana sayfa CLS sıfıra döndü; kapılar hedefe bakıyor

## Neden

Masaüstü ana sayfa CLS **0,088**, mobil **0,052** idi — hedef 0,000.
Asıl mesele bozulmanın kendisi değil, **iki hafta fark edilmemesiydi**:
Lighthouse adımı raporlayıcıydı ve özeti "hedef < 0,1" yazıyordu.

## Teşhis — ölçülerek

### Hangi öğe

Lighthouse bir kayma olayında yalnızca en büyük kaynağı gösteriyor
(`SinematikHero` başlık bloğu). Gerçek tarayıcıda `PerformanceObserver`
ile bütün kaynaklar okundu: **tek kayma, bütün ilk ekran aynı anda
57 px yukarı** — başlık 273→216, açıklama, butonlar, EİDS satırı ve hero
kısalınca ekrana giren "Neden Aslıhan GYD" bölümü (0→748).

### Neden

Yayındaki sürümde (`ee59b87`), yalıtılmış tarayıcı bağlamında,
Lighthouse ekran boyutlarıyla:

| Cihaz | Çerez bandı açık | Onay çerezi var | Lighthouse |
| --- | --- | --- | --- |
| Masaüstü 1350×940 | 0,0876 (3/3) | 0 (3/3) | 0,0876 |
| Mobil 412×823, 4× CPU | 0,0517 (2/2) | 0 (2/2) | 0,0517 |
| Mobil 412×823, yavaşlatmasız | 0 | 0 | — |

`CerezBanneri` bayrağı (`data-cerez-bandi`) ve ölçtüğü yüksekliği
**hidrasyondan sonra** yazıyordu; vitrin çizildikten sonra bant kadar
kısalıyor ve iç boşluğunu daraltıyordu. İçerik dikeyde ortalı, hepsi
kayıyordu.

⚠️ Yavaşlatmasız mobilde kayma yok: hidrasyon ilk boyamadan önce
bitiyor. CI'daki ara sıra `0,000` koşumlar da bu zamanlamadan.

⚠️ İlk tahmin (font değişimi) yanlıştı ve ölçümle düştü — Lighthouse'un
tek kaynak göstermesi "yalnızca başlık kaydı" gibi okunmuştu.

### Hangi PR

`c96691c` — "fix(ilk ekran): vitrin butonları tıklanmıyordu" (31 Ağustos).
Bayrak, ölçülen yükseklik ve iki CSS kuralı orada girdi; çözdüğü sorun
(bant butonları örtüyordu) gerçekti.

⚠️ Sınır: o tarihten önceki Lighthouse çıktılarının süresi dolmuş.
Erişilebilen 29 koşumun hepsi (31 Ağustos 19:19'dan beri) 0,088–0,089;
belgelenmiş son 0,000 24 Ağustos. "İlk sıfırdan çıkan koşum" doğrudan
gösterilemiyor; mekanizma ölçümle doğrulandı.

⚠️ Saha verisi bunu GÖREMEZDİ: kayma yalnızca onay vermemiş ziyaretçide,
vital ölçümü ise yalnızca onay veren ziyaretçiden toplanıyor.

## Düzeltme

### 1. Bayrak sunucuda — `app/(site)/layout.tsx`

`<html data-cerez-bandi="acik">` onay yokken sunucuda basılıyor. Onay
zaten orada okunuyor (`cerezOnayiniOku`) ve bant da aynı bilgiyle
çiziliyor; ikisi ayrışamaz.

⚠️ **Plan değişti:** onaylanan yol `<head>`e senkron betikti. Uygulamaya
geçerken düzenin onayı sunucuda ZATEN okuduğu görüldü — "sunucuda bayrak"
seçeneğini reddetme gerekçem ("kök düzeni dinamik yapar") yanlıştı.
Sunucu bayrağı aynı işi satır içi betiksiz, CSP riskisiz ve JavaScript
inmese de doğru yapıyor.

### 2. Kompakt bant yüksekliği CSS'te — ölçülmüş sabitler

Yayındaki sürümde kompakt bandın yüksekliği (kart + 32 px) 320–1920 px
arasında **1 px adımla** ölçüldü:

| Genişlik | Yükseklik |
| --- | --- |
| 320–336 | 418 |
| 337–398 | 393 |
| 399–439 | 369 |
| 440–522 | 317 |
| 523–625 | 293 |
| 626–639 | 241 |
| 640–649 | 313 |
| 650–752 | 261 |
| 753+ | 236 |

Azalan sınırlar 2 px geç, artan sınır (640) 2 px erken devreye giriyor:
tahmin hiçbir genişlikte gerçeğin **altında** değil (altındaysa bant
butonları örter).

**Tahmin–ölçüm farkı:** 1601 genişliğin **1585'inde birebir**. Kalan 16
genişlik sınır güvenlik payı: +24 px (4), +25 px (4), +52 px (6), +72 px
(2 — 638–639). Fazla tahmin yalnızca vitrini o genişliklerde biraz kısa
bırakıyor; kayma üretmiyor.

### 3. `ResizeObserver` yalnızca "ayrıntılı" görünümde

Oraya kullanıcı tıklayarak geliyor; etkileşimden hemen sonraki kayma CLS'e
sayılmıyor (`hadRecentInput`).

### Kalan kayma — ölçüldü: 0

PR #116 CI'ı, düzeltilmiş derlemede:

| Ölçüm | Sonuç |
| --- | --- |
| Duman — ilk ekran, onaysız, masaüstü 1350×940 | **CLS 0,0000** · bant CSS 236 px = ölçülen 236 px |
| Duman — ilk ekran, onaysız, mobil 412×823 4× CPU | **CLS 0,0000** · bant CSS 369 px = ölçülen 369 px |
| Lighthouse — 3 sayfa × 2 cihaz × 3 koşum | **18 koşumun her biri 0** (yalnızca medyan değil) |

Masaüstü anasayfa performans skoru 98 → 100 (LCP ve baytlar aynı; kayma
kalktı). Mobil LCP değişmedi (3,3–3,7 sn) — beklenen, karar kaydı ayrı.

Kalan küçük kayma yok. Tahmin–ölçüm farkı yalnızca 16 sınır genişliğinde
ve yalnızca vitrin boyunda (+24–72 px), kayma olarak değil.

Engelleyici kapılar ilk koşumda: ilk ekran CLS ✓ (11 sn), Lighthouse
kapıları ✓, istemci JS 214,8 kB (bütçe 320) ✓.

## Kapılar — hedefe bakıyor

| Ölçüt | Önce | Şimdi |
| --- | --- | --- |
| İlk ekran CLS | yok | **engelleyici, 0** — duman testi, onaysız, masaüstü + 4× mobil |
| CLS (3 sayfa × 2 cihaz) | raporlayıcı, "< 0,1" | **engelleyici, 0** — Lighthouse medyanı |
| Erişilebilirlik / en iyi uygulamalar / SEO | raporlayıcı | **engelleyici** |
| İstemci JS | 220 kB'ta uyarı; 320 kB bütçesi denetlenmiyordu | **320 kB engelleyici**, 220 kB uyarı |
| Performans, LCP, TBT, derleme süresi | raporlayıcı | raporlayıcı (runner'a duyarlı) |

### Kapıların kendisi sınandı

- **Duman testi CLS turu** yayındaki (düzeltilmemiş) sürüme karşı koşuldu:
  masaüstü 0,0876 ve mobil 0,0517 ile **kırıldı**, çıkış 1, 12 sn.
- **Lighthouse kapısı** 14 Eylül'ün gerçek CI raporlarıyla koşuldu: iki
  CLS kapısını ❌ işaretledi, çıkış 1; diğer kategoriler 100, yanlış alarm
  yok.

### Gözden geçirmede çıkan boşluklar

- ⚠️ **İstemci JS bütçesi yazılıydı, denetlenmiyordu:** CLAUDE.md 320 kB
  diyordu, betik 220'de uyarıp her durumda 0 dönüyordu. Bugünkü değer
  214,8 kB. Artık engelleyici; ikiz sayı testle kilitli.
- ⚠️ **Hareket kodu bütçesi (≤120 kB) hiç ölçülmüyor.** Açık madde,
  CLAUDE.md'ye yazıldı.

Mobil LCP kararı: `2026-09-14-mobil-lcp-karari.md`.
