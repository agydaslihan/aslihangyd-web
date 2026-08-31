# 31 Ağustos 2026 — Mahalle olgusal iskeleti: PostGIS'ten hesaplanan bölümler

26 mahallenin sınırları ve 544 OSM ilgi noktası sistemde vardı; hiçbiri
mahalle sayfasında rakama dönüşmüyordu. Artık dört bölüm **hesaplanıyor**.

## Ne hesaplanıyor

| Bölüm | Satırlar | Kaynak |
| --- | --- | --- |
| Konum ve ulaşım | Çorlu merkezine mesafe · en yakın tren istasyonu · havalimanı | Mahalle merkezleri, OSM |
| Sanayi yakınlığı | Beş OSB'ye mesafe | OSM + Çorlu TSO (ilçe bilgisi) |
| Sosyal donatı | 1 km içinde okul/eczane/market/park/durak sayısı · en yakın sağlık noktası | OSM |
| Nüfus | Mahalle nüfusu · ilçe nüfusundaki payı | Panel + TÜİK ADNKS 2025 |

Alipaşa için üretim verisiyle ölçülen sanayi mesafeleri:

```
Çorlu 1. Organize Sanayi Bölgesi          3.481 m
Çorlu Deri Organize Sanayi Bölgesi (OSB)  5.352 m
Velimeşe Organize Sanayi Bölgesi          8.010 m
Veliköy Organize Sanayi Bölgesi          12.450 m
Ergene 2 Organize Sanayi Bölgesi         14.012 m
```

## ⚠️ Bir tasarım ölçümle çürütüldü

İlk tasarım şıktı: "nokta mahalle sınırlarımızın içine düşüyorsa Çorlu'da,
düşmüyorsa değil". Ad listesi gömmeden, geometriden hesaplanan bir ilçe
bilgisi.

**Yanlıştı.** Üretimde ölçüldü:

```
mahalle:        26,  sınırı olan: 26
ilgi noktası:  544,  bir sınırın içinde: 438  (%80)
```

Mahalle poligonları ilçenin tamamını kaplamıyor — aradaki kırsal ve sanayi
alanları hiçbir mahalleye ait değil. Sorgu "hangi ilçede" sorusunu değil,
"hangi mahallede" sorusunu cevaplıyor.

Sonuç: **Çorlu Deri OSB "Çorlu sınırları dışında" çıkıyordu** — oysa Çorlu
Ticaret ve Sanayi Odası onu Çorlu ilçesi altında listeliyor. Ekranda
kendinden emin ve yanlış bir etiket.

Çıkarım kaldırıldı. İlçe bilgisi artık **kaynaklı bir eşlemeden** geliyor:
Çorlu TSO'nun OSB listesine göre Velimeşe ve Ergene 1-2 Ergene ilçesinde;
etiket ve kaynak satırda birlikte yazılı. Listede geçmeyen bir bölge için
(Veliköy) ilçe hakkında **hiçbir şey söylenmiyor**.

Regresyon testle kilitli: "Çorlu Deri OSB Ergene'de sayılmıyor."

## Yazılmayanlar

⚠️ **D-100 mesafesi hesaplanmıyor ve satır hiç çizilmiyor.** D-100 bir
nokta değil bir yol; mesafesi ancak yol geometrisiyle hesaplanır ve o veri
sistemde yok. "Yaklaşık 2 km" yazmak doğrulanamaz bir sayı üretirdi.

⚠️ **Sıfır yazılmıyor.** 1 km içinde okul kaydı yoksa satır hiç
çizilmiyor. "0 okul" yazmak, OSM'de henüz işaretlenmemiş bir okulu
"yok" ilan etmektir — veri eksikliğini olguya çevirmek.

⚠️ **Merkezi girilmemiş mahallede sanayi bölümü hiç çizilmiyor.** Tahmini
bir koordinattan hesaplanan mesafe, yanlış olduğu belli olmayan bir sayı
üretirdi.

## Kararlar

- **Çorlu merkezi koda gömülmedi**, mahalle merkezlerinin ağırlık
  merkezinden türetiliyor (`ST_Centroid(ST_Collect(...))`) — CLAUDE.md'nin
  OSM bölümündeki kuralın aynısı. Elle yazılmış bir koordinat, sınırlar
  güncellendiğinde sessizce yanlışa dönerdi.
- **Mesafeler 10 metreye yuvarlanıyor.** "347 m" kuş uçuşu bir mesafede
  sahte bir kesinlik: mahalle merkezinin kendisi bir yaklaşıklık.
- **Kuş uçuşu uyarısı bölümün içinde**, ayrı bir sayfada değil.
- **Deri OSB için iki taraflı not**: "hem istihdam kaynağı hem çevresel
  etki konusudur… koku ve çevre açısından değerlendirilmesi gereken bir
  başlıktır." Yalnızca birini yazmak, bir yatırım sitesinde eksik değil
  **yanlış** bilgi olurdu.
- **İlçe nüfusu CMS'te** (`İlçe Olguları` global'i), kaynağıyla birlikte.
  Koda gömülseydi TÜİK her yıl yeni sayı yayınladığında sessizce eskirdi.
  ⚠️ Kaynak boşsa rakam da dönmüyor — kaynaksız paydadan çıkan yüzde de
  kaynaksızdır.
- **Kaynak her satırın yanında**, dipnotta değil. "OSB'ye 3,5 km" cümlesine
  bakıp karar veren biri, rakamın nereden geldiğini aynı satırda görmeli.
- ODbL atfı bölümün altında.

20 iddia: `src/lib/mahalle/olgusal.test.ts`.
