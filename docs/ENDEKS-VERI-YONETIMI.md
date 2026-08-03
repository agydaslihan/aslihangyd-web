# Çorlu Konut Endeksi — Metodoloji ve Veri Güncelleme Rehberi

Bu doküman iki soruya cevap verir:
1. Endeks nasıl hesaplanır ki güvenilir olsun?
2. Aslıhan bu veriyi haftalık olarak nasıl güncel tutar?

---

## BÖLÜM 1 — Neden Bu Kadar Dikkat?

Endeks yayınlamak, bir rakamın arkasında durmak demektir. Gazeteci arayıp
"bu rakamı nasıl buldunuz?" diye sorduğunda cevabınız net olmalı. Cevap
zayıfsa endeks size otorite değil, itibar kaybı getirir.

Küçük ölçekli veri toplamada üç tuzak vardır:

**Tuzak 1 — Bileşim yanlılığı (en tehlikelisi).**
Bu ay tesadüfen daha çok lüks daire gözlemlediniz. Endeks %8 fırladı.
Ama piyasada hiçbir şey değişmedi — sadece örneklem değişti. Çözüm:
sabit ağırlıklı sepet (Bölüm 3).

**Tuzak 2 — İstenen fiyat / gerçekleşen fiyat karışıklığı.**
İlan fiyatları pazarlık payı içerir. Bu ikisini karıştırmak endeksi
sistematik olarak şişirir. Çözüm: endeksin adında "İstenen Fiyat" geçsin,
gerçekleşen satışları ayrı seri olarak tutun.

**Tuzak 3 — Az örneklemle kesin konuşmak.**
Bir mahallede 3 gözlemle "medyan m² fiyatı 42.500 TL" demek uydurmadır.
Çözüm: katman başına minimum gözlem eşiği + gözlem sayısını (n) her zaman
göstermek.

---

## BÖLÜM 2 — Veri Kaynakları

| Kaynak | Ne verir | Güven | Nasıl alınır |
|---|---|---|---|
| **Kendi işlemleriniz** | Gerçekleşen satış/kira fiyatı | Yüksek | İşlem kapanınca hemen girin |
| **Meslektaş ağı** | Gerçekleşen fiyat | Orta-Yüksek | Karşılıklı bilgi paylaşımı |
| **Portal ilan gözlemi** | İstenen fiyat | Orta | ⚠️ Elle, aşağıdaki kurallarla |
| **TCMB Konut Fiyat Endeksi** | Tekirdağ il geneli, aylık | Yüksek | Resmi, ücretsiz — kıyas çıpası |
| **TÜİK konut satış istatistikleri** | İlçe bazlı satış adedi | Yüksek | Resmi, ücretsiz — hacim göstergesi |
| **Ticari veri sağlayıcılar** | Bölgesel tahminler | Değişken | Lisans/abonelik ile |

### ⚠️ Portal gözlemi hakkında sınırlar

Yapabilecekleriniz:
- Bir ilanı gözünüzle görüp **kendi tablonuza toplu istatistik amaçlı**
  sayısal kayıt düşmek (mahalle, m², oda, fiyat, tarih)
- Bu kayıtlardan **türetilmiş toplu bir gösterge** (medyan, endeks) yayınlamak

Yapmamanız gerekenler:
- Otomatik veri çekme (script, bot, tarayıcı eklentisi) — kullanım koşulu
  ihlali ve veri tabanı hakkı riski
- İlan metnini, fotoğrafını, başlığını kopyalamak
- Tek tek ilanları sitenizde yeniden yayınlamak
- Toplu, sistematik kopyalama boyutuna ulaşan kayıt tutmak

Kısacası: **sayı toplayın, içerik toplamayın; elle yapın, makineyle değil.**
Ölçeğiniz büyürse önce bir avukata danışın.

### TCMB endeksini çıpa olarak kullanın

Kendi endeksiniz TCMB'nin Tekirdağ serisinden çok saparsa, muhtemelen sizin
veriniz hatalıdır. Üç ayda bir karşılaştırın. Sapma %5'i geçerse veriyi
gözden geçirin. Bu, kendinizi denetlemenin en ucuz yoludur.

---

## BÖLÜM 3 — Endeks Metodolojisi (tabakalı medyan, sabit ağırlık)

### 3.1 Katmanlar

Çorlu'yu **mahalle × oda tipi** katmanlarına bölün:

```
Muhittin   × 1+1    Alipaşa   × 1+1    Şeyhsinan × 1+1
Muhittin   × 2+1    Alipaşa   × 2+1    Şeyhsinan × 2+1
Muhittin   × 3+1    Alipaşa   × 3+1    Şeyhsinan × 3+1
Muhittin   × 4+1    ...              ...
```

Başlangıçta 6 mahalle × 4 oda tipi = 24 katman. Hepsini doldurmak
gerekmez; ağırlığı olan katmanlar yeterlidir.

### 3.2 Sabit ağırlıklar (sepet)

Her katmana bir ağırlık verin. Ağırlıklar **konut stokunu** temsil etmeli,
sizin gözlem sayınızı değil. Bu, bileşim yanlılığını öldüren adımdır.

```
Katman              Ağırlık
Muhittin × 3+1        0,14
Muhittin × 2+1        0,09
Şeyhsinan × 3+1       0,11
Alipaşa × 2+1         0,08
...
                     ─────
Toplam                1,00
```

Ağırlıkları nasıl belirlersiniz? Başlangıçta **saha bilginizle tahmin edin**
(hangi mahallede kaç konut var, hangi tip yaygın). TÜİK bina sayımı ve
belediye verisi varsa onunla iyileştirin. **Ağırlıklar yılda bir kez,
Ocak ayında güncellenir** — ay ay değişirse endeks anlamını kaybeder.

### 3.3 Hesaplama

**Adım 1 — Katman medyanı.** Her katman için o ayın gözlemlerinin
m² fiyat **medyanı** (ortalama değil — medyan aykırı değerlere dirençlidir).

```
Muhittin × 3+1, Ağustos 2026:
gözlemler (TL/m²): 38.500 · 41.200 · 39.800 · 44.100 · 40.300 ·
                   39.100 · 42.700 · 40.900 · 71.000 ← aykırı, medyan etkilenmez
medyan = 40.600 TL/m²   (n=9)
```

**Adım 2 — Minimum eşik.** Katmanda 8'den az gözlem varsa: önceki ayın
değeri taşınır ve "taşınan" olarak işaretlenir. Uydurma yapılmaz.

**Adım 3 — Endeks.**

```
                Σ (ağırlık_katman × medyan_katman_bu_ay)
Endeks_t  =  ────────────────────────────────────────────  × 100
                Σ (ağırlık_katman × medyan_katman_baz_ay)
```

Baz dönem = veri toplamaya başladığınız ilk tam ay = **100**.

**Adım 4 — Reel seri.** Nominal endeksi TÜFE ile deflate edin:

```
Reel Endeks_t = (Nominal Endeks_t / TÜFE_t) × TÜFE_baz
```

Reel seri **çok değerlidir ve kimse yayınlamıyor.** "Çorlu'da konut
enflasyondan arındırılmış olarak %X reel getirdi" cümlesi, sizi doğrudan
basında alıntılanır hale getirir.

### 3.4 Üç ayrı seri yayınlayın

1. **Çorlu Konut İstenen Fiyat Endeksi** (nominal + reel)
2. **Çorlu Kira Endeksi** (aynı yöntem, kiralık gözlemlerle)
3. **Kira Çarpanı Serisi** = ortalama fiyat / (ortalama aylık kira × 12)

Üçüncüsü yatırımcı için en değerli olanıdır ve en kolay anlaşılanıdır:
"Çorlu'da bir daire kendini 17,4 yılda amorti ediyor" cümlesi tek başına
haber değeri taşır.

### 3.5 Şeffaflık kuralları (pazarlığa kapalı)

Her yayında görünmesi gerekenler:
- Toplam gözlem sayısı (n)
- Katman bazında gözlem sayıları
- Hangi katmanların "taşındığı"
- Verinin **istenen fiyat** olduğu
- Metodoloji sayfasına link
- Güncelleme tarihi

---

## BÖLÜM 4 — Aslıhan'ın Haftalık Rutini ⭐ Asıl Soru

Sistem ne kadar iyi olursa olsun, veri girilmezse endeks ölür. Bu yüzden
rutin **basit ve kısa** olmalı.

### Haftalık — 30-40 dakika, sabit gün

**Önerilen: Pazartesi sabahı, kahveyle birlikte.**

```
□ Portallarda 6 mahalleyi sırayla tara (mahalle başına ~5 dakika)
□ Her mahalleden 4-6 ilan seç, Hızlı Gözlem ekranına gir
□ Kiralık ilanlar için aynısını yap (haftada 8-10 kayıt)
□ Bu hafta kapanan kendi işlemlerinizi "gerçekleşen" olarak girin
□ Meslektaşlardan duyduğunuz gerçekleşen fiyatları girin

Haftalık hedef: 30 gözlem (satılık ~20, kiralık ~10)
Aylık toplam: ~120 gözlem
```

**Gözlem seçerken kural:** Rastgele seçin, "ilginç" olanı değil. En ucuzu
veya en pahalıyı seçme eğilimi endeksi bozar. Listenin başından, ortasından
ve sonundan alın.

### Hızlı Gözlem Girişi ekranı nasıl olacak

```
┌───────────────────────────────────────┐
│  HIZLI GÖZLEM                         │
│  Bugün girilen: 7                     │
├───────────────────────────────────────┤
│  Mahalle    [Muhittin        ▾]  ←son │
│  Tip        [Satılık] [Kiralık]  ←son │
│  Oda        [1+1][2+1][3+1][4+1]      │
│  m²         [    135    ]             │
│  Fiyat      [ 4.300.000 ]             │
│  Bina yaşı  [    7      ]             │
│                                       │
│  → 31.852 TL/m²                       │
│                                       │
│         [ Kaydet ve Yeni ]            │
└───────────────────────────────────────┘
```

Tasarım kararları:
- Mahalle ve tip **son seçilen değerde kalır** — aynı mahalleden arka arkaya
  giriş yaparken tekrar seçmeye gerek olmaz
- m² fiyatı anında hesaplanıp gösterilir (yanlış girişi hemen fark edersiniz)
- Kaydet → form temizlenir, imleç m² alanına döner
- Telefondan çalışır — sırada beklerken bile giriş yapılabilir
- Hedef: **kayıt başına 15 saniye**

### Sistem sizi koruyacak

Girerken otomatik uyarılar:

```
⚠️ Bu gözlem mükerrer olabilir
   Muhittin · 135 m² · 4.300.000 TL · 12 gün önce girilmiş

⚠️ Aykırı değer
   31.852 TL/m², bu katmanın medyanının %52 üstünde.
   Doğru mu?  [Evet, özel bir mülk]  [Hayır, düzelteyim]

⚠️ Bayat veri
   Hıdırağa Mahallesi'nde 47 gündür gözlem yok.
```

### Aylık — 20 dakika, ayın son iş günü

```
□ Sistem endeksi otomatik hesaplar ve TASLAK olarak sunar
□ Anomali uyarılarını incele
   "Şeyhsinan × 3+1 bu ay %13 arttı — olağandışı"
□ Anomalinin sebebi var mı? (yeni proje, altyapı yatırımı)
   Varsa notlar alanına yaz. Yoksa veriyi kontrol et.
□ Onaylayıp yayınla  → /endeks sayfası güncellenir
□ Sosyal medya materyali otomatik üretilir, paylaş
```

**Otomatik yayın yok.** Sistem hesaplar, siz onaylarsınız. Bir kez yanlış
rakam yayınlanırsa geri almak zordur.

### Üç ayda bir — 1 saat

```
□ TCMB Tekirdağ konut fiyat endeksi ile karşılaştır
   Sapma %5'ten büyükse veriyi gözden geçir
□ Gerçekleşen satışları topluca gir (kendi + meslektaş)
□ Çeyreklik raporu hazırla (PDF) → e-posta listesine gönder
□ Basın bülteni: "Çorlu'da konut fiyatları çeyrekte %X"
   Yerel gazetelere ve emlak yayınlarına gönder → backlink
```

### Yılda bir — Ocak

```
□ Sepet ağırlıklarını gözden geçir (konut stoku değişti mi?)
□ Yeni mahalle eklenecek mi?
□ Metodoloji sayfasını güncelle
□ Yıllık rapor: "Çorlu Gayrimenkul Yılı"
```

---

## BÖLÜM 5 — Yayına Ne Zaman Açılır?

Sayfa, şu şartların **hepsi** sağlanana kadar 404 döner:

```
□ En az 6 tam ay veri
□ Toplam en az 500 gözlem
□ Ağırlığı %70'i kapsayan katmanlarda ay başına ≥8 gözlem
□ TCMB Tekirdağ serisiyle karşılaştırma yapılmış, sapma makul
□ Metodoloji sayfası yazılmış ve yayında
□ Feragat ibareleri yerleştirilmiş
```

Bu kontrol **koda gömülü** olmalı — "bir ay erken açalım" cazibesi güçlüdür
ve zararı kalıcıdır.

### Geriye dönük veri

Elinizde eski notlar, ekran görüntüleri veya kayıtlar varsa geçmişi kısmen
doldurabilirsiniz. Ancak bu kayıtlar `guvenSeviyesi: dusuk` olarak
işaretlenmeli ve grafikte kesikli çizgiyle gösterilmelidir. Geriye dönük
veriyi gerçek gözlemle karıştırmayın.

---

## BÖLÜM 6 — Veri Toplamaya Bugün Başlayın

Site 3-4 ay sonra hazır olacak. Ama veri toplamayı bugün başlatabilirsiniz.

**Google Sheets şablonu — şu sütunlarla açın:**

```
Tarih | Mahalle | Tip | Kategori | Oda | m² | Fiyat | Bina Yaşı |
Kat | Kaynak | Güven | Not
```

Site hazır olduğunda bu tablo CSV olarak içe aktarılır. Agent'a CSV içe
aktarma özelliğini yazdırın (Faz 2C'de var).

Bugün başlarsanız, site açıldığında elinizde 3-4 aylık veri olur; endeksi
9. ay yerine **6. ayda** yayınlayabilirsiniz. Bu, üç ay erken otorite
demektir.

---

## BÖLÜM 7 — Endeksin Getirisi

Neden bu zahmete değer:

| Kazanım | Nasıl |
|---|---|
| **Backlink** | Basın alıntısı = SEO'nun en değerli para birimi |
| **Otorite** | "Çorlu'nun veri kaynağı" konumu |
| **Değerleme aracının yakıtı** | Tahminler bu veriden beslenir |
| **Yatırım skorunun temeli** | Fiyat trendi bileşeni %25 ağırlıkta |
| **Rapor içeriği** | Çeyreklik PDF'in omurgası |
| **Taklit edilemezlik** | 2 yıl sonra bu seriyi kimse yeniden üretemez |

Bir yıl sonra "Çorlu'da konut fiyatları" arayan gazeteci sizi bulur.
İki yıl sonra rakibiniz sizin verinizi kaynak göstermek zorunda kalır.

**Bu, drone videosundan çok daha derin bir hendektir.**

---

## BÖLÜM 8 — Hukuki Notlar

- Endeks bir **istatistiktir**, değerleme raporu veya yatırım tavsiyesi
  değildir. Her sayfada belirtin.
- Metodolojiyi yayınlamak hem güven hem koruma sağlar: "yöntemimiz açık,
  isteyen kontrol edebilir".
- Verinizi atıf şartıyla serbest bırakın. Her alıntı size link kazandırır
  ve veri sahipliğinizi pekiştirir.
- Bireysel ilanları veya malik bilgilerini asla yayınlamayın — yalnızca
  toplulaştırılmış rakamlar.
- Ölçeğiniz büyüdüğünde (aylık binlerce gözlem) veri toplama yönteminizi
  bir avukatla gözden geçirin.

