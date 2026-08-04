# İlerleme Kaydı

Bu dosya oturumlar arası hafızadır. **Yeni bir oturuma başlarken önce bunu oku.**
Her faz sonunda güncellenir: ne yapıldı, hangi karar neden verildi, ne eksik kaldı.

---

## Durum özeti

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 1.1–1.2 | Proje iskeleti, Docker geliştirme ortamı | ✅ PR #1 |
| 1.3 | Veri modeli — Payload koleksiyonları | ✅ |
| 1.4 | EİDS iş kuralı + testler | ✅ |
| 1.5 | KVKK / çerez altyapısı | ✅ |
| 1.6 | Tasarım sistemi + temel sayfalar | ✅ |
| 1.7 | İlan listesi / detayı | ✅ |
| 1.8 | Mahalle sayfaları | ✅ |
| 1.9 | Lead formu + WhatsApp | ✅ |
| 1.10 | SEO, CI/CD, yedekleme, dokümantasyon | ✅ |
| 2 | Harita, hesaplayıcılar, ticari dikey | ✅ |
| 2B | Bal küpü modülleri, CRM, portföy yönetimi | 🟡 Kısmi — bkz. aşağısı |
| 2C | Gözlem girişi ve endeks altyapısı | ✅ (sayfa kapalı — tasarım gereği) |
| 3 | Drone / 360° medya | ⏭️ atlandı — altyapı hazır |
| 4 | Yatırım skoru, AI arama, raporlar | 🟡 Skor tamam; AI arama ve raporlar yapılmadı |
| 5 | Çorlu Live | ⏭️ atlandı |

---

## Faz 1.1 + 1.2 — Proje iskeleti ve Docker geliştirme ortamı

**PR:** #1 · merge edildi

- Next.js 16.2 + TypeScript strict + Payload CMS 3.87 tek uygulamada
- PostgreSQL 17 + PostGIS 3.5, Redis 7 için `compose.dev.yml`
- ESLint 9 flat config, Prettier, husky + lint-staged, Vitest

**Kararlar:**

- **Uygulama geliştirmede container'da değil host'ta çalışır.** 3.2 GB RAM'de
  Next.js dev server'ı container'a koymak hem bellek hem yeniden derleme
  maliyeti getiriyordu.
- **Docker portları `127.0.0.1`'e bağlandı.** Docker port yayınında iptables'ı
  doğrudan yazar ve UFW'yi atlar; `5432:5432` yazmak veritabanını internete
  açardı.
- **Payload admin dili Türkçe'ye sabitlendi.**

---

## Faz 1.3 + 1.4 — Veri modeli ve EİDS yayın engeli

### Ne yapıldı

- Koleksiyonlar: `Ilanlar`, `Mahalleler`, `Talepler`, `Sayfalar`, `Medya`,
  `Kullanicilar`. Global: `KurumsalBilgiler`.
- `src/lib/eids` — kural motoru, çerçeveden bağımsız saf TypeScript
- `eidsYayinEngeli` kancası `beforeChange` üzerinde
- `src/lib/kvkk/saklama.ts` — saklama süresi hesabı
- `src/lib/tarih.ts` — Türkiye saat dilimi gün anahtarları
- 110 test (birim + gerçek veritabanına karşı entegrasyon)

### Kararlar ve gerekçeleri

**EİDS kuralı `beforeChange` kancasında, alan doğrulamasında değil.**
Kanca panel, REST/GraphQL API ve Local API (seed betikleri dahil) dahil
tüm yazma yollarını kapsar. Alan bazlı `validate` yalnızca form gönderimini
kapsardı.

**İkinci savunma hattı: `access.read`.** Koleksiyonun okuma erişimi yalnızca
yayındaki kayıtları dışarı verir. Kanca bir şekilde atlansa bile taslak ilan
API'den okunamaz.

**Kural satılık/kiralık ayrımı yapmadan tüm ilanlara uygulanır.** Mevzuat
metni satılık taşınmazı açıkça sayar; kiralık tarafın kapsamı yoruma açık.
Katı davranmak hukuki risk üretmez, gevşek davranmak üretir. Avukat görüşüyle
kapsam daraltılacaksa bu **bilinçli bir karar** olmalı — SENDEN-BEKLENENLER.md'de
soru olarak duruyor.

**Tarih karşılaştırmaları `Europe/Istanbul` gün anahtarı üzerinden.** Sunucu
UTC'de çalışıyor; doğrudan `Date` karşılaştırması Türkiye'de gece yarısından
sonraki ilk 3 saatte bir gün kayma üretiyor ve yetkisi dolmuş ilanın bir gün
fazla yayında kalmasına yol açıyordu.

**`satildi` durumu herkese açık kümeden çıkarıldı.** Satılan taşınmazın
yetkilendirmesi işlemle birlikte anlamını yitirir; yayında tutmak "ilan"
sayılıp EİDS kapsamına girme riski doğurur. Satılan kayıtlar iç referans
olarak kalır.

**Yatırım göstergeleri yalnızca hook ile hesaplanır, elle girilemez.**
Elle girilmiş bir kira çarpanı, fiyat değiştiğinde sessizce yanlışa döner.
Yatırımcının ilk baktığı rakamın yanlış olması en pahalı hatadır.

**Veri yoksa gösterge `null` kalır.** Sıfır veya tahmini rakam üretilmez.

**Medya koleksiyonu video MIME tiplerini reddeder.** Self-host video sunucunun
bant genişliğini tüketir; kural kod seviyesinde uygulandı.

**Görsel `alt` metni zorunlu.** Erişilebilirlik sonradan eklenen bir şey değil.

**Slug çakışmaları sayı ekiyle sessizce çözülür.** Aynı başlıkla iki ilan
girmek olağandır; editöre "geçersiz alan: slug" göstermek anlaşılmaz bir
duvardır. Bu kusuru entegrasyon testi buldu.

**Slug, başlık değişince DEĞİŞMEZ.** Slug kalıcı URL'dir; sessizce değişmesi
indekslenmiş sayfanın 404'e düşmesi demektir.

### Teknik borç

- ✅ `passWithNoTests` kaldırıldı
- `sharp` 0.34'e sabitlendi — 0.35'in tip imzası Payload'ın `SharpDependency`
  tipiyle uyuşmuyor

---

## Faz 1.5 – 1.9 — Tasarım sistemi, KVKK ve sayfalar

### Ne yapıldı

- Tasarım sistemi (`globals.css`): OKLCH renk paleti, koyu tema, tipografi
- 15 UI bileşeni, 12 elle yazılmış SVG ikon
- Çerez onayı ve sunucu tarafı analitik kapısı
- Sayfalar: ana sayfa, `/portfoy` (+filtre, sayfalama), `/portfoy/[slug]`,
  `/mahalleler`, `/mahalleler/[slug]`, `/hakkimizda`, `/iletisim`,
  CMS hukuki sayfaları, 404, hata ekranı
- Talep formu (Zod + server action + honeypot)
- `scripts/seed.ts` — DEMO veri

### Kararlar ve gerekçeleri

**Tasarım yönü: emlak klişelerinin tersi.** Sıcak kağıt zemini (saf beyaz
değil — klinik ve ucuz durur), derin lacivert marka rengi, veri vurguları
için pirinç sarısı. Vurgu rengi **yalnızca rakam ve rozetlerde** kullanılır,
dekorasyonda değil.

**Renkler OKLCH.** Açıklık değeri algısal olarak doğrusal olduğu için
kontrast oranlarını tahmin etmek yerine hesaplamak mümkün.

**Koyu temada pirinç bir tık parlatıldı.** Aynı ton koyu zeminde sönerek AA
kontrastının altına düşüyordu.

**Tipografi: Inter + Source Serif 4, ikisi de `latin-ext` alt kümesiyle.**
Türkçe'nin ş, ğ, ı, İ karakterleri temel `latin` kümesinde YOK; eksik alt
küme yedek fontla karışık metin ve gözle görülür düzen kayması üretir.

**Çerez onayı çerezde tutuluyor, localStorage'da değil.** Analitik betiğinin
sayfaya hiç eklenmemesi gerekiyor; bunun için sunucunun HTML'i üretirken
onayı bilmesi şart. localStorage'a yalnızca tarayıcı erişebilir — o durumda
betik önce eklenir, sonra kaldırılmaya çalışılırdı ki istek zaten gitmiş olur.

**Şüphe halinde izin verilmez.** Bozuk, eski sürümlü, süresi geçmiş veya
gelecek tarihli (kurcalanmış) çerez "onay yok" sayılır.

**Boş durum tasarımı birinci sınıf davranış olarak ele alındı.** Site uzun
süre kısmi veriyle çalışacak:

- `RakamKarti` veri yokken dolu haliyle aynı dikey alanı kaplar (CLS) ve
  verinin **neden** olmadığını açıklar
- Henüz gelmemiş modüller (harita, drone, yatırım skoru, fiyat trendi)
  sayfadan silinmedi; ne geleceğini dürüstçe anlatan yer tutucularla duruyor.
  Sahte grafik veya "temsili" rakam gösterilmiyor.
- Hiçbir biçimlendirici veri yokken "0 ₺" üretmiyor

**KVKK ve pazarlama onayı ayrı kutular.** Tek kutuda birleştirmek KVKK
açısından geçersiz onaydır.

**Telefon deseni yaygın yazımların hepsini kabul eder.** Biçim dayatmak
dönüşümü düşürür; ayrıştırmak doğru yaklaşım.

**Karusel yerine kapak + ızgara.** Karusel mobilde kaydırma çakışması
yaratır, ilk görsel dışındakiler nadiren görülür ve JavaScript gerektirir.

**Sonsuz kaydırma yerine sayfalama.** İndekslenmeyen içerik SEO motorunu
köreltir.

**`clsx` + `tailwind-merge` yerine 4 satırlık birleştirici, ikon paketi
yerine 12 elle yazılmış SVG.** Tarayıcıya inen her kilobayt LCP bütçesinden
düşüyor.

---

## Faz 1.10 — SEO, CI/CD, yedekleme, dokümantasyon

### Ne yapıldı

- Günlük bakım görevleri (`src/lib/bakim/gorevler.ts`) + `/api/bakim` ucu
- Sağlık kontrolü ucu `/api/saglik`
- GitHub Actions: CI kapısı (gerçek PostGIS ile) + Lighthouse ölçümü
- Üretim `Dockerfile`, `compose.prod.yml`, `Caddyfile`
- `scripts/yedekle.sh`, `scripts/geri-yukle.sh`
- `docs/ISLETME-REHBERI.md`

### Kararlar ve gerekçeleri

**Günlük bakım görevi EİDS vaadinin ikinci yarısı.** Yayın engeli kancası
kaydetme anını korur; ama hiç kimse kaydetmezse yetki sessizce dolar ve ilan
yayında kalır. Görev o boşluğu kapatır.

**Yetkisi dolan ilan `yetki_bitti` yapılır, `taslak` değil.** Aradaki fark,
ilanın neden yayından düştüğünün panelde görünmesi.

**`BAKIM_ANAHTARI` tanımlı değilse `/api/bakim` 404 döner.** Açıkta duran,
herkesin çağırabildiği bir veri silme ucu bırakmaktansa hiç çalışmasın.

**KVKK silme raporunda kişisel veri yazılmaz.** Silinen kaydın adını günlük
dosyasında bırakmak silmeyi anlamsız kılar. Bu bir testle korunuyor.

**CI'da gerçek PostGIS servisi çalışır.** EİDS ve KVKK güvenceleri yalnızca
entegrasyon testleriyle kanıtlanıyor; onları CI'da atlamak kapıyı anlamsız
kılardı.

**Üretimde Postgres ve Redis'in `ports` tanımı yok.** Geliştirmede
`127.0.0.1`'e bağlıydılar; üretimde hiç açılmıyorlar. Docker'ın port
yayınlaması UFW'yi atladığı için `ports` eklemek veritabanını internete
açmak demektir.

**Yedekleme betiği döküm boyutunu kontrol eder.** 1 KB'den küçük döküm
"başarılı" sayılmaz ve yedek iptal edilir — sessiz başarısızlık yedeklemede
en tehlikeli davranıştır.

**Geri yükleme betiği üretim için açık onay ister.** `EVET, USTUNE YAZ`
yazılmadan üretim veritabanının üzerine yazmaz.

**Lighthouse CI'da çalışır, geliştirme sunucusunda değil.** 3.2 GB RAM'li ve
yüklü bir makinede alınan sayılar gerçek kullanıcı deneyimini temsil etmez.

---

## Faz 2 — Harita, hesaplayıcılar, ticari dikey

### Ne yapıldı

- 5 hesaplayıcı: kira getirisi, kredi, alım maliyeti, kira geliri vergisi,
  değer artış kazancı vergisi
- `VergiParametreleri` koleksiyonu + parametre kayıt defteri
- `IlgiNoktalari` (POI) koleksiyonu
- MapLibre haritası (`/harita`) + katman filtreleri
- `/ticari` dikeyi
- `/mahalleler/karsilastir` karşılaştırma aracı
- 49 hesaplayıcı testi

### Kararlar ve gerekçeleri

**Hiçbir oran koda gömülmedi.** `src/lib/vergi/parametreler.ts` yalnızca
hangi parametrelerin var olduğunu tanımlar; değerler CMS'te. Parametre
eksikse hesaplayıcı **çalışmaz** ve eksik olanı adıyla söyler. Yanlış bir
vergi rakamı, rakam olmamasından çok daha zararlı.

**Parametre kontrolü, girdi kontrolünden ÖNCE gelir.** İlk yazımda ters
sıradaydı: kullanıcı bütün alanları dolduruyor, sonra "bu hesaplayıcı
çalışmıyor" duvarına çarpıyordu. Eksik parametre aracın eksikliğidir,
kullanıcının değil — ilk anda söylenmeli. Dört testle korunuyor.

**Gelir vergisi dilimleri kümülatif uygulanır.** "Matrah 800 bini geçti,
tamamı %40" en yaygın yanlış anlamadır; sonuç ekranında dilim dilim
gösteriliyor ve testle korunuyor.

**Kredi faiz oranı kullanıcıdan alınır, CMS'te tutulmaz.** Konut kredisi
faizi bankadan bankaya ve haftadan haftaya değişir; sabit bir oran
göstermek ziyaretçiyi eskimiş rakamla hesap yaptırmak olurdu.

**Yİ-ÜFE değerleri de kullanıcıdan alınır.** Aylık yayınlanan resmî bir
seri; her ay güncellenmesi gereken yüzlerce değeri sistemde tutup eskitmek
yanlış vergi üretir.

**Değer artış vergisinde muafiyet süresi takvim üzerinden hesaplanır.**
365'e bölmek artık yıllarda birkaç günlük hata üretir ve muafiyet
sınırındaki bir satışta bu fark verginin tamamı demektir. Aracın en değerli
çıktısı, "satışı N gün ertelersen vergi ödemezsin" uyarısı.

**Kira getirisi hesaplayıcısı vergi parametresi gerektirmez.** En çok
aranan aracın, oranlar CMS'e girilene kadar çalışmaması kabul edilemezdi.

**Sıfır gider varsayılmaz.** Gider girilmezse net getiri hiç gösterilmez;
sıfır varsaymak getiriyi olduğundan yüksek gösterirdi.

**maplibre-gl yalnızca `/harita` rotasında yükleniyor** (`next/dynamic`,
`ssr: false`). Doğrulandı: 924 KB'lık chunk ayrı duruyor, ana sayfanın JS
bütçesi 198 KB gzip'te değişmedi.

**Haritadaki her nokta aynı sayfada metin listesi olarak da var.** Harita
bir görselleştirmedir; bilginin kendisi listede. Ekran okuyucu kullanan
biri hiçbir şey kaybetmiyor ve MapTiler anahtarı olmadan da sayfa işe
yarıyor.

**WebGL desteği render sırasında ölçülüyor**, efektte değil. Desteklenmiyorsa
MapLibre hiç başlatılmıyor.

**Karşılaştırmada "en iyi" vurgusu yalnızca iki veya daha fazla mahallede
veri varsa yapılır.** Tek mahallede veri varken onu en iyi diye işaretlemek,
karşılaştırma yapılmış izlenimi verirdi.

**Şema artık yalnızca migration'larla değişiyor** (`push: false`). Payload
üretim dışı ortamlarda şemayı doğrudan veritabanına yazıyordu; bu üç soruna
yol açıyordu: `pnpm test` şemayı sessizce değiştiriyordu, `payload migrate`
etkileşimli soru sorup kilitleniyordu, ve migration'ın gerçekten çalıştığı
ilk yer üretim oluyordu.

---

## Faz 2B — Bal küpü modülleri ve CRM çekirdeği (kısmi)

### Ne yapıldı

- **B1 — "Evim ne eder?" değerleme motoru** (`src/lib/degerleme`) + `/degerleme`
  sayfası + `Degerlemeler` koleksiyonu + `DegerlemeAyarlari` global. 27 test.
- **B2 — Gizli Portföy** (`/gizli-portfoy`) sunucu tarafı maskelemeyle
- **Lead skorlama motoru** (`src/lib/crm/skorlama.ts`) + `Talepler` kancasına
  bağlandı. 14 test.
- Gezinme üst menü / altbilgi olarak ayrıldı

### Kararlar ve gerekçeleri

**Değerleme sonucu iletişim bilgisi arkasında kilitli değil** (CLAUDE.md
kural 6b). Ziyaretçi hiçbir şey vermeden gerçek bir sonuç görüyor; iletişim
yalnızca *derinleştirme* (yerinde değerleme) için isteniyor.

**Nokta değer değil aralık veriliyor.** "Eviniz 4.437.500 ₺ eder" cümlesi,
sahip olmadığımız bir kesinliği iddia eder.

**Az veri = geniş aralık + düşük güven rozeti.** Dürüstlük burada satıştır:
dar bir aralık verip yanılmak o müşteriyi kalıcı kaybettirir. Güven düzeyi
yalnızca gözlem sayısına değil, **hesaba katılamayan faktör sayısına** da
bakıyor.

**Mahalle m² verisi yoksa değerleme yapılmıyor.** Model, gerçek gözleme
dayanmayan çıktı üretmez. Ziyaretçiye "bu mahalle için henüz yeterli veri
yok" denip doğrudan iletişime yönlendiriliyor.

**Tanımsız katsayı 1,0 varsayılmıyor.** O faktör hesaba hiç katılmıyor ve
kullanıcıya "bu etki hesaba katılmadı" deniyor. Sessizce 1,0 uygulamak,
ayarlama yapılmış izlenimi verirdi.

**Katsayılara başlangıç değeri konulmadı.** "Makul görünen" bir katsayı
yazmak, uydurma veriyi model parametresi kılığında sokmak olurdu. Aslıhan'ın
saha bilgisiyle belirlenecek.

**Gizli portföy maskelemesi sunucuda.** Sorgu `select` ile yalnızca
gösterilecek alanları çekiyor; adres, fotoğraf, kat planı, tam konum ve
taşınmaz numarası veritabanından **hiç okunmuyor.** İstemcide gizlemek
(CSS bulanıklığı, render etmeme) gerçek koruma değildir — veri RSC yükünde
durur ve geliştirici araçlarıyla okunur. Rakibin portföyü kopyalaması için
bu yeterli olurdu.

**Fiyat ve m² banda yuvarlanıyor**, gizlenmiyor. Gerçek değer gerçekten o
bandın içinde — kıtlık hissi korunuyor ama yanıltma yok.

**Lead skoru sıralar, elemez.** Skor asla bir talebi gizlemiyor. Bileşenler
tamamen gözlemlenebilir davranışa dayanıyor (ne kadar bilgi paylaştı,
ulaşılabilir mi, ne kadar somut); demografik hiçbir bileşen yok. Satıcı ve
değerleme talepleri en yüksek ağırlıkta — emlakta kıt kaynak alıcı değil
portföydür.

### ⚠️ Faz 2B'de YAPILMAYANLAR

Şartname dosyası (`BAL-KUPU-VE-PORTFOY-YONETIMI.md`) **B3 modülünün
ortasında kesiliyor**; B4 ve sonrası hiç yazılmamış. Aşağıdakiler bilinçli
olarak bırakıldı:

| Modül | Durum | Neden |
| --- | --- | --- |
| B3 — Mahalle Eşleştirme Testi | Yapılmadı | Şartname yarım; eşleştirme algoritmasının kriter ağırlıkları Aslıhan'ın saha bilgisini gerektiriyor |
| Yatırım Simülatörü | Yapılmadı | Şartnamesi yok |
| Kira mı Satın Alma mı | Yapılmadı | Şartnamesi yok |
| Bölge Radarı | Yapılmadı | Şartnamesi yok |
| Kişiye özel PDF rapor | Yapılmadı | PDF üretimi ağır bağımlılık (~2 MB); 3.2 GB RAM'de değerlendirilmeli |
| CRM eşleştirme motoru | Yapılmadı | Portföy–talep eşleştirmesi anlamlı miktarda veri gerektiriyor |
| Portföy giriş sihirbazı | Yapılmadı | Payload admin şu an yeterli; sihirbaz optimizasyondur |
| Sosyal medya materyal üretimi | Yapılmadı | Görsel şablon kararları marka kimliği netleşince |

Bunlar `docs/SENDEN-BEKLENENLER.md` üzerinden takip ediliyor.

---

## Faz 2C — Endeks altyapısı

### Ne yapıldı

- `src/lib/endeks/motor.ts` — tabakalı medyan, sabit ağırlıklı endeks motoru
- `src/lib/endeks/kalite.ts` — veri kalitesi korumaları
- `Gozlemler` koleksiyonu + `EndeksAyarlari` global
- `/endeks` sayfası — **kapalı**, yayın kapısı koda gömülü
- `/endeks-metodolojisi` — yayında
- 51 test

### Kararlar ve gerekçeleri

**Yayın kapısı iki taraflı.** Aslıhan'ın onay kutusu **tek başına yetmez**;
sistem ayrıca veri koşullarını kontrol eder (≥6 ay, ≥500 gözlem, %70 ağırlık
kapsamı, metodoloji yayında). Koşullar sağlanmazsa sayfa 404 döner. Bu,
"bir ay erken açalım" cazibesine karşı duran tek şey.

**`/endeks` site haritasında YOK.** Sayfa 404 dönerken site haritasına
koymak, arama motoruna ölü bağlantı vermek olurdu. Endeks yayına alındığında
eklenecek.

**Medyan, ortalama değil.** Test bunu gösteriyor: tek bir 71.000 TL/m²
gözlemi ortalamayı 3.000 TL kaydırıyor, medyanı 300 TL.

**Sabit ağırlık, bileşim yanlılığını öldüren adım.** Bir test tam da bunu
sınıyor: gözlem dağılımı köklü biçimde değişiyor ama fiyatlar sabit —
endeks kıpırdamıyor.

**Eşik altında uydurma yok.** Katmanda 8'den az gözlem varsa önceki ayın
değeri taşınıyor ve bu tabloda **açıkça işaretleniyor.**

**İstenen ve gerçekleşen fiyat asla karışmıyor.** İki ayrı seri; endeksin
adında "İstenen Fiyat" geçiyor ve sayfada bu bir uyarı kutusuyla
vurgulanıyor.

**Ağırlıklara başlangıç değeri konulmadı.** Ağırlıklar konut stokunu temsil
etmeli, gözlem sayısını değil — bu Aslıhan'ın saha bilgisi.

**Kalite korumaları UYARIR, ENGELLEMEZ.** Bir gözlemi "aykırı" diye
reddetmek, veriyi kendi beklentimize göre budamak olurdu — endeksin
bozulmasının en sinsi yolu. Sistem soruyu sorar, kararı insan verir.

**Gözlemler koleksiyonu ziyaretçiye tamamen kapalı.** Tek tek kayıtlar asla
yayınlanmaz; yalnızca toplulaştırılmış göstergeler.

### Faz 2C'de yapılmayanlar

| Konu | Durum | Not |
| --- | --- | --- |
| Hızlı Gözlem Girişi ekranı | Yapılmadı | Payload admin formu şu an çalışıyor ve m² fiyatını otomatik hesaplıyor. Özel ekran (15 sn/kayıt hedefi, "son seçilen değerde kalma") bir optimizasyon — gerçek kullanım alışkanlığı görülmeden tasarlamak erken. |
| CSV içe aktarma | Yapılmadı | Aslıhan'ın mevcut Excel/Sheets sütun düzeni bilinmeden yazmak, iki kez yazmak demek |
| Reel endeks (TÜFE) arayüzü | Motor hazır, arayüz yok | `reelEndeksHesapla` yazıldı ve test edildi; TÜFE serisi girişi henüz yok |
| Kira çarpanı serisi arayüzü | Motor hazır, arayüz yok | `kiraCarpaniSerisi` yazıldı ve test edildi |
| Aylık onay akışı | Yapılmadı | "Sistem hesaplar, Aslıhan onaylar" akışı; endeks yayına yaklaşınca anlamlı olacak |

---

## Faz 4 — Yatırım Skoru (kısmi)

### Ne yapıldı

- `src/lib/skorlama/yatirimSkoru.ts` — altı bileşenli skor motoru + ham puan
  üreticileri. 42 test.
- `/yatirim-skoru-metodolojisi` — metodoloji sayfası
- Radar grafiği + sayısal kırılım bileşenleri
- `Mahalleler.yatirimSkoru` grubuna bileşen alanları; toplam kaydetme anında
  otomatik hesaplanıyor

### Kararlar ve gerekçeleri

**Yetersiz veriyle skor üretilmiyor.** Bileşenlerin en az %70 ağırlığı
dolu değilse skor hiç gösterilmez. Eksik bileşeni sıfır saymak mahalleyi
haksız yere cezalandırır; ortalama saymak veriyi uydurmaktır. İkisi de
yapılmıyor — bir test bunu koruyor.

**Kırılım her zaman gösteriliyor.** Kara kutu puan yayınlanmıyor: altı
bileşenin hepsi, ham puanları, ağırlıkları ve hangisinde veri olmadığı
görünüyor.

**Fiyat trendi göreli ölçülüyor.** Yüksek enflasyonda her mahallenin fiyatı
yükselir; mutlak artışı puanlamak her mahalleye yüksek puan verir ve skor
hiçbir şey ayırt etmez. Mahallenin değişimi Çorlu ortalamasıyla
karşılaştırılıyor.

**İki bileşen ters yönlü** ve bu hem kodda hem metodoloji sayfasında açıkça
yazılı: düşük kira çarpanı yüksek puan alır, çok yeni arz düşük puan alır.

**Radar tek başına bırakılmadı.** CLAUDE.md radar istiyor ve radar profili
iyi okutur; ama alan yanılsaması nedeniyle kesin karşılaştırmaya elverişsiz.
Bu yüzden hemen altında her bileşenin sayısal değeri çubuk + rakam olarak
veriliyor. Şekil radardan, kesin okuma listeden gelir. SVG `aria-hidden`;
anlam listede yaşıyor.

**Grafik kütüphanesi kullanılmadı.** Altı köşeli bir çokgen 40 satır SVG;
bir kütüphane ~50 kB gzip eklerdi.

**Çubuklar tek renk.** Değere göre renklendirmek, çubuk uzunluğunu ikinci
kez kodlamak olurdu.

### ⚠️ Faz 4'te YAPILMAYANLAR

| Konu | Neden |
| --- | --- |
| AI doğal dil arama | `ANTHROPIC_API_KEY` yok. Ayrıca anlamlı bir portföy olmadan test edilemez — 6 demo ilan üzerinde "3+1 bahçeli daire ara" demenin bir karşılığı yok. |
| PostGIS yakınlık sorguları | Skorun `sanayiYakinligi` ve `ulasim` bileşenleri şu an elle giriliyor. Otomatik hesap için POI verisi ve mahalle sınırları gerekiyor; ikisi de henüz yok. |
| Çeyreklik PDF rapor | PDF üretimi ağır bağımlılık; birlikte karar verilmeli |
| PriceHistory grafikleri | Endeks motoru (Faz 2C) bu veriyi üretecek; grafik endeks yayına yaklaşınca anlamlı |

---

## Ölçümler

### Sunucu yanıt süresi (üretim derlemesi, yerel, demo veriyle)

| Sayfa | TTFB |
| --- | --- |
| `/` | 28 ms |
| `/portfoy` | 30 ms |
| `/mahalleler` | 19 ms |
| `/portfoy/[slug]` | 38 ms |

### İstemciye inen JavaScript

| Sayfa | Sıkıştırılmamış | gzip |
| --- | --- | --- |
| `/` | 653 KB | **198 KB** |
| `/portfoy` | 671 KB | ~203 KB |

198 KB gzip, React 19 + Next 16 App Router taban maliyetinin (~110 KB) üzerine
yaklaşık 90 KB uygulama kodu demek. Kabul edilebilir ama ideal değil.

### Derleme süresi

| Faz | Süre | Not |
| --- | --- | --- |
| Faz 1 sonu | 87 sn | Eşiğe yakın |
| Faz 2 sonu | **105 sn** | ⚠️ 90 sn eşiği aşıldı |

**Araştırıldı.** Artışın kaynağı `maplibre-gl` (924 KB'lık chunk) ve 9 yeni
sayfa. Derleme *zamanı* arttı ama **çalışma zamanı maliyeti artmadı**:
maplibre yalnızca `/harita` rotasında yükleniyor, ana sayfanın JS bütçesi
198 KB gzip'te sabit kaldı.

Bu, kabul edilen bir takas: harita gerçek bir gereksinim ve tek alternatif
onu tamamen çıkarmak olurdu. Eşiğin aşılması derleme altyapısında bir
sorun değil, kapsam büyümesinin doğal sonucu. Faz 2B/2C'de 120 sn'yi
aşarsa admin panelinin ayrı derlenmesi değerlendirilecek.

### ⚠️ Lighthouse henüz ölçülmedi

Geliştirme sunucusunda Chrome yok. Ölçüm `.github/workflows/lighthouse.yml`
ile CI'da yapılıyor ve iş özetinde raporlanıyor. Şu an **engelleyici değil,
raporlayıcı** — site demo veriyle ve gerçek görseller olmadan çalışıyor,
bu koşullardaki skorlar yayına girecek halin skorları değil.

**Gerçek içerik ve medya geldiğinde eşikler zorunlu hale getirilmeli.**

---

## Bilinen eksikler ve teknik borç

| Konu | Etki | Not |
| --- | --- | --- |
| **Tüm sayfalar dinamik render** | TTFB ve önbellek | Layout, çerez onayını okumak için `cookies()` çağırıyor; bu bütün rotaları dinamik yapıyor. Bilinçli takas — yasal güvence performanstan önce. Çözüm adayı: PPR / `cacheComponents` olgunlaştığında dinamik parçaları `Suspense` içine almak. |
| Lighthouse eşikleri engelleyici değil | Regresyon kaçabilir | Gerçek içerik gelince zorunlu yapılacak |
| Derleme 87 sn | Sınıra yakın | 90 sn eşiği aşılırsa araştır |
| SMTP yok | Lead bildirimi gitmiyor | Kayıt düşüyor, e-posta gitmiyor. Bilgi bekleniyor. |
| E-posta bildirimi kodu yok | — | SMTP bilgileri gelince `yetkisiBitecekleriBildir` görevine eklenecek |
| `sharp` 0.34'e sabit | — | Payload sürüm yükseltmesinde 0.35 tekrar denenebilir |
| PostGIS `tiger`/`topology` şemaları | Disk | Düşük öncelik |
| Rol tabanlı yetkilendirme | — | `Kullanicilar.rol` alanı var ama henüz erişim kurallarına bağlı değil; Faz 2B (CRM) |
| Gizli portföy modülü | — | `gizliPortfoy` alanı ve liste filtresi hazır; kilitli görünüm Faz 2B |

---

## Sonraki adım

Planlanan fazların tamamı işlendi (Faz 3 ve 5 talimat gereği atlandı).
**Sıradaki iş artık koddan değil, veriden ve karardan geliyor.**

### Sistem hazır, veri bekliyor

Şu modüller yazıldı, test edildi ve çalışıyor — ama gerçek veri girilene
kadar boş durum gösteriyorlar. Bu bir eksiklik değil, tasarım:

| Modül | Beklediği |
| --- | --- |
| 3 hesaplayıcı | Vergi/harç oranları (CMS) |
| Değerleme aracı | Mahalle m² fiyatları + katsayılar |
| Harita | MapTiler anahtarı + POI verisi |
| Yatırım skoru | Bileşen puanları |
| Endeks | 6 ay veri, 500 gözlem, sepet ağırlıkları |
| Mahalle sayfaları | 800+ kelime analiz metni |
| Hukuki sayfalar | Avukat metinleri |

Tamamı `docs/SENDEN-BEKLENENLER.md` içinde, nereye gireceği ve olmazsa ne
olacağıyla birlikte.

### Kod tarafında sırada ne var

Öncelik sırasıyla, ama hepsi **Aslıhan'ın kararına bağlı**:

1. **Faz 2B'nin kalan modülleri** — mahalle eşleştirme testi, yatırım
   simülatörü, kira mı satın alma mı, bölge radarı. Şartname yarım
   kaldığı için öncelik sorusu SENDEN-BEKLENENLER.md madde 4'te.
2. **PostGIS yakınlık sorguları** — skorun `sanayiYakinligi` ve `ulasim`
   bileşenlerini otomatikleştirir. POI verisi girilince anlamlı olur.
3. **CSV içe aktarma** — Aslıhan'ın mevcut tablo düzeni bilinince.
4. **AI doğal dil arama** — API anahtarı + anlamlı portföy gerektirir.
5. **PDF rapor üretimi** — bağımlılık maliyeti nedeniyle birlikte
   kararlaştırılmalı.
6. **Faz 3 (drone/360)** — medya ve CDN hesabı gelince; alanlar ve boş
   durumlar bugünden hazır.
