# Veri Girişi Kılavuzu

Bu kılavuz, aslihangyd.com'un yönetim panelinde **boş kutuları doldurma**
işini adım adım anlatır. Bilgisayar bilgisi gerektirmez; her adımda nereye
tıklayacağınız, ne göreceğiniz ve bir sonraki adıma geçmeden neyi kontrol
edeceğiniz yazılıdır.

Sırayı bozmayın. Adımlar birbirine bağlı: mahalleler açılmadan sınır
yazılacak kayıt yoktur, sınır yazılmadan POI aranacak alan yoktur.

---

## Önce bunları bilin

### Panele nasıl girilir

Tarayıcıdan **https://aslihangyd.com/admin** adresine gidin, e-posta ve
şifrenizle giriş yapın.

### ⚠️ Bu kılavuzdaki içe aktarma ekranlarını yalnızca YÖNETİCİ görür

Sistemde iki rol var: **yönetici** ve **danışman**. Aşağıdaki 1, 2, 3 ve 5.
adımların ekranları (mahalle kurulumu, POI, rayiç) sol menüde **yalnızca
yönetici rolündeki kullanıcıya görünür.** Danışman rolüyle giriş yaptıysanız
o menü satırları hiç çıkmaz — ekran bozuk değildir, yetkiniz yoktur.

Bu bilinçli bir karar: bu ekranlar yüzlerce kaydı tek tıkla değiştirir.
Kılavuzun 1–3 ve 5–7. adımlarını **Aslıhan** (yönetici) yapar.

### İçe aktarmaların üç güvenlik kuralı

Bunları bilirseniz cesaretle deneyebilirsiniz:

1. **Önce gör, sonra yaz.** Her ekranda önizleme butonu ayrıdır. Önizleme
   hiçbir şeyi değiştirmez; ne yazılacağını tablo hâlinde gösterir. Yazma
   ancak ikinci butona bastığınızda olur.
2. **Hiçbir içe aktarma kayıt SİLMEZ.** Sadece ekler ve günceller.
3. **Elle düzelttiğiniz veri bir daha ezilmez.** Bir mahallenin sınırını
   elle düzelttiyseniz, bir sonraki içe aktarma o mahalleyi atlar ve
   önizlemede "korunacak" diye gösterir.

### Bilmediğiniz rakamı boş bırakın

Bu bir yatırım sitesi. Tahmini rakam yazmak, o rakamı okuyup karar veren
biri için gerçek zarar demektir. **Emin olmadığınız hiçbir kutuyu
doldurmayın** — boş kalan alan sitede "bilgi bekleniyor" olarak görünür,
uydurma rakam ise sessizce yanlış gösterir.

### Süreler hakkında dürüst not

Aşağıdaki süreler **ölçülmüş değil, beklenen büyüklük sırasıdır.** Gerçek
süre internet hızınıza ve OpenStreetMap sunucusunun o anki yoğunluğuna göre
değişir. Bir işlem verilen süreden uzun sürüyorsa bu tek başına hata
anlamına gelmez; ekranda dönen "…" yazısı duruyorsa çalışıyor demektir.

---

## Yedek almalı mıyım?

**Kısa cevap: her adımda değil, sadece 5. adımdan önce.**

Her gece saat 03:00'te otomatik yedek alınıyor (`scripts/yedekle.sh`).
Ayrıca içe aktarmalar kayıt silmediği için 1, 2 ve 3. adımlar geri
dönülemez bir zarar veremez.

Elle yedek almanız **gereken** iki durum var:

| Durum | Neden |
| --- | --- |
| **5. adım (rayiç CSV)** öncesi | Tek seferde yüzlerce kayıt yazılır. Yanlış sütun eşlemesiyle aktarılan büyük bir dosyayı tek tek temizlemek saatler sürer. |
| **Kayıt silmeden önce** (örn. 1. adımda çıkan "listede olmayan mahalleler") | Silme geri alınamaz. |

Yedek almak panelden yapılamaz, sunucuya bağlanmayı gerektirir →
**[EK A, komut 1](#ek-a--sunucuda-çalıştırılacak-komutlar)**.

---

## 1. adım · Mahalle listesini içe aktar

Çorlu'nun 18 merkez ve 8 kırsal mahallesini (toplam 26) tek tıkla açar.
Yalnızca **ad** ve **yerleşim türü** yazılır — koordinat, sınır ve tüm
rakamlar boş kalır, onları siz gireceksiniz.

### Nereye tıklayacaksınız

1. Sol menüde **"Mahalle verisi kurulumu"** bağlantısına tıklayın.
   (Doğrudan adres: `https://aslihangyd.com/admin/mahalle-verisi`)
2. Sayfadaki ilk bölüm: **"1 · Çorlu mahalle listesi"**
3. **"Ne yazılacağını göster"** butonuna basın.

### Ne göreceksiniz

Buton **"Bakılıyor…"** olur, ardından üç renkli rozet çıkar:

- `26 yeni mahalle` — açılacak kayıtlar
- `0 kayda yerleşim türü eklenecek` — mevcut ama türü boş olanlar
- `0 kayıt zaten tam` — dokunulmayacaklar

Altında dört sütunlu bir tablo: **İşlem · Mahalle · Yerleşim türü ·
Adres (slug)**. Yeşil satırlar yeni açılacaklar.

Tablonun altında **"26 kaydı oluştur/güncelle"** butonu belirir. Basın.

Bittiğinde yeşil bir satır: *"26 mahalle açıldı, 0 kayda yerleşim türü
eklendi, 0 kayıt zaten tamdı."*

### Ne kadar sürer

Önizleme birkaç saniye, yazma **yaklaşık yarım dakika**. İnternet
gerektirmez, sadece kendi veritabanımıza yazar.

### ⚠️ "Listede olmayan mahalle kayıtları" başlığı çıkarsa

Bu, sistemde olup bizim Çorlu listemizde olmayan kayıtları gösterir.
İçe aktarma bunları **silmez** — karar sizindir.

Burada **Velimeşe** veya **Yeşiltepe** görürseniz silin: ikisi de Çorlu'nun
değil **Ergene ilçesinin** mahallesidir. 6360 sayılı kanunla Ergene kurulurken
oraya geçmişler; ikisi de listemize yanlışlıkla girmişti.

Silmek için: sol menü → **Mahalleler** → ilgili mahalle → sağ üstteki sil.

⚠️ Bunları silmezseniz zarar vermezler ama her sınır içe aktarmasında
"konum bulunamadı" listesinde çıkarlar — çünkü Çorlu içinde aranıp
bulunamazlar.

### Hata alırsanız

| Ekranda yazan | Ne yapmalısınız |
| --- | --- |
| "Mahalleler açılamadı." | Sayfayı yenileyin, tekrar deneyin. Sürerse EK B'ye bakın. |
| Buton hiç tıklanmıyor (soluk) | Önizlemede yazılacak kayıt sayısı 0'dır — hepsi zaten var demektir, bu adım bitmiş. |
| Sayfa hiç açılmıyor / menüde yok | Danışman rolüyle girmişsiniz. Yönetici hesabıyla girin. |

### ✅ Sonraki adıma geçmeden doğrulayın

Sol menü → **Mahalleler**. Listede **26 kayıt** görmelisiniz. Birkaçını
açıp **Mahalle adı** ve **Yerleşim türü** alanlarının dolu, rakamların boş
olduğunu görün. Bu normaldir.

---

## 2. adım · OpenStreetMap'ten mahalle sınırlarını çek

Mahallelerin harita üzerindeki sınırlarını ve merkez noktalarını
OpenStreetMap'ten alır. **Merkez noktası 3. adım için şarttır** — POI
araması o noktaların çevresinde yapılır.

### Nereye tıklayacaksınız

1. Aynı sayfada (**Mahalle verisi kurulumu**) aşağı kaydırın.
2. İkinci bölüm: **"2 · Mahalle sınırları — OpenStreetMap"**
3. **"Sınırları önizle"** butonuna basın.

### Ne göreceksiniz

Buton **"OpenStreetMap sorgulanıyor…"** olur. Sonra dört rozet:

- `… yeni sınır` · `… tazelenecek` · `… korunacak (elle çizilmiş/düzeltilmiş)`
- `… eşleşmedi` — komşu ilçeden gelip elenen kayıtlar

Beş sütunlu tablo: **İşlem · OSM adı · Eşleşen mahalle · Merkez · Nokta
sayısı**.

Altında **"… sınırı yaz"** butonu. Basın.

### Kaç sınır gelmeli — 26

15 Ağustos 2026'da OpenStreetMap'e canlı sorularak sayıldı: listedeki **26
mahallenin 26'sının da sınırı OSM'de var** ve içe aktarma hepsini getiriyor.
Yani beklenen kapsama **%100**.

**Önizlemede bundan az sınır görüyorsanız durun.** Özellikle
sıfır görüyorsanız bu "OSM'de sınır yok" demek değildir — bizim tarafımızda
bir sorun demektir. O ekranda ayrıca uyarı da çıkar. Elle çizmeye
başlamadan önce sorunu bildirin.

Gelmeyenler ekranda tek tek listelenir.

Eksik kalan bir sınırı elle çizmek isterseniz: `geojson.io` sitesinde çizip
çıkan metni **Mahalleler → [mahalle] → Konum** sekmesindeki *"Mahalle sınırı
(GeoJSON)"* kutusuna yapıştırın. Elle çizdiğiniz sınır bu ekran tarafından
**bir daha ezilmez.**

### Sınırı olmayan mahalle konumsuz kalmaz

Elle koordinat girmeniz **gerekmiyor.** Aynı sorgu ikinci bir küme daha
getiriyor: OpenStreetMap'teki adlandırılmış yerleşim noktaları. Sınırı
bulunamayan bir mahallenin merkezi buradan alınır ve önizlemede ayrı bir
tabloda gösterilir — *"Sınırı yok — merkezi yerleşim noktasından gelecek"*.

Bu mahallelerde **sınır alanı boş kalır**; noktadan poligon uydurulmaz.
Merkez yeterlidir: harita odaklanır ve 3. adımdaki POI araması çalışır.

Hiçbir kaynaktan konum bulunamayan mahalle olursa **boş bırakılır** ve
ekranda *"Hiçbir kaynaktan konum bulunamadı"* başlığı altında adlarıyla
listelenir. Yaklaşık koordinat üretilmez — uydurulmuş bir merkez, haritayı
çalışıyor gibi gösterip yanlış yeri işaret ederdi.

⚠️ Bir mahalle o listede çıkıyorsa ilk kontrol edilecek şey adının doğru
yazıldığı ve **gerçekten Çorlu ilçesine ait olduğudur.** Komşu ilçenin
mahallesi, Çorlu içinde aranınca elbette bulunamaz.

### Ne kadar sürer

⚠️ **Bu adım dakikalar sürebilir ve bu normaldir.** Sorgu artık tek parça
değil: önce ucuz bir liste sorgusu, sonra mahalleler üçerli gruplar hâlinde
indiriliyor. Ekranda bir **ilerleme çubuğu** ve "5/9 grup indirildi" yazısı
görürsünüz.

Ölçüm (15 Ağustos 2026, canlı): dokuz grubun yedisi ilk denemede ve
saniyeler içinde geldi; ikisi yedek sunucuya geçtikten sonra geldi. Toplam
yaklaşık **10 dakika**.

**Sayfayı kapatmayın ve butona tekrar basmayın.** Program yoğunluğu kendisi
yönetiyor.

Yazma yaklaşık yarım dakika.

### Hata alırsanız

| Ekranda yazan | Ne yapmalısınız |
| --- | --- |
| "Sistemde hiç mahalle kaydı yok. Önce yukarıdaki 1. adımı çalıştırın." | 1. adımı atlamışsınız. Yukarı çıkın, onu yapın. |
| "OpenStreetMap sunucusu yoğun, 15 sn sonra tekrar denenecek (2/4)" | **Hiçbir şey yapmayın.** Program kendisi bekleyip tekrar deniyor ve her denemede başka bir yedek sunucuya geçiyor. Butona tekrar basmayın. |
| "7/9 grup geldi · 2 grup düştü" | Gelenler kayboldu sanmayın — duruyorlar. **"Kalan 2 grubu tekrar dene"** düğmesine basın; yalnızca eksikler yeniden istenir. |
| Dört denemeden sonra da gelmiyor | OSM sunucularının hepsi yoğun demektir. 10-15 dakika sonra tekrar deneyin; gelen veri kaybolmaz. |
| Çok sayıda "eşleşmedi" satırı | Normaldir; komşu ilçelerin mahalleleri eleniyor. Sadece adı sistemimizde olanlara sınır yazılır. |

### ✅ Sonraki adıma geçmeden doğrulayın

Sol menü → **Mahalleler** → herhangi bir mahalle → **Konum** sekmesi.
*"Mahalle merkezi"* dolu olmalı. **En az birkaç mahallede merkez noktası
yoksa 3. adım çalışmaz.**

---

## 3. adım · OpenStreetMap'ten POI (ilgi noktaları) çek

Okul, eczane, market, park, hastane gibi noktaları haritaya ve mahalle
sayfalarındaki "çevre" bölümüne getirir.

### Nereye tıklayacaksınız

1. Sol menü → **"POI içe aktar (OpenStreetMap)"**
   (Doğrudan adres: `https://aslihangyd.com/admin/osm-poi-ice-aktar`)
2. **"1 · Arama alanı"** bölümünde *"Mahalle merkezlerine eklenecek pay
   (metre)"* kutusu **5000** yazar. **İlk seferde değiştirmeyin.**
3. **"Önizle"** butonuna basın.

### Ne göreceksiniz

Buton **"OpenStreetMap sorgulanıyor…"** olur, sonra **"2 · Önizleme"**
bölümü açılır: `… yeni` · `… güncellenecek` · `… korunacak (elle
düzeltilmiş)`.

Altında **"Eşleme tablomuzda karşılığı olmayan türler"** başlığı vardır.
Bu bölüm boşken bile görünür ve **okumaya değer**: OSM'den gelen ama bizim
kategorilerimize girmeyen etiketleri listeler. Burada işinize yarayacak bir
tür görürseniz (örneğin yeni bir kategori) not alıp bana söyleyin.

Sonra **"… noktayı içe aktar"** butonuna basın.

### Ne kadar sürer

⚠️ **Dakikalar sürebilir ve bu normaldir.** Alan artık tek parça
sorulmuyor: mahalleler üçerli gruplanıp her grup için ayrı, küçük bir sorgu
gönderiliyor. Ekranda **ilerleme çubuğu** ve "4/9 bölge indirildi" yazısı
görürsünüz.

Küçük sorgular tek büyük sorgudan çok daha güvenilir dönüyor; ayrıca bir
bölge düşerse yalnızca o bölge yeniden isteniyor.

**Sayfayı kapatmayın ve butona tekrar basmayın.**

### Payı büyütmeli miyim?

- **5000 m (varsayılan):** Çorlu merkezi ve yakın çevresi. Çoğu durumda doğru.
- **Daha büyük:** Çevre köyler ve OSB'ler de girer — daha çok nokta, ama
  alakasız kayıt da artar.
- **Daha küçük:** Daha az ama daha kesin sonuç.

Payı değiştirdiyseniz **önizlemeyi tekrar çalıştırın**; sayı değişecektir.

### Hata alırsanız

| Ekranda yazan | Ne yapmalısınız |
| --- | --- |
| "Merkez noktası tanımlı mahalle bulunamadı." | 2. adım tamamlanmamış. En az bir mahallenin **Konum → Mahalle merkezi** alanı dolu olmalı. |
| "OpenStreetMap sunucusu yoğun, … tekrar denenecek (2/4)" | **Hiçbir şey yapmayın**, program kendisi bekliyor ve yedek sunucuya geçiyor. |
| "Sunucu bizi geçici olarak kısıtladı (kota sınırı) — bu bir hata değil" | **Kesinlikle butona basmayın.** Bu bir arıza değil; sunucu bize "biraz yavaşla" diyor. Tekrar tekrar denemek kısıtlama süresini **uzatır**. Program 1–3 dakika bekleyip kendisi deneyecek. |
| "Sınır içe aktarma az önce çalıştı… ~4 dk bekleyip deneyin" | Uyarıdır, engel değil. İki işlem aynı kotayı paylaşıyor. Beklerseniz iş daha çabuk biter; beklemezseniz büyük olasılıkla kota sınırına takılırsınız. |
| "6/9 bölge geldi · 3 bölge düştü" | **"Kalan 3 bölgeyi tekrar dene"** düğmesine basın. Gelen noktalar duruyor. |
| "İçe aktarma tamamlanamadı." | Sayfayı yenileyip tekrar deneyin. Yarım kalan aktarma zarar vermez; ikinci çalıştırma kaldığı yerden devam eder. |

### ⚠️ Kaldırmamanız gereken ibare

POI verisinin göründüğü her yerde **"© OpenStreetMap katkıcıları"** yazar.
Bu yasal bir zorunluluktur (ODbL lisansı). Bu ibareyi kaldırmayın,
kaldırılmasını istemeyin.

### ✅ Sonraki adıma geçmeden doğrulayın

Sol menü → **İlgi Noktaları**. Liste dolu olmalı. Birkaç kaydı açıp
kategorisinin doğru olduğuna bakın. Sonra siteye gidip bir mahalle
sayfasının "çevre" bölümünde noktaların göründüğünü kontrol edin.

---

## 4. adım · Kurumsal bilgiler (yetki belgesi, iletişim)

Bu bilgiler sitenin **altbilgisinde**, **ana sayfadaki güven şeridinde** ve
**/hakkimizda** sayfasında görünür. Yetki belgesi numarası girilene kadar
altbilgide *"yetki belgesi girilmedi"* uyarısı durur.

### Nereye tıklayacaksınız

Sol menüde **"Kurumsal Bilgiler"** bağlantısı.
(Doğrudan adres: `https://aslihangyd.com/admin/globals/kurumsal-bilgiler`)

Sayfa üç sekmeye bölünmüştür: **Yasal · İletişim · KVKK**.

### Yasal sekmesi

| Alan | Ne yazılacak |
| --- | --- |
| Ticaret unvanı | Vergi levhasındaki tam unvan |
| **Taşınmaz Ticareti Yetki Belgesi numarası** | Belgenizin üzerindeki numara |
| MERSİS numarası | Varsa |
| Vergi dairesi / Vergi numarası | Vergi levhasından |
| Sorumlu Emlak Danışmanı (MYK Seviye 5) belge no | Belgenizden |

### İletişim sekmesi

İş yeri adresi · Telefon · E-posta · WhatsApp numarası · Çalışma saatleri ·
Sosyal medya hesapları (platform seçip profil adresini yazarak eklenir).

### KVKK sekmesi

Veri sorumlusu · VERBİS kayıt numarası · KVKK başvuru e-postası.

⚠️ **KVKK metinlerinin kendisini buraya yazmayın.** Gizlilik politikası,
aydınlatma metni ve kullanım koşullarının içeriğini **avukatınız** verir.
Bu sekmedeki alanlar yalnızca numara ve iletişim bilgisidir.

### Ne kadar sürer

Elinizde belgeler varsa **10–15 dakika**. Bilgi toplamak gerekiyorsa
belgeleri önce hazırlayın.

### Kaydetme

Sayfanın altındaki **"Kaydet"** butonuna basın. Yeşil bir onay çıkar.

### Hata alırsanız

| Durum | Ne yapmalısınız |
| --- | --- |
| Alanlar soluk, yazılamıyor | Danışman rolündesiniz. Bu sayfayı yalnızca yönetici düzenleyebilir. |
| "Kaydet" bir hata veriyor | Zorunlu bir alan boş olabilir; kırmızı işaretli alanı doldurun. |

### ✅ Doğrulayın

Yeni bir sekmede **https://aslihangyd.com** açın, sayfanın en altına inin.
Yetki belgesi numarası görünmeli ve *"yetki belgesi girilmedi"* uyarısı
kaybolmuş olmalı. **/hakkimizda** sayfasına da bakın.

---

## Marka ve Görünüm — logo ve renkler

Bu bölüm veri girişi değil, görünüm ayarı. Sırası önemli değil; ne zaman
isterseniz yapabilirsiniz.

**Sol menü → Ayarlar → Marka ve Görünüm** (`/admin/globals/marka-gorunum`)

### Marka sekmesi

| Alan | Not |
| --- | --- |
| Site adı | Boş bırakırsanız "Aslıhan GYD" kullanılır |
| Kısa slogan | Paylaşım kartlarında görünür |
| Ana logo | SVG tercih edilir. ⚠️ Her sayfada yükleniyor — 50 kB üstünde uyarı çıkar (engel değil) |
| Koyu tema logosu | İsteğe bağlı. Boşsa koyu temada da ana logo kullanılır |
| Simge kaynağı | **Kare**, en az 512×512. Favicon ve tüm ikonlar bundan otomatik üretilir |
| Paylaşım görseli | Önerilen 1200×630 |

⚠️ **Logo yüklemek zorunda değilsiniz.** Logo yoksa site adı yazıyla
gösterilir; site logosuz da düzgün çalışır.

⚠️ **Favicon zaten çalışıyor.** Simge yüklemeseniz bile site adının baş
harfinden marka renkleriyle bir simge üretiliyor. Kare görsel
yüklediğinizde kendiliğinden ona döner.

Sayfanın altındaki **Durum** kutusu logonun boyutunu ve simgenin kare olup
olmadığını söyler. Bu kutu *kaydedilmiş* durumu gösterir — yeni yüklediğiniz
dosya, kaydete bastıktan sonra görünür.

### Renk sekmeleri

İki sekme var: **Renkler — açık tema** ve **Renkler — koyu tema**. Her
birinde on renk kutusu. Her kutuda bir renk seçici ve hex girişi.

⚠️ **On yuvadan fazlası yok ve olmayacak.** Her yeni yuva yeni bir kontrast
çifti demek.

**Kontrast ölçümü** tablosu her renk değişiminde anında güncellenir:

```
Metin / Ana arka plan          12.69:1  ✓ AAA
Buton metni / Buton zemini      4.74:1  ✓ AA
Başlık / Bölüm arka planı       4.22:1  × AA için 4.5 gerekiyor
```

⚠️ **Bir çift bile AA'yı geçmiyorsa kaydedemezsiniz.** Kaydete bastığınızda
ilgili renk kutusu kırmızı işaretlenir ve sebebi altında yazar. Bu kapı
gevşetilemez — erişilebilirlik pazarlık konusu değil.

Kırmızı satırın yanındaki **"Yakın alternatif"** düğmesi, aynı tonu koruyup
eşiği geçen en yakın rengi önerir. Tıklayınca uygular.

**Canlı önizleme** kartı renk değiştikçe güncellenir. Siteyi bozmadan
deneyebilirsiniz — kaydetmeden hiçbir şey yayına girmez.

**Hazır paletler**: Bohem/pudra (varsayılan), Klasik lacivert, Sıcak nötr.
Ayrıca her zaman **"Varsayılana dön"**.

### İki yuva metin rengi olarak kullanılamaz

**Dekoratif çizgi** (gold) ve **Yumuşak vurgu zemini** (pudra) yalnızca
zemin ve ayraçtır. Panelde bu not yazılı. Gold açık zeminde 2,14:1 verir —
üstüne yazı gelirse okunmaz.

### Kaydettikten sonra

Renk değişikliği **anında** yayına girer; sunucuda bir şey yapmanız
gerekmez, imajın yeniden derlenmesi gerekmez. Siteyi yenileyip görebilirsiniz.

---

## 5. adım · Rayiç bedel CSV içe aktarma

Belediyenin yayınladığı **rayiç bedel** (emlak vergisine esas asgari değer)
tablosunu sisteme aktarır.

⚠️ **Bu adımdan önce yedek alın** → [EK A, komut 1](#ek-a--sunucuda-çalıştırılacak-komutlar).

### Rayiç bedel nedir, ne DEĞİLDİR

Belediyelerin takdir komisyonlarınca dört yılda bir belirlenen, emlak
vergisi ve tapu harcı için **asgari** matrahtır. **Piyasa fiyatı değildir**
ve çoğu yerde piyasanın belirgin biçimde altındadır — bu bir hata değil,
tanımı gereğidir. Sitede rakamın yanında kaynağı ve yılı **her zaman**
gösterilir; bu ibareler kaldırılmaz.

### CSV dosyanız nasıl olmalı

Excel'de hazırlayıp **"Farklı Kaydet → CSV UTF-8"** ile kaydedin. Türkçe
Excel'in noktalı virgülle ayırdığı çıktı da okunur.

**İlk satır başlık satırı olmalıdır.** Sütun sırası önemli değildir; sistem
başlıklardan tahmin eder ve tahminini size gösterir, yanlışsa
düzeltirsiniz.

#### Sütunlar

| Alan | Zorunlu mu | Kabul edilen başlıklar (bunlardan biri yeterli) |
| --- | --- | --- |
| **Mahalle** | ✅ **Evet** | `Mahalle`, `Mahalle Adı`, `Semt`, `Bölge` |
| Sokak / cadde | Hayır | `Sokak`, `Cadde`, `Cadde/Sokak`, `Yol` |
| Yıl | Hayır | `Yıl`, `Vergi Yılı`, `Dönem` |
| Bina m² rayiç bedeli | Hayır* | `Bina Rayiç`, `Bina m2`, `Rayiç`, `Rayiç Bedel`, `Birim Değer`, `Metrekare Değeri` |
| Arsa m² rayiç bedeli | Hayır* | `Arsa Rayiç`, `Arsa m2`, `Arsa Değeri`, `Arsa Birim Değer` |
| Kaynak | Hayır | `Kaynak`, `Veri Kaynağı` |
| Not | Hayır | `Not`, `Notlar`, `Açıklama` |

\* Bina ve arsanın **en az biri** dolu olmalı. İkisi de boşsa satır
aktarılmaz — yazılacak rakam yoktur.

**Mahalle adı sistemdeki adla eşleşmelidir.** Eşleşmeyen satır aktarılmaz
ve sebebi yazılır.

#### Örnek dosya

> ⚠️ **ÖRNEK VERİ — YAYINLANMAYACAK.** Aşağıdaki rakamlar biçimi göstermek
> için uydurulmuştur, gerçek Çorlu rayiç bedelleri **değildir.** Gerçek
> rakamları belediyenin yayınladığı tablodan alın.

Noktalı virgülle (Türkçe Excel'in varsayılanı):

```csv
Mahalle;Sokak;Yıl;Bina m² rayiç;Arsa m² rayiç;Kaynak;Not
Muhittin;Atatürk Caddesi;2026;9500;6200;belediye;
Muhittin;Cumhuriyet Sokak;2026;8750;5400;belediye;
Şeyhsinan;;2026;7200;4100;belediye;mahalle geneli
Alipaşa;Hükümet Caddesi;2026;10250;7300;belediye;
Önerler;;2026;;2800;belediye;arsa ağırlıklı
```

Virgülle ayrılmış hâli de okunur:

```csv
Mahalle,Sokak,Yıl,Bina m² rayiç,Arsa m² rayiç
Muhittin,Atatürk Caddesi,2026,9500,6200
Şeyhsinan,,2026,7200,4100
```

**Dikkat edilecekler:**

- **Sokak boş bırakılırsa** değer o mahallenin geneli sayılır (örnekteki
  Şeyhsinan satırı).
- **Binlik ayırıcı:** `9500` ya da `9.500` yazabilirsiniz. Ama `9,500`
  yazarsanız sistem bunu 9,5 mi 9500 mü olduğunu kesin çözemez — böyle
  satırlar için **uyarı** üretir ve gözle doğrulamanızı ister. Karışıklığı
  önlemek için **ayırıcı kullanmadan** yazmak en güvenlisidir.
- **Para birimi işareti yazmayın** (`₺`, `TL`). Sadece rakam.
- **Kaynak sütunu** yazacaksanız kabul edilen değerler: `belediye`, `tkgm`,
  `elle`. Yazmazsanız aşağıdaki varsayılan kullanılır.

### Nereye tıklayacaksınız

1. Sol menü → **"Rayiç bedel içe aktar (CSV)"**
   (Doğrudan adres: `https://aslihangyd.com/admin/rayic-ice-aktar`)
2. **"1 · Dosya"** bölümünde *"CSV dosyası"* yanındaki **Dosya Seç**
   butonuyla dosyanızı seçin. (Ya da içeriği alttaki kutuya yapıştırın.)
3. **"Varsayılanlar"** başlığı altında:
   - **Yıl** — rayiç bedelin ait olduğu vergi yılı. Dosyada yıl sütunu
     yoksa bu kullanılır. *Yılsız rakam anlamsızdır.*
   - **Kaynak** — genellikle **"Belediye (takdir komisyonu)"**.
   - **Tabloyu aldığınız tarih** — isteğe bağlı ama **girin**: sitedeki
     "veriler [tarih] itibarıyladır" ibaresi bundan üretilir.
4. **"Önizle"** butonuna basın.

### Ne göreceksiniz — önizleme

**"2 · Sütun eşlemesi"** bölümü açılır. Üstte hangi ayırıcının bulunduğu
yazar (`;` veya `,`).

Bir tablo: her **Alan** için hangi **CSV sütununa** bağlandığı açılır
listede gösterilir. **Tahmin yanlışsa listeden doğrusunu seçin** — seçer
seçmez önizleme kendini yeniler.

Zorunlu alan bağlanmadıysa kırmızı uyarı çıkar: *"Şu zorunlu alanlar bir
sütuna bağlanmadı: Mahalle."*

Aşağıda üç rozet:

- `… hazır` — sorunsuz
- `… uyarılı` — aktarılır ama işaretlenir (rakam olağandışı, mükerrer satır…)
- `… hatalı (aktarılmayacak)` — sebebi satırın **Durum** sütununda yazar

Satır tablosunda her satırın başında bir **onay kutusu** var. İşareti
kaldırdığınız satır aktarılmaz. Hatalı satırlar zaten aktarılamaz.

Son olarak **"… satırı aktar"** butonuna basın.

### Ne göreceksiniz — sonuç

*"… yeni kayıt açıldı, … kayıt güncellendi, … satır elendi, … satır hatalı
olduğu için aktarılmadı."*

**Hiçbir satır sessizce atlanmaz.** Aktarılmayan her satırın sebebi
yazılıdır.

### Ne kadar sürer

Önizleme anlıktır. Aktarma satır sayısına bağlı: birkaç yüz satır için
**1–2 dakika**. 300 satırdan fazlaysa ekranda ilk 300'ü görürsünüz ama
**tamamı işlenir**.

### Hata alırsanız

| Ekranda yazan | Ne demek / ne yapmalısınız |
| --- | --- |
| `"X" sistemdeki hiçbir mahalleyle eşleşmedi.` | Mahalle adı yanlış yazılmış ya da o mahalle sistemde yok. Dosyadaki yazımı düzeltin. |
| `Mahalle boş.` | O satırda mahalle hücresi boş. |
| `Yıl okunamadı: "…"` | Yıl 1990–2100 arasında bir tam sayı olmalı. |
| `Bina rayiç bedeli okunamadı: "…"` | Hücrede rakam dışında bir şey var (₺, TL, harf). |
| `… rayiç bedeli olağandışı (… ₺/m²). Binlik ayırıcı yanlış okunmuş olabilir` | **Uyarı, engel değil.** Rakama gözle bakın: bir sıfır fazla/eksik olabilir. Doğruysa aktarın. |
| `Satırda ne bina ne arsa rayiç bedeli var` | İki rakam sütunu da boş. |
| `Bu mahalle/sokak/yıl birleşimi … satırda da var.` | Dosyada mükerrer satır. Hangisinin doğru olduğuna karar verin, diğerinin onay kutusunu kaldırın. |
| `Kaynak tanınmadı ("…"); varsayılan kullanıldı.` | Kaynak sütununda beklenmedik bir değer. Zararsız. |
| "… satırı aktar" butonu soluk | Ya yazılacak satır yok ya da zorunlu alan bağlanmamış. Yukarıdaki kırmızı uyarıya bakın. |

### ✅ Doğrulayın

1. Sol menü → **Rayiç Değerler**. Kayıtlar listede olmalı.
2. Siteye gidin, rayiç verisi girdiğiniz bir mahallenin sayfasını açın.
   Rakamın yanında **kaynak ve yıl** görünmeli. Görünmüyorsa bana söyleyin.
3. **Araçlar → Alım maliyeti** hesaplayıcısında o mahalleyi seçin; tapu
   harcı hesabının rayiç bedeli dikkate aldığını göreceksiniz.

---

## 6. adım · Değerleme katsayıları

Ücretsiz değerleme aracının kat, yapı durumu ve bina yaşı çarpanları.

⚠️ **Bu katsayılara başlangıç değeri konulmadı ve konulmamalı.** Benim
"makul görünen" bir katsayı yazmam, uydurma veriyi model parametresi
kılığında sokmak olurdu. **Bir katsayı girilmemişse motor o faktörü hesaba
katmaz** ve ziyaretçiye "bu etki hesaba katılmadı" der — sessizce 1,0
uygulamaz. Yani eksik bırakmak güvenlidir; yanlış doldurmak değildir.

### Katsayı ne demek

Katsayılar **çarpımsaldır**:

- `1,00` = etkisiz
- `1,05` = değeri %5 artırır
- `0,90` = değeri %10 düşürür

İzin verilen aralık: **0,30 – 2,00**.

### Nereye tıklayacaksınız

Sol menü → **"Değerleme Ayarları"**
(Doğrudan adres: `https://aslihangyd.com/admin/globals/degerleme-ayarlari`)

### Doldurulacak üç liste

**1 · Kat katsayıları** — "Kat Ekle" ile satır ekleyin. Kat tipleri:

| Kat tipi |
| --- |
| Bodrum / giriş altı |
| Zemin veya bahçe katı |
| Ara kat |
| Yüksek kat |
| En üst kat / çatı |

**2 · Yapı durumu katsayıları** — "Durum Ekle":

| Yapı durumu |
| --- |
| Sıfır / hiç kullanılmamış |
| İyi durumda |
| Ortalama |
| Tadilat gerekiyor |

**3 · Bina yaşı katsayıları** — "Yaş dilimi Ekle". Her dilim için **üst yaş
sınırı** ve **katsayı** girilir. ⚠️ **En yaşlı dilimin üst sınırını BOŞ
bırakın** — bu "ve üzeri" anlamına gelir. Sıralama önemli değil, sistem
kendisi sıralar.

**4 · Metodoloji notu** — Katsayıları neye göre belirlediğinizi yazın. Bir
müşteri veya gazeteci *"bu rakamı nasıl buldunuz?"* diye sorduğunda
cevabınız hazır olsun. Bu alan boş kalmasın.

### Ne kadar sürer

Rakamlara karar vermek asıl iştir. Girmek **15–20 dakika**.

### ✅ Doğrulayın

Siteye gidip **değerleme aracını** kendi bildiğiniz bir daire için
çalıştırın. Sonuç ekranında girdiğiniz katsayıların tek tek listelendiğini
göreceksiniz. Çıkan rakam sizin sahadaki tahmininize yakın değilse
katsayıları gözden geçirin — araç şeffaftır, hangi çarpanın ne yaptığını
gösterir.

---

## 7. adım · Mahalle eşleştirme profili (4 ölçüt)

"Bana uygun mahalle hangisi?" testinin çalışması için her mahalleye dört
puan verilir. **Her mahalle için ayrı ayrı** doldurulur.

### ⚠️ Bu puanlar kalite yargısı DEĞİLDİR

Sakinlik puanı düşük bir mahalle "kötü" değildir — kimi ziyaretçi sakinlik
ister, kimi hareket. Test, ziyaretçinin tercihine göre eşleştirme yapar.

### Nereye tıklayacaksınız

1. Sol menü → **Mahalleler**
2. Bir mahalleye tıklayın
3. Üstteki sekmelerden **"Eşleştirme profili"** sekmesine geçin
4. Aynı adı taşıyan başlık altındaki dört kutuyu doldurun
5. **Kaydet**
6. **26 mahalle için tekrarlayın**

### ⚠️ Yarım doldurulan profil sonuç ÜRETMEZ

Test sekiz ölçüt kullanır: buradaki dördü, artı **Yatırım skoru**
sekmesinden otomatik okunan dördü (yatırım potansiyeli, sanayi yakınlığı,
ulaşım, sosyal donatı).

Bir mahalle için **ölçütlerin en az %60 ağırlığı dolmadan uyum yüzdesi
hesaplanmaz** — o mahalle teste hiç girmez. Yani bir mahalleye tek bir puan
girip bırakmak işe yaramaz; ya dördünü de girin ya da hiç girmeyin.

Bu bilinçli: yarım veriyle üretilmiş bir "%82 uyumlu" rakamı, hiç
göstermemekten daha kötüdür.

### Dört ölçüt — hepsi 0 ile 100 arası

| Ölçüt | Ne sorar | 100 ne demek |
| --- | --- | --- |
| **Toplu taşıma** | Araç kullanmayan biri için otobüs/dolmuş erişimi ve hat sıklığı | Araçsız rahatça yaşanır |
| **Okul erişimi** | Okul öncesi, ilkokul ve ortaokullara yürüme mesafesi | Çocuk okula yürüyerek gider |
| **Sakinlik** | Trafik, gürültü ve yoğunluk | Çok sakin (0 = ana arter üzerinde) |
| **Merkeze yakınlık** | Çorlu merkezine ve çarşıya yakınlık | Merkezde |

💡 **Sakinlik ve merkeze yakınlık genellikle ters çalışır.** İkisini
birlikte düşünün: merkezde bir mahalleye hem 90 merkeze yakınlık hem 90
sakinlik vermek muhtemelen gerçeği yansıtmaz.

**Profil notu** kutusunu da doldurun: bu puanları neye göre verdiğinizi
yazın. Bir ziyaretçi *"neden bu mahalle önerildi?"* diye sorduğunda
cevabınız hazır olsun.

### Pratik öneri

26 mahalleyi tek oturumda puanlamayın. **Önce en iyi bildiğiniz 6 mahalleyi
yapın** (Muhittin, Alipaşa, Şeyhsinan, Hıdırağa, Önerler ve bir tane daha),
sonuçları test edin, sonra devam edin.

Puan vermeden önce hepsini kağıda dökmek işi kolaylaştırır: dört sütun, 26
satır. Birbirine göre puanlamak, tek tek puanlamaktan çok daha tutarlı
sonuç verir.

### Ne kadar sürer

Mahalle başına **2–3 dakika**. 26 mahalle için toplam **1–1,5 saat**.

### ✅ Doğrulayın

Siteye gidip **mahalle eşleştirme testini** kendiniz çözün. Çıkan öneri
sizin sahadaki sezginize uymuyorsa, o mahallelerin puanlarına dönüp bakın.
Test portföyden bağımsızdır — ilan sayısı sonucu etkilemez.

---

## Bittikten sonra

Bu yedi adım bitince siteye şu eklenmiş olur:

- 26 mahallenin adı, türü, sınırı ve merkez noktası
- Haritada ve mahalle sayfalarında POI katmanı
- Altbilgide ve /hakkimizda'da yasal kurumsal bilgiler
- Rayiç bedeller ve alım maliyeti hesabında doğru harç matrahı
- Çalışan bir değerleme aracı
- Çalışan bir mahalle eşleştirme testi

**Henüz eksik kalanlar** (bu kılavuzun kapsamı dışında, ayrı iş):

- Mahalle **rakamları** (m² satış, kira, çarpan) — bunlar kendi
  gözlemlerinizden gelir, `Mahalleler → Rakamlar` sekmesinden girilir
- Mahalle **içerikleri** ("Neden bu mahalle?" metinleri)
- **Drone video ve 360° tur** — CDN hesabı gerekiyor
- **İlanların cephe yönü** — güneş zaman çubuğunun çalışması buna bağlı

Ayrıntılı liste: `docs/SENDEN-BEKLENENLER.md`

---

## EK A — Sunucuda çalıştırılacak komutlar

⚠️ **Bu bölüm panel kullanıcısı için değildir.** Buradaki komutlar sunucuya
SSH ile bağlanabilen kişi tarafından çalıştırılır.

Panelden yapılamayan **tek iş elle yedek almaktır.** İçe aktarmaların
hepsi (mahalle listesi, sınırlar, POI, rayiç CSV) **panelden çalışır** —
komut satırı gerektirmez.

### Komut 1 — İçe aktarma öncesi elle yedek

```bash
ssh deploy@sunucu
cd /srv/aslihangyd/app

# .env'den veritabanı bilgilerini oku
set -a; . ./.env; set +a

# Zaman damgalı döküm al
docker exec aslihangyd-postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "/srv/aslihangyd/yedek-$(date -u +%Y%m%d-%H%M%S).sql.gz"

# Dosyanın gerçekten yazıldığını doğrula — boyut anlamlı olmalı
ls -lh /srv/aslihangyd/yedek-*.sql.gz | tail -3
```

⚠️ Çıkan dosya **birkaç kilobayttan küçükse yedek başarısızdır.** Sebebini
bulmadan içe aktarmaya başlamayın.

### Komut 2 — Geri yükleme (bir şey ters giderse)

```bash
cd /srv/aslihangyd/app
./scripts/geri-yukle.sh
```

⚠️ Geri yükleme **yedek anından sonraki tüm değişiklikleri siler.** Önce
neyi kaybedeceğinizi düşünün.

### Komut 3 — Gece yedeğinin çalıştığını kontrol et

```bash
tail -20 /srv/aslihangyd/logs/yedek.log
```

Her gece 03:00'te çalışır. ⚠️ **Test edilmemiş yedek, yedek değildir** —
ayda bir gerçek bir geri yükleme denemesi yapın.

### Google Places katmanı (isteğe bağlı, varsayılan KAPALI)

Google Places katmanını açmak **iki koşulun birlikte sağlanmasını** ister:

1. Sunucuda `.env` dosyasına `GOOGLE_PLACES_API_KEY=` satırı eklenir ve
   uygulama yeniden başlatılır (SSH gerekir)
2. Panelden **Ayarlar → Site Bölümleri → "Google Places katmanı açık"**
   işaretlenir

⚠️ Google Places verisi **önbelleğe alınamaz** (lisans kısıtı) ve **her
çağrı ücretlidir.** Katman açıkken kullanımı panelden izleyebilirsiniz:
**Ayarlar → Google Places Kullanımı**.

Anahtar olmadan panelden işaretlemek tek başına bir şey yapmaz — ikisi
birden gerekir.

---

## EK B — Bir şey ters giderse

| Belirti | Muhtemel sebep | Ne yapmalısınız |
| --- | --- | --- |
| Menüde içe aktarma bağlantıları yok | Danışman rolüyle giriş yapılmış | Yönetici hesabıyla girin |
| "OpenStreetMap sorgulanıyor…" 2 dakikadan uzun sürüyor | OSM sunucusu yoğun | Bekleyin; sürerse 10 dakika sonra tekrar deneyin |
| Önizleme butonu çalışıyor ama yazma butonu soluk | Yazılacak kayıt sayısı 0 | Zaten yapılmış demektir, bir sorun yok |
| İçe aktarma yarıda kesildi | Bağlantı koptu | Tekrar çalıştırın. Yarım aktarma zarar vermez; ikinci çalıştırma kaldığı yerden devam eder |
| Elle düzelttiğim sınır kayboldu | Olmaması gerekir | Bana bildirin — `Konum → "Sınır elle düzeltildi"` kutusu işaretliyse ezilmemeliydi |
| Sitede rakam görünüyor ama kaynak/yıl görünmüyor | Hata | Bana bildirin. Kaynaksız rakam gösterilmemesi gerekir |
| Panel açılıyor ama site 500 hatası veriyor | Muhtemelen bekleyen veritabanı göçü | SSH erişimi olan kişiye söyleyin: `docs/ISLETME-REHBERI.md` §5.3, adım 2–3 |

**Emin olmadığınız her durumda sorun.** Yanlış veri girmektense boş
bırakmak her zaman daha iyidir.
