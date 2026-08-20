# Portföy ve mahalle sayfaları — vitrin bandı, hareket ve skor rozeti

**20 Ağustos 2026** · dal: `feature/portfoy-mahalle-tasarim`

Ana sayfada kurulan tasarım dili (bkz. `2026-08-20-vitrin-ve-hareket.md`)
liste ve detay sayfalarına taşındı. Bu arada ihlal edilemez bir kuralın
sessizce sızdığı fark edildi ve teste bağlandı.

---

## 1. `SayfaVitrini` — iç sayfaların açılışı yoktu

`/portfoy` ve `/mahalleler` doğrudan küçük, ortalanmış bir başlıkla başlayıp
hemen kart ızgarasına giriyordu. Sayfa "açılmıyor", içeriğin ortasına
düşüyordunuz: ne bulunduğunuz yeri söyleyen bir zemin vardı ne de listenin
ne olduğunu anlatan bir nefes.

Yeni bant, ana sayfadaki vitrinin sakin kardeşi: aynı krem zemin, aynı gold
sıcaklığı, aynı serif başlık — ama sahne yok. İç sayfada gösteri değil,
**konum duygusu** gerekiyor. Gold degrade ana sayfanınkinin yarısı kadar
yoğun (%18 → %10): iç sayfa bir liste taşıyor, zemin dikkat çekerse listeyle
yarışır.

⚠️ **Bant `<h1>` basmıyor ve başlığı kendi kurmuyor.** Sayfa başlıkları
CMS'ten düzenlenebiliyor (`SayfaBasligi`); bileşen onu yeniden kursaydı
düzenlenebilirlik zinciri kopardı. Bant yalnızca zemin, ritim ve giriş
hareketi veriyor — başlık `cocuklar` olarak içeriden geliyor.

⚠️ **Başlıklar ortadan sola alındı.** Bandın sağındaki rakam özetiyle
ortalanmış blok çakışıyordu. `h1` **etiketi değişmedi**: bu sayfaların arama
motoru sıralaması ve ekran okuyucu gezinmesi ona bağlı.

### `VitrinOzeti`

Bandın sağındaki rakamlar. ⚠️ Değer `null` olabilir ve bu bir özellik: sıfır
yazmak yanlış bilgi, hücreyi gizlemek düzeni bozar.

⚠️ **Portföyde filtre uygulanmışken toplam hiç gösterilmiyor.** "3 taşınmaz"
yazan bir bant, ziyaretçiye portföyün tamamı üç sanılırdı. Sonuç sayısı
zaten listenin üstünde ve `aria-live` ile duyuruluyor.

## 2. Hareket, detay sayfalarına indi

Bölüm başlıkları site genelinde `BolumBasligi` üzerinden sahneye giriyordu
ama detay sayfaları o bileşeni kullanmıyor: kendi `<section>` + `<h2>`
yapılarını kuruyorlar. Onbir bölüm tek tek `Sahne` ile sarıldı — altısı
mahalle detayında (skor, rakamlar, trend, harita, tur, "neden bu mahalle"),
beşi ilan detayında (açıklama, drone, tur, çevre, özellikler) artı taşınmaz
bilgileri tablosu.

Kart ızgaralarına kademeli giriş eklendi.

⚠️ **Kademe üst sınırı 5 kart (300 ms).** Sabit çarpan uzun bir listede son
kartı yarım saniye geciktirir ve "takıldı" gibi okunur.

## 3. Mahalle kartında yatırım skoru rozeti

Sitenin ayırt edici rakamı kartta görünür oldu: ziyaretçi mahalleleri
açmadan karşılaştırabiliyor.

⚠️ **Skor yoksa rozet hiç çizilmiyor.** `toplam`, yeterli bileşen verisi
yoksa kancada bilinçli olarak boş bırakılıyor. "—" ya da "0" yazan bir
rozet, skorun var olduğunu ama okunamadığını ima ederdi; ikisi de yanlış.

⚠️ Rozet kartı kaplayan bağlantının üstünde ama `pointer-events-none`:
ikinci bir tıklama hedefi, kartın tamamı zaten tek bir bağlantı olduğu için
kafa karıştırırdı.

⚠️ Ekran okuyucu için `sr-only` etiket: etiketsiz bir "72 /100" anlamsız.

---

## 4. ⚠️ Kural 5 bir bileşene sızdı — ve fark edilmedi

**CLAUDE.md kural 5 ihlal edilemezler listesinde:** yatırım skoru gösterilen
her yerde "bu bilgiler yatırım tavsiyesi niteliğinde değildir" ibaresi
zorunlu. Sebebi çift — itibar ve mevzuat: "garantili getiri" izlenimi
yaratan gösterimler Reklam Kurulu yaptırımı doğurur.

Rozet eklendiği anda kural sızdı: skor artık **kartın kendisinde**, yani
kartı çizen her sayfa farkında olmadan skor yayınlamaya başladı. Ana
sayfada feragat gerçekten unutulmuştu ve **hiçbir şey uyarmadı**.

Bu, projedeki sessiz arıza kalıbının aynısı: kural doğruydu, kod doğruydu,
ama ikisinin arasındaki bağ ekranda iz bırakmadan koptu.

### Çözüm

Feragat `/mahalleler` ve ana sayfaya eklendi. ⚠️ **Rozet başına değil sayfa
seviyesinde**: rozet başına feragat basmak hem okunmaz hem gürültü olurdu ve
kuralın amacı skorun kayıtsız görünmemesi.

Kalıcı denetim: `src/lib/skorlama/feragat.test.ts` — skor gösteren bir
bileşen (`MahalleKarti`, `MahalleSkoru`) kullanan her sayfa `<Feragat />`
basmak zorunda.

⚠️ Testi susturmanın doğru yolu listeden dosya çıkarmak **değil**, sayfaya
feragat eklemek. Skoru göstermek istemiyorsan bileşeni kullanma.

Test önce bozularak doğrulandı: ana sayfadan feragat kaldırılınca kırmızıya
döndü, geri konunca yeşile.

---

## 5. ⚠️ Sahne geçişi ilk ekranı gizliyordu — LCP gerilemesi

Kart ızgaraları sahneye alınınca CI Lighthouse `/portfoy` sayfasının mobil
LCP'sini **2,8 s → 3,6 s** gösterdi (bir koşuda 4,1 s). Sebep animasyonun
maliyeti değil, **sırası**:

- LCP, öğenin **boyandığı** anı ölçüyor.
- `bekliyor` durumu `opacity: 0` demek — boyanmamış sayılıyor.
- Bu durumu **JavaScript** veriyor: öğe ancak paket inip hidrasyon bitip
  gözlemci tetikledikten **sonra** görünür oluyor.

Yani ilk ekrandaki bir görsel, sırf giriş animasyonu yüzünden saniyelerce
"boyanmamış" sayılıyordu. Ölçüm bir sapma değildi — ziyaretçi de onu
gerçekten geç görüyordu.

Kaydırarak gelinen içerikte sorun yok: kullanıcı oraya varana kadar
JavaScript çoktan inmiş oluyor.

### Yapılan değişiklik

`Sahne` artık gizlemeden önce `getBoundingClientRect()` ile bakıyor; öğe
zaten görüş alanındaysa hiç sahneye alınmıyor.

⚠️ Bu bir **tasarım kararı olarak doğru**: ekranda zaten duran bir şeyi
"girer gibi" göstermek, hareketin anlamını (yeni bir şey geldi) boşaltıyor.

Kalıcı denetim: `src/components/hareket/sahne.test.ts` — hem bu tuzağı hem
de "içerik animasyona bağlanmasın" kuralını bağlıyor. İkisi de ekranda
hiçbir hata bırakmadan geçen türden.

### ⚠️ AMA HİPOTEZ YANLIŞ ÇIKTI — DÜZELTME LCP'Yİ DEĞİŞTİRMEDİ

Düzeltilmiş sürüm ölçüldüğünde `/portfoy` mobil LCP **3,6 s'de kaldı**.
Yani `Sahne` bu gecikmenin sebebi değildi. Geriye dönüp bakınca zaten
olamazdı: `bekliyor` durumunu `useEffect` veriyor, yani hidrasyondan sonra —
o ana kadar öğe görünür ve boyanmış oluyor.

Düzeltme yine de duruyor çünkü kendi başına doğru; ama **LCP gerilemesini
açıklamıyor**.

### Elenen sebepler

Ölçümle bakıldı, üçü de eledi:

| Aday | Ölçüm | Sonuç |
| --- | --- | --- |
| `Sahne` gizlemesi | düzeltme sonrası LCP aynı | **değil** |
| Render engelleyen CSS | 13.894 B → 13.991 B (+%0,7), kayıp 310 ms → 309 ms | **değil** |
| LCP öğesinin türü | önce de sonra da aynı açıklama paragrafı | **değil** |

Fark `elementRenderDelay`de: 130 ms → 421 ms (üç koşunun ikisinde; üçüncüde
137 ms). Paragraf artık daha büyük (`text-govde-kucuk` → `text-govde`) ve
sayfada daha aşağıda (bandın `py-12`si). Kalan en güçlü aday, `display: swap`
sonrası font değişiminde öğenin yeniden boyanması — ama **kanıtlanmadı**.

### Yol boyunca bulunan gerçek açık: font ön yüklemesi HİÇ YOK

Üretilen HTML'de tek bir `<link rel="preload" as="font">` yok — hiçbir
sayfada. `next/font/local` `preload: true` ile çağrılıyor (varsayılan da
öyle) ve derleme çıktısındaki dosya adı Next'in "ön yüklenecek" işaretini
taşıyor (`inter_turkce-s.p.0-…woff2`), ama bağlantı head'e basılmıyor.
Açıkça `preload: true` yazılıp yeniden derlendi: **hiçbir şey değişmedi**.

Yani sitedeki her metin LCP'si font değişimini bekliyor. Bu bu PR'ın
getirdiği bir şey değil, **önceden beri öyle** — ve ayrı bir iş olarak
ele alınmalı. Next 16 + Turbopack davranışı olduğu için burada bir
geçici çözümle örtülmedi.

### Sayısal durum

| Sayfa | Masaüstü | Mobil performans | Mobil LCP |
| --- | --- | --- | --- |
| Ana sayfa | 100 | 90 (86–91) | 3,5 s |
| Mahalleler | 100 | 91 (90–91) | 3,5 s |
| Portföy | 100 | 89 (89–90) | 3,6 s (önce 2,8 s) |

Erişilebilirlik her sayfada **100**, CLS her sayfada **0**. Mobil LCP hedefi
(2,5 s) sitede zaten hiçbir sayfada tutmuyordu; `/portfoy` bu PR'la
diğerlerinin seviyesine geldi.

---

## Doğrulama

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — temiz
- `pnpm vitest run` — 76 dosya, **1745 test** yeşil
- Üretim imajıyla 12 sayfa duman testi: hepsi 200, **her sayfada tek `<h1>`**,
  **hiçbir sayfada başlık seviyesi atlaması yok**, skor gösteren her sayfada
  feragat var
