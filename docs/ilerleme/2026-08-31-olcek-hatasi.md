# 31 Ağustos 2026 — Ölçek hatası: tarama raporu, toplu düzeltme, uyarı

## Rapor — üretim verisi tarandı, HİÇBİR ŞEY DEĞİŞTİRİLMEDİ

26 mahalle ve 2 ilan kaydı tarandı. Ölçek hatası taşıyan **4 alan**:

| Kayıt | Alan | Şu an | Olması muhtemel |
| --- | --- | --- | --- |
| Mahalle #1 Alipaşa | Ortalama m² satış | **39,704** | 39.704 |
| Mahalle #1 Alipaşa | Ortalama aylık kira | **21,302** | 21.302 |
| Mahalle #1 Alipaşa | Nüfus | **10,918** | 10.918 |
| İlan #2 KERVANCI CİTY… | Aidat | **2,55** | 2.550 |

⚠️ **Diğer 25 mahallenin rakamları hiç girilmemiş** — bozuk değil, boş.
Yani "muhtemelen tüm mahallelerde aynı" endişesi geçerli değil: tek veri
girilmiş mahalle Alipaşa ve o da bozuk.

⚠️ **Şu değerler DOĞRU, dokunulmamalı:** Alipaşa kira çarpanı 12 (yıl),
12 aylık değişim 23 (%), gözlem sayısı 3; ilan #1 aidat 1.000 ₺, ilan #2
fiyat 5.650.000 ₺ ve tahmini kira 30.000 ₺; her iki ilanın m² değerleri.

Düzeltme uygulanmadı — doğru rakamları Aslıhan verecek.

## Kök neden bulundu

⚠️ **Payload'ın sayı alanı bir `<input type="number">` ve tarayıcı orada
noktayı ONDALIK ayırıcı sayar.**

Türkçe yazan biri `39.704` yazdığında niyeti otuz dokuz bin yedi yüz
dört; alanın anladığı otuz dokuz tam yedi yüz dört binde. Hata sessiz:
alan kabul eder, kayıt oluşur, hiçbir uyarı çıkmaz.

⚠️ **CSV içe aktarma bu hatayı YAPMIYOR.** `lib/csv/ayristir.ts` "39.704"ü
doğru okuyor (son grup üç haneli → binlik ayırıcı). Kayıtların tarihi de
bunu doğruluyor: Alipaşa 28 Ağustos'ta elle girilmiş, içe aktarma aracı
ise 31 Ağustos'ta geldi.

## İki bağımsız dedektör, aynı sonuç

1. **Ondalık izi** — `39,704`ün ondalık kısmı tam üç haneli; üç haneli bir
   kesir bir binlik grubunun ta kendisi. Bu, eşikten daha kesin bir
   işaret.
2. **Büyüklük eşiği** — talimattaki sınırlar (m² satış < 1.000, kira <
   1.000, aidat < 100, nüfus < 100).

İkisi de aynı dört değerde buluştu; yanlış pozitif yok.

⚠️ Kayan nokta tuzağı: `2.55 * 1000` kayan noktada 2549,9999… çıkıyor.
Doğrudan `Number.isInteger` kullanmak üretimdeki gerçek hatalardan birini
kaçırırdı; tolerans kullanılıyor.

## Yanlış pozitif, aracın en büyük riski

⚠️ Bu tespit doğru rakamları şüpheli gösterirse uyarı değersizleşir ve
kapatılır — kapatılan uyarı yoktur.

Bu yüzden yalnızca dört alan taranıyor: `ortalamaM2Satis`, `ortalamaKira`,
`nufus`, `fiyat`, `tahminiKira`, `aidat`. **Taranmayan:** kira çarpanı
(12 yıl normal), 12 aylık değişim (%23 normal), brüt/net m² (145 normal),
gözlem sayısı (3 normal). Bir test bu dışarıda bırakmayı kilitliyor.

## Toplu düzeltme aracı

`/admin/olcek-duzeltme` — üç kapı üst üste:

1. **Önizleme.** Hangi kaydın hangi alanı neyden neye çevrilecek, tek tek
   yazılı. Ne yapacağını göstermeden basılan bir "26 mahalleyi düzelt"
   düğmesi, düzeltme aracı değil kumar.
2. **Onay.** Varsayılan olarak hiçbiri seçili değil. Toplu işlemde
   varsayılanın "hepsi" olması, gözden kaçan satırın da uygulanması demek.
3. **Geri alma.** Parti eski değerleriyle kaydediliyor.

⚠️ **Geri alma 1000'e BÖLMÜYOR, eski değeri YAZIYOR.** Bölme matematiksel
tersi ama aradan geçen sürede elle düzeltilmiş bir kaydı da bozardı.

⚠️ **Yeni değer sunucuda hesaplanıyor.** İstemci yalnızca hangi alanların
düzeltileceğini söylüyor; değeri de gönderseydi form üzerinden istenen her
sayı yazdırılabilirdi.

⚠️ **Arada değişen kayıt atlanıyor:** alan artık şüpheli değilse (biri elle
düzeltmiş olabilir) dokunulmuyor ve sayılıyor.

Partiler `Ölçek düzeltmeleri` koleksiyonunda; yan ürünü bir denetim izi.
Yalnızca yönetici okur — içinde düzeltilmeden önceki yanlış rakamlar var.

## Giriş uyarısı — engellemiyor

⚠️ `validate` kullanılmadı: o kaydı **reddeder**. Çorlu'da 900 ₺/m² bir
arsa gerçekten olabilir, kırsal bir mahallenin nüfusu 90 olabilir.
Reddedilen doğru bir kayıt, kabul edilen yanlış bir kayıttan daha çok
zarar verir — kullanıcı bir daha denemez.

Bunun yerine form durumunu okuyan bir panel bileşeni: rakam yazılır
yazılmaz uyarı çıkıyor, **rakam alanlarının üstünde** (altta dursaydı
kaydet düğmesine giden kişi görmezdi) ve kök nedeni yazıyor.

## Birimler etiketlere girdi

`Ortalama m² satış (₺/m²)` · `Ortalama aylık kira (₺/ay)` · `Nüfus (kişi)`
· `Kira çarpanı (yıl)` · `Fiyat (₺)` · `Aylık aidat (₺/ay)`

Sekme açıklamalarına da binlik ayırıcı uyarısı eklendi.

20 iddia: `src/lib/veri/olcek.test.ts`.
