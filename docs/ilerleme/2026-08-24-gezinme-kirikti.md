# Menüdeki hiçbir bağlantı çalışmıyordu — sebep ScrollTrigger sabitlemesi

**Tarih:** 24 Ağustos 2026
**Dal:** `fix/gezinme-kirik`
**Önem:** Site kullanılamaz hâldeydi.

## Belirti

Ziyaretçi anasayfadan menüdeki herhangi bir bağlantıya tıklıyor, sayfa
açılmıyor, tarayıcı "sayfa yüklenemedi" diyor. Aynı adres F5 ile sorunsuz
açılıyor. Sunucu tarafında hiçbir iz yok: bütün rotalar 200, testler yeşil,
Lighthouse masaüstü 100 / mobil 92, CLS 0,000.

## Sebep

`YatayAnlati` (anasayfadaki yatay anlatı) GSAP ScrollTrigger'ı `pin: true`
ile kullanıyordu. ScrollTrigger sabitlediği öğeyi **kendi ürettiği**
`<div class="pin-spacer">` içine taşır:

```
main                        main
  └─ bölüm        →           └─ pin-spacer      ← GSAP ekledi
                                   └─ bölüm      ← taşındı
```

React bu taşımadan habersiz; bölümün ebeveynini hâlâ `<main>` sanıyor.
Ziyaretçi menüden bir bağlantıya bastığında React o bölümü sökmek için
`main.removeChild(bölüm)` çağırıyor, tarayıcı reddediyor:

```
NotFoundError: Failed to execute 'removeChild' on 'Node':
The node to be removed is not a child of this node.
```

Hata `commit` aşamasında düştüğü için React **kökün tamamını** söküyor:
ekran boşalıyor, menü gidiyor. `(site)/error.tsx` sınırı devreye giremiyor
çünkü o sınır `<main>`in içinde, hata ise kökte.

Yalnızca **anasayfadan çıkarken** oluyordu — sabitlenen bölüm orada.
Ziyaretçilerin çoğu anasayfaya indiği için pratikte menünün tamamı ölüydü.
`/portfoy` → `/mahalleler` geçişi ölçüldü ve sorunsuzdu.

## Şüpheliler nasıl elendi

Talimat "tahmin etme, izole et" diyordu. Her şüpheli **çalışma zamanında**
tek tek kapatıldı (yeniden derleme yok; sayfa yüklenmeden önce enjekte
edilen küçük bir betikle):

| Senaryo | Sonuç |
| --- | --- |
| Temel (hareket açık, masaüstü) | ✗ `removeChild` NotFoundError |
| `document.startViewTransition` silindi | ✗ aynı hata → **View Transitions değil** |
| `prefers-reduced-motion: reduce` | ✓ sorunsuz → **hareket kodunda** |
| Dokunmatik (pointer coarse) | ✓ sorunsuz |
| Yalnızca Lenis parçası engellendi | ✗ aynı hata → **Lenis değil** |

Geriye `masaustuMu()` kapısının ardındaki GSAP kalıyordu. DOM incelemesi
kesin kanıtı verdi: `.pin-spacer` düğümü `<main>` ile bölüm arasına
girmişti.

⚠️ **Ölçümün kendisi üç kez yanılttı.** Headless Chrome `(pointer: fine)`
sorgusuna varsayılan olarak `false` diyor; `masaustuMu()` false dönüyor ve
hareket kodunun tamamı atlanıyor. İlk üç denemede tarayıcı "her şey
çalışıyor" dedi çünkü kırılan kod yolu hiç çalıştırılmamıştı. `matchMedia`
yamalandıktan sonra arıza ilk denemede çıktı.

## Düzeltme

Aracı düğümü GSAP değil **biz** veriyoruz. ScrollTrigger'ın kendi kaynağı:

```js
if (pin.parentNode !== spacer) { parent.insertBefore(spacer, pin); spacer.appendChild(pin) }
```

`pinSpacer` olarak, sabitlenenin React'teki ebeveyni verilirse bu koşul
hiç sağlanmıyor: tek bir `appendChild` bile çalışmıyor, yalnızca satır içi
stil yazılıyor. React'in gördüğü ağaç ile tarayıcıdaki ağaç aynı kalıyor.

İki bağımsız koruma birlikte uygulandı:

1. `pinSpacer: dis` — aracı düğüm bizim, DOM taşıması yok.
2. `pin: sabit` — sabitlenen artık bileşenin **kök** düğümü değil, içindeki
   bir düğüm. React bir alt ağacı silerken yalnızca en üstteki düğüm için
   `removeChild` çağırıyor; taşınan düğüm kökün içinde kalırsa React onu
   hiç görmüyor.

Ayrıca:

- `kill(true)` — sabitlemenin yazdığı satır içi ölçüler geri alınıyor.
- `.catch()` — hareket kurulumu hata verirse yutuluyor. Hareket süs,
  gezinme işlev; efektin başarısızlığı sayfayı kullanılamaz yapmamalı.

Animasyon aynen duruyor: kaydırmada ray −1144 piksel ötelendi, `.pin-spacer`
artık `<main>` içindeki kendi düğümümüz.

## Yan bulgu: yeni sayfa en üstten açılmıyordu

Ölçüm sırasında çıktı. Ziyaretçi anasayfanın 2400 pikselindeyken
`/portfoy`'a geçince sayfa 0'da değil **30 pikselde** duruyordu — Lenis
Next'in kaydırma sıfırlamasını kendi yumuşatmasıyla oynatıyor ve
asimptotik eğri sıfıra varamadan bitiyor. Tıklamadan sonraki üç saniye:

```
0ms=1106  200ms=292  400ms=30  600ms=30 … 2800ms=30
```

Aynı ölçüm az hareket kipinde (Lenis yok) 0 veriyor.

Düzeltme `HareketAltyapisi` içinde: rota değişiminde `scrollTo(0, {
immediate: true })`. **Geri/ileri korunuyor** — `popstate` bayrağı tutuluyor
ve o turda sıfırlama atlanıyor; ölçüldü: geri tuşundan sonra 2400'e
dönüyor.

⚠️ Önce Lenis'in `stopInertiaOnNavigate` seçeneği denendi ve **işe
yaramadı** (30 piksel aynen kaldı): o seçenek tıklama anında `reset()`
çağırıyor, Next'in kaydırma sıfırlaması ise tıklamadan sonra geliyor.
Ölçüm çürüttüğü için geri alındı.

## Kalıcı denetimler

### 1. `scripts/gezinme-dumani.mjs` — gerçek tarayıcı, CI'da ENGELLEYİCİ

Üç rotaya **gerçek fare olaylarıyla** tıklıyor (`a.click()` değil: üstteki
katmanlar tıklamayı yutuyorsa yalnızca böyle görünür). İki kipte koşuyor:
hareket açık ve az hareket. Her rota için adres, başlık, gövde ve
yakalanmamış istisna denetleniyor.

Bağımlılık eklemiyor: CDP'ye Node 22'nin yerleşik `WebSocket`'i ile
bağlanıyor, Chrome'u kendisi başlatıyor.

Testin arızayı **gerçekten** yakaladığı, düzeltme geri alınıp yeniden
derlenerek kanıtlandı:

```
✗ hareket AÇIK — 9 sorun:
    · /portfoy: sayfa başlığı boş — React ağacı çökmüş olabilir
    · /portfoy: yakalanmamış istisna → NotFoundError: ... removeChild ...
    …
✓ az hareket   — 3 rota, hepsi açıldı        ← tek başına GÖRMEZDİ
```

Son satır kritik: `(pointer: fine)` yaması olmadan bu test yeşil derdi.

### 2. `src/lib/hareket/pinYalitimi.test.ts` — kaynak denetimi

ScrollTrigger `pin` kullanan her bileşen için: `pinSpacer` verilmiş mi,
`pin` ile `pinSpacer` ayrı düğüm mü, `kill(true)` çağrılıyor mu, kurulum
hata yutuyor mu. Beş iddia; korumalardan biri kaldırıldığında kırıldığı
denendi.

### 3. `src/app/global-error.tsx` — boş ekran bir daha olmasın

Kök çöktüğünde `(site)/error.tsx` devreye giremiyor ve ziyaretçi bembeyaz
bir sayfa görüyordu. Artık Türkçe bir mesaj, "Sayfayı yenile" ve "Ana
sayfaya dön" var. Satır içi stil kullanıyor — kök düzen render edilmediği
için `globals.css` yüklenmiyor.

Ham hex muafiyeti aldı; bedeli ödendi: `disiplin.test.ts` içindeki yeni
"kök hata ekranı onaylı paletten boyanıyor" testi, yazılan her hex'in
palette birebir var olmasını şart koşuyor.

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (102 dosya, 2043 test) ·
`pnpm build` temiz. Gezinme dumanı iki kipte de geçiyor. Anlatı animasyonu
ve geri/ileri kaydırma geri yüklemesi ölçülerek doğrulandı.
