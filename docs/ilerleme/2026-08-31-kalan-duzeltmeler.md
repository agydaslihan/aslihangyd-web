# 31 Ağustos 2026 — Beş düzeltme

## I1 · Haritadaki tek dev sütun

⚠️ **Tek sütun bir kıyas değil, bir leke.** Sütun yüksekliği bir
**orandır**: mahalleyi diğerleriyle kıyaslıyor. Veri girilmiş tek mahalle
varsa o mahalle kendisiyle kıyaslanıyor ve daima en yüksek sütunu alıyor —
haritanın ortasında sebebi anlaşılmayan dev bir kule. Üretimde tam olarak
bu vardı: 26 mahalleden yalnızca birinde rakam.

Artık **üçten az veride hiç sütun çizilmiyor**; sınırlar kalıyor ve
haritada sebebi yazılı bir kutu çıkıyor: *"Mahalle sınırları haritada;
fiyat sütunları en az üç mahallede rakam girildiğinde çizilir. Tek bir
sütun kıyas üretmez, yanıltır."*

Üç, kıyasın anlam kazandığı en küçük sayı: iki sütun yalnızca "hangisi
daha yüksek" der, üç sütun bir dağılım gösterir.

**Renk** `--color-notr-600`dan (haritada neredeyse siyah bir kule)
`--color-gold-600`a alındı — sütun sayfadaki en dikkat çeken öğe ve nötr
koyu bir blok markanın hiçbir yerinde yoktu.

## I2 · Taşan istatistik değerleri

"+%23,0" ve "1.250.000 ₺" gibi değerler kart genişliğini aşıp komşusunun
üstüne biniyordu. Üç koruma birlikte:

- `[overflow-wrap:anywhere]` — sayı sarabiliyor
- `min-w-0` — ızgara hücresi içeriğinden küçülebiliyor (**olmadan sarma
  kuralı tek başına yetmiyor**; flex/grid hücresi taşmayı dışarı taşır)
- karakter sayısına göre kademe (`degerBoyu`)

⚠️ **Kırpma (`truncate`) kullanılmadı: kırpılan bir rakam yanlış bir
rakamdır.** "1.250.0…" hiçbir şey söylemiyor.

⚠️ Eşik **ölçümle** düzeltildi: ilk yazdığım 12 karakterdi ve
"12.345.678 ₺" tam 12 karakter — yani zaten taşan bir değer eşiğin altında
kalıyordu. Test yakaladı; eşik 10'a indi.

## I3 · 360° turdaki kırık çerçeve

⚠️ **Sebep bulundu ve bir görsel hatası değildi.** Üretimde Alipaşa'nın
tur adresi:

```
https://maps.app.goo.gl/mT9Myj3mUaxGpeWy6
```

Bu bir Google Maps **paylaşım linki**, tur değil. Eski kontrol yalnızca
protokole bakıyordu; adres `https` olduğu için geçti, çerçeveye kondu,
Google `X-Frame-Options` ile gömülmeyi reddetti ve ziyaretçi boş/kırık bir
kutu gördü — **sebebi hiçbir yerde yazmadan**.

`https` olmak, gömülebilir olmak değildir.

Artık adres denetleniyor ve gömülemeyen adreslerde çerçeve yerine **ne
yapılacağını söyleyen bir metin** çıkıyor. Panel alan açıklaması da
uyarıyor.

⚠️ **Beyaz liste değil kara liste** — ve bilinçli: gömülebilir tur servisi
çok (Kuula, Matterport, Momento360, Google Maps *embed*, kendi
sayfalarımız). Beyaz liste, listede olmayan geçerli bir servisi sessizce
reddederdi. Kara liste yalnızca **çalışmadığını bildiğimiz** kalıpları
eliyor; Google'ın `/maps/embed` biçimi elenmiyor.

## I4 · Tamamı büyük harf başlıklar

`KERVANCI CİTY 3 HAVUZ CEPHE SATILIK ARA KAT 3+1 DAİRE` →
`Kervancı City 3 Havuz Cephe Satılık Ara Kat 3+1 Daire`

⚠️ **CSS `text-transform` değil, gerçek dönüşüm — sebebi SEO.**
`text-transform` yalnızca çizimi değiştirir; `<title>`, site haritası, OG
etiketi ve arama motoru dizini hâlâ tamamı büyük harf görür.

⚠️ **Veri değiştirilmiyor**, dönüşüm yalnızca gösterimde. Aslıhan'ın
yazdığını sessizce değiştirmek, bir gün "ben böyle yazmamıştım" denecek
bir durum üretirdi. Panel bunun yerine uyarıyor.

İki şeyi test çürüttü ve düzeltti:

1. **Kısaltma tespiti uzunluktan tahmin ediliyordu** ("2–4 harfli tamamı
   büyük parça kısaltmadır"). "ARA KAT" ve "CİTY" de o kalıba uyuyordu ve
   büyük harf kalıyordu. Kısaltma bir uzunluk meselesi değil, bir sözlük
   meselesi — açık listeye çevrildi (OSB, AVM, TOKİ, TEM, KDV…).
2. **Türkçe "I" belirsizliği çözülemez.** "ISITMALI" doğru yazılmışsa
   "Isıtmalı" olur. Ama biri "MERKEZİ" yerine "MERKEZI" yazdıysa sonuç
   "Merkezı" olur; girdi zaten yanlıştı. Hangi "I"nın hangisi olduğunu
   bilmek sözlük ister ve tahmin etmek, uydurmanın başka bir biçimi
   olurdu. Davranış testle belgeli.

## I5 · Yatırım skoru eşik mesajı

Eskiden: *"Yatırım skoru için yeterli veri yok"* — bir durum bildiriyordu
ama ne yapılacağını söylemiyordu.

Şimdi: *"Yatırım skoru: altı bileşenden 3'ü hazır"* + *"Eksik olanlar:
[liste]. Skorun görünmesi için ağırlığın en az %70'i dolmalı; şu an %45."*

Üç şeyi birden veriyor: kaçının hazır olduğu, hangilerinin eksik olduğu ve
eşiğin ne olduğu — yani "bir tane daha girersem görünür mü" sorusunun
cevabı.

18 iddia: `baslik.test.ts`, `istatistikTasma.test.ts`, `turAdresi.test.ts`
ve `sutunlar.test.ts` eklemeleri.
