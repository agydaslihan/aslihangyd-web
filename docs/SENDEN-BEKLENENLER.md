# Senden Beklenenler — Aslıhan'ın yapması gerekenler

Bu dosya, geliştirmenin ilerlemesi için **senden** gelmesi gereken her şeyi
biriktirir. Ben eksik veri yüzünden durmuyorum: alanı boş bırakıp
`AslihanTarafindanDoldurulacak` işaretliyorum, buraya yazıyorum, devam ediyorum.

Bir maddeyi hallettiğinde başındaki `[ ]` kutusunu `[x]` yap.

---

## Acil (yayın engelleyici)

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
      Nereye: `.env` → `NEXT_PUBLIC_WHATSAPP_NUMARA`
      Olmazsa: Tüm WhatsApp CTA'ları gizlenir (kırılmaz ama dönüşüm kaybı).

- [ ] **İletişim e-postası ve telefon**
      Nereye: `.env` → `NEXT_PUBLIC_ILETISIM_EPOSTA`, `NEXT_PUBLIC_ILETISIM_TELEFON`

## Önemli (içerik eksikliği)

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

- [ ] **Kurumsal görsel kimlik: logo (SVG), marka rengi tercihi varsa**
      Nereye: bana ilet, `src/app/(site)/globals.css` içine işlerim.
      Şu an: Kendi seçtiğim sakin lacivert/kum paletiyle ilerliyorum.
      Beğenmezsen söyle, değiştiririm.

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

## Sonra (fazlar geldiğinde gerekecek)

- [ ] **MapTiler API anahtarı** (Faz 2)
      Nereden: maptiler.com → hesap aç → Account → API Keys
      Nereye: `.env` → `NEXT_PUBLIC_MAPTILER_API_KEY`
      Olmazsa: `/harita` sayfası ve mini haritalar çalışmaz.

- [ ] **Güncel vergi/harç oranları** (Faz 2 — hesaplayıcılar)
      Tapu harcı oranı, döner sermaye ücreti, DASK tarifesi, kira geliri
      istisna tutarı, değer artış kazancı istisnası, gelir vergisi dilimleri.
      Nereye: Payload admin → Vergi Parametreleri
      Kaynak: mali müşavirinden teyitli almanı öneririm.
      Olmazsa: Hesaplayıcılar "parametre tanımlı değil" uyarısı gösterir ve
      hesaplama yapmaz. Ben bu oranları koda gömmüyorum (CLAUDE.md kural 4).

- [ ] **POI verisi** — okul, hastane, market, park, sanayi, durak konumları (Faz 2)
      Nereye: Payload admin → İlgi Noktaları
      Alternatif: OpenStreetMap'ten toplu içe aktarma yazabilirim, söyle.

- [ ] **SMTP bilgileri** (e-posta bildirimleri için)
      Nereye: `.env` → `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
      `SMTP_GONDEREN`
      Olmazsa: Lead geldiğinde sana e-posta gitmez (kayıt yine de düşer).

- [ ] **Umami analitik kurulumu** (Faz 2)
      Nereye: `.env` → `NEXT_PUBLIC_UMAMI_URL`, `NEXT_PUBLIC_UMAMI_SITE_ID`
      Not: Çerez onayı alınmadan yüklenmez (CLAUDE.md kural 8).

- [ ] **Sunucu / deploy erişimi** (Faz 1.10 — CI/CD)
      GitHub repo → Settings → Secrets: `SSH_HOST`, `SSH_PORT`, `SSH_USER`,
      `SSH_PRIVATE_KEY`, `DATABASE_URI`, `PAYLOAD_SECRET`
      Olmazsa: Otomatik deploy çalışmaz; workflow hazır bekler.

- [ ] **Yedekleme hedefi** (Faz 1.10)
      Cloudflare R2 veya Backblaze B2 hesabı + restic şifre cümlesi
      Nereye: `.env` → `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, erişim anahtarları

- [ ] **Bunny Stream hesabı** (Faz 3 — atlandı, altyapı hazır bekliyor)
      Nereye: `.env` → `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY`
      Olmazsa: Video alanları boş durum gösterir; sayfa kırılmaz.

- [ ] **Anthropic API anahtarı** (Faz 4 — AI doğal dil arama)
      Nereye: `.env` → `ANTHROPIC_API_KEY`

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

### 2. Kişisel veri saklama süresi 24 ay uygun mu?

**Şu anki davranış:** Siteden gelen her talep kaydına oluşturulduğu anda
"saklama bitiş tarihi" yazılıyor (onay + 24 ay). Süresi dolan kayıtlar
günlük bakım göreviyle otomatik siliniyor.

**Senden istediğim:** 24 ay makul bir varsayılan ama hukuki bir tercih.
Avukatın farklı bir süre belirlerse söyle, tek satırda değiştiriyorum
(`src/lib/kvkk/saklama.ts` → `VARSAYILAN_SAKLAMA_AYI`).

### 3. Değerleme katsayıları — senin saha bilgin gerekiyor

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

### 4. ✅ Cevaplandı — kalan bal küpü modülleri yapıldı

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

### 5. Endeks sepet ağırlıkları — senin saha bilgin gerekiyor

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

### 6. Gözlem toplamaya bugün başla

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

### 7. ✅ Cevaplandı — palet onaylandı, üç noktada onayına ihtiyacım var

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
