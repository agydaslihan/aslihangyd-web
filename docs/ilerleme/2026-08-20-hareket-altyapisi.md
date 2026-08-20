# Aurora Adım 2 — hareket altyapısı: kod ne zaman iner, inmez

**20 Ağustos 2026** · dal: `feature/aurora-palet`

Üç kütüphane eklendi ve tek bir animasyon yazılmadı. Bu adımın konusu
hareketin kendisi değil, **hareket kodunun yükleme sözleşmesi**.

---

## Neden önce sözleşme

Şartname §1'in dört maddesi pazarlığa kapalı ve dördü de "ne zaman iner"
sorusuna bakıyor. Bir animasyon yazıp sonra optimize etmek, bu maddeleri
sonradan geri almak demekti: `import` bir kez statik yazıldığında
kütüphane o sayfanın paketine giriyor ve oradan çıkarmak yeniden yazmayı
gerektiriyor.

Bu projede aynı sınıf hata bir kez yaşandı: tek bir sabit uğruna zod'un
tamamı `/portfoy` paketine giriyordu — 63 kB, hiç çalıştırılmadan.

## Kurulan yapı

| Dosya | İşi |
| --- | --- |
| `lib/hareket/kapi.ts` | Az hareket tercihi, masaüstü kontrolü, LCP sonrası zamanlayıcı |
| `lib/hareket/yukleyiciler.ts` | Üç kütüphanenin TEK dinamik giriş kapısı |
| `components/hareket/HareketAltyapisi.tsx` | Düzende duruyor, hiçbir şey çizmiyor |
| `components/hareket/Devinim.tsx` | `LazyMotion` sağlayıcısı (Adım 3–4 kullanacak) |

## ⚠️ Dört kural, dört karşılık

**1. LCP'den sonra.** `lcpSonrasi` üç kademeli: gerçek LCP olayı
(`PerformanceObserver`) → `requestIdleCallback` → 3 sn zaman aşımı. Üçü de
gerekli: Safari'de LCP olayı yok, hiç boşa çıkmayan bir sayfada
`requestIdleCallback` hiç tetiklenmiyor.

**2. Rota bazlı bölme.** GSAP hiçbir yerden çağrılmıyor; onu kaydırma
anlatısı olan sayfa `gsapGetir()` ile isteyecek. GSAP çekirdeği ile
ScrollTrigger **ayrı parçalar**: yalnızca `gsap.to()` kullanan bir sayfa
eklentiyi indirmiyor.

**3. Lenis sadece masaüstü.** `pointer: fine` **ve** ≥1024 px. Genişlik
tek başına yetmiyor — 1024 px'lik bir tablet de dokunmatik ve orada Lenis
native kaydırmayı bozuyor.

**4. Az hareket → KOD İNMİYOR.** Kapı `import()` çağrısından ÖNCE
soruluyor. "Yükle ama animasyonu kapat" reddedildi: kapalı bir animasyonun
kütüphanesi yine de indirilir, ayrıştırılır ve ana iş parçacığını meşgul
eder. Hareketi istemeyen ziyaretçi çoğu zaman onu en az kaldırabilecek
cihazdadır.

## ⚠️ `import type` kural dışı — ve sebebi teknik

Yükleyici dosyası `gsap` ve `lenis`ten TÜR içe aktarıyor. TypeScript tür
içe aktarmalarını derlemede tamamen siliyor; üretilen JavaScript'te o
satırdan iz kalmıyor ve paketleyici kütüphaneyi görmüyor. Tür olmadan
yükleyicilerin dönüşü `any` olurdu — projede gerekçesiz `any` yasak.

Denetim bu ayrımı biliyor: `import type` serbest, `import` yasak.

## ⚠️ `LazyMotion strict` — sessiz geri dönüşü kapatıyor

`strict` olmadan `motion.div` yazmak mümkün ve o bileşen, `LazyMotion`'ın
kaçındığı tam paketi geri getiriyor — hiçbir uyarı vermeden. `strict` ile
`motion.*` çalışma zamanı hatası veriyor; doğru kullanım `m.*`.

Özellik kümesi `domAnimation`, `domMax` **değil**: aradaki fark düzen
animasyonları (`layout`, `layoutId`) ve sürükleme jestleri. İkisi de
şartnamedeki hareketlerde yok ve `layout` animasyonları tanımı gereği düzen
kaydırıyor — CLS 0 hedefiyle çelişiyor.

## Bundle dökümü — kütüphane bazında

Parçalar derleme çıktısından tek tek ölçüldü (gzip):

| Parça | gzip | Ne zaman iniyor |
| --- | ---: | --- |
| framer-motion (`domAnimation`) | **52,7 kB** | `Devinim` render edildiğinde |
| gsap çekirdek | **27,3 kB** | `gsapGetir()` çağrıldığında |
| gsap/ScrollTrigger | **17,5 kB** | aynı çağrıda, ayrı parça |
| lenis | **5,5 kB** | masaüstü + LCP sonrası |
| **Toplam hareket kodu** | **103,0 kB** | hiçbiri ilk yükte değil |

Şartname sınırı 120 kB gzip → **altında, ama payı dar (17 kB).**

⚠️ **framer-motion tek başına bütçenin yarısı.** `domAnimation` v13'te
beklediğimden büyük çıktı. Adım 3–4 için sonucu şu: basit geçişler (hover,
fade, basma geri bildirimi) CSS'te kalacak — hâlihazırdaki hareket katmanı
zaten onu yapıyor. Framer yalnızca jest ve orkestrasyon gerektiren yerlerde
kullanılacak. Bütçe zorlanırsa framer'ı tümden düşürüp GSAP + CSS ile
devam etmek gerçek bir seçenek; ölçüm bunu söyleyecek.

### İlk yük değişmedi

| Rota | Önce | Sonra |
| --- | ---: | ---: |
| `/` | 206,2 kB | **206,8 kB** |
| `/portfoy` | 209,0 kB | **209,6 kB** |
| `/mahalleler` | 203,0 kB | **203,6 kB** |

Fark 0,6 kB ve tamamı kapı kodunun kendisi. Üretilen HTML'de dört
kütüphane parçasının hiçbiri yok — tek tek arandı.

## Kalıcı denetim

`hareketYukleme.test.ts` — kaynak taraması:

- üç kütüphane statik içe aktarılmıyor (tür içe aktarma hariç)
- dinamik `import()` yalnızca yükleyici dosyasında
- her yükleyicide kapı çağrısı `import()`ten ÖNCE
- Lenis'te masaüstü kontrolü `import()`ten önce
- `Devinim` hiçbir yerden statik içe aktarılmıyor

⚠️ Testi susturmanın doğru yolu izinli listeye dosya eklemek değil,
kütüphaneyi yükleyici üzerinden istemek.

Test önce bozularak doğrulandı: kapı `import`tan sonraya alınınca iki
denetim birden kırmızıya döndü.

`kapi.test.ts` — kapının kendisi: az hareket, dokunmatik tablet, sunucu
ortamı, üç kademeli zamanlayıcının yalnızca bir kez çalışması, sökülme.

⚠️ Testler jsdom EKLEMEDEN yazıldı: ortam `node` kalıyor ve gereken üç
tarayıcı yüzeyi (`matchMedia`, `setTimeout`, `clearTimeout`) taklit
ediliyor. jsdom bütün paket için bir bağımlılık ve her testin açılışını
yavaşlatırdı.

## Bu adımda YAPILMAYANLAR

- **lucide-react eklenmedi.** Şartname onaylıyor ama ikon değişimi Adım 3'ün
  (Global UI) işi; kullanılmayan bir bağımlılık eklemek, "gereksiz kütüphane
  yok" kuralının kendisiyle çelişirdi.
- **Tek bir animasyon yazılmadı.** Mevcut CSS hareket katmanı ve `Sahne`
  yerinde duruyor; ikisi de kütüphanesiz çalışıyor ve ilk ekran için
  şartnamenin istediği "CSS ile yap" karşılığı zaten bu.
- **Lenis'in gerçekten aktığı görülmedi.** Sunucuda tarayıcı yok; kapı
  mantığı testlerle, parçaların inmediği HTML ile kanıtlandı. Akışın
  kendisi telefonda/masaüstünde göz kontrolü ister.

## Doğrulama

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 94 dosya, **1934 test** yeşil
- İlk yük ölçüldü, tembel parçalar HTML'de aranıp bulunmadı
