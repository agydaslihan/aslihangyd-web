# Senden Beklenenler — Aslıhan'ın yapması gerekenler

Bu dosya, geliştirmenin ilerlemesi için **senden** gelmesi gereken her şeyi
biriktirir. Ben eksik veri yüzünden durmuyorum: alanı boş bırakıp
`AslihanTarafindanDoldurulacak` işaretliyorum, buraya yazıyorum, devam ediyorum.

Bir maddeyi hallettiğinde başındaki `[ ]` kutusunu `[x]` yap.

> 📘 **Panelde nereye tıklayacağını arıyorsan:** bu dosya *neyin* gerektiğini
> söyler, **[docs/VERI-GIRISI-KILAVUZU.md](VERI-GIRISI-KILAVUZU.md)** ise
> *nasıl yapılacağını* adım adım anlatır — menü adı, buton adı, hata tablosu
> ve her adımın sonunda yapılacak doğrulamayla.

---

## Koşula bağlı — sayı dolunca yapılacak

- [ ] **"Bugün aranacaklar" ekranı** ⬅️ *koşul: açık talep sayısı 15'i geçince*

      Talepleri `sonTemas` + `durum` + `skor` ile sıralayan tek liste.
      Mevcut alanlardan besleniyor; yeni şema gerekmiyor.

      ⚠️ **Bilerek ertelendi (28 Ağustos 2026).** Bugün açık talep sayısı
      tek haneli; boş bir "bugün aranacaklar" listesi kimseye fayda
      vermez ve bir kez boş görülen ekran bir daha açılmaz. Aynı gerekçe
      CRM'in kendisini ertelerken de kullanılmıştı ve doğruydu.

      ⚠️ `sonTemas` alanı bugün HİÇBİR YERDE kullanılmıyor — ne sıralamada
      ne uyarıda. Bu ekran yazıldığında ilk işi o alanı işe koşmak olacak.

      Kontrol: panelde Talepler listesinde durum "kazanıldı"/"kaybedildi"
      olmayan kayıt sayısı 15'i geçtiyse sıra bu ekranda.

- [ ] **Kanban panosu** ⬅️ *karar: gerçek ihtiyaç doğarsa*

      ⚠️ Bilerek yapılmadı. Tablo + filtre aynı işi yapıyor ve altı
      durumlu bir pano 20 kayıtta boş görünür. Görsel olarak tatmin edici
      ama bilgi olarak tablodan fazlasını vermiyor.

---

## Acil (yayın engelleyici)

- [ ] **Sunucudaki `.env` dosyasında değişken adlarını güncelle** — bu
      değişiklik yayına çıktıktan SONRA, kabı yeniden başlatmadan önce

      Dokuz değişkenin adı değişti. Eski adlar (`NEXT_PUBLIC_` önekli)
      **zaten çalışmıyordu**: Next.js onları derleme anında imaja gömüyor ve
      imaj bu değerler tanımsızken derleniyordu. Yani bugün yayında harita
      açılmıyor, bot koruması kapalı, analitik yüklenmiyor ve drone
      videoları "yapılandırılmadı" diyor. Yeni adlar çalışma zamanında
      okunuyor — artık `.env`'i değiştirip kabı yeniden başlatmak yetiyor.

      | Eski ad | Yeni ad |
      | --- | --- |
      | `NEXT_PUBLIC_MAPTILER_API_KEY` | `MAPTILER_ANAHTARI` |
      | `NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI` | `TURNSTILE_SITE_ANAHTARI` |
      | `NEXT_PUBLIC_WHATSAPP_NUMARA` | `WHATSAPP_NUMARA` |
      | `NEXT_PUBLIC_ILETISIM_TELEFON` | `ILETISIM_TELEFON` |
      | `NEXT_PUBLIC_ILETISIM_EPOSTA` | `ILETISIM_EPOSTA` |
      | `NEXT_PUBLIC_UMAMI_URL` | `UMAMI_URL` |
      | `NEXT_PUBLIC_UMAMI_SITE_ID` | `UMAMI_SITE_ID` |
      | `NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME` | `BUNNY_STREAM_CDN_HOSTNAME` |
      | `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID` | (silin — `BUNNY_STREAM_LIBRARY_ID` ile birleşti) |

      `NEXT_PUBLIC_SERVER_URL` kalıyor; yanındaki `SITE_ADRESI` ile aynı
      değeri taşımaya devam etmeli.

      Doğrulama (kabı yeniden başlattıktan sonra):
      ```bash
      curl -s http://127.0.0.1:3000/harita | grep -c api.maptiler.com   # 1+ olmalı
      ```
      Olmazsa: `/harita` boş durumda kalır ve OSM'den içe aktardığımız ilgi
      noktalarının görüneceği başka yer yok.

- [ ] **Taşınmaz Ticareti Yetki Belgesi numarası**
      Nereye: Payload admin → Ayarlar → Kurumsal Bilgiler → Yetki Belgesi No
      Olmazsa: `/hakkimizda` sayfasında zorunlu yasal bilgi eksik kalır, ilan
      yayınlamak mevzuata aykırı olur.

- [ ] **MERSİS / vergi dairesi + vergi numarası, ticaret unvanı, iş yeri adresi**
      Nereye: Payload admin → Ayarlar → Kurumsal Bilgiler
      Olmazsa: ETBİS ve mesafeli satış bilgilendirme yükümlülükleri karşılanmaz.

- [ ] **KVKK aydınlatma metni, açık rıza metni, gizlilik politikası,
      çerez politikası, kullanım koşulları — avukattan**
      Nereye: Payload admin → Sayfalar → ilgili hukuki sayfa
      Olmazsa: Lead formu hukuken güvenli değil. İskeletleri hazırladım,
      içerik metinlerini ben yazmıyorum (CLAUDE.md kural 3).

- [ ] **WhatsApp iş numarası** (uluslararası biçimde, örn. 905XXXXXXXXX)
      Nereye: Payload admin → Ayarlar → Kurumsal Bilgiler → WhatsApp
              (yedek olarak `.env` → `WHATSAPP_NUMARA`)
      Olmazsa: Tüm WhatsApp CTA'ları gizlenir (kırılmaz ama dönüşüm kaybı).

- [ ] **İletişim e-postası ve telefon**
      Nereye: Payload admin → Ayarlar → Kurumsal Bilgiler
              (yedek olarak `.env` → `ILETISIM_EPOSTA`, `ILETISIM_TELEFON`)

## ⭐ A paketi sonrası — mahalle verisini doldurma (SIRA ÖNEMLİ)

15 Ağustos 2026'da mahalle veri altyapısı bitti. Ekranlar hazır, koleksiyonlar
hazır, içe aktarıcılar hazır — **içleri boş.** Ben veri girmedim ve
girmeyeceğim (CLAUDE.md kural 2).

⚠️ **Aşağıdaki sıra zorunlu.** Her adım bir öncekinin çıktısını kullanıyor;
atlanan adım sonrakini sessizce çalışmaz hâle getirir.

- [ ] **1. Mahalle listesini oluştur** — `/admin/mahalle-verisi` → 1. adım

      "Önizle"ye bas, listeyi gör, sonra "Oluştur". 18 merkez + 9 kırsal
      mahalle **yalnızca adıyla** açılır; koordinat, sınır ve rakamlar boş
      kalır ve kayıtlar yayında değil taslak doğar.

      ⚠️ **VELİMEŞE listede yok** — Ergene ilçesinde, Çorlu'da değil. Benim
      eski hatamdı, düzeltildi. Veritabanında duruyorsa önizleme onu
      "liste dışı" diye gösterir ama **silmez**; silmek senin kararın.

      ⚠️ Bir mahalle eksik ya da fazla görünüyorsa **bana söyle**, panelden
      elle eklemeden önce: liste kodda tek kaynaktan geliyor ve testi var.

- [ ] **2. OSM sınırlarını çek** — `/admin/mahalle-verisi` → 2. adım

      1. adım olmadan çalışmaz (eşleştirecek mahalle kaydı bulamaz).
      Sınırlar ve mahalle merkez koordinatları OpenStreetMap'ten gelir.

      ⚠️ **OSM'de Türkiye mahalle sınırları eksik ve yer yer yanlış.** Rapor
      sana üç listeyi ayrı ayrı verir: yazılanlar, sınırı gelmeyen
      mahalleler, bizde karşılığı olmayan OSM adayları. Sınırı gelmeyen bir
      mahallenin sınırını panelden elle çizebilirsin.

      ⚠️ **Elle düzelttiğin sınır bir daha ezilmez.** İkinci kez içe
      aktarma o kaydı atlar ve raporda "korunacak" der. Bu koruma bilinçli;
      ezilmesini istiyorsan panelden "Sınırın kaynağı" bölümündeki elle
      düzenleme işaretini kaldırman gerekir.

- [ ] **3. OSM ilgi noktalarını çek** — `/admin/osm-poi-ice-aktar`

      ⚠️ **2. adım olmadan çalışmaz.** Arama alanı mahalle merkezlerinden
      türetiliyor; merkez yoksa arama alanı da yok. Bugüne kadar POI içe
      aktarmanın boş dönmesinin sebebi buydu.

- [ ] **4. Belediye rayiç bedel tablosunu yükle** — `/admin/rayic-ice-aktar`

      ⭐ Paketin en değerli parçası ve **tamamen sende.**

      Nereden: Çorlu Belediyesi → Emlak Servisi → takdir komisyonu rayiç
      bedel cetveli (yıllık yayınlanır). PDF geliyorsa Excel'e çevir,
      Excel'den CSV olarak kaydet, ya da tabloyu doğrudan ekrandaki kutuya
      yapıştır.

      Gereken en az sütunlar: **mahalle** ve **m² rayiç bedel**. Yıl,
      sokak, arsa rayici, kaynak ve not isteğe bağlı.

      Ne işe yarıyor:
      - Tapu harcı matrahı satış bedelinin altına inemiyor →
        `/araclar/alim-maliyeti` gerçek harcı hesaplıyor
      - Her yıl güncellendiği için tarihsel seri oluşuyor
      - ⭐ **Rayiç/piyasa oranı** — "bu mahallede piyasa fiyatı rayiç bedelin
        ~3,2 katı". Türkiye'de bunu yayınlayan yok. Mahalle sayfasında
        çıkıyor, ama **hem rayiç hem gözlem verisi** gerekiyor.

      ⚠️ Tanımadığı mahalle adını **tahmin etmiyor, hata veriyor**. Yanlış
      mahalleye yazılan bir rayiç harç hesabını sessizce bozardı.

      ⚠️ Çok küçük ya da çok büyük değerlerde uyarı çıkarsa **ciddiye al**:
      Türkçe Excel `1.250,00`u 125.000 okuyabiliyor.

      ⚠️ Aynı tabloyu düzeltip ikinci kez yüklemek kopya üretmez, üzerine
      yazar (mahalle + sokak + yıl aynıysa).

- [ ] **5. (İsteğe bağlı, ÜCRETLİ) Google Places katmanı**

      OSM'de işletme adı ve çalışma saati zayıf. Resmî Places API bunu
      tamamlıyor — **scraping değil**, kendi anahtarımızla lisanslı çağrı.

      Açmak için **iki şey birden** gerekiyor:
      1. `.env` → `GOOGLE_PLACES_API_KEY` (console.cloud.google.com →
         "Places API (New)" → API anahtarı; anahtara mutlaka IP kısıtı koy)
      2. Panel → Site Bölümleri → **Google Places** anahtarını aç

      ⚠️ Anahtarı sunucuya koymak katmanı **açmaz**. Ücretli bir servisi
      kendiliğinden başlatmıyoruz; açma kararı senin.

      ⚠️ **Ne kadar tutar bilmiyorum ve tahmin etmiyorum** — Google'ın
      fiyatlandırması bölgeye ve aylık hacme göre değişiyor. Google Cloud
      tarafında **fatura uyarısı kur**. Bizim tarafımızdaki sayaç:
      Panel → Google Places (aylık arama ve detay çağrısı sayısı).

      ⚠️ Otomatik kapanma yok. Sayaç beklediğinden yüksekse bölüm
      anahtarını kapat — site OSM verisiyle aynen çalışmaya devam eder.

      Çalışma biçimi: her POI'yi panelden **tek tek** Google'da aratıp
      eşleştiriyorsun (toplu eşleştirme bilinçli olarak yok — hangi
      "Migros"un hangisi olduğuna insan karar vermeli). Eşleştirilen
      noktada ziyaretçi "Çalışma saatleri"ne basınca bilgi o anda
      Google'dan çekiliyor. **Hiçbir şey kaydedilmiyor** — lisans buna
      izin vermiyor.

- [ ] **6. `/veri-kaynaklari` sayfasını bir kez oku**

      Sayfa artık canlı: kayıt sayıları ve son güncelleme tarihleri
      veritabanından geliyor. Yukarıdaki adımları yaptıkça kendiliğinden
      dolacak. Rayiç bölümüne **hangi belediyeden, hangi yıl** aldığını
      içe aktarma sırasında "kaynak" ve "yıl" alanlarına yazarsan orada
      görünür.

      ⚠️ Sayfadaki "Piyasa fiyatları kendi gözlemlerimize dayanır ve
      istenen fiyattır" uyarısı ve OpenStreetMap atfı **kaldırılamaz** —
      ilki dürüstlük, ikincisi ODbL lisans yükümlülüğü.

## Önemli (içerik eksikliği)

- [ ] **İlanlara cephe yönü girin** (Güneş Haritası ve zaman çubuğu için)
      Nereye: Payload admin → İlanlar → [ilan] → Cephe yönü (çoklu seçim)
      Olmazsa: Güneş haritası gün doğumu/batımı/gündüz süresini yine
      gösterir (bunlar konuma bağlı) ama **cephe analizi ve saat saat
      çubuk hiç görünmez**. Cephe yönü koordinattan çıkarılamaz ve TAHMİN
      EDİLMEZ — alım kararı doğrudan bu bilgiye dayanıyor.
      ⚠️ Köşe daireler için birden fazla yön seçin; her cephe kendi
      çubuğunu alıyor.

      ⭐ **15 Ağustos 2026'da bu alan çok daha değerli hâle geldi.** Artık
      yalnızca "yazın ~8 saat" demiyoruz; hangi SAATLERDE güneş aldığını
      saat saat gösteriyoruz. Ölçümün öğrettiği iki şeyi bilmen işine
      yarar:

      · **Doğu ve batı cepheler gün toplamında neredeyse eşit** (ekinoksta
        20 dakikadan az fark) ama biri sabah, diğeri akşam alıyor. Müşteriye
        "ikisi de aynı" demek yanlış olur.
      · **Güney cephe yazın kazanmıyor.** Çorlu'da yaz günü kış gününden
        ~6 saat uzun, ama güney cephenin aldığı doğrudan güneş 8 saat
        civarında sabit. Kışın güneş gün boyu cephenin önünde, yazın günün
        başını ve sonunu arkasında geçiriyor.

      ⚠️ İlan koordinatı da gerekiyor — koordinat yoksa güneş bölümünün
      tamamı gizli kalır.

- [ ] **Mahallelere merkez koordinatı girin**
      Nereye: Payload admin → Mahalleler → [mahalle] → Merkez
      ⭐ **Artık elle girmene gerek yok:** `/admin/mahalle-verisi` → 2. adım
      merkez koordinatlarını OpenStreetMap sınırlarından hesaplıyor
      (yukarıdaki "A paketi sonrası" listesinde 2. madde). Elle girdiğin
      bir merkez içe aktarma tarafından EZİLMEZ.
      Olmazsa: Güneş haritası o mahallede ve konumu olmayan ilanlarında
      hiç görünmez; harita sütunları da çizilmez.


- [ ] **Çorlu'nun havadan çekilmiş hero görseli** (kullanım hakkı bize ait)
      ⚠️ **Karşılığı büyüdü:** Aurora'da ana sayfanın vitrini tam ekran ve
      zemini panelden geliyor — Hero (Ana Sayfa) slaytlarının İLKİ tam ekran
      arka plan oluyor. Yani yüklediğin fotoğraf sayfanın en görünür yerine
      çıkıyor. Şu an yerine sıcak gradyan çiziliyor (boş kutu değil,
      tasarlanmış ikinci basamak).

- [ ] **Koyu zemin için açık renkli logo** (altın ya da beyaz, tercihen SVG)
      Nereye: Ayarlar → Marka ve Görünüm → Koyu tema logosu
      ⚠️ Altbilgi iki temada da koyu. Açık zemin için hazırlanmış bir PNG'nin
      kenarları koyu zeminde hale bırakıyor — bu, kodla düzeltilemeyecek tek
      logo sorunu. SVG yükleme açık ve yüklenen dosya otomatik temizleniyor.
      Boşsa ana logo, o da yoksa site adı yazıyla kullanılıyor.
      Nereye: `src/app/(site)/page.tsx` → `Kahraman` bölümünün zemini
      Olmazsa: Hero şu an düz lacivert zemin. Şartname tam genişlik görsel +
      lacivert overlay istiyor; stok fotoğraf koymadım çünkü şartnamenin
      kendisi "stok fotoğraf estetiği"ni yasaklıyor ve hero LCP ögesi —
      yanlış görsel hem performans hedefini hem tonu bozar.
      ⚠️ Görsel AVIF olmalı, mobilde ≤80 kB. Geldiğinde tek yapılacak
      zemini `background-image` ile değiştirmek; metin katmanı aynen kalır.

- [ ] **Aslıhan'ın portre fotoğrafı**
      Nereye: `src/app/(site)/page.tsx` → `AslihanBolumu`
      Olmazsa: "Fotoğraf hazırlanıyor" boş durumu görünür. Stok görsel
      koymadım: "kurumsal güven" anlatısının tam tersini yapardı.


- [ ] **Bülten (e-bülten) için KVKK açık rıza metni + e-posta sağlayıcısı**
      Nereye: metin avukattan → Payload admin → Sayfalar; sağlayıcı `.env` → SMTP_*
      Olmazsa: Altbilgideki bülten bandı EKLENMEDİ ve eklenemez.

      Gerekçe: pazarlama e-postası, iletişim formundaki rızadan **ayrı bir
      açık rıza** gerektiriyor (KVKK). O metni ben yazmıyorum (CLAUDE.md
      kural 3). Ayrıca gönderim için bağlı bir sağlayıcı yok.

      Çalışmayan bir abonelik kutusu koymak bal küpü kuralının tersi
      olurdu: değer vermeden iletişim bilgisi istemek. Metin ve sağlayıcı
      gelince banda bir aşamada eklenir.


- [ ] **6 pilot mahalle için "Neden bu mahalle?" analiz metni — her biri min 800 kelime**
      Mahalleler: Muhittin, Alipaşa, Şeyhsinan, Hıdırağa, Velimeşe, Önerler
      Nereye: Payload admin → Mahalleler → [mahalle] → İçerik
      Olmazsa: Google "thin content" cezası riski; mahalle sayfaları SEO
      motorunun kalbi ve şu an boş durum gösteriyor.

- [ ] **Mahalle temel rakamları** (ortalama m² satış, ortalama kira, 12 ay değişim)
      Nereye: Payload admin → Mahalleler → [mahalle] → Rakamlar
      Olmazsa: Rakam kartları "veri bekleniyor" boş durumunda kalır.
      ⚠️ Bu rakamları ben uyduramam (CLAUDE.md kural 2). Gözlem verisi
      biriktikçe Faz 2C'deki endeks motoru bunları otomatik hesaplayacak;
      o zamana kadar elle girilir.

- [ ] **Mahalle sınırları (polygon) ve merkez noktaları**
      Nereye: Payload admin → Mahalleler → Konum (GeoJSON yapıştır)
      Nasıl: geojson.io üzerinde çizip GeoJSON kopyalayabilirsin.
      Olmazsa: Harita katmanı ve PostGIS yakınlık sorguları çalışmaz.

- [ ] **Kurumsal logo (SVG)**
      Nereye: bana ilet, `src/app/(site)/globals.css` ve başlık bileşenine
      işlerim.
      ⚠️ **Palet artık kapandı** — 15 Ağustos 2026'da bohem/pudra paletini
      onayladın ve "son olsun" dedin. Logo gelirken paletin dışında bir renk
      taşıyorsa bana söyle; siteyi logoya uydurmak yerine ikisini birlikte
      konuşalım (dördüncü palet değişikliği tasarım sistemini değil, ona
      olan güveni yıpratır).

- [x] ✅ **Palet kararı — bohem / pudra (15 Ağustos 2026)**

      Lacivert gitti. Yedi renk onaylandı: kırık beyaz `#FBFAF7` (ana
      zemin), krem `#F2EBE3`, pudra gülü `#E8CFC8`, terracotta `#A85A42`,
      adaçayı `#4F7C6A`, soft gold `#C9A96E`, koyu kakao `#3D2B2F` (metin).

      ⭐ **Terracotta konusunda haklıydın.** "Metin olarak sınırda olabilir"
      demiştin; ölçüm doğruladı. Kırık beyaz üzerinde 4,78 ile kıl payı
      geçiyor ama KREM üzerinde 4,22, PUDRA üzerinde 3,37 — ikisi de senin
      kendi kullanım kuralının başlık koyduğu zeminler. Koyulaştırılmış
      ayrı bir jeton üretildi (`#844632`): 6,92 · 6,12 · 4,88.

      İki şeyi bilmen iyi olur:

      1. **Hero artık pudra gülü zeminde, koyu kakao metinli.** Çorlu'nun
         havadan görseli geldiğinde bu bileşende İKİ ŞEY birden değişecek:
         zemin görsel + %45 kakao overlay olacak VE metin açık renge
         dönecek. Eskiden "sadece zemini değiştir" yetiyordu, artık
         yetmiyor — kodda yazılı.
      2. **Hata rengi kaydırıldı.** Eski kırmızı terracotta'ya çok
         yakındı (OKLCh'de 10° fark) ve aynı sayfada "vurgu" ile "hata"
         birbirine karışıyordu. Marka lacivertken sorun değildi.

      Paleti gözünle görmek istersen: geliştirme ortamında `/stil-rehberi`
      bütün rampaları ve ölçülen kontrast oranlarını gösteriyor.

- [ ] **Hakkımızda metni ve fotoğraf**
      Nereye: Payload admin → Sayfalar → Hakkımızda

- [ ] **Mahalle Eşleştirme profili — her mahalle için 4 puan (0–100)** ⬅️ *sen dolduracaksın*
      Nereye: Payload admin → Mahalleler → [mahalle] → Eşleştirme profili
      Alanlar: toplu taşıma, okul erişimi, sakinlik, merkeze yakınlık
      Olmazsa: `/mahalle-testi` o mahalle için uyum yüzdesi üretmez.
      ⚠️ Bu puanları ben dolduramam: "Şeyhsinan ne kadar sakindir?"
      sorusunun cevabı orayı bilen birinin bilgisidir. Testte kullanılan
      diğer dört ölçüt (yatırım potansiyeli, sanayi yakınlığı, ulaşım,
      sosyal donatı) yatırım skorundan otomatik okunuyor.

      **Sakinlik bir kalite yargısı DEĞİL:** kimi sakinlik ister, kimi
      hareket. 100 = çok sakin, 0 = ana arter üzerinde. Merkeze yakınlıkla
      genellikle ters çalışır; ikisini birlikte düşün.

      Puanları neye göre verdiğini "Profil notu" alanına yaz — bir ziyaretçi
      "neden bu mahalle önerildi?" diye sorduğunda cevabın hazır olsun.

- [ ] **Site simgesi (favicon) — marka işareti**

      Sitenin şu an hiç favicon'u yok. Tarayıcı her sayfa açılışında
      `/favicon.ico` istiyor, 404 alıyor ve konsola hata düşüyor. Bunun
      ölçülebilir bir bedeli var: **Lighthouse "En iyi uygulamalar"
      skorumuz üç sayfada da 100 yerine 96** ve tek sebebi bu. Logo gelene
      kadar 96'da kalacak.

      Bunu bilerek uydurmadım. Favicon bir marka işaretidir; geçici bir
      şekil koymak, sekmede haftalarca "bizim logomuz" gibi duran ve sonra
      değişen bir işaret bırakırdı. CLAUDE.md marka tercihlerini sana
      sormamı söylüyor.

      **Ne gerekiyor:**

      | Ne | Değer |
      | --- | --- |
      | Biçim | SVG (tercih) — tek dosya her boyutta keskin durur |
      | SVG olmazsa | PNG, 512×512, kayıpsız |
      | Güvenli alan | İşaret kenarlara değmesin; kenarda ~%10 boşluk bırak |
      | Arka plan | **Saydam DEĞİL, dolu olsun.** Açık ve koyu sekme temasında da okunması gerekiyor; saydam bir işaret koyu temada kaybolur |
      | Renk | Onaylanan laciverti kullan: `#0F1E33` zemin, `#F8F7F3` işaret. ⚠️ Bakır kullanılmayacak — bakır yalnızca "Evimi değerlendir" ve "Erişim talep et" eylemlerine ait |
      | Okunabilirlik | 16×16 pikselde ne olduğu anlaşılmalı. İnce çizgi ve küçük yazı bu boyutta kaybolur; tek harf ya da sade bir geometrik işaret en güvenlisi |

      **Nereye konacak:** `src/app/icon.svg` (PNG ise `src/app/icon.png`).
      Next.js bu dosyayı görünce `<link rel="icon">` etiketini kendisi
      basar; ayrıca bir şey yapılması gerekmiyor. Dosyayı bana ver ya da
      doğrudan bu yola koy.

      **Aynı dosyadan türeyecekler** (logo gelince ben hallederim):
      Apple dokunmatik simgesi ve paylaşım görselinin köşe işareti.

- [ ] **Danışman yetkileri — gevşetmek istediğin var mı?** ⬅️ *karar bekliyor*

      Rol ayrımını erişim kurallarına bağladım. Sen **yöneticisin**, her
      şeye erişiyorsun; bu madde yalnızca ileride ekleyeceğin danışmanlar
      için.

      Danışmanın şu an **yapabildikleri:** ilan/mahalle/POI/medya
      oluşturma ve güncelleme, talep ve değerleme güncelleme, gözlem
      girme, kendi şifresini değiştirme.

      Danışmanın şu an **yapamadıkları:**

      | Ne | Neden kısıtladım |
      | --- | --- |
      | Kayıt silme (her koleksiyon) | İlan silinince EİDS kayıtları da gider — yasal dayanak. Güncelleme hatası düzeltilir, silme hatası düzeltilmez. |
      | Vergi parametreleri | Yanlış oran → hesaplayıcılar yatırımcıya yanlış rakam gösterir |
      | Hukuki sayfalar | KVKK, gizlilik, kullanım koşulları — hukuki sonuç doğurur |
      | Kurumsal bilgiler | Yetki belgesi numarası burada |
      | Endeks ve değerleme ayarları | Metodolojinin kendisi |
      | Site/portföy vitrini, altbilgi | Editoryal karar |
      | Kullanıcı ekleme/silme, rol değiştirme | Yetki yükseltme riski |

      **Neden sıkı taraftan başladım:** fazla kısıtladıysam danışman
      "erişemiyorum" der, açarım. Az kısıtladıysam yanlış vergi oranı
      yayınlanır ya da bir ilan silinir — ikisi de fark edilmeden olur.

      Gevşetmek istediğin bir satır varsa söyle, tek tek açarım.

## Sonra (fazlar geldiğinde gerekecek)

- [ ] **MapTiler API anahtarı** (Faz 2)
      Nereden: maptiler.com → hesap aç → Account → API Keys
      Nereye: `.env` → `MAPTILER_ANAHTARI`
      Olmazsa: `/harita` sayfası boş durum gösterir — OSM'den içe aktarılan
      ilgi noktalarının göründüğü tek yer orasıdır.
      ⚠️ Anahtarı aldıktan sonra MapTiler panelinden **alan adı kısıtı**
      koyun (Account → API Keys → anahtar → Allowed origins →
      `aslihangyd.com`). Anahtar harita isteklerinin içinde tarayıcıya
      gider ve gizlenemez; tek gerçek koruma bu kısıttır.

- [ ] **Güncel vergi/harç oranları** (Faz 2 — hesaplayıcılar)
      Tapu harcı oranı, döner sermaye ücreti, DASK tarifesi, kira geliri
      istisna tutarı, değer artış kazancı istisnası, gelir vergisi dilimleri.
      Nereye: Payload admin → Vergi Parametreleri
      Kaynak: mali müşavirinden teyitli almanı öneririm.
      Olmazsa: Hesaplayıcılar "parametre tanımlı değil" uyarısı gösterir ve
      hesaplama yapmaz. Ben bu oranları koda gömmüyorum (CLAUDE.md kural 4).

- [ ] **POI verisi** — okul, hastane, market, park, sanayi, durak konumları
      Nereye: Payload admin → İlgi Noktaları
      ⬆️ **OpenStreetMap içe aktarma HAZIR** (senin kararın).
      Nerede: Payload admin → sol menü → **POI içe aktar (OpenStreetMap)**

      ⚠️ **Önce mahalle merkezlerini gir** (yukarıdaki madde). Arama alanı
      onlardan hesaplanıyor — Çorlu'nun koordinatlarını koda gömmedim ki
      yeni mahalle eklediğinde alan kendiliğinden büyüsün.

      Akış: payı seç → **Önizle** → listeyi gör → aktar.

      Gerçek ölçüm (3 km pay ile): **277 nokta** eşleşti. Elle girsen
      haftalar sürerdi.

      ⚠️ Elle düzelttiğin kayıt bir daha ezilmez. Bir noktanın adını ya da
      konumunu düzelttiğinde kayıt işaretlenir, sonraki içe aktarmalar onu
      atlar ve raporda "korundu" der.

      ⚠️ Atıf zorunlu (ODbL): içe aktarılan noktalar sitede "© OpenStreetMap
      katkıcıları" ile gösteriliyor, lisans ve kategori eşlemesi
      `/veri-kaynaklari` sayfasında yayınlanıyor. Bu ibareleri kaldırma.

- [ ] **Eşleme tablosuna eklemek istediğin tür var mı?** ⬅️ *karar bekliyor*

      İçe aktarma, eşleme tablomuzda karşılığı olmayanları da sayıyor ve
      önizlemede gösteriyor. Çorlu'da (3 km pay) dışarıda kalanların
      ilk sıraları:

      | OSM etiketi | Adet | Bizde karşılığı |
      | --- | --- | --- |
      | leisure=playground (oyun alanı) | 60 | yok |
      | amenity=parking (otopark) | 50 | yok |
      | leisure=pitch (spor sahası) | 42 | yok |
      | amenity=restaurant | 34 | yok |
      | amenity=cafe | 29 | yok |
      | amenity=place_of_worship (cami vb.) | 27 | yok |
      | amenity=pharmacy (eczane) | 21 | yok |

      Bence **eczane** ve **oyun alanı** sosyal donatı sayılabilir; ikisi de
      "yürüme mesafesinde ne var" sorusuna cevap veriyor. Restoran/kafe daha
      çok yaşam tarzı göstergesi — istersen ayrı bir tip açarız.

      Söyle, eşleme tablosuna eklerim ve `/veri-kaynaklari` sayfasında
      yayınlanır.

      ⬆️ **Bu madde artık daha değerli.** Yakınlık sorguları yazıldı; her
      kayıt üç yeri birden besliyor:

      1. Mahalle sayfası → "Konum ve çevre" bölümü (en yakın nokta + mesafe)
      2. İlan detayı → "Çevre ve erişim" bölümü
      3. `/admin/skor-onerileri` → yatırım skorunun üç bileşeni için
         gerekçeli puan önerisi

      Haritadan **bağımsız** çalışıyor: MapTiler anahtarı gelmese bile
      nokta girdiğin anda bu bölümler dolmaya başlar.

      ⚠️ İki şart: mahallenin **merkez noktası** girilmiş olmalı (yukarıdaki
      madde) ve mesafeler **kuş uçuşu** gösterilir — sürüş süresi değil.

      ⚠️ Önce en çok fark yaratanları gir: OSB'ler, tren istasyonu,
      havalimanı, şehir hastanesi. Bunlar Çorlu'nun değer sürücüleri ve
      skor önerisinde en ağır kalemler.

      Not: Bir tür için **hiç kayıt yoksa** sistem o türü hesaba katmaz —
      mahalleyi "o donatısı yok" diye cezalandırmaz. Kayıt eksikliğini
      olguya çevirmiyoruz.

- [ ] **SMTP bilgileri** (e-posta bildirimleri için)
      Nereye: `.env` → `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
      `SMTP_GONDEREN`
      Olmazsa: Lead geldiğinde sana e-posta gitmez (kayıt yine de düşer).

- [ ] **Umami analitik kurulumu** (Faz 2)
      Nereye: `.env` → `UMAMI_URL`, `UMAMI_SITE_ID`
      Not: Çerez onayı alınmadan yüklenmez (CLAUDE.md kural 8).

- [ ] **Sunucu / deploy erişimi** (Faz 1.10 — CI/CD)
      GitHub repo → Settings → Secrets: `SSH_HOST`, `SSH_PORT`, `SSH_USER`,
      `SSH_PRIVATE_KEY`, `DATABASE_URI`, `PAYLOAD_SECRET`
      Olmazsa: Otomatik deploy çalışmaz; workflow hazır bekler.

- [ ] **Cloudflare DNS — deploy sırasında iki tıklık iş** ⚠️ ZAMANLAMASI ÖNEMLİ
      Deploy'dan **önce**: DNS → Records → `aslihangyd.com` ve `www` A
      kayıtlarını **DNS only** (gri bulut) yap.
      Sertifika alındıktan **sonra**: ikisini de **Proxied** (turuncu) geri al.
      Neden: Caddy sertifikayı Let's Encrypt'ten alıyor ve doğrulama
      origin'e doğrudan bağlanıyor; turuncu bulutta doğrulama başarısız
      olur. Adım adım: `docs/ISLETME-REHBERI.md` §5.2 ADIM 0 ve Adım 6.
      Olmazsa: Site HTTPS'te açılmaz. Kalıcı hasar yok ama körlemesine
      tekrar denemek Let's Encrypt oran sınırına takabilir.

- [ ] **Deploy sonrası: eski sertifikayı iptal et**
      `docker/certs/origin.key` ve `origin.pem` dosyalarını sunucudan sil,
      Cloudflare panelinde SSL/TLS → Origin Server → sertifikayı **Revoke**
      et. Yordam: `ISLETME-REHBERI.md` §5.5 "Eski kurgudan kalanlar".
      Neden: 8443 + origin sertifikası kurgusu kaldırıldı; kullanılmayan
      bir özel anahtarı diskte tutmanın hiçbir faydası yok.
      ⚠️ Deploy **doğrulandıktan sonra** yap, önce değil.

- [ ] **Yedekleme hedefi** (Faz 1.10)
      Cloudflare R2 veya Backblaze B2 hesabı + restic şifre cümlesi
      Nereye: `.env` → `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, erişim anahtarları

- [ ] **Bunny Stream hesabı** (Faz 3 — atlandı, altyapı hazır bekliyor)
      Nereye: `.env` → `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY`
      Olmazsa: Video alanları boş durum gösterir; sayfa kırılmaz.

- [ ] **Anthropic API anahtarı** (Faz 4 — AI doğal dil arama)
      Nereden: console.anthropic.com → API Keys
      Nereye: `.env` → `ANTHROPIC_API_KEY`

      Ne açar: `/portfoy` sayfasında "kendi cümlenizle arayın" kutusu.
      Ziyaretçi *"Muhittin'de 5 milyon altı 3+1, getirisi iyi olsun"*
      yazar, sistem bunu filtreye çevirip normal arama adresine yollar.

      ⚠️ **Varsayılan kapalı.** Anahtar yoksa kutu hiç görünmez, normal
      filtreler çalışmaya devam eder. Acele etme.

      ⚠️ **ÖNCE AVUKATA SOR — yurt dışına veri aktarımı.**
      Ziyaretçinin yazdığı metin Anthropic'in (ABD) sunucularına gider.
      Sitenin Türkiye'de barındırılıyor olması bunu değiştirmiyor.
      Aldığım önlemler: yalnızca metin gönderiliyor (IP, oturum, kimlik
      yok) ve kutunun altında bu açıkça yazıyor. Ama **aydınlatma metnine
      bu aktarımın eklenmesi gerekiyor ve o metni ben yazmıyorum**
      (CLAUDE.md kural 3). Metin hazır olmadan anahtarı üretime koyma.

- [x] ~~**AI arama için model tercihi**~~ — **ERTELENDİ** (senin kararın).
      Sebep maliyet değil KVKK. Avukat onayı sonrası konuşacağız; o zamana
      kadar `.env` → `ANTHROPIC_ARAMA_MODELI` boş kalabilir.
      Hatırlatma: hız sınırı dakikada 10 arama — betikle fatura şişirmeyi
      durdurur, gerçek ziyaretçiyi rahatsız etmez.

- [ ] **AI arama KVKK maddesi — avukata ver** ⚠️ *özelliği açan tek şey bu*
      Ver: `docs/AI-ARAMA-KVKK-NOTU.md` (hangi veri, nereye, ne amaçla
      gidiyor; ne saklanıyor; ziyaretçi ne görüyor; beş somut soru)
      Al: aydınlatma metnine eklenecek madde + "açık rıza gerekir mi" cevabı
      Sonra: Sayfalar'a metni gir → `.env`'e anahtarı koy → Site
      Bölümleri'nden aç. Üçü birden yapılmadan kutu görünmez.

- [x] ~~**Bakım anahtarı**~~ — `.env`'e eklendi.

- [ ] **Cron kurulumu — sunucuda kalan tek adım** ⚠️ ZORUNLU
      Komutlar hazır: `docs/ISLETME-REHBERI.md` bölüm 6.4 ve 6.5.
      Üç satır kopyalanıp `/etc/cron.d/aslihangyd-bakim` dosyasına
      konacak, `sudo systemctl restart cron` çalıştırılacak.

      ⚠️ **Anahtarı `.env`'e ekledikten sonra uygulama kabını yeniden
      başlatmayı unutma** — Docker ortam değişkenlerini yalnızca
      başlangıçta okur. Başlatmazsan uç 404 döner ve hiçbir görev
      çalışmaz:
      `docker compose -f docker/compose.prod.yml up -d --force-recreate uygulama`

      Kurulumdan sonra doğrulama (bölüm 6.7):
      `sudo -u deploy /srv/aslihangyd/app/scripts/bakim.sh eids-kaldir`

      Olmazsa: Yetkisi dolan ilanlar **otomatik yayından kalkmaz** ve
      saklama süresi dolan kişisel veriler silinmez. Her ikisi de yasal
      yükümlülük.

- [ ] **SMTP** — "yetkisi bitecek" uyarısı bugün yalnızca günlüğe yazılıyor
      SMTP gelene kadar `/srv/aslihangyd/logs/bakim.log` dosyasını haftada
      bir taraman gerekiyor; gelince e-posta olarak sana düşecek.

---

## Bana sorman gereken / avukata sorman gereken

### 1. EİDS kiralık ilanları da kapsıyor mu?

**Şu anki davranış:** Kural satılık/kiralık ayrımı yapmadan **tüm** ilanlara
uygulanıyor. Yani kiralık bir ilanı da EİDS yetkisi olmadan yayınlayamıyorsun.

**Neden böyle yaptım:** Mevzuat metni satılık taşınmazı açıkça sayıyor;
kiralık tarafın kapsamı yoruma açık. Katı davranmak hukuki risk üretmez,
gevşek davranmak üretir. Bu yüzden katı tarafı seçtim.

**Senden istediğim:** Avukatına sor. Kiralık ilanlar kapsam dışıysa kuralı
daraltabilirim — ama bunu senin bilinçli kararınla ve hukuki dayanakla
yapmak istiyorum, kendi başıma gevşetmem.

**Aciliyet:** Kiralık portföy girmeye başlayana kadar bekleyebilir.

### 2. Cloudflare Web Analytics çerez onayına tabi mi?

**Bağlam:** Deploy sonrası gerçek kullanıcı hız ölçümü (Core Web Vitals)
kuracağız. İki seçenek var: Umami (bizim yüklediğimiz betik) ya da
Cloudflare Web Analytics (proxy seviyesinde, sayfaya betik eklemeden).

**Şu anki davranış:** Analitik betiği onay alınmadan **yüklenmiyor**
(CLAUDE.md kural 8, kod seviyesinde zorlanıyor). Umami seçilirse bu kapı
aynen geçerli.

**Senden istediğim:** Cloudflare Web Analytics için avukatına sor.
"Sayfaya betik eklenmiyor, ölçüm proxy'de yapılıyor" gerekçesi onay
zorunluluğunu kaldırıyor mu? Ziyaret ölçümü kişisel veri işleme sayıldığı
için ben **kaldırmadığını varsayıyorum** ve onaya bağlı tutuyorum —
gevşetmeyi kendi başıma yapmam.

**Aciliyet:** Deploy sonrası, ölçüm kurulmadan önce.

### 3. Kişisel veri saklama süresi 24 ay uygun mu?

**Şu anki davranış:** Siteden gelen her talep kaydına oluşturulduğu anda
"saklama bitiş tarihi" yazılıyor (onay + 24 ay). Süresi dolan kayıtlar
günlük bakım göreviyle otomatik siliniyor.

**Senden istediğim:** 24 ay makul bir varsayılan ama hukuki bir tercih.
Avukatın farklı bir süre belirlerse söyle, tek satırda değiştiriyorum
(`src/lib/kvkk/saklama.ts` → `VARSAYILAN_SAKLAMA_AYI`).

### 4. Değerleme katsayıları — senin saha bilgin gerekiyor

**Şu anki durum:** Değerleme aracı (`/degerleme`) çalışıyor ama katsayılar
boş. Bu yüzden kat, bina yaşı ve yapı durumu tahmine **hiç katılmıyor** ve
ziyaretçiye "bu etkiler hesaba katılmadı" deniyor.

**Neden ben doldurmadım:** "Zemin kat %8 düşük değerlenir" gibi bir rakam
yazsaydım, uydurma veriyi model parametresi kılığında sokmuş olurdum. Bu
rakamlar senin gözlemin.

**Nereye:** Payload admin → Değerleme Ayarları

Doldurman gerekenler:
- **Kat katsayıları** — bodrum, zemin, ara kat, yüksek kat, en üst kat
- **Yapı durumu katsayıları** — sıfır, iyi, ortalama, tadilat gerekli
- **Bina yaşı dilimleri** — örn. 0-5 yaş, 6-10, 11-20, 20+ ve katsayıları

Katsayılar çarpımsal: `1,00` etkisiz, `1,05` %5 artırır, `0,90` %10 düşürür.

**Ayrıca:** Mahalle rakamları (ortalama m² satış + gözlem sayısı) girilmeden
değerleme aracı hiçbir mahalle için sonuç üretemez. Bu, bilinçli bir kapı.

### 5. ✅ Cevaplandı — kalan bal küpü modülleri yapıldı

Talimatın üzerine dördü de yazıldı: Mahalle Eşleştirme Testi, Yatırım
Simülatörü, Kira mı Satın Alma mı, Bölge Radarı. PDF rapor da eklendi.
Ayrıntı `docs/ILERLEME.md` → "Faz 2B+".

**Öncelik sırasını verdin (4 Ağustos 2026):**

| Sıra | Modül | Durum |
| --- | --- | --- |
| 1 | Portföy giriş sihirbazı | ✅ Yapıldı — `/admin/portfoy-sihirbazi` |
| 2 | CRM eşleştirme motoru | Sırada |
| 3 | Sosyal medya materyal üretimi | Bekliyor |

Gerekçen — *portföy giremeden CRM'in besleyeceği veri yok* — doğru ve sıralamayı
tek başına haklı çıkarıyor. CRM'i önce yazsaydık, eşleştirecek kaydı olmayan
boş bir ekran teslim etmiş olurduk.

**Sihirbaz hazır.** Admin'e girdiğinde sol menüde *Portföy giriş sihirbazı*
bağlantısını göreceksin. 5 adımda taşınmazı giriyor, **taslak** olarak
kaydediyor. Fotoğraf, uzun açıklama ve yayına alma her zamanki gibi ilan
sayfasında.

En işine yarayacak kısım: sağdaki panel **yazarken** EİDS durumunu söylüyor —
"bu ilan şu an yayınlanamaz, şunlar eksik". Admin'de bunu ancak "Yayında"
demeyi deneyince öğreniyordun.

### 4b. ✅ Cevaplandı — derleme süresi

Kararın uygulandı: eşik **150 sn**'ye çekildi ve CI'ya `.next/cache` önbelleği
(`actions/cache@v4`) eklendi. Süre artık her koşuda ölçülüp iş akışı özetine
yazılıyor; eşik aşılırsa uyarı düşer ama koşu başarısız olmaz.

**Ölçüm sonucu — beklentiyi karşılamadı, sebebini buldum:**

| Koşu | Önbellek | Derleme |
| --- | --- | --- |
| 1 | miss | 37 sn |
| 2 | hit | 35 sn |

Önbellek işe yaramadı çünkü **Next 16 Turbopack kullanıyor ve derleme
önbelleğini `.next/cache`'e yazmıyor** (orada sadece 187 KB kalıyor). Klasik
`actions/cache` tarifi webpack dönemine ait.

**Ama sorun zaten yoktu:** yereldeki 107 sn benim makinemin hızıydı. CI'da
soğuk derleme **37 sn** — senin hedeflediğin 40–50 sn bandının zaten altında.
150 sn eşiği bol bol karşılanıyor.

Adımı kaldırmadım (maliyeti ~1 sn) ama yorumuna şu an bir şey yapmadığını
yazdım. Kaldırmamı istersen söyle. Ayrıntı `docs/ILERLEME.md` → "CI derleme
önbelleği ölçümü".

### 6. Endeks sepet ağırlıkları — senin saha bilgin gerekiyor

**Şu anki durum:** Endeks motoru hazır ve test edildi, ama sepet ağırlıkları
boş. Ağırlık olmadan endeks hesaplanamaz.

**Neden ben doldurmadım:** Ağırlıklar **konut stokunu** temsil etmeli, bizim
gözlem sayımızı değil. "Muhittin 3+1 → 0,14" gibi bir rakam ancak o mahallede
kaç konut olduğunu bilen biri tarafından yazılabilir.

**Nereye:** Payload admin → Endeks Ayarları → Sepet ağırlıkları
Her katman (mahalle × oda tipi) için bir ağırlık; toplamı **1,00** olmalı.

Başlangıçta saha bilginle tahmin et; TÜİK bina sayımı veya belediye verisi
bulursan iyileştirirsin. **Ağırlıklar yılda bir kez, Ocak ayında güncellenir**
— ay ay değişirse endeks anlamını kaybeder.

### 7. Gözlem toplamaya bugün başla

Endeks sayfası şu koşullar sağlanana kadar **404 dönüyor** (kod seviyesinde):
en az 6 ay veri, 500 gözlem, ağırlığın %70'ini kapsayan katmanlarda her ay
8 gözlem, metodoloji sayfası yayında.

**Nereye:** Payload admin → Gözlemler
**Haftalık hedef:** 30 gözlem (satılık ~20, kiralık ~10) — yaklaşık 30-40 dakika

**Elindeki Excel/Sheets tablosunu artık aktarabilirsin** — sütun düzenini
bana göndermene gerek kalmadı.

**Nerede:** Payload admin → sol menü → **Gözlem içe aktar (CSV)**

Sütun düzenin sabit olmak zorunda değil: başlıklardan tahmin ediliyor,
tahmini ekranda görüp düzeltiyorsun. Türkçe Excel'in `4.300.000` biçimi,
`03.08.2026` tarihi, noktalı virgül ayırıcı ve Windows-1254 kodlaması
destekleniyor.

Akış: dosyayı seç → sütunları onayla → **önizlemeye bak** → aktar.

⚠️ Önizlemeyi atlamadan aktarma. Her satırın ne olarak okunduğu orada
yazıyor; hatalı satırlar sebebiyle birlikte ayrılıyor. Geri alma yok —
yanlış aktarılan kayıtlar Gözlemler koleksiyonundan tek tek silinir.

⚠️ CSV'deki mahalle adları sistemdeki mahallelerle eşleşmeli. Eşleşmeyen
satır aktarılmaz (tahmin edilmez) — önce mahalleyi ekle.

Not: CSV ile gelen kayıtlar varsayılan olarak **Güven: Düşük** işaretlenir,
çünkü genellikle geriye dönüktür (metodoloji §5). Dosyan güncel
gözlemlerse ekrandan değiştirebilirsin.

### 6b. Portföy bölümlerini kendin düzenleyebilirsin

**Nerede:** Payload admin → Ayarlar → **Portföy Bölümleri**

Portföy sayfasındaki tema sıralarının başlığını, açıklamasını, kaç
taşınmaz görüneceğini ve düzenini buradan yönetiyorsun. Hiç dokunmazsan
dört sıra varsayılan düzende çalışır.

**⚠️ Bir şeyi bilerek değiştirdim.** Şartnamede alt başlık örneği "Kira
çarpanı **ilçe ortalamasının** altında kalan portföyümüz" idi. İlçe
ortalamasını bilmiyoruz — o piyasa verisi ve bizde yok. Elimizdeki
portföy ortalamasını ilçe ortalamasıymış gibi yazmak, doğrulanamayan bir
iddia olurdu. Şu an "**portföy** ortalamasının altında kalan taşınmazlar"
yazıyor.

Çorlu Konut Endeksi yayına girdiğinde (6. ay) gerçek ilçe medyanını
kullanabiliriz ve ifadeyi düzeltirim.

**Ayrıca:** sıra numarası sadece görsel düzen değil, **öncelik**. Bir
taşınmaz yalnızca ilk girdiği sırada görünür; yukarıdaki sıra onu "kapar".
Aynı daireyi üç sırada göstermek portföyü olduğundan küçük gösterir.

---

### 8. ✅ Cevaplandı — palet onaylandı, üç noktada onayına ihtiyacım var

Onayladığın lacivert / bakır / sıcak nötr paleti, tipografi ölçeği ve
bileşen kuralları uygulandı. Değerler `src/app/(site)/globals.css` içinde
tek gerçek kaynak olarak duruyor ve her derlemede WCAG AA'ya karşı
ölçülüyor.

**Üç noktada onayladığın değerden saptım. Üçü de erişilebilirlik
zorunluluğu, estetik tercih değil — ama senin kararın:**

**a) Uyarı rengi metin olarak kullanılamıyor.**
Onayladığın `#A87A1E`, beyaz üzerinde 3,87:1 kontrast veriyor. WCAG AA
metin için 4,5:1 istiyor. Rengi ikon ve kenarlıkta aynen tuttum; uyarı
METNİ için bir tık koyusunu (`#7A5714`) kullanıyorum. Yan yana bakınca
fark neredeyse görünmüyor ama düşük görme keskinliğinde okunabilirlik
tamamen değişiyor.

**b) Nötr rampaya bir ara basamak ekledim.**
Listende nötr 500 var, 600 yok. Yardımcı metinler (gözlem sayısı, tarih,
kaynak) çoğunlukla açık gri bir yüzeyin üzerinde duruyor ve orada nötr-500
3,93:1'e düşüyordu. `#5F5C55` ekledim.

**c) Form kutularının kenarlığı daha koyu.**
"0,5px, nötr-200" kuralı kart çerçevelerinde aynen geçerli. Ama bir metin
kutusunun sınırı, kutunun kendisini tanımlıyor ve WCAG ayrı bir kural
koyuyor (3:1). Nötr-200 beyaz üzerinde 1,3:1 — güneşte telefon ekranında
kutu tamamen kayboluyordu. Form kutularında nötr-500 kullanıyorum.

**d) Koyu tema tonlarını ben türettim.**
Onay listende koyu tema yoktu. Sitede zaten vardı, kaldırmak gerileme
olurdu. Senin paletinden türettim (lacivert-950 zemin, lacivert-900
yüzey) ve aynı kontrast testinden geçiriyorum.

**Senden istediğim (İKİ ŞEY):**

**1) Telefonundan siteye bak.** Bu benim yapamadığım tek kontrol:
sunucuda tarayıcı yok, gerçek bir cihazda dokunma ve kaydırma denemesi
mümkün değil. Kodda dokunma hedeflerini 44px'e sabitledim, mobil öncelikli
yazdım, ama bunlar "çalışacağını gösterir, kanıtlamaz".

Özellikle şunlara bak: portföy sayfasındaki yatay kaydırmalı sıralar,
haritadaki alt paneller, formlardaki kutular güneşte görünüyor mu.

**2) Koyu temaya al ve tekrar bak.** Beğenmezsen koyu temayı tamamen
kapatabilirim — tek satırlık iş.

**Nereye bakacaksın:** Geliştirme ortamında `/stil-rehberi` adresi tüm
renkleri, yazı boyutlarını ve bileşenleri tek sayfada gösteriyor. Üretimde
bu sayfa kapalı.

**Logon hâlâ bekleniyor** — gelince yerleştiririm.
