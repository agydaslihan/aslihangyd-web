# Aurora Luxury tamamlandı — altı adım, on bir PR

**20 Ağustos 2026**

Şartnamenin altı adımı da bitti. Bu kayıt, tek tek PR'larda dağınık duran
kararları bir arada tutuyor.

---

## Ölçülen sonuç

| | Masaüstü | Mobil | Hedef |
| --- | --- | --- | --- |
| Performans | 100 · 100 · 100 | 91 · 92 · 89 | ≥90 / ≥75 |
| Erişilebilirlik | 100 | 100 | ≥95 |
| En iyi uygulamalar | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 |
| CLS | 0,000 | 0,000 | 0,000 |

Ana sayfa **210,6 kB** gzip (bütçe 320) · hareket kodu **50,3 kB**
(bütçe 120) · font **57,5 kB** (önce 105,5).

## Ölçümün değiştirdiği beş karar

Bu projede en pahalı hatalar hep aynı sınıftandı: ekranda iz bırakmayan
sessiz arızalar. Aurora boyunca beş tanesi ölçümle yakalandı.

**1. framer-motion düşürüldü.** Adım 2'de eklendi, Adım 3 ve 4'te sıfır kez
kullanıldı, bütçenin yarısını tutuyordu (52,7 kB). CSS ve GSAP işi
paylaşınca geriye ona kalan bir iş kalmadı. **52,7 kB geri kazanıldı.**

**2. İmleç ışığı ilk yüke giriyordu.** `next/dynamic` yazmak tek başına
tembellik getirmiyor: düzen bir sunucu bileşeni olduğu için `ssr: false`
kullanılamıyor ve parça hidrasyonda baştan isteniyor. Koşulun arkasına
alındı — **21 kB → 628 B.**

**3. `text-white` altın bandın üstünde kaldı.** Palet terracotta'dan altına
dönünce 4,99:1 olan oran **2,36:1**'e düştü. Hiçbir test kırılmadı: kontrast
testi jetonları ölçüyor, bileşende elle yazılmış sınıfı değil. Beş yerde
düzeltildi ve kural teste bağlandı.

**4. SVG temizliği yanlış kancadaydı.** `beforeChange` çalışıyordu ama
etkisi yoktu — Payload diske yazılacak tamponu daha önce hazırlıyor. Dış
referanslı bir SVG yüklendi, temizlenmeden servis edildi. `beforeOperation`a
taşındı; **233 bayt → 194 bayt ve temiz.**

**5. Aynı hero fotoğrafı iki kez basılıyordu.** Biri tam ekran zemin
(`priority`), biri slider bandının ilk slaydı (`lazy`). Lighthouse skorunda
görünmüyordu; üretilen HTML'e bakmadan bulunamazdı.

## Kalıcı hale gelen kurallar

Her biri bir testin arkasında:

- Hareket kütüphaneleri yalnızca dinamik, yalnızca yükleyiciden, kapı
  `import()`ten önce (`hareketYukleme.test.ts`)
- Düşürülen kütüphane geri sızamaz — `package.json` denetleniyor
- Geniş yarıçaplı `backdrop-blur` yasak; cam yüzey `.cam` üzerinden ve
  mobilde düz renge düşüyor (`globalUI.test.ts`)
- `text-white` yalnızca koyu zeminli iki dosyada
- Lighthouse eşikleri tek kaynakta, `CLAUDE.md` ile eşleniyor
  (`lighthouseEsikleri.test.ts`)
- Her sayfa ortak açılış bandını kullanıyor ya da muafiyeti gerekçesiyle
  yazılı (`sayfaAcilisi.test.ts`)
- SVG temizliği `beforeOperation`da kalıyor (`logo.test.ts`)

## Şartnameden bilinçli sapmalar

| Sapma | Gerekçe |
| --- | --- |
| Önerilen üç renk değeri kullanılmadı | Sıcak bej bantta AA'nın altına düşüyorlardı |
| Masonry ızgara yok | CSS masonry yaygın desteklenmiyor; JS masonry düzen zıplatıyor, CLS 0,000 isteniyor |
| Altın hover kenarlığı bölge radarına konmadı | O kartların kenarlığı sinyal türünü taşıyor; dekoratif renk anlamın üstüne yazılmaz |
| Üç yol ayrımı ve araç bölümleri korundu | Şartnamenin on maddesinde yoklar ama işlev taşıyorlar |
| `/harita` ve `/rapor/*` dışarıda | Uygulama yüzeyi ve yazdırma çıktısı; palet ve tipografiyi jetonlardan aldılar |

## Sırada — kod değil veri

1. **Çorlu'nun havadan fotoğrafı** — artık doğrudan tam ekran vitrin zemini
   oluyor (panelden ilk hero slaydı).
2. **Aslıhan'ın portresi** — kurucu hikâyesi bölümü onunla dolacak.
3. **Koyu zemin için açık renkli logo** — altbilgideki hale sorununun tek
   gerçek çözümü.
4. **Telefondan görsel doğrulama** — cam yüzeyler, yatay anlatının akışı,
   haritanın açılışı, galeri büyütme. Sunucuda tarayıcı yok; bunlar
   ölçülemedi.
