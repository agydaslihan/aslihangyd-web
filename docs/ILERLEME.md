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
| 2 | Harita, hesaplayıcılar, ticari dikey | ✅ (PostGIS yakınlık dahil) |
| 2B | Bal küpü modülleri, CRM, portföy yönetimi | 🟡 Kısmi — bkz. aşağısı |
| 2B+ | Kalan bal küpü modülleri + raporlar | ✅ 4 modül + PDF rapor — bkz. aşağısı |
| 2B++ | Portföy giriş sihirbazı | ✅ Admin'in yanında, EİDS canlı geri bildirimli |
| 2C | Gözlem girişi ve endeks altyapısı | ✅ CSV içe aktarma dahil (sayfa kapalı — tasarım gereği) |
| 3 | Drone / 360° medya | ⏭️ atlandı — altyapı hazır |
| 4 | Yatırım skoru, AI arama, raporlar | ✅ Skor, raporlar ve AI arama tamam |
| 5 | Çorlu Live | ⏭️ atlandı |
| A paketi | Mahalle veri altyapısı (liste, OSM sınır, Google, rayiç, şeffaflık) | ✅ Altyapı hazır — **veri Aslıhan'dan** |
| B paketi | Bohem / pudra paleti — lacivert kaldırıldı | ✅ Ölçüldü ve teste bağlandı |
| C paketi | Güneş zaman çubuğu — saat saat cephe analizi | ✅ Ek kütüphane yok, 10,9 kB gzip |

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
| B3 — Mahalle Eşleştirme Testi | ✅ Faz 2B+ | — |
| Yatırım Simülatörü | ✅ Faz 2B+ | — |
| Kira mı Satın Alma mı | ✅ Faz 2B+ | — |
| Bölge Radarı | ✅ Faz 2B+ | — |
| Kişiye özel PDF rapor | ✅ Faz 2B+ | Bağımlılıksız yazdırma yoluyla; gerekçe aşağıda |
| Portföy giriş sihirbazı | ✅ Faz 2B++ | — |
| CRM eşleştirme motoru | Sırada — **2.** | Portföy giremeden CRM'in besleyeceği veri yok |
| Sosyal medya materyal üretimi | Sırada — **3.** | Görsel şablon kararları marka kimliği netleşince |

**Öncelik sırası Aslıhan tarafından verildi (4 Ağustos 2026):** portföy giriş
sihirbazı → CRM eşleştirme motoru → sosyal medya. Gerekçe: *portföy giremeden
CRM'in besleyeceği veri yok.* Bu sıra, CRM'i veri kıtlığı içinde yazıp boş
bir ekranla teslim etme riskini ortadan kaldırıyor.

---

## Faz 2B+ — Kalan bal küpü modülleri ve raporlar

### Ne yapıldı

- **Kira mı Satın Alma mı** (`src/lib/hesaplayicilar/kiraMiSatinAlmaMi.ts`)
  + `/araclar/kira-mi-satin-alma-mi`. 23 test.
- **Yatırım Simülatörü** (`src/lib/hesaplayicilar/yatirimSimulatoru.ts`)
  + `/araclar/yatirim-simulatoru`. 26 test.
- **B3 — Mahalle Eşleştirme Testi** (`src/lib/eslestirme/`) + `/mahalle-testi`
  + `/mahalle-eslestirme-metodolojisi` + `Mahalleler.eslestirmeProfili`
  (4 yeni CMS alanı, migration `20260804_091230`). 26 test.
- **Bölge Radarı** (`src/lib/radar/motor.ts`) + `/bolge-radari`. 23 test.
- **PDF rapor** — `/rapor/degerleme`, `/rapor/yatirim-simulatoru`,
  `/rapor/kira-mi-satin-alma-mi` + `RaporKabugu` + yazdırma stilleri.
- `anuiteTaksiti` `kredi.ts`'e çıkarıldı — üç modül aynı formülü kullanıyordu.

Toplam **98 yeni test**; süit 366 → 464 (21 dosya).

### Kararlar ve gerekçeleri

**Kira/satın alma karşılaştırması aylık ödemeyi değil NET VARLIĞI kıyaslıyor.**
Aracın en kolay yanlış yapılan hâli taksiti kirayla yan yana koymaktır; o
karşılaştırma ya peşinatın alternatif getirisini ya kiracının biriktirdiği
parayı görmez. Her ay **az ödeyen taraf farkı yatırır** — bu adım atlanırsa
"kiralamak ucuz" derken kiracının o parayı harcadığı varsayılmış olur.

**Başabaş değer artışı eşiği.** Aracın en değerli çıktısı bu: satın almanın
kiralamayı geçmesi için gereken yıllık değer artışı. Kullanıcının tahmin
etmesine gerek bırakmıyor, kendi beklentisiyle kıyaslayacağı bir eşik
veriyor. İkiye bölme ile bulunuyor; testi doğrudan tanımı sınıyor.

**Büyüme varsayımlarına yer tutucu KONULMADI.** Değer artışı, kira artışı ve
alternatif getiri alanları boş açılıyor. Yer tutucu, kullanıcının çoğu zaman
doğrudan kabul ettiği bir öneridir; oraya rakam yazmak tahminimizi veri
kılığında sunmak olurdu (kural 2).

**Simülatörde getiri ölçüsü İVO (iç verim oranı).** Kaldıraçlı ve ara nakit
akışlı bir yatırımda anlamlı tek ölçü budur. "Toplam getiri %180" cümlesi
bunun 3 yılda mı 15 yılda mı elde edildiğini gizler.

**Reel getiri Fisher denklemiyle.** `(1+n)/(1+e)−1`. Nominalden enflasyonu
çıkarmak yüksek enflasyonda ciddi biçimde yanıltır; test bunu ayrıca sınıyor.

**Vergi dilimi kayması düzeltiliyor.** Bugünün dilimlerini 10 yıl sonrasının
nominal kirasına uygulamak vergiyi sistematik olarak şişirir — dilimler her
yıl yeniden belirlenir. Enflasyon girildiğinde kira bugünkü paraya indirgenip
vergi öyle hesaplanıyor. Enflasyon girilmezse düzeltme yapılamıyor ve bu
uyarı olarak bildiriliyor.

**Vergi parametresi yoksa simülasyon DURMUYOR**, ama sonuç açıkça "vergi
öncesi" etiketleniyor. Vergiyi uydurmaktansa göstermemek ve bunu söylemek
doğru.

**Eşleştirmede ağırlıklar KODDA, mahalle öznitelikleri CMS'TE.** Yatırım
skorundaki ayrımın aynısı: "çocuklu hane için okul erişimi ne kadar önemli?"
bir ölçüm değil, aracın ilan ettiği metodolojidir ve yayınlanır.
"Şeyhsinan ne kadar sakindir?" ise orayı bilen birinin bilgisidir — CMS'e
girilir, başlangıç değeri konulmaz.

**Eşleştirme portföyden TAMAMEN bağımsız.** Bir mahallede kaç ilanımız olduğu
hesaba hiç girmiyor ve bu metodoloji sayfasında açıkça yazılı. Test elimizdeki
evi satmanın yolu olsaydı, ilk yanlış öneride hem müşteriyi hem itibarı
kaybederdik.

**Bütçe mutlak eşikle değil, karşılaştırmalı puanlanıyor.** "70 m² altı
yetersizdir" demek bizim uydurduğumuz bir yaşam standardını dayatmak olurdu.
Bütçeyle en çok m² alınan mahalle 100 puan; kullanılan tek veri gerçek m²
fiyatları.

**Zaman ufku eşleştirmeyi ETKİLEMİYOR.** Aceleci olana farklı mahalle önermek,
aceleye getirmenin örtülü bir yolu olurdu. Cevap yalnızca sonuç ekranındaki
yönlendirmeyi değiştiriyor.

**Radar YENİ BİR SKOR ÜRETMİYOR.** İkinci bir puan icat etmek, Yatırım
Skoruyla çeliştiğinde hangisine inanılacağı sorusunu doğurur ve ikisini de
değersizleştirir. Radar bunun yerine **sinyal** üretiyor: rakamıyla birlikte
gösterilen, veriye dayanan tek cümlelik gözlemler.

**Radarda mutlak eşik yok.** Her sinyal, verisi olan mahallelerin MEDYANINA
göre hesaplanıyor — ölçüt Çorlu'nun kendisi. Medyan tercihi ortalamaya karşı
bilinçli; test tek bir aykırı değerin medyanı kıpırdatmadığını gösteriyor.

**Radar veri zayıflığını GİZLEMİYOR, sinyal olarak gösteriyor.** Bir mahallenin
gözlem sayısı endeksin yayınlanmış katman eşiğinin (8) altındaysa bunu açıkça
söylüyor. Eşik uydurulmadı; endeks metodolojisindeki sayıyla aynı.

### PDF: neden kütüphane kullanılmadı

Ölçüldü:

| Aday | Disk | Türkçe |
| --- | --- | --- |
| `pdf-lib` | 23 MB | ❌ `WinAnsi cannot encode "ğ"` |
| `@react-pdf/renderer` | 71 paket / 56 MB | Font kaydı gerektirir |

`pdf-lib`'in standart fontları WinAnsi kodlamalıdır ve Türkçe karakterleri
**kodlayamaz** — doğrulandı, hata mesajı yukarıda. Çalışması için `fontkit`
+ depoya gömülü ~700 KB'lık bir TTF gerekiyor. Kullanıcıya görünen her şeyin
Türkçe olduğu bir projede bu, kütüphanenin en temel işini yapamaması demek.
Üstelik `pdf-lib`'in düzen motoru yok; her tablo elle koordinatlanacaktı.

Bunun yerine **yazdırma yolu** seçildi: rapor sayfası + `@media print` +
tarayıcının "PDF olarak kaydet" seçeneği. Kullanıcının eline geçen çıktı
gerçek bir PDF dosyasıdır, Türkçe sistem fontlarıyla kusursuz çıkar, **sıfır
bağımlılık** ekler ve derleme süresini artırmaz.

#### Sunucu tarafı PDF — Faz 4 teknik borcu

Rapor **e-postaya iliştirilecekse** yazdırma yolu yetmez: kullanıcının
tarayıcısı gerekiyor. O aşamada **Playwright + headless Chrome** kullanılacak:
mevcut `/rapor/*` rotaları olduğu gibi render edilip `page.pdf()` ile PDF'e
çevrilecek.

Neden bu yol:
- **Türkçe sorunu yok** — Chrome sistem fontlarını kullanır, `pdf-lib`'in
  WinAnsi kısıtı burada yok.
- **Düzen motoru zaten var** — `@media print` kuralları aynen geçerli; tablo
  ve sayfa sonu davranışı elle koordinatlanmaz.
- **Tek kaynak** — ekran, yazdırma ve e-posta PDF'i aynı rotadan üretilir;
  üçünün birbirinden ayrılma riski ortadan kalkar.

Dikkat edilecekler:
- Chromium ~300 MB; sunucu 3,2 GB RAM. PDF üretimi **istek anında değil,
  kuyrukta** çalışmalı — eşzamanlı iki render belleği zorlar.
- Yalnızca sunucu tarafında, `NEXT_RUNTIME=nodejs` altında; istemci
  paketine sızmamalı.
- SMTP bilgileri gelmeden bu iş anlamsız (bkz. bilinen eksikler).

**Rapor URL'sinde SONUÇ değil GİRDİ taşınıyor** ve sunucuda aynı motorlarla
yeniden hesaplanıyor. İstemcinin hesapladığı rakamı URL'den alıp rapora
basmak, adres çubuğunu düzenleyen herkese "aslihangyd.com raporu" görünümlü
uydurma bir belge üretme imkânı verirdi. Değerlemede taban m² fiyatı da
URL'den değil mahalle kaydından okunuyor.

Raporlar `robots: noindex` — kişiye özel girdilerle üretiliyorlar.

**Rapor bal küpü kuralına tabi (6b):** raporu açmak ve PDF olarak kaydetmek
için iletişim bilgisi istenmiyor. İletişim yalnızca *yerinde* değerleme için.

### Derleme süresi: eşik 150 sn, CI'da önbellek

**87 sn → 107 sn.** Sebep bağımlılık DEĞİL — bu fazda hiçbir paket eklenmedi.
Artış 8 yeni rotadan ve ~4.000 satır koddan geliyor; rota başına ~2,5 sn.

Alınan kararlar:

1. **Eşik 90 → 150 sn.** Site büyüdükçe derleme uzar; 90 sn artık gerçekçi
   değildi ve sürekli ihlal edilen bir eşik, eşik olmaktan çıkar.
2. **CI'da `.next/cache` önbelleği** (`actions/cache@v4`). Anahtar iki
   katmanlı: kilit dosyası + kaynak özeti. Bağımlılık değişirse önbellek
   bilinçli olarak ıskalanır — eski SWC çıktısını yeni sürümle karıştırmak
   sinsi hatalar üretir.
3. **Süre CI'da ölçülüp iş akışı özetine yazılıyor.** Eşik aşılırsa koşu
   BAŞARISIZ OLMAZ, uyarı düşer. Derleme süresi bir kalite kapısı değil,
   trend göstergesidir; testleri geçen bir PR'ı süre yüzünden bloklamak
   kapının kendisini anlamsızlaştırırdı.

#### CI derleme önbelleği ölçümü

Önbellek eklendikten sonra aynı commit iki kez koşuldu:

| Koşu | Önbellek | Derleme | Toplam iş |
| --- | --- | --- | --- |
| 1 | miss (yazdı) | **37 sn** | 2 dk 08 sn |
| 2 | **hit** | **35 sn** | 1 dk 57 sn |

**Beklenen kazanç gerçekleşmedi ve sebebi öğrenildi.**

`.next/cache` içeriği CI'da **187 KB** — neredeyse boş. İçinde yalnızca
`.tsbuildinfo` var. İki sebep:

1. **Next 16 varsayılan olarak Turbopack kullanıyor** ve Turbopack derleme
   önbelleğini `.next/cache`'e yazmıyor. Klasik `actions/cache` + `.next/cache`
   tarifi webpack dönemine ait; bu projede karşılığı yok.
2. **Tüm rotalar dinamik (ƒ).** Layout çerez onayını okumak için `cookies()`
   çağırıyor (bilinen ve bilinçli takas). Statik ön-render olmadığı için
   önbelleğe alınacak prerender çıktısı da yok.

37 → 35 sn farkı gürültü seviyesinde; önbellek restore 1 sn, save 1 sn.
Yani adım net olarak **başa baş**.

**Asıl bulgu: sorun zaten yoktu.** Yereldeki 107 sn, geliştirme makinesinin
hızıydı. CI'da soğuk derleme **37 sn** — hedeflenen 40–50 sn bandının zaten
altında. 150 sn eşiği bol bol karşılanıyor.

**Adım kaldırılmadı** çünkü maliyeti ~1 sn ve iki durumda kendiliğinden işe
yarayacak: bazı rotalar statikleşirse, ya da Turbopack kalıcı önbelleği
kararlı hale gelirse. Yorumu, şu an bir şey yapmadığını açıkça söylüyor —
bir şey yaptığı sanılan ölü adım, hiç adım olmamasından kötüdür.

**Denenmeyen seçenek:** Turbopack'in deneysel kalıcı önbelleği. Deneysel bir
derleyici bayrağı açmak yığın kararıdır (CLAUDE.md: "yığını değiştirmeden
önce sor") ve derleme süresi zaten sorun olmadığı için gerekçesi yok.

---

## Faz 2B++ — Portföy giriş sihirbazı

### Ne yapıldı

- `src/lib/sihirbaz/sema.ts` — adım adım doğrulanabilir Zod şeması
- `src/lib/sihirbaz/eylemler.ts` — Local API üzerinden taslak oluşturan
  sunucu eylemi
- `src/components/sihirbaz/` — 5 adımlı sihirbaz, canlı EİDS paneli,
  gösterge önizlemesi, admin temasına uyan CSS
- Payload admin görünümü: `/admin/portfoy-sihirbazi` + yan menü bağlantısı
- 29 test (20 birim + 9 entegrasyon); süit 464 → 493

### Kararlar ve gerekçeleri

**Sihirbaz admin'in YANINDA duruyor, yerine geçmiyor** (Aslıhan'ın kararı).
Payload'ın özel görünüm (custom view) mekanizması kullanıldı: oturum
yönetimi Payload'ın kalıyor, ikinci bir kimlik doğrulama yolu açılmıyor ve
kullanıcı admin'den çıkmıyor.

**Sihirbazın varlık sebebi "admin çirkin" değil.** Üç somut sorunu çözüyor:
1. *Sıra belirsizliği* — admin'de 6 sekme var, hangisinden başlanacağı belli
   değil.
2. *EİDS geri bildirimi geç geliyor* — admin'de eksik EİDS ancak "Yayında"
   denemesinde, yani tüm veri girildikten sonra hata olarak çıkıyor. Sihirbaz
   **her tuşta** değerlendiriyor.
3. *Göstergeler kaydetmeden görünmüyor* — kira çarpanı ve brüt getiri admin'de
   kayıt sonrası hesaplanıyor; yanlış girilen fiyat bir kayıt döngüsü sonra
   fark ediliyor.

**Kayıt DAİMA taslak; `durum` alanı şemada YOK.** İstemci gövdeye
`durum: 'yayinda'` eklese bile o değer şemadan geçemiyor. Yayına alma, EİDS
kapısının bulunduğu admin'de bilinçli bir eylem olarak kalıyor. Sihirbaza
yayınlama yetkisi vermek, o kapının ikinci bir kopyasını doğururdu ve iki
kopyanın er ya da geç ayrışması demekti (CLAUDE.md kural 1).

**Yazma yolu `overrideAccess: false`.** Kancalar (`ilanGostergeleri`,
`eidsYayinEngeli`) ve `access.create` aynen çalışıyor. Sihirbaz bir kestirme
değil, aynı kapıdan geçen daha rahat bir yol.

**EİDS paneli bir KAPI değil, AYNA.** Gerçek kapı sunucudaki hook. Panel
aynı motoru (`eidsDegerlendir`) kullanıyor — kendi kural kopyasını taşısaydı
gösterilenle uygulanan zamanla ayrışırdı. Panel hiçbir zaman "yayınlayın"
düğmesi göstermiyor.

**EİDS alanları taslak için zorunlu değil.** "Yetkiyi henüz almadım, önce
taşınmazı sisteme gireyim" tamamen meşru bir akış; zorunlu kılmak onu
imkânsızlaştırırdı. Bu gevşeklik yayın kapısını gevşetmiyor — entegrasyon
testi bunu ayrıca kanıtlıyor.

**Alan bileşenleri site tarafından yeniden KULLANILMADI.** Sitedeki
`hesaplayici/Alanlar.tsx` Tailwind ile sitenin tasarım sistemine bağlı;
sihirbaz admin'in içinde çalışıyor ve admin temasını (koyu/açık tema, renk
değişkenleri) miras almalı. Site paletini admin'e taşımak, iki tasarım
sisteminin ortasında kalan yamalı bir ekran üretirdi.

**Yan menü bağlantısı sunucu bileşeni.** İstemci bileşeni olsaydı
`useConfig` için `@payloadcms/ui` doğrudan bağımlılık olacaktı — tek bir menü
bağlantısı uğruna admin arayüz kütüphanesini bağımlılık listesine almak
taşınacak yükün karşılığını vermez. Bedeli: bağlantıda "etkin sayfa" vurgusu
yok. Beş öğelik bir menüde bu kayıp, bir paket bağımlılığından ucuz.

### ⚠️ Duman testinde bulunan ve kapatılan açık

Derleme sonrası gerçek sunucuya karşı yapılan duman testinde şu bulundu:

**Payload, oturumu olmayan ziyaretçiye giriş ekranını gösteriyor ama görünüm
bileşeninin gövdesi yine de ÇALIŞIYOR.** Sonuç: mahalle listesi sorgusu
oturumsuz istekte de koşuyor ve mahalle adları sunucu bileşeni yükünde
dışarı sızıyordu.

İki katmanlı bir sorundu:
1. Görünüm oturumsuz da çalışıyordu.
2. Local API'de `overrideAccess` varsayılanı **`true`**; yani sorgu erişim
   kurallarını atlıyor ve **yayında olmayan** mahalleleri de döndürüyordu.

Kapatılışı: görünümün başına `if (!req.user) return null` kapısı ve sorguya
açık `overrideAccess: false` + `user`. İkisi de doğrulandı — oturumsuz
yanıtta artık ne mahalle adı ne görünüm gövdesi var, oturumlu akış aynen
çalışıyor.

Sızan verinin (mahalle adları) zaten büyük ölçüde herkese açık olması bu
açığı önemsiz kılmıyordu: görünüme ileride portföy veya müşteri verisi
eklendiğinde aynı sızıntı sessizce ciddileşirdi.

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

## A aşaması — Tasarım sistemi (onaylanan palet)

Aslıhan renk paletini, tipografi ölçeğini ve bileşen davranışlarını yazılı
olarak onayladı. Bu aşama o kararları **tek gerçek kaynağa** taşıdı ve
uyulup uyulmadığını testle bağladı.

### Ne yapıldı

- `src/app/(site)/globals.css` yeniden yazıldı — onaylanan lacivert (11
  basamak), bakır (7 basamak) ve sıcak nötr rampaları, anlamsal jetonlar,
  tipografi ölçeği (34/22/19/16/14/13/12/11), köşe yarıçapları, 0,5px
  kenarlık, geçiş süreleri.
- `src/lib/tasarim/kontrast.ts` — WCAG kontrast hesabı ve globals.css
  jeton çözümleyicisi.
- `src/lib/tasarim/kontrast.test.ts` — **33 renk kombinasyonu × 2 tema**
  gerçek CSS dosyasına karşı AA'ya göre ölçülüyor. Ayrıca onaylanan
  rampaların birebir korunduğu doğrulanıyor.
- `src/lib/tasarim/disiplin.test.ts` — ham hex, 600/700 font ağırlığı ve
  bakır kuralı kod seviyesinde denetleniyor.
- Bileşenler: `Buton` (5 görünüm + sebepli pasif), `Rozet` (+ doğrulanmış
  ilan / yayınlanmayan / yetki süresi), `IstatistikKarti` (gözlem sayısı
  **zorunlu**), `KilitliKart` (çapraz çizgili doku), `GuvenDuzeyi`,
  `BosDurum` (ne yok / neden / ne zaman / eylem), `Iskelet`.
- `/stil-rehberi` — yalnızca geliştirme ortamında açık, üretimde 404,
  robots.txt'te kapalı.

### Kararlar ve gerekçeleri

**Renk iki katmanlı: rampalar + anlamsal jetonlar.**
`lacivert-600` her yerde aynı renktir ve temayla değişmez; `--color-vurgu`
ise role işaret eder ve koyu temada rampanın başka bir basamağına bağlanır.
Tek katmanlı bir sistemde koyu tema için ya rampanın anlamı bozulur ya da
her bileşende koşullu sınıf yazılır.

**Eski jeton adları korundu, değerleri değiştirildi.**
Tailwind bilinmeyen bir yardımcı sınıfı sessizce üretmez — `bg-kagit`'i bir
çırpıda silmek, hiçbir derleme hatası vermeden ~40 bileşenin rengini
düşürürdü. Eski adlar onaylanan palete bağlandı: site bugünden doğru
renkleri kullanıyor, çağrı yerleri E aşamasında taşınacak.

**Pirinç aksan kaldırıldı, yerine bakır GELMEDİ.**
Eski `pirinc` jetonu veri vurgusu olarak 18 yerde geçiyordu. Bakıra
bağlansaydı yeni kural daha doğmadan ihlal edilmiş olurdu. Lacivert
vurguya bağlandı; bakır boş kaldı ve iki eyleme ayrıldı.

**Bakır kuralı testle bağlandı.**
`bg-bakir-400…700` yalnızca `Buton.tsx` ve stil rehberinde geçebilir;
`gorunum="bakir"` çağrıları en fazla 4 olabilir. Kural nadirlik üzerine
kurulu olduğu için kademeli uygulanamaz — bugünden tüm koda uygulanıyor.
Açık bakır tintler (100/200) kuralın dışında: onlar eylem değil DURUM
boyar ("yetki N gün sonra bitiyor").

**Şartnamede olmayan `lacivert` buton görünümü eklendi.**
Şartnamedeki hiyerarşi uygulanınca form içindeki "Gönder" ile "Vazgeç"
görsel olarak eşitleniyordu. Bakırı üçüncü bir eyleme açmak yerine markanın
kendi rengi kullanıldı: bakır nadir kaldı, gönderim butonu tıklanabilir
göründü.

**Pasif buton `disabled` değil `aria-disabled` kullanıyor.**
`disabled` butonu sekme sırasından çıkarır; klavye ya da ekran okuyucu
kullanan biri butona hiç ulaşamadığı için SEBEBİNİ de duymaz. Bu projede
en sık görülecek pasiflik sebebi "EİDS yetkisi eksik" olacak ve tam olarak
orada susmak kabul edilemezdi.

**`IstatistikKarti.gozlemSayisi` tip düzeyinde zorunlu.**
İsteğe bağlı olsaydı unutulurdu. Gerçekten bilinmiyorsa `null` geçilir ve
kart "Gözlem sayısı bilinmiyor" yazar — gizlemek seçenek değil.

**Kilitli kartta doku, bulanık fotoğraf değil.**
İki gerekçe: (1) bulanıklık "saklıyoruz" der ve ucuz durur, doku "bu bilgi
henüz size ait değil" der; (2) bulanık görsel yine de indirilir, CSS
filtresi kaldırılınca ortaya çıkar. Doku hiçbir görsel isteği yapmaz.

### ⚠️ Onaylanan değerlerden sapılan üç nokta

Üçü de erişilebilirlik zorunluluğundan; hiçbiri estetik tercih değil.

| Konu | Onaylanan | Sorun | Yapılan |
| --- | --- | --- | --- |
| Uyarı rengi | `#A87A1E` | Beyaz üzerinde **3,87:1** — ikon için yeterli, metin için değil | `--color-uyari` (ikon/kenarlık) ve `--color-uyari-metin` `#7A5714` (6,56:1) ayrıldı |
| Nötr ramp | 400 ve 500 var, 600 yok | Yardımcı metin notr-500 ile tint yüzeyde **3,93:1**'e düşüyordu — ve yardımcı metin çoğunlukla tam orada duruyor | `--color-notr-600: #5F5C55` eklendi (her iki yüzeyde 5,7:1+) |
| Form kenarlığı | "0,5px, nötr-200" | notr-200 beyaz üzerinde **1,3:1**; WCAG 1.4.11 bileşen sınırı için 3:1 ister | Dekoratif kart çerçevesi notr-200 kaldı; form denetimleri için `--color-kenar-giris` (notr-500, 4,6:1) |

Ayrıca koyu temada ilerleme çubuğu dolgusu, tint kanalından **1,83:1** ile
ayrışıyordu — yani görünmüyordu. Kontrast testi yakaladı; `--color-gosterge`
ayrı bir jeton olarak açıldı.

**Koyu tema değerleri onaylanan listede yoktu.** Mevcut sitede koyu tema
vardı, sessizce kaldırmak gerileme olurdu; onaylanan paletten türetildi ve
aynı kontrast testinden geçiriliyor. Onaya sunuldu (SENDEN-BEKLENENLER
md. 7).

### A aşaması ölçümleri (yerel)

| Ölçüm | Değer | Not |
| --- | --- | --- |
| `pnpm typecheck` · `lint` | temiz | — |
| `pnpm test` | **605 test / 25 dosya** | A öncesi 493 |
| Derleme (Turbopack) | **79 sn** | 150 sn eşiğinin altında, A öncesiyle aynı |
| `/` JS (gzip) | **198,5 kB** | A öncesi 198 kB — değişmedi |
| `/` CSS (gzip) | **10,1 kB** | — |
| TTFB `/` · `/portfoy` · `/degerleme` | 72 · 48 · 54 ms | üretim derlemesi, demo veri |
| `/stil-rehberi` (üretim) | **404** | doğrulandı |

Tasarım sistemi performans bütçesine dokunmadı: yeni bileşenler sunucu
bileşeni, yeni renkler CSS değişkeni, yeni ikonlar elle yazılmış SVG.

---

## B aşaması — 3B harita sayfası

`/harita` tam ekran bir gösteri parçasına dönüştürüldü: mahalle merkezlerinde
seçili veri kipine göre yükselen sütunlar, üstte kontrol şeridi, iki dar yan
panel, sol altta gösterge.

### Ne yapıldı

- `src/lib/harita/sutunlar.ts` — sütun geometrisi ve ölçekleme (saf, test
  edilebilir). 20 birim testi.
- `src/lib/harita/jetonlar.ts` — harita renklerini `getComputedStyle` ile
  tasarım jetonlarından okur.
- `src/components/harita/Harita3B.tsx` — MapLibre `fill-extrusion` sütunlar,
  kâğıt tonuna çevrilmiş taban harita, katman görünürlüğü, 2B/3B geçişi,
  seçim vurgusu, Türkçeleştirilmiş MapLibre arayüzü.
- `src/components/harita/HaritaSahnesi.tsx` — tam ekran düzen, kontrol
  şeridi, katman paneli (132px), mahalle detay paneli (186px), gösterge,
  mobil alt sayfalar, metin listesi.
- Eski `Harita.tsx` ve `HaritaBolumu.tsx` **silindi** — yeni sayfadan sonra
  hiçbir yerden çağrılmıyorlardı ve ham hex kullanıyorlardı. İki harita
  uygulamasını yan yana tutmak, ikisinin ayrışması demekti.

### Kararlar ve gerekçeleri

**deck.gl değil, MapLibre `fill-extrusion`.**
Şartname ikisine de izin veriyordu. deck.gl `ColumnLayer` daha zengin ama
~130 kB gzip daha getiriyor ve kendi render döngüsünü MapLibre'ninkiyle
senkronlamak gerekiyor. `fill-extrusion` zaten MapLibre'nin içinde: ek bayt
yok, kamera ve ışıklandırma haritanınkiyle aynı. Sunucu 3,2 GB RAM / 2 vCPU.

**Sütunlar tek renk, ölçek sıfırdan başlıyor.**
Fiyatı hem yükseklikle hem renkle kodlamak haritayı rengarenk yapardı.
Ayrıca ölçeğin alt sınırı en küçük değere çekilmiyor: 42.000 ile 44.000
arası fark küçük görünüyor, çünkü küçük. Eksen kırpma bir yatırım
sitesinde doğrudan yanıltmadır — test bunu koruyor.

**Harita renkleri CSS jetonundan okunuyor.**
MapLibre CSS değişkeni anlamaz; ilk sürümde bu, elle yazılmış `#3b5a8a`
gibi renklere yol açmıştı. `getComputedStyle` ile jetonu çalışma zamanında
okumak üç şeyi birden çözdü: tek gerçek kaynak korunuyor, harita koyu
temaya kendiliğinden uyuyor, palet değişince harita da değişiyor.

**Taban harita katman ADINA değil TÜRÜNE göre soluklaştırılıyor.**
Satıcı stilinin katman adlarına bağlanmak, MapTiler stili güncellendiğinde
sessizce kırılırdı. Katman türüne ve genel ad kalıplarına bakılıyor; hiçbir
şey eşleşmezse satıcı stili olduğu gibi kalıyor — harita şartnamedeki kadar
sade olmaz ama çalışır.

**Açılışta yalnızca iki katman açık.**
Fiyat sütunları ve mahalle sınırları. Binalar, okul/sağlık, sanayi,
portföy ve projeler kapalı. Emlak haritalarının tipik hatası her şeyi açık
başlatmak; harita nokta bulutuna dönüyor. Binalar ayrıca mobilde kare
düşürüyor ve trafiğin ~%75'i mobil.

**Verisi olmayan katman gizlenmiyor, pasif gösteriliyor.**
Gizlemek "böyle bir katman yok" der; pasif göstermek "var ama verisi
girilmedi" der. "Projeler" katmanı bugün sıfır öğeyle, sebebi yazılı
duruyor.

**Kaydırma tek başına yakınlaştırmıyor (`cooperativeGestures`).**
Tam ekran haritada `scrollZoom`u tümden kapatmak yakınlaştırmayı düğmelere
hapsederdi; açık bırakmak sayfayı kaydırmak isteyeni haritanın içinde
tutardı. Ctrl/⌘ ile kaydırma ikisini de çözüyor.

**MapLibre arayüzü Türkçeleştirildi.**
Kütüphane varsayılan olarak İngilizce konuşuyor. "Zoom in" yazan bir düğme,
çevirisi unutulmuş bir arayüzün en görünür işareti.

### ⚠️ Duman testinde bulunan ve kapatılan açık

İlk sürümde merkez koordinatı girilmemiş mahalleler veri kümesinden tümden
düşürülüyordu. Demo veride hiçbir mahallenin `merkez` alanı dolu olmadığı
için sayfa **komple boş duruma** düşüyordu: kontrol şeridi, katman paneli,
mahalle listesi ve gösterge hiç görünmüyordu.

Hata, iki farklı eksikliği tek şeymiş gibi ele almaktı:

| Eksik olan | Doğru davranış |
| --- | --- |
| Merkez koordinatı | Sütun çizilmez, mahalle listede ve panelde **kalır** |
| Seçili kipteki değer | Sütun çizilmez, sınır **kesikli** çizilir |

İkisi artık ayrı ayrı izleniyor ve gösterge her ikisini de sayıyla
bildiriyor ("3 mahallenin merkez koordinatı girilmedi; haritada yer almıyor
ama listede duruyor").

### B aşaması ölçümleri (yerel, üretim derlemesi)

| Ölçüm | Değer | Not |
| --- | --- | --- |
| `pnpm test` | **625 test / 26 dosya** | A sonu 605 |
| Derleme | **80 sn** | 150 sn eşiğinin altında |
| `/` JS (gzip) | **198,6 kB** | **değişmedi** — maplibre ana pakete girmedi |
| `/harita` JS (gzip) | 441,1 kB | 242,7 kB'ı maplibre, `async` etiketiyle |
| `/harita` CSS (gzip) | 20,4 kB | 10 kB'ı maplibre-gl.css |
| TTFB `/` · `/harita` | 46 · 88 ms | demo veri |

**maplibre `async` yükleniyor ve ilk boyamayı engellemiyor.** Sunucu,
kontrol şeridini ve iskeleti HTML'de gönderiyor; LCP adayı bu, harita
tuvali değil. Yine de `/harita` sitenin en ağır rotası ve bu, gerçek bir
harita isteğinin doğal bedeli — alternatif özelliği tümden çıkarmak olurdu.

⚠️ Lighthouse yerelde ölçülemiyor (sunucuda Chrome yok); CI iş akışında
raporlanıyor. Gerçek MapTiler verisiyle `/harita` için ayrıca ölçülmeli.

## C aşaması — Portföy listeleme (tema sıraları)

`/portfoy` sayfasının filtresiz görünümü, ölçüte göre gruplanmış yatay
kaydırmalı sıralara dönüştürüldü.

### Ne yapıldı

- `src/lib/portfoy/bolumler.ts` — ölçüt tanımları ve uygulaması (saf,
  testli). 21 birim testi.
- `src/globals/PortfoyBolumleri.ts` — CMS'ten yönetilen sıra düzeni;
  migration `20260806_093100_portfoy_bolumleri`.
- `src/lib/veri/portfoy.ts` — sıraların kurulumu, tekrar ayıklama,
  kilitli kartların araya karıştırılması.
- `src/components/ilan/YataySira.tsx` — kaydırmalı sıra: ok düğmeleri,
  ilerleme çubuğu, klavye ile ok tuşu desteği, `ResizeObserver`.
- `src/components/ilan/IlanKarti.tsx` — şartnameye göre yeniden yazıldı.
- `/portfoy` — filtresiz görünüm tema sıraları, süzülmüş görünüm ızgara.

### Kararlar ve gerekçeleri

**Ölçüt kodda, metin CMS'te.**
Yatırım skorunda ve mahalle eşleştirmede uygulanan ayrımın aynısı. Bir
sıranın hangi ilanları seçtiği metodolojidir ve denetlenebilir olması için
kodda durur; başlık, alt başlık, adet ve düzen editoryal karardır ve
panelden yönetilir. Tersini yapmak, "hangi ilanlar öne çıkıyor?"
sorusunun cevabını bir metin kutusuna hapsederdi.

**⚠️ "İlçe ortalaması" değil "portföy ortalaması".**
Şartnamedeki örnek alt başlık "Kira çarpanı ilçe ortalamasının altında
kalan portföyümüz" idi. İlçe ortalaması piyasa verisi gerektirir; bizde
yok. Elimizdeki portföy ortalamasını ilçe ortalamasıymış gibi sunmak
doğrulanamayan bir iddia olurdu (CLAUDE.md kural 2). Alt başlık "Kira
çarpanı **portföy** ortalamasının altında kalan taşınmazlar" oldu ve bir
test bu ifadenin "ilçe" demediğini koruyor. Çorlu Konut Endeksi yayına
girdiğinde ölçüt gerçek ilçe medyanına bağlanabilir.

**Ortalama için asgari 4 gözlem.**
İki ilanın ortalaması bir "portföy ortalaması" değildir. Eşik altında sıra
gösterilmiyor ve sebebi yazılıyor — dolu görünsün diye üç ilanı "öne
çıkanlar" diye sunmak, ölçütü süse çevirirdi.

**Kart hiyerarşisi yatırımcının okuma sırasına göre.**
Fiyat (18px) → **m² fiyatı (11px)** → başlık → mahalle → nitelikler →
kapanış satırında kira çarpanı. m² fiyatı rakiplerde yok ve yatırımcının
ilk yaptığı hesap tam olarak bu; kartta olması 15 ilan tararken kafadan
bölme yapmayı bitiriyor. Kira çarpanı ise kapanış satırında, çünkü kartın
"bakılmaya değer mi?" sorusunu cevaplayan tek rakamı o.

**m² fiyatı kiralık ilanda hesaplanmıyor.**
Aylık kirayı m²'ye bölmek, satış m² fiyatıyla aynı satırda göründüğünde
yanıltıcı bir karşılaştırma üretiyordu.

**Kilitli kartlar hem kendi bölümünde hem araya karışmış.**
Şartname ikisini birden istiyordu: ayrı bir "Yayınlanmayan portföy"
bölümü VE "yayınlananların yanında durur, merak doğal oluşsun". İkisini
birlikte yapmak aynı taşınmazı iki kez göstermek anlamına geleceği için
(ve bu, tekrar yasağını ihlal edeceği için) ilk iki kilitli kayıt ilk dolu
yayın sırasına karıştırılıyor, kendi bölümü kalanlarla açılıyor.

**Tekrar ayıklama sıraların tanımlı düzenini izliyor.**
Yukarıdaki sıra ilanı "kapar". Bu yüzden CMS'teki sıra numarası sadece
görsel düzen değil, öncelik — panelde bu yazılı.

**Tema sıraları yalnızca filtresiz görünümde.**
Filtre uygulandığı anda ziyaretçi aramaya geçmiştir; "yeni eklenenler"
sırası orada sonucun önünü kapatan bir gürültü olurdu. Süzülmüş görünüm
ızgara + sayfalama olarak kaldı — arama motorunun tüm portföyü gezebilmesi
de buna bağlı.

**Ok düğmeleri uçta gizlenmiyor, pasifleşiyor.**
Kaybolan bir düğme odağın sayfada zıplamasına yol açıyor.

### C aşaması ölçümleri (yerel, üretim derlemesi)

| Ölçüm | Değer | Not |
| --- | --- | --- |
| `pnpm test` | **626 test / 26 dosya** | +21 bölüm ölçütü testi |
| Derleme | **82 sn** | eşiğin altında |
| `/portfoy` JS (gzip) | **206,3 kB** | öncesi ~205 kB — kaydırma bileşeninin maliyeti ~1 kB |
| `/portfoy` CSS (gzip) | 10,2 kB | — |
| TTFB `/portfoy` | 117 ms | dört ölçüt sorgusu tek havuzdan süzülüyor |
| Migration | `20260806_093100_portfoy_bolumleri` | yalnızca ekleme, uygulandı |

## D aşaması — Site bölümleri, danışman başvurusu, altbilgi

### Ne yapıldı

- `src/lib/siteBolumleri.ts` — sekiz bölümün tanımı, rotaları ve rota
  eşleştirmesi (saf, testli). 12 birim testi.
- `src/globals/SiteBolumleri.ts` — Ayarlar → Site Bölümleri paneli.
- `src/lib/veri/siteBolumleri.ts` — `bolumKapisi()` rota kapısı, istek
  başına tek sorgu (`cache()`).
- `/danisman-ol` — sayfa, form, sunucu eylemi, `DanismanBasvurulari`
  koleksiyonu, `DanismanOl` içerik global'i.
- `src/lib/guvenlik/` — hız sınırı ve Turnstile (18 test).
- Altbilgi dört sütuna çevrildi; `AltbilgiBaglantilari` koleksiyonu.
- Migration `20260806_094944_faz_d_site_bolumleri`.

### Kararlar ve gerekçeleri

**Bölüm listesi kodda, anahtarlar CMS'te.**
Bir bölümün hangi rotaları kapsadığı yapılandırma değil, uygulamanın
bilgisi. CMS'te olsaydı yanlış yazılan bir rota sessizce hiçbir şeyi
kapatmazdı — ve bunu kimse fark etmezdi.

**Rota eşleşmesi sınır karakteri arıyor.**
`/ticari` kapalıyken `/ticaridukkanlar` diye bir rota açılsa onun da
kapanmaması gerekiyor. Test bunu koruyor.

**Bölüm kapısı sayfanın EN BAŞINDA.**
Aşağıda çağrılsaydı veri sorguları boşuna çalışır ve kapalı bölümün
verisi RSC yüküne girebilirdi.

**Hata durumunda varsayılana düşülüyor, "hepsi kapalı"ya değil.**
Veritabanı bir an erişilemez olduğunda sitenin yarısının 404 dönmesi,
geçici bir sorunu kalıcı bir görünürlük kaybına çevirirdi.

**Danışman başvuruları Talepler'e karıştırılmadı.**
Üç somut sebep: farklı KVKK veri kategorisi ve işleme amacı, farklı
saklama süresi, ve lead skorlamasının bir iş başvurusunda anlamsız —
hatta ayrımcılık riski taşıyan — olması.

**Hız sınırı süreç içi, Redis değil.**
Sınırı bilerek yazıldı: sunucu yeniden başlarsa sayaç sıfırlanır, çok
örnekli kurulumda paylaşılmaz. Tek kapta çalışan bu proje için yeterli;
Redis istemcisi bağımlılık, bellek ve bir hata yüzeyi daha demekti.
Yatay ölçeklendiğimiz gün taşınmalı.

**Turnstile kapalı kapı çalışıyor.**
Anahtarlar tanımlıysa doğrulama zorunlu: jeton yoksa, geçersizse ya da
Cloudflare'e ulaşılamıyorsa gönderim reddedilir. "Servise ulaşamadım,
geçir" davranışı, korumayı kapatmanın en kolay yolunu (Cloudflare'i
engellemek) saldırgana hediye ederdi. Anahtar yoksa widget hiç render
edilmez ve doğrulama atlanır — Aslıhan hesabı açana kadar formun hiç
çalışmaması daha kötü olurdu.

**IP adresi saklanmıyor.**
Hız sınırı anahtarı olarak bellekte kullanılıyor, pencere dolunca
siliniyor. Veritabanına, günlüğe ya da e-postaya yazılmıyor.

**⚠️ Davet bloğunda bakır buton YOK — şartnameden bilinçli sapma.**
Şartname bu blokta bakır buton istiyordu. Bakır kuralı ise iki eylemle
sınırlı ("Evimi değerlendir", "Erişim talep et") ve kuralın gerekçesi
"nadir olduğu için işe yarıyor". Üçüncü bir yerde kullanmak ikisini
birden sıradanlaştırırdı. Blokta sayfa içi bir çapa var; form zaten
hemen aşağıda.

**Yetki belgesi satırı koşulsuz basılıyor.**
Numara CMS'te boşsa uydurulmuyor; yerine "girilmedi — yönetim panelinden
eklenmeli" uyarısı çıkıyor. Satırı gizlemek uyumsuzluğu Aslıhan'dan da
saklamak olurdu; her sayfada duran bir uyarı, eksiğin kapanmasının en
hızlı yolu.

**Resmî bağlantılar doğrulandı.**
`turkiye.gov.tr/tapu-bilgileri-sorgulama` ve `parselsorgu.tkgm.gov.tr`
HTTP 200 + sayfa başlığıyla doğrulandı. Tahmin ettiğim üçüncü bir adres
404 döndüğü için listeye ALINMADI — uydurulmuş bir resmî bağlantı,
sitenin en kolay kaybedeceği güven.

### ⚠️ Duman testinde bulunan ve kapatılan açık

Bölüm anahtarının üç etkisi tek tek denendi. İkisi çalışıyordu, biri
çalışmıyordu:

| Etki | İlk durum |
| --- | --- |
| Rota 404 döner | ✅ |
| Altbilgiden düşer | ✅ |
| Site haritasından kalkar | ❌ |

Sebep: `sitemap.ts` Next tarafından **derleme anında önceden üretiliyordu**.
Bu yalnızca bölüm anahtarını değil, derlemeden sonra eklenen her ilan ve
mahalle sayfasını da etkiliyordu — yeni içerik ancak bir sonraki
dağıtımda site haritasına giriyordu. Yani bu, D aşamasının açığa
çıkardığı ama D'den önce de var olan bir SEO hatasıydı.

`export const dynamic = 'force-dynamic'` eklendi. Maliyeti düşük: site
haritasını tarayıcı değil, arama motoru ve o da seyrek ister.

Doğrulama (üretim derlemesi, canlı sunucu):

| Bölüm | Rota | Altbilgi | Site haritası |
| --- | --- | --- | --- |
| `danisman_ol` açık | 200 | var | var |
| `danisman_ol` kapalı | 404 | yok | yok |
| `ticari` kapalı | 404 | yok | yok |
| `simulator` kapalı | 404 | — | `/araclar` listesinden de düştü |

### D aşaması ölçümleri (yerel, üretim derlemesi)

| Ölçüm | Değer |
| --- | --- |
| `pnpm test` | **635 test / 27 dosya** (+30) |
| Derleme | **85 sn** |
| Migration | `20260806_094944_faz_d_site_bolumleri` — yalnızca ekleme |

### Bu aşamadan kalan iş

- **`.env.example` düzenlenemedi**: dosya benim izin kapsamımın dışında.
  `NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI` ve `TURNSTILE_GIZLI_ANAHTAR`
  satırlarının elle eklenmesi gerekiyor (SENDEN-BEKLENENLER md. 8).
- **Yeni başvuru e-postası gönderilmiyor**: SMTP yapılandırması yok.
  Kayıt panele düşüyor, bildirim gitmiyor — mevcut talep formuyla aynı
  durum ve aynı sebep.

---

## E aşaması — Geriye dönük tasarım uyarlaması

Sitedeki tüm sayfalar A'daki tasarım diline taşındı. Çalışan mantığa
dokunulmadı; değişen yalnızca görünüm ve bileşen seçimi.

### Ne yapıldı

| İş | Sayı |
| --- | --- |
| Eski jeton → anlamsal jeton | **448** sınıf |
| Keyfi/varsayılan yazı boyutu → ölçek jetonu | **175** sınıf |
| 600/700 ağırlık → 500 | **63** sınıf |
| `rounded-yumusak` → `rounded-kart` / `rounded-buton` | **91** sınıf |
| Kalın kenarlık → 0,5px kıl payı | tüm `border` sınıfları |

- **Geçiş jetonları `globals.css`'ten SİLİNDİ.** Artık `bg-kagit`,
  `text-murekkep`, `bg-pirinc` gibi bir sınıf yazan kişi renksiz bir
  öğe elde eder — sistemin dışına çıkmanın bedeli görünür.
- **Disiplin testinin kapsamı tüm arayüze açıldı** (`components` + `app`).
  177 → 257 test.
- 4 yeni yükleme iskeleti: `/mahalleler`, `/mahalleler/[slug]`,
  `/gizli-portfoy`, `/bolge-radari`.

### Kararlar ve gerekçeleri

**`RakamKarti` silinmedi, ikiye AYRILDI.**
Plan onu `IstatistikKarti` lehine silmekti. Çağrı yerlerine bakınca ayrım
netleşti: hesaplayıcı sonuçları (kredi taksiti, tapu harcı) bir ölçüm
değil bir hesap; "kaç gözleme dayanıyor?" sorusunun orada karşılığı yok
ve zorunlu bir `n` alanı anlamsız gürültü olurdu. Mahalle rakamları ise
gerçekten gözlenmiş veri.

Sonuç: `HesapKarti` (türetilmiş rakam, `n` yok) ve `IstatistikKarti`
(gözlenmiş rakam, `n` tip düzeyinde zorunlu). Tek bileşende birleştirmek,
ya hesaplara sahte bir `n` uydurmak ya da istatistiklerde `n`i isteğe
bağlı bırakmak demekti; ikincisi zamanla "unutulan alan" olurdu.

**Mahalle sayfasındaki dört rakam `IstatistikKarti`ye taşındı.**
Gözlem sayısı artık dipnotta değil, her kartın altında.

**Bakır aksan iki eyleme bağlandı — tam olarak ikisine.**
`gorunum="bakir"` yalnızca iki yerde: ana sayfadaki "Evimi değerlendir"
ve gizli portföydeki "Erişim talep et". Kart üzerindeki "Erişim talep et"
bakır METİN (dolu zemin değil); ayrım, gözün "tıklanır" diye okuduğu
şeyin dolu zemin olması.

**Gizli portföy kendi kart çizimini bıraktı, `KilitliKart`a geçti.**
Ayrı bir kart çizmek "bunlar farklı bir şey" izlenimi verirdi; oysa aynı
portföyün paylaşılmamış kısmı. Ayrıca eski kartta bir 🔒 emojisi vardı —
emoji yasağının kapsamı dışında kalmıştı.

**`themeColor` muaf tutuldu.**
Tarayıcı meta etiketinde `var()` çözmez; değerler `zemin` jetonuyla
birebir aynı ve dosyada bu ilişki yorumda yazılı. Harita muaf DEĞİL:
orada renkler `getComputedStyle` ile çalışma zamanında jetondan okunuyor.

**Form denetimlerinin kenarlığı ayrı jeton.**
Kart çerçevesi notr-200 kaldı; metin kutuları `kenar-giris` (notr-500)
kullanıyor — WCAG 1.4.11 bileşen sınırı için 3:1 istiyor ve notr-200
beyaz üzerinde 1,3:1 veriyordu.

### Kontrol listesi

| Ölçüt | Durum | Nasıl doğrulandı |
| --- | --- | --- |
| Ham hex yok | ✅ | `disiplin.test.ts` — tüm `.tsx` taranıyor |
| Tüm rakamlarda `tabular-nums` | ✅ | gövde seviyesinde, test denetliyor |
| 600/700 ağırlık yok | ✅ | `disiplin.test.ts` |
| Bakır yalnızca iki eylemde | ✅ | `disiplin.test.ts`, üst sınır 4 |
| Boş durum tasarlandı | ✅ | `BosDurum` dört soruya cevap veriyor |
| İskelet yükleme | ✅ | 5 rota (`/portfoy` + 4 yeni) |
| Klavye ile gezinilebilir | ✅ | statik denetim: `onClick` taşıyan role'süz öğe yok, href'siz `<a>` yok, alt'sız görsel yok; global `:focus-visible` halkası; 35 dokunma hedefi ≥44px |
| Kontrast AA | ✅ | `kontrast.test.ts` — 34 kombinasyon × 2 tema |
| **Mobilde manuel kontrol** | ⚠️ **YAPILAMADI** | Sunucuda tarayıcı yok. Aşağıya bakın. |

### ⚠️ Mobil manuel kontrol yapılamadı

Kontrol listesindeki dokuz maddeden sekizi otomatik doğrulandı. Dokuzuncu
— "mobilde manuel kontrol edildi" — bu ortamda **yapılamaz**: sunucuda
tarayıcı yok, dolayısıyla gerçek bir cihazda dokunma, kaydırma ve okuma
denemesi mümkün değil.

Yerine yapılanlar: mobil öncelikli sınıflar, dokunma hedeflerinin kod
düzeyinde ≥44px olması, yatay sıranın `ResizeObserver` ile ölçülmesi,
harita panellerinin alt sayfaya dönmesi. Bunlar mobilde çalışacağını
**gösterir, kanıtlamaz.**

Bunu kapatmanın yolu Aslıhan'ın telefonundan bakması ya da CI'a görsel
regresyon testi eklenmesi. SENDEN-BEKLENENLER md. 7'ye eklendi.

### E aşaması ölçümleri (yerel, üretim derlemesi)

| Ölçüm | Değer | Not |
| --- | --- | --- |
| `pnpm test` | **829 test / 29 dosya** | A öncesi 493 |
| Derleme | **91 sn** | 150 sn eşiğinin altında; artış kapsam büyümesi |
| `/` JS (gzip) | **198,7 kB** | A öncesi 198 kB — uyarlama bütçeye dokunmadı |
| `/portfoy` JS (gzip) | 206,4 kB | — |
| `/harita` JS (gzip) | 441,4 kB | 242,7 kB maplibre, `async` |
| CSS (gzip) | 10,3 kB | jeton sayısı arttı, boyut sabit kaldı |
| TTFB (12 rota) | 21–108 ms | hepsi 200 |

---

## Bakım cron kurulumu

`BAKIM_ANAHTARI` sunucudaki `.env`'e eklendi; cron tarafı tamamlandı.

### Ne yapıldı

- `src/lib/bakim/gorevler.ts` — görev kaydı (`GOREV_KAYDI`): her görevin
  anahtarı, sıklığı, **başarısızlık sonucu** ve yasal bayrağı. 7 birim testi.
- `/api/bakim?gorev=…` — görevler tek tek çağrılabiliyor.
- `scripts/bakim.sh` — cron çağırıcısı; anahtarı `.env`'den okur, anlamlı
  çıkış kodu döner.
- `docs/ISLETME-REHBERI.md §6` baştan yazıldı: görev tablosu, cron dosyası,
  nöbetçi satırı, doğrulama adımları, arıza tablosu.

### ⚠️ Belgedeki cron satırı ÇALIŞMIYORDU

Önceki §6 şu satırı öneriyordu:

```cron
0 4 * * * deploy curl -H "Authorization: Bearer ${BAKIM_ANAHTARI}" https://…
```

`/etc/cron.d` dosyaları uygulamanın `.env`'ini okumaz. `${BAKIM_ANAHTARI}`
boş genişler, uç 401 döner ve **hiçbir bakım görevi hiç çalışmaz.** Üstelik
sessizce: `curl -fsS` çıktısını bir günlüğe yazıyordu, o günlüğü de kimse
okumuyordu.

Anahtarı cron dosyasının içine yazmak alternatif değildi — `/etc/cron.d`
altındaki dosyalar herkes tarafından okunabilir. Çözüm `scripts/bakim.sh`:
anahtarı `750` izinli bir betik `.env`'den okuyor.

### Kararlar ve gerekçeleri

**Üç ayrı cron satırı, tek çağrı değil — arıza yalıtımı.**
KVKK silme görevi bozulsaydı uç her gece hata döner, cron her gece uyarı
üretirdi. İşletmecinin en olası tepkisi cron satırını susturmaktır — ve
yasal riski olan EİDS kontrolü onunla birlikte susardı. Ayrı satırlar
bunu imkânsız kılıyor.

**`CRON_TZ=Europe/Istanbul` zorunlu.**
Sunucu UTC ise "03:10" saat 06:10 İstanbul demektir. Uygulamanın tarih
mantığı zaten Europe/Istanbul'a sabitli (`src/lib/tarih.ts`); kayan tek
şey cron'un saatiydi.

**Betik `curl -f` kullanmıyor.**
`-f` yanıt gövdesini atar; hangi görevin neden başarısız olduğunu söyleyen
JSON kaybolur. Durum kodu ayrıca okunuyor.

**"Çalışmazsa ne olur" metni koda taşındı.**
`GOREV_KAYDI` içindeki `calismazsaSonuc` alanı zorunlu ve bir test
uzunluğunu denetliyor. Belgeye kopyalanan bir cümle güncellenmeyi
unutturur; kaynağı kodda olan cümle, görevi değiştiren kişiyi sonucunu da
güncellemeye zorlar.

**Nöbetçi cron satırı eklendi.**
Sessiz aksama bu işin en tehlikeli hali. Her sabah 09:00'da günlükte o
güne ait `TAMAM (eids-kaldir)` satırı aranıyor; yoksa günlüğe `UYARI`
yazılıyor. Dört senaryoda denendi: bugünkü satır var / yalnızca dünkü var
/ hata satırı var ama TAMAM yok / başka görevin TAMAM'ı var.

### Doğrulama (üretim derlemesi, canlı sunucu)

| Senaryo | Sonuç |
| --- | --- |
| Anahtarsız istek | 401 |
| Yanlış anahtar | 401 |
| Geçersiz görev adı | 400 + geçerli görev listesi |
| `?gorev=eids-kaldir` · `eids-uyar` · `kvkk-sil` | 200, tek tek |
| Tüm görevler | 200 |
| `bakim.sh` başarı | çıkış 0 |
| `bakim.sh` yanlış anahtar | çıkış 1 + açıklama |
| `bakim.sh` anahtar boş | çıkış 1 + "hiçbir görev çalışmaz" uyarısı |
| `bakim.sh` uca ulaşılamıyor | çıkış 3 |
| `bakim.sh` geçersiz görev | çıkış 2 |

⚠️ **Denenemeyen tek yol:** `BAKIM_ANAHTARI` sunucuda hiç tanımlı değilken
ucun 404 dönmesi. `.env` artık anahtarı içerdiği için Next onu her koşulda
okuyor ve kabuktan `env -u` ile gizlemek işe yaramıyor. Bu, kodda üç
satırlık bir dal (`if (!anahtar) return 404`) ve `.env`'den okumanın
çalıştığı bu koşuda zaten kanıtlandı.

---

## 8443 yayını, Cloudflare origin sertifikası ve gerçek ziyaretçi IP'si

80/443 portları sunucuda başka bir uygulamada. Yayın 8443'e taşındı, TLS
Cloudflare origin sertifikasıyla sağlanıyor, Let's Encrypt kaldırıldı.

### Ne yapıldı

- `docker/Caddyfile` — `auto_https off`, açık `tls` yolu, 8443 site bloğu,
  `trusted_proxies` + `client_ip_headers`, `header_up` ile IP aktarımı.
  HSTS kaldırıldı.
- `docker/compose.prod.yml` — caddy yalnızca `8443:8443`; `./certs` salt
  okunur bağlandı; `CADDY_EPOSTA` kaldırıldı.
- `src/lib/guvenlik/hizSiniri.ts` — istemci IP çözümlemesi yeniden yazıldı.
- `docs/ISLETME-REHBERI.md` §5.4–5.6 — güvenlik duvarı, TLS, gerçek IP.

### ⚠️ Üç gerçek hata bulundu ve kapatıldı

**1. Hız sınırı atlatılabiliyordu (güvenlik).**

Eski kod `x-forwarded-for` başlığının ilk değerini okuyordu. Caddy o
başlığa gelen değeri KORUR ve sonuna kendi gördüğünü ekler. Yani
`X-Forwarded-For: 1.2.3.4` gönderen biri için başlık `1.2.3.4, <gerçek>`
olur ve ilk sırayı okumak, saldırganın kendi sayaç anahtarını seçmesi
demekti — her istekte farklı bir değerle sınır tek istekte atlatılıyordu.

Artık yalnızca `CF-Connecting-IP` ve `X-Real-IP` okunuyor; ikisini de
Caddy `{client_ip}` ile ÜZERİNE YAZIYOR, dolayısıyla istemciden gelen
değer uygulamaya ulaşmıyor.

**2. IPv6 aralıkları `trusted_proxies` listesinde yoktu (erişilebilirlik).**

Cloudflare origin'e IPv6 üzerinden bağlanırsa ve aralık listede yoksa
CF-Connecting-IP'ye güvenilmez; tüm ziyaretçiler aynı Cloudflare adresine
düşer ve form beşinci gönderimden sonra herkese kapanır. Yedi IPv6 aralığı
eklendi.

**3. Genel adres çalışma zamanında okunmuyordu (SEO).**

`NEXT_PUBLIC_*` değişkenleri Next.js tarafından derleme anında koda
gömülüyor — sunucu tarafında bile. `compose.prod.yml` içindeki
`NEXT_PUBLIC_SITE_ADRESI` bu yüzden HİÇ okunmuyordu; üretim imajı
geliştirme `.env`'iyle derlendiği için site haritası ve kanonik adresler
`http://localhost:3000` diyordu.

Duman testinde yakalandı: `NEXT_PUBLIC_SERVER_URL` verilerek başlatılan
üretim derlemesi hâlâ `localhost:3000` üretiyordu. Derlenmiş chunk
içinde değerin gömülü olduğu doğrulandı.

Çözüm ön eksiz `SITE_ADRESI` değişkeni (gömülmez, çalışma zamanında
okunur); compose onu `NEXT_PUBLIC_SERVER_URL`'den kopyalıyor, `.env` tek
satır kalıyor. `robots.ts` ayrıca `force-dynamic` yapıldı — statik üretilen
bir rota değeri derleme anında dondurur.

### Kararlar ve gerekçeleri

**`auto_https off` — yalnızca sertifika değil, :80 sunucusu da kapanıyor.**
80 portu başka uygulamada; Caddy oraya yönlendirme sunucusu açmaya
çalışırsa başlangıçta hata verir.

**HSTS Caddy'den çıkarıldı.** Cloudflare gönderiyor; iki kaynaktan gelen
`Strict-Transport-Security` çakışır ve HSTS geri alınamaz bir mekanizma —
belirsizlik kabul edilemez.

**IP belirlenemezse hız sınırı UYGULANMIYOR.** Eski kod bu durumda
`bilinmeyen` sabitine düşüyordu: vekil yapılandırmasındaki bir hata,
doğrudan bir hizmet kesintisine dönüşürdü. Açık kapı burada daha az kötü —
bal küpü ve Turnstile katmanları IP'ye bağlı değil. Durum üretimde
olursa sunucu günlüğüne yazılıyor.

**`uygulama` servisi 127.0.0.1:3000'e bağlandı.** Bakım cron'u host
üzerinde çalışıyor ve `/api/bakim`'a ulaşması gerekiyor; Caddy üzerinden
gitmek işe yaramaz, çünkü güvenlik duvarı kuralı Cloudflare dışındaki
kaynakları — sunucunun kendisi dahil — 8443'te reddediyor.
**Bu, bir önceki iş paketinde benim bıraktığım hataydı:** `bakim.sh`
127.0.0.1:3000'e gidiyordu ama o port hiç yayınlanmıyordu. Yerel
`pnpm start`'a karşı test ettiğim için fark edilmemişti.

**8443 için güvenlik duvarı kuralı belgelendi.** Docker UFW'yi atlıyor;
`ufw deny 8443` işe yaramaz. Doğru yer `DOCKER-USER` zinciri — origin
IP'sini bulan birinin Cloudflare'i (WAF, bot koruması, hız sınırı) atlaması
engellenmeli.

### Doğrulama

**Caddy yapılandırması** — `caddy validate`: *Valid configuration*.
`caddy fmt` temiz.

**Gerçek IP zinciri** — gerçek `docker/Caddyfile`, sahte üst sunucuyla,
yerel Caddy 2.10 üzerinde:

| Senaryo | Uygulamanın gördüğü |
| --- | --- |
| Güvenilen vekil, `CF-Connecting-IP: 203.0.113.7` | **203.0.113.7** ✓ |
| Güvenilmeyen kaynak, sahte `CF-Connecting-IP: 1.2.3.4` | **127.0.0.1** — sahte değer üzerine yazıldı ✓ |
| Güvenilmeyen kaynak, sahte `X-Forwarded-For: 9.9.9.9` | **127.0.0.1** — yok sayıldı ✓ |

**Adresler** — `SITE_ADRESI` ile başlatılan üretim derlemesi:
kanonik `https://aslihangyd.com:8443/portfoy`, og:url, site haritası ve
robots.txt `Host`/`Sitemap` satırları hepsi portlu.

**Kapı** — typecheck · lint temiz, **842 test**, derleme 107 sn.

---

## 1. aşama — Acil hatalar

### 1.2 `/portfoy` performansı — N+1 HİPOTEZİ YANLIŞ ÇIKTI

Sorgu sayısı PostgreSQL sunucu günlüğünden sayıldı (`log_statement=all`).

⚠️ İlk sayım yöntemim hatalıydı: yalnızca `statement:` satırlarını arıyordum
ve **0 sorgu** görünüyordu. Payload parametreli sorgu kullanıyor; PostgreSQL
bunları genişletilmiş protokolde `execute` satırı olarak yazıyor.

| İlan sayısı | `/portfoy` sorgu | Ortanca süre |
| --- | --- | --- |
| 6 | **15** | 0,84 sn (geliştirme) |
| 50 | **16** | 0,28 sn |
| 200 | **16** | 0,25 sn |

**Sorgu sayısı sabit — N+1 yok.** Payload'ın postgres adaptörü ilişkileri
ayrı sorgularla değil birleştirmelerle çözüyor.

### Yine de gerçek bir israf vardı

`/portfoy` her istekte **200 ilanı `depth: 1` ile** çekip bunların ~32'sini
gösteriyordu. `depth: 1`, 200 kaydın her biri için mahalle, görsel ve
danışman ilişkilerini çözüyordu.

İki aşamalı yapıya geçildi:

1. Ölçütlerin ihtiyacı olan **dört alan**, `depth: 0` ile 200 kayıt için
   (ölçütler yalnızca kategori, kira çarpanı ve tarihe bakıyor).
2. Yalnızca **seçilen ~32 kayıt** için tam belge, `depth: 1` ile, tek
   `in` sorgusuyla.

200 ilanla 8 istek, üretim derlemesi:

| | En hızlı | Ortanca | En yavaş |
| --- | --- | --- | --- |
| Önce (tek aşamalı) | 0,156 sn | 0,254 sn | **0,707 sn** |
| Sonra (iki aşamalı) | 0,169 sn | **0,214 sn** | **0,354 sn** |

⚠️ **Kazanç mütevazı, abartmıyorum.** Ortanca %16 iyileşti; asıl fark uç
gecikmede (%50) ve tutarlılıkta. İlk tek örnekte gördüğüm 1,48 sn soğuk
başlangıç sapmasıydı — sekiz örnekli ölçüm onu düzeltti.

Asıl gerekçe yapısal: ağır sorgu artık **gösterilen kart sayısıyla**
sınırlı, portföy büyüklüğüyle değil. 200'de fark küçük, 2000'de büyük olur.

### Geliştirmedeki 1–13 saniye — yeniden üretilemedi

Çalışan geliştirme sunucusunda ölçtüm:

| Rota | 1. istek | 2. istek | 3. istek |
| --- | --- | --- | --- |
| `/portfoy` | 0,83 sn | 0,82 sn | 0,67 sn |
| `/mahalleler` | 0,19 sn | 0,24 sn | — |
| `/` | 0,28 sn | 0,36 sn | — |

Bildirilen 1–13 sn **yeniden üretilemedi**; muhtemelen Turbopack'in ilk
derleme davranışıydı. Ama bildirilen asıl belirti doğrulandı: `/portfoy`
tekrar isteklerde hızlanmıyor ve diğer rotalardan ~4 kat yavaş kalıyor.
İki aşamalı yapı bunu da hafifletiyor.

### 1.1 `allowedDevOrigins`

Sabit IP koddan çıkarıldı, `DEV_IZINLI_KAYNAKLAR` ortam değişkenine
taşındı. Liste boşken geliştirmede terminale uyarı basılıyor — sessiz
başarısızlık (sunucu 200, sayfa beyaz) teşhisi en zor arıza türü.

⚠️ **Düzenlemem ilk denemede sessizce uygulanmamıştı**: özgün satırın
sonunda sekme karakteri vardı, eşleşme tutmadı ve `typecheck`/`lint`
temiz döndüğü için fark edilmedi. Dosyayı okuyarak doğruladım.

### 1.3 DEMO verisi

- Seed koruması **kara listeden beyaz listeye** çevrildi. Önceki sürüm
  yalnızca `NODE_ENV === 'production'` ise duruyordu; `NODE_ENV` tanımsızsa
  — kabuktan elle çalıştırırken en yaygın durum — çalışıyordu.
- `scripts/demo-denetimi.ts` eklendi: hedef veritabanında `[DEMO]` / `[YUK]`
  önekli kayıt varsa 1 ile çıkar. Yük veritabanına karşı denendi, 204 kayıt
  buldu ve durdu.
- CI'da karşılığı `src/lib/tohum.test.ts`: korumanın yerinde olduğunu
  kaynak okuyarak doğrular (betiği çalıştırmaz — çalıştırmak demo veri
  yazmak olurdu).

### 1.4 Metin denetimi — bir gerçek bulgu

Yatırım skoru metodoloji sayfası mahallenin değişimini "**Çorlu
ortalamasıyla karşılaştırıyoruz**" diyordu. Sistem böyle bir hesap
**yapmıyor**: `fiyatTrendiPuani()` hiçbir yerden çağrılmıyor, CMS doğrudan
0–100 puan istiyor, karşılaştırmayı danışman yapıyor.

Metin gerçeğe uyduruldu ve karşılaştırmayı kimin yaptığı açıkça yazıldı.
Bölge radarı zaten aynı ilkeyi uyguluyordu (az mahallenin medyanını "Çorlu
ortalaması" diye sunmayı reddediyor); tutarlılık sağlandı.

Diğer taramalar temiz: "piyasa ortalaması", "Türkiye ortalaması", "garanti"
gibi sahip olmadığımız veriye atıf yapan ifade bulunmadı.

### 1.5 Statik üretim taraması

Üretim derlemesinde statik üretilen **tek rota `/_not-found`** ve o
`SITE_ADRESI` kullanmıyor.

| Aday | Durum |
| --- | --- |
| `sitemap.ts` | ✅ `force-dynamic` (önceki turda düzeltildi) |
| `robots.ts` | ✅ `force-dynamic` (önceki turda düzeltildi) |
| OG görsel üretimi | Rota yok |
| RSS / feed | Rota yok |
| `generateStaticParams` | Hiçbir rotada kullanılmıyor |

Aynı sınıftan başka hata **yok**.

---

## 2. aşama — Uyarılar görünür yere (panel bildirim şeridi)

**Dal:** `feature/panel-bildirimleri`

### Sorun

EİDS yetki bitişi ve bakım görevlerinin aksaması yasal sonuç doğuruyor.
SMTP bilgileri girilmediği için e-posta gönderilemiyor; geriye kalan tek
kanal `/srv/aslihangyd/logs/bakim.log` idi.

O dosyanın iki kusuru var:

1. **Kimse bakmıyor.** Uyarı, işin yapıldığı yerde görünmezse yok sayılır.
2. **Cron hiç kurulmadıysa dosya hiç oluşmuyor.** Yani "görev hiç
   çalışmadı" durumu, kimsenin bakmadığı bir dosyanın *yokluğuyla*
   temsil ediliyordu — tespit edilemez bir arıza.

### Yapılan

| Parça | Dosya |
| --- | --- |
| Bildirim motoru (saf) | `src/lib/bildirim/motor.ts` |
| Motorun birim testleri (21) | `src/lib/bildirim/motor.test.ts` |
| Sayım katmanı | `src/lib/veri/bildirimler.ts` |
| Sayımların entegrasyon testleri (8) | `src/lib/veri/bildirimler.entegrasyon.test.ts` |
| Bakım durumu global'i | `src/globals/BakimDurumu.ts` |
| Görev künyesi (saf) | `src/lib/bakim/kunye.ts` |
| Panel şeridi | `src/components/panel/BildirimSeridi.tsx` |
| Göç | `src/migrations/20260807_112409_bakim_durumu.ts` |

### Üretilen bildirimler

| Anahtar | Öncelik | Koşul |
| --- | --- | --- |
| `eids-dolmus-yayinda` | Yasal | Yetkisi dolmuş ilan hâlâ yayında |
| `eids-bitiyor` | Yasal | 15 gün içinde yetkisi bitecek yayındaki ilan |
| `bakim-hic-*` | Yasal / Önemli | Görev hiç çalışmamış |
| `bakim-gecikti-*` | Yasal / Önemli | Görev 26 saatten uzun süredir koşmamış |
| `bakim-hata-*` | Yasal / Önemli | Görev çalıştı ama hata döndürdü |
| `yetki-belgesi-yok` | Yasal | Yetki belgesi numarası girilmemiş |
| `ilgisiz-portfoy` | Bilgi | 60 gündür hiç talep almamış yayındaki ilan |
| `gozlemsiz-mahalle` | Bilgi | 45 gündür gözlem girilmemiş yayındaki mahalle |

Sıralama önceliğe göre; **yasal olanlar her zaman en üstte**. Bir portföyün
ilgi görmemesi ticari bir sorun, yetkisi dolmuş ilanın yayında kalması
idari yaptırım — ikisini aynı görsel ağırlıkta göstermek ikincisini
görünmez kılardı.

### Karar: şerit kapatılamaz

"Anladım, gizle" düğmesi **yok**. Gizlenen uyarı kapatıldığı gün çözülmüş
sayılır ve bir daha hatırlanmaz. Bildirim, sebebi ortadan kalkınca
kendiliğinden kaybolur; tek susturma yolu sorunu çözmektir.

Aynı gerekçeyle `bakim-durumu` global'inin tüm alanları **salt okunur**:
biri "son çalışma"yı elle ileri alıp yasal bir uyarıyı susturamasın.

### Karar: eşik 24 değil 26 saat

Cron günde bir kez koşuyor. Saat kayması, yeniden başlatma ya da uzun
süren bir görev yüzünden 24 saat birkaç dakika aşılabilir. 24'e sabitlemek
**her gün yanlış alarm** üretirdi — ve yanlış alarm veren bir uyarı kısa
sürede görmezden gelinir. 26 saat, gerçek aksama ile normal sapmayı ayırır.

Aynı sebeple 48 saatin altı "dün çalışmadı" diye yazılıyor, "1 gündür
çalışmıyor" diye değil: tek kaçırılmış bir koşuyu süregelen bir arıza gibi
sunmak, uyarının güvenilirliğini düşürür.

### Bulunan hata: göç fotoğraf zinciri kopmuş

`payload migrate:create` yeni göçe `portfoy_bolumleri` ve
`portfoy_bolumleri_siralar` tablolarını da yazdı — oysa onlar
`20260806_093100_portfoy_bolumleri` göçünde zaten oluşturuluyor.

**Sebep:** Payload göç farkını canlı veritabanına değil, bir önceki göçün
yanındaki `.json` şema fotoğrafına bakarak hesaplıyor. C aşaması (portföy
bölümleri) ve D aşaması (site bölümleri) ayrı dallarda geliştirildi; D dalı
C'den önce ayrıldığı için D'nin fotoğrafında `portfoy_bolumleri` yok.
Dallar birleşince fotoğraf zinciri koptu.

**Bırakılsaydı:** temiz bir veritabanında 8 numaralı göç tabloyu oluşturur,
yeni göç aynı tabloyu ikinci kez oluşturmaya çalışır ve
`relation already exists` hatasıyla düşerdi — **üretimin ilk kurulumu
kırılırdı.**

**Düzeltme:** göç dosyası elle sadeleştirildi (gerekçesi dosyanın başında
yazılı). Yanındaki `.json` fotoğrafı doğru; zincir buradan itibaren
kendini onarıyor.

**Doğrulandı:** boş bir veritabanı (`aslihangyd_gockontrol`,
`template_postgis`'ten) oluşturulup **dokuz göçün tamamı sıfırdan
çalıştırıldı** — 41 tablo, hatasız. Bu, üretim ilk kurulum yolunun ilk
gerçek sınavı; `docs/DURUM.md`'de "yazıldı ama hiç çalıştırılmadı"
işaretliydi.

### Duman testi

Geliştirme sunucusuna karşı, gerçek tarayıcı isteğiyle:

| Durum | Sonuç |
| --- | --- |
| **Oturumsuz** `/admin` | Şerit yok, bildirim metni sızmıyor (0 eşleşme) |
| **Oturumlu** `/admin` | Şerit görünüyor, 3 bildirim, sıralama yasal → önemli → bilgi |

⚠️ Oturum kapısı (`if (!user) return null`) bilinçli ve gerekli: Payload
oturumsuz ziyaretçiye giriş ekranını gösterir ama **bileşenin gövdesi yine
de çalışır** (sihirbaz görünümünde aynı sızıntı duman testiyle
yakalanmıştı). Kapı olmadan portföy ve ilan sayıları sunucu bileşeni
yükünde dışarı sızardı.

### Yan iş: `server-only` çakışması

`BakimDurumu` global'i görev listesini `gorevler.ts`ten okuyordu; o dosya
`import 'server-only'` taşıyor ve `payload generate:types` (tsx ile koşuyor)
o bayrağı çözemeyip hata fırlattı.

Künye — görevlerin adı, sıklığı, yasal olup olmadığı — sunucuya özel bir
bilgi değil. `src/lib/bakim/kunye.ts` olarak ayrıldı; çalıştırıcılar
`gorevler.ts`te kaldı. `Record<GorevAnahtari, …>` kullanıldı: künyeye yeni
bir görev eklenip çalıştırıcısı yazılmazsa **derleme kırılır**, görev
sessizce atlanmaz.

---

## 3. aşama — Üretim yolu

**Dal:** `feature/uretim-yolu`

> ⚠️ Bu aşamada üretim sunucusuna **hiçbir şey dağıtılmadı.** Yapılandırma
> hazırlandı, komutlar yerel ortamda gerçekten çalıştırılarak doğrulandı.
> Sunucudaki adımları Aslıhan çalıştıracak.

### Bulunan altı hata

`docs/DURUM.md` üretim yolunu "yazıldı ama hiç çalıştırılmadı" diye
işaretlemişti. Çalıştırıldı; altı hata çıktı ve hepsi düzeltildi.

| # | Bulgu | Bırakılsaydı ne olurdu |
| --- | --- | --- |
| 1 | **Üretim imajı hiç derlenemiyordu.** Dockerfile `public/` dizinini kopyalıyor, dizin depoda yok | `compose.prod.yml` var olmayan bir imajı çekiyordu; dağıtım ilk adımında dururdu |
| 2 | **`.dockerignore` yoktu.** `.env` (4658 bayt, 4 sır) derleme katmanına kopyalanıyordu; ana makinenin 975 MB `node_modules`'ü imajdakinin üzerine yazıyordu | Derleme önbelleği dışa aktarılırsa sırlar onunla gider. Farklı mimaride derlenmiş ikili dosyalar (`sharp`) sessizce yanlış olurdu |
| 3 | **Göç üretimde çalıştırılamıyordu.** Uygulama imajı `standalone`: ne kaynak, ne `payload` CLI, ne `src/migrations` var | Şema değişikliği içeren ilk dağıtım, uygulamayı ESKİ şemaya karşı başlatırdı |
| 4 | **Geri yükleme betiği hedef veritabanını oluşturmuyordu** | Betiğin kendi başlığında önerilen aylık tatbikat hiçbir zaman çalışmazdı |
| 5 | **Hata tuzağı çıkış kodunu her zaman 0 yazıyordu.** `$(date -Is)` komut ikamesi `$?` genişletilmeden önce koşup sıfırlıyordu | Başarısız bir yedekleme günlüğe "çıkış kodu 0" diye düşerdi |
| 6 | **`.env.example` koddan sapmıştı.** Kod `NEXT_PUBLIC_WHATSAPP_NUMARA` okuyor, belge `..._NUMARASI` yazıyordu; 8 değişken hiç belgelenmemişti | Belgeyi harfiyen izleyen biri WhatsApp düğmesini boş numarayla yayına alırdı; `BAKIM_ANAHTARI` ve `RESTIC_*` eksik kalınca EİDS kontrolü ve yedekleme çalışmazdı |

### Yedekleme tatbikatı — ilk kez yapıldı

Yerel bir restic deposu ve geliştirme veritabanı kullanılarak tam döngü:
**yedek al → ayrı veritabanına geri yükle → doğrula.**

| Doğrulama | Sonuç |
| --- | --- |
| Tüm tablolarda satır sayısı | **41 tablonun tamamı birebir aynı** |
| İlan içerik özeti (id, başlık, durum, yetki bitişi, fiyat) | md5 aynı |
| PostGIS geometrisi | `POINT(27.7997 41.1592)`, SRID 4326 — bozulmadan geldi |

⚠️ İlk denemede geometri sütunları boştu, yani karşılaştırma hiçbir şey
kanıtlamıyordu. Gerçek bir geometri yazılıp döngü tekrarlandı — boş bir
sütunun "eşleşmesi" doğrulama değildir.

### Üretim imajı — ilk kez derlendi ve çalıştırıldı

| Ölçüm | Değer |
| --- | --- |
| Uygulama imajı | 452 MB |
| Göçmen imajı | 1,54 GB (yalnızca göç için, `up -d` ile başlamaz) |
| Son imajda `.env` / `.git` | yok (doğrulandı) |
| Son imajda `node_modules` | 58 MB (standalone budaması çalışıyor) |

Kap geliştirme veritabanına karşı çalıştırıldı: `/api/saglik` **200**,
kap sağlık durumu **healthy**, yedi rota 200 (`/` 0,50 sn · `/portfoy`
0,20 sn · `/mahalleler` 0,06 sn · `/harita` 0,08 sn · `/admin/login`
0,57 sn · `/sitemap.xml` · `/robots.txt`).

✅ **`SITE_ADRESI` düzeltmesi de kanıtlandı:** site haritası, imaja
gömülen derleme zamanı adresini değil, kaba çalışma zamanında verilen
adresi yazdı. Bu, 8443 aşamasında yapılan ön eksiz değişken düzeltmesinin
gerçekten işe yaradığının ilk canlı kanıtı.

### Eklenenler

| Dosya | Ne yapar |
| --- | --- |
| `.github/workflows/imaj.yml` | Uygulama ve göçmen imajlarını derler, GHCR'a yayımlar. **Dağıtım yapmaz.** PR'da yalnızca derler |
| `.dockerignore` | Sır ve gereksiz dosyaları derleme bağlamının dışında tutar |
| `.env.production.example` | Üretim değişkenleri; her satır ⚠️ FARKLI / ✅ AYNI / 🆕 YALNIZCA ÜRETİM olarak işaretli |
| `src/lib/ortam.test.ts` | Kodun okuduğu her değişkenin belgelenmiş olduğunu sınar |
| `public/OKUBENI.md` | Dizini var eder (imaj bu olmadan derlenmiyordu) ve neyin buraya konup konmayacağını yazar |
| Dockerfile `gocmen` aşaması | Üretimde göç çalıştırmanın tek yolu |
| compose `gocmen` servisi | `profiles: [gocmen]` — `up -d` ile başlamaz |

### Karar: dağıtımı iş akışı tetiklemez

İş akışı imajı derleyip yayımlar, orada durur. Sunucudaki
`docker compose pull && up -d` komutunu insan çalıştırır.

Gerekçe: dağıtım anı, veritabanı göçünün ne zaman koşacağına karar
verilen tek an. Otomatik dağıtım, geri alınamaz bir şema değişikliğini
gece yarısı bir merge ile başlatabilirdi. Aynı sebeple göçmen servisi
compose profili arkasında: profil verilmeden hiçbir komut onu çağırmaz.

### Karar: geri dönüş imajda, şemada değil

Her imaj `latest` yanında commit SHA'sıyla da etiketleniyor; `.env`
içindeki `UYGULAMA_IMAJI` ile eski bir sürüme dönülebilir.

⚠️ Şema geri alınmaz. Göç ileri doğru tasarlandı; eski bir uygulama
sürümünü yeni şemaya karşı çalıştırmak genelde sorunsuzdur (yeni sütunları
görmez), tersi değildir. Şemayı geri almak gerekiyorsa yedekten dönülür.

---

## 4. aşama — Eksik modüller

**Dal:** `feature/eksik-moduller`

### 4.1 CRM eşleştirme motoru

`src/lib/crm/eslestirme.ts` (saf) + `src/lib/veri/crmEslestirme.ts` (sorgu) +
talep kaydında "Eşleşen portföy" sekmesi.

**Sert eleme ile puanlama ayrı.** Kiralık arayan birine satılık ilan
göstermek "zayıf eşleşme" değil, **yanlış** eşleşme. Puanla ifade
edilseydi listenin ortasında "%40 uyumlu" diye dururdu. Eleyen kurallar:
tip uyumsuzluğu, talebin geldiği ilan, bütçenin iki katından pahalı.

**Eksik bilgi cezalandırılmaz.** Bütçesini yazmayan talep, bütçesi
uymayan talep değildir; değerlendirilemeyen ölçüt paydaya girmez.
Ağırlıklar yeniden ölçeklenmeseydi hiç bilgi vermemiş bir talep her
ilanla düşük puan alır ve motor sessizce işe yaramaz hale gelirdi.

**Ağırlıklar:** bütçe 40, mahalle 30, oda 20, büyüklük 10. Bütçe en ağır —
ödenemeyecek ev, ne kadar uygun olursa olsun uygun değildir. Mahalle
ikinci: konum gayrimenkulde geri alınamayan tek özellik.

#### Duman testinde çıkan iki hata

| Bulgu | Düzeltme |
| --- | --- |
| **Fiyatı girilmemiş ilan en ağır ölçütten bedava geçiyordu** — bütçe ölçütü tamamen atlandığı için bütçeye TAM UYAN bir ilanı geçmişti (84'e 69) | Talep bütçe verdiyse ama ilanda fiyat yoksa ölçüt 0,5 ile kuruluyor ve açıklama boşluğu görünür kılıyor. "Eksik bilgi cezalandırılmaz" kuralı TALEBİN eksiklerini korumak için var; ilanın fiyatsızlığı bizim veri boşluğumuz |
| **Gerekçe metni gerçeğin tersini söylüyordu**: istenen 3+1, ilan 4+1 iken panelde "4+1 istendi" yazıyordu | `4+1 (3+1 istenmişti)`. Yanlış bir gerekçe, gerekçe olmaktan çıkar |

⚠️ Motor öneri üretir, eylem üretmez: otomatik mesaj göndermez, talebi
elemez, ilanı ziyaretçiye göstermez. Yalnızca panelde çalışır.

### 4.2 Sosyal medya materyali

`/admin/sosyal-materyal` — her yayındaki ilan için iki görsel biçimi
(1080×1080 gönderi, 1080×1920 hikâye), metin taslağı, etiketler ve UTM'li
bağlantı. "Tümünü indir" iki dosyayı indirir.

⚠️ **Otomatik yayın yok ve eklenmeyecek.** Hiçbir hesaba bağlanılmaz,
hiçbir gönderi zamanlanmaz. Gerekçe teknik değil: bir danışmanın
hesabından çıkan her cümle onun sözüdür ve ilan metni yasal sonuç
doğurur.

⚠️ **Uydurma rakam yok** (kural 2): metin yalnızca kayıtta gerçekten var
olan alanları kullanır. Fiyat girilmemişse fiyat cümlesi hiç kurulmaz;
"cazip fiyatlı" gibi doldurma ifade üretilmez. Yatırım tavsiyesi feragati
metnin **içinde** — gönderi kopyalanıp taşındığında feragat de gitsin.

#### Bulunan hata: görsel üretimi çalışma anında Google'a çıkıyordu

`next/og` (Satori), gömülü fontta bulunmayan bir glif görünce **çalışma
anında** Google Fonts'tan font indirmeye çalışıyor. ₺ (U+20BA) Geist'te
yok; istek 400 döndü ve görsel üretimi 500 ile düştü.

Asıl tehlike hata değil, **sessiz başarı**: internet erişimi olan bir
makinede font iner ve her şey çalışır görünür. Üretim kabının dışarı
çıkışı yoksa aynı kod orada sessizce bozulur — ya da her görsel isteği
Google'a bir tur atar.

Bu, PDF üretimindeki pdf-lib Türkçe font sorunuyla **aynı sınıftan** bir
hata; o zaman kütüphane yolundan tamamen vazgeçilmişti.

**Çözüm:** görselde `₺` yerine `TL` yazılıyor (site arayüzünde ₺
kullanılmaya devam ediyor — orada tarayıcının fontu var).
`gorsel.entegrasyon.test.ts` `fetch` çağrılarını kaydediyor ve uzak bir
adrese çıkılırsa test düşüyor.

✅ Türkçe karakterler doğrulandı: ğ ü ş ı ö ç İ hepsi üretilen PNG'de
doğru render oldu, hiçbir çalışma anı font indirmesi olmadan.

### 4.3 Medya altyapısı

`DroneVideo` (Bunny Stream) ve `SanalTur` bileşenleri; mahalle ve ilan
sayfalarına bağlandı.

⚠️ **Çerçeve baştan yüklenmez** — "tıkla-oynat" (facade) düzeni. Sayfa
açılışında bir video iframe'i gömmek üç şeyi birden bozar: LCP hedefi
(2,5 sn), mobil kullanıcının verisi (trafiğin ~%75'i mobil) ve gizlilik
(ziyaretçi henüz hiçbir şey istemedi). Oynatıcı ancak dokunulduğunda
oluşuyor; `autoplay=false`, `preload=false`.

⚠️ Video kimliği UUID olarak doğrulanıyor: CMS'e tam adres yapıştırmak
çok olası ve doğrulama olmasaydı ziyaretçi boş bir çerçeve görürdü —
hata da vermezdi. Ayar eksikse "oynatıcı yapılandırılmadı" denir, kırık
bir çerçeve gösterilmez.

#### ⚠️ Yapılmayan: Pannellum ile kendi barındırdığımız 360° panoramalar

Brief'te Pannellum adı geçiyordu; **yapılmadı**. Sebep veri modeli:
`sanalTurUrl` alanı bir ADRES tutuyor, panorama görseli değil. Pannellum
eş dörtgen (equirectangular) bir görsel ister; bu da yeni bir yükleme
alanı, yeni bir göç ve gerçek bir 360° görselle doğrulama demek — elimde
test edilecek panorama yok ve doğrulanmamış bir görüntüleyici eklemek,
kırık olduğu ilk gerçek kullanımda anlaşılacak bir şey eklemektir.

Bugünkü `SanalTur` bileşeni dış tur adreslerini (Matterport, Kuula vb.)
aynı tıkla-aç düzeniyle gömüyor ve `https` zorunlu tutuyor. Panorama
alanı istenirse ayrı bir işte eklenir.

### 4.4 Turnstile değişken adları

Zaten kesinleşmişti; 3. aşamada `.env.example` ve
`.env.production.example` içine gerekçeleriyle yazıldı:

| Değişken | Nerede |
| --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI` | İstemci — görünür, gizli değil |
| `TURNSTILE_GIZLI_ANAHTAR` | ⚠️ Sunucu — `NEXT_PUBLIC_` ön eki ALMAZ |

⚠️ Turnstile alan adına **8443 portu yazılmaz**; yalnızca ana makine adı
(`aslihangyd.com`). İkisi de boşsa doğrulama katmanı devre dışı kalır ve
form bal küpü + hız sınırıyla korunmaya devam eder.

### 4.5 CI paket eşiği

`scripts/paket-olcumu.mjs` + CI adımı. Ana sayfa istemci JS'i 220 kB
gzip'i aşarsa **uyarı** düşer; koşu başarısız olmaz. Paket boyutu bir
kalite kapısı değil trend göstergesi — testleri geçen bir PR'ı birkaç
kilobayt yüzünden bloklamak, eşiği yükseltme alışkanlığı doğurur.

| Rota | Sıkıştırılmamış | gzip |
| --- | ---: | ---: |
| `/` | 656,7 kB | **198,2 kB** |
| `/portfoy` | 677,0 kB | 205,9 kB |
| `/harita` | 1592,8 kB | 440,1 kB |

198,2 kB, belgelenen 198,7 kB referansıyla örtüşüyor.

#### ⚠️ Ölçüm `.next` manifest'lerine bakmıyor

Turbopack `app-build-manifest.json` üretmiyor ve kalanların biçimi Next
sürümleri arasında değişiyor — ölçüm sessizce yanlışlaşır ya da bir gün
sıfır döner. Betik bunun yerine sunucuyu ayağa kaldırıp **gerçekten
yüklenen sayfayı** okuyor.

#### Bulunan hata: ölçüm geliştirme paketini saymıştı

İlk koşuda 804,7 kB çıktı — gerçek değerin dört katı. Sebep: 3000
portunda unutulmuş bir `pnpm dev` vardı, `next start` "adres kullanımda"
deyip düştü ve ölçüm dev paketini saydı (`next-devtools` tek başına
211,9 kB).

Rakam inandırıcı olmadığı için fark edildi. **%10 sapsaydı fark
edilmez** ve eşik kalıcı olarak yanlış bir zemine otururdu. Betiğe
geliştirme paketini tanıyıp düşen bir koruma eklendi.

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

## Gerçek kullanıcı Core Web Vitals ölçümü — DEPLOY SONRASI YAPILACAK ⚠️

**Mobil LCP hedefi (< 2,5 sn) laboratuvar ölçümünde tutmuyor: 3,3–3,5 sn.
Bu hedefi kapatma kararı, gerçek kullanıcı verisi görülmeden VERİLMEYECEK.**

### Neden laboratuvar sayısına bakıp karar vermiyoruz

Üç sebep, üçü de ölçülmüş:

1. **Kalan yükün %93,8'i çatı.** Sayfadaki JavaScript'in yalnızca 9,9 kB
   gzip'i bizim kodumuz; gerisi React + Next App Router çalışma zamanı.
   Bizim kodu sıfıra indirsek bile taban yerinde kalıyor. Kesecek yer yok.

2. **Ölçüm CDN olmadan yapılıyor.** Lighthouse `localhost`a bağlanıyor;
   canlıda trafik Cloudflare üzerinden gelecek ve statik varlıklar kenar
   düğümlerden servis edilecek. Yazı tipleri ve JS parçaları için bu
   doğrudan LCP'ye yansır. Laboratuvar sayısı bu avantajı hiç görmüyor.

3. **Lighthouse mobil ölçümü SİMÜLASYON.** Gerçek bir 4G bağlantı değil;
   kaydedilen izin üzerine 1.475 kbps / 150 ms RTT / 4x CPU yavaşlatma
   uygulanıyor (`throttlingMethod: simulate`). Çorlu'daki gerçek bir
   ziyaretçinin bağlantısı bundan iyi de olabilir kötü de.

### Kurulacak olan

Gerçek kullanıcı ölçümü (RUM). İki seçenek var, ikisi de mevcut altyapıya
oturuyor:

- **Cloudflare Web Analytics** — proxy zaten önümüzde olacak, ek betik
  gerekmeden Core Web Vitals topluyor. ⚠️ Panelden açılması gerekiyor.
- **Umami** — `NEXT_PUBLIC_UMAMI_URL` / `NEXT_PUBLIC_UMAMI_SITE_ID` ile
  bağlanan altyapı hazır (`src/components/analitik/Analitik.tsx`).

⚠️ **KVKK kuralı ikisinde de geçerli.** CLAUDE.md kural 8: analitik betiği
onay alınmadan YÜKLENMEZ. `Analitik` bileşeni bunu zaten zorluyor
(`izinVarMi(onay, 'analitik')`); RUM ölçümü de aynı kapıdan geçmeli.
Cloudflare Web Analytics kullanılacaksa, "proxy seviyesinde topluyor,
betik yok" gerekçesiyle onayın atlanıp atlanamayacağı **avukata
sorulmalı** — kendi başımıza karar vermiyoruz.

### Hedefi neye göre değerlendireceğiz

Laboratuvar medyanı değil, **gerçek kullanıcıların 75. yüzdeliği** — Core
Web Vitals'ın kendi tanımı bu. Yeterli örneklem birikene kadar (en az
birkaç yüz oturum) hedef hakkında karar verilmeyecek.

⚠️ Ölçüm kurulmadan "LCP hedefi tutmuyor" ya da "tutuyor" demek, ikisi de
temelsiz olur.

---

## Yatay sırada lazy yükleme — bilinen sınırlama ⚠️

**Kısa hâli: `loading="lazy"` yatay kaydırmalı sıralarda fiilen çalışmıyor
ve bunu düzeltmeye çalışmak durumu kötüleştirdi. Aynı fikri tekrar
denemeden önce burayı okuyun.**

### Sorun

`/portfoy` sayfasındaki tema sıraları yatay kaydırmalı (`YataySira`).
Mobilde ilk ekranda **hiçbir kart görseli görünmüyor** — çerez banneri
ekranın alt yarısını kaplıyor, kartların yalnızca üst kenarı görünüyor.
Buna rağmen **6 görsel (152 kB) iniyor**.

Sebep: tarayıcının `loading="lazy"` kararı ağırlıklı olarak **dikey**
yakınlığa dayanıyor. Sağa kaydırılmış kartlar dikeyde aynı hizada olduğu
için "yakında görünecek" sayılıyor ve indiriliyor.

### Denenen çözüm ve ölçüm sonucu

8 Ağustos 2026'da şu denendi: ekran dışı kartlar küçük bir `sizes`
değeriyle (`48px`) sunucuda basılıyor, `IntersectionObserver` kart görünür
alana girince gerçek `sizes` değerini yazıyor. `<img>`, `src`, `srcset` ve
`alt` sunucu HTML'inde aynen duruyordu — SEO tarafı sağlamdı.

**Ölçüm kötüleşme gösterdi:**

| | Önce | Sonra |
| --- | --- | --- |
| Görsel isteği | 6 | **10** |
| Görsel baytı | 152,3 kB | **155,2 kB** |
| İnen genişlikler | [640] | [96, **640**] |

Ertelenen kartlar **iki kez** indi: önce 96 px'lik küçük sürüm, sonra
gözlemci yükseltince 640 px'lik tam sürüm.

### Neden ısrar edilmedi

İlk tepki `rootMargin`i (250 px) küçültmekti — kart genişliği 248 px
olduğu için komşu kartlar "neredeyse görünür" sayılıyordu. Payı sıfırlamak
**Lighthouse sayısını düzeltirdi**, çünkü Lighthouse sayfayı kaydırmıyor:
ekran dışı kartlar hiç yükseltilmez ve ölçümde 96 px'te kalır.

Ama **gerçek kullanımı düzeltmezdi.** Kaydıran her kullanıcı için görünen
her kart yine iki kez inecekti (96 px + 640 px ≈ 28 kB, tek seferde 25 kB
yerine). Kazanç yalnızca "hiç kaydırmayan kullanıcı" senaryosunda vardı.

⚠️ **Ölçüm aracını memnun edip kullanıcıya zarar veren bir değişiklik,
kazanç değil metrik oyunudur.** Bu yüzden geri alındı.

### Bugünkü durum

Kartlar sade `loading="lazy"` kullanıyor. Yatay sıradaki tüm görseller
iniyor; bu bilinen ve kabul edilmiş bir maliyet.

### Tekrar denenecekse

Çift indirmeyi ortadan kaldıran bir yaklaşım gerekiyor. Akla gelenler:

- **Sunucuda daha az kart basmak** — SEO'yu bozar, içerik HTML'den çıkar.
  Bu sayfalar sitenin arama motoru; yapılmamalı.
- **Sıra başına kart sayısını azaltmak** — editoryal karar, teknik değil.
  Sıra başına 6 yerine 4 kart, indirmeyi doğrudan üçte bir azaltır.
- **`content-visibility: auto`** — render işini azaltır ama kaynak
  indirmesini engellemez; bu sorunu çözmez.
- Sanallaştırma **denenmemeli**: içerik HTML'den çıkar, SEO kaybı kazançtan
  büyük.

En umut verici yol, teknik bir numara değil, **sıra başına kart sayısını
düşürmek**.

---

## Faz 2 kalanı — PostGIS yakınlık sorguları

Faz 2'nin tamamlanmamış tek maddesi buydu: "sanayiye 10 dakika" tipi
yakınlık sorguları. Kapatıldı.

### Ne yapıldı

- `src/lib/yakinlik/` — saf motor: mesafe → 0–100 puan eğrileri, veri
  kapsamı korumaları, karşılaştırmalı yoğunluk. 15 birim testi.
- `src/lib/veri/yakinlik.ts` — ham parametreli PostGIS sorguları
  (`ST_Distance` + `geography`). 8 entegrasyon testi.
- `CevreBolumu` bileşeni — mahalle sayfası 5. bölümünde ve ilan
  detayında; en yakın nokta + 1 km içindeki kayıt sayısı.
- `/admin/skor-onerileri` — üç skor bileşeni için gerekçeli öneri ekranı.
- `/yatirim-skoru-metodolojisi` — eğriler ve ağırlıklar yayınlandı.
- `mesafeYaz` biçimlendiricisi (`850 m` / `3,4 km`).

### Kararlar ve gerekçeleri

**1. Dakika değil, kilometre — ve "kuş uçuşu" etiketiyle.**

PROJE-PLANI.md "sanayiye 10 dakika" diyor. Süre üretmek için yol ağı ve
rotalama motoru (OSRM/Valhalla) gerekir; elimizde yok. Mesafeyi varsayılan
bir hıza bölüp "12 dakika" yazmak, bilmediğimiz bir şeyi iddia etmek
olurdu — CLAUDE.md kural 2 kapsamında uydurma veri. Arayüzde her yerde
"kuş uçuşu" etiketi var. Rotalama gelirse etiket değişir, veri modeli
değişmez.

**2. Türetilen puan skora OTOMATİK YAZILMIYOR.** ⭐ En önemli karar

Sanayi yakınlığı, ulaşım ve sosyal donatı bileşenleri koordinatlardan
hesaplanabiliyor. Doğrudan yazmak kolaydı ve yanlış olurdu:

> **POI kaydının yokluğu, donatının yokluğu değildir.**

Hıdırağa'ya henüz tek okul girilmediyse otomatik hesap onu "donatısı
zayıf" diye damgalar. Veri eksikliği bir kez skora yazıldığında olguya
dönüşür ve kimse geri dönüp sorgulamaz. Bu yüzden ekran **öneri** üretir,
gerekçesini satır satır gösterir, veri boşluklarını söyler; alanı Aslıhan
doldurur.

Aynı ilkenin daha önceki örnekleri: skorda %70 kapsam eşiği, eşleştirmede
%60, endekste katman başına 8 gözlem.

**3. Sosyal donatıda mutlak eşik yerine karşılaştırma.**

"1 km içinde 8 donatı iyidir" gibi bir eşiği biz uydurmuş oluruz. Bunun
yerine en yoğun mahalle 100 puan, diğerleri ona oranlanır — eşleştirme
motorundaki bütçe puanıyla aynı yöntem. En az 3 mahalle şartı var; ikisiyle
"en yoğun olan 100" demek kıyas değil etiketlemedir.

**4. Sanayi eğrisi monoton değil.**

OSB'ye işe gidilebilir mesafede olmak değerli; OSB'nin dibinde oturmak
gürültü ve ağır araç trafiği. En yüksek puan 2–7 km bandında. Havalimanı
kalemi de aynı gerekçeyle plato biçimli.

**5. Eğri sayıları metodoloji sayfasına koddan basılıyor.**

`/yatirim-skoru-metodolojisi` sayfası kırılım noktalarını `SANAYI_EGRISI`
ve `ULASIM_KALEMLERI`den okuyor, elle yazmıyor. Yayınlanan metodolojinin en
sık görülen sessiz yalanı, kod değişip sayfanın eski kalmasıdır.

**6. Mesafe listesi haritadan bağımsız.**

MapTiler anahtarı gelmeden de çalışır: ilgi noktası girildiği anda dolar.
En değerli bilgi (neye ne kadar uzak) en ucuz veriye bağlandı. Harita boş
durumu bunun altında duruyor.

**7. Ham SQL erişim denetimini atlar — iki koruma kondu.**

- Ziyaretçiye açık yol (`noktayaGoreYakinlik`) yalnızca **koordinat** alır;
  mahalle zaten Payload üzerinden erişim denetimiyle çekilmiştir.
  Sorgulanan `ilgi_noktalari` koleksiyonu zaten herkese açık.
- Panel yolu (`tumMahallelerinYakinligi`) yayında olmayan mahalleleri de
  döndürür; görünümde `if (!req.user) return null` kapısı var. Oturumsuz
  istekte gövdenin hiç basılmadığı duman testiyle doğrulandı.

### Ölçüm ve doğrulama

- Birim: 15 test (eğri uçları, doğrusal geçiş, kapsam koruması, kıyas eşiği)
- Entegrasyon: 8 test, gerçek PostGIS'e karşı. İki tuzağı kapatıyorlar:
  **boylam/enlem sırası** (karışırsa Çorlu Somali açıklarına gider) ve
  **SRID** (sütun `geometry(Point)`, SRID'siz açılmış; `ST_SetSRID`
  olmadan `geography` dönüşümü kırılgan).
- Duman testi: geçici veriyle mahalle sayfası — 3,3 km / 2,2 km / 666 m /
  444 m / 222 m doğru sırayla basıldı, "Öne çıkan" rozetleri doğru
  kayıtlara düştü. Test verisi sonrasında silindi.
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1009 test) ✅ `build` ✅

### Bilerek yapılmayan

- **GiST uzamsal indeks eklenmedi.** `ilgi_noktalari.konum` üzerinde
  indeks yok. Gerekçe: Payload'ın ürettiği göç dosyaları kendi şemasını
  temel alıyor; elle eklenen bir indeksi ileride sessizce `DROP` edebilir.
  Kazanç ise bu ölçekte ölçülemez — Çorlu'da POI sayısı yüzlerle ifade
  edilecek, sıralı tarama milisaniyenin altında. Tetik: kayıt sayısı
  10.000'i geçerse indeks eklenmeli ve göç üretiminden sonra korunduğu
  doğrulanmalı.
- **Rotalama (sürüş süresi) yapılmadı.** Ayrı bir servis (OSRM) ve yol ağı
  verisi gerektirir; 3,2 GB RAM'de barındırma kararı ayrıca verilmeli.

---

## Faz 2C kalanı — Gözlem CSV içe aktarma

Faz 2C'nin tamamlanmamış tek maddesi buydu. ILERLEME'de "Aslıhan'ın mevcut
tablo düzeni bilinince" diye bekletiliyordu; **beklemeye gerek olmadığı
anlaşıldı** — düzeni sormak yerine düzeni tanıyan bir eşleme yazıldı.

### Ne yapıldı

- `src/lib/csv/ayristir.ts` — CSV ayrıştırıcı (26 birim testi)
- `src/lib/gozlem/iceAktarma.ts` — sütun eşleme + satır doğrulama (22 test)
- `src/lib/gozlem/iceAktarmaCekirdegi.ts` — çözümleme ve yazma çekirdeği
- `src/lib/gozlem/eylemler.ts` — ince sunucu eylemleri (yalnızca oturum)
- `/admin/gozlem-ice-aktar` — üç adımlı sihirbaz: dosya → eşleme → önizleme
- 10 entegrasyon testi (gerçek veritabanı)

### Kararlar ve gerekçeleri

**1. Sabit sütun düzeni dayatılmadı.** ⭐

ENDEKS-VERI-YONETIMI.md §6 bir şablon öneriyor ama Aslıhan'ın tablosu
aylardır kullanımda. "Önce tablonuzu şu düzene çevirin" demek, içe
aktarmayı hiç kullanılmayacak bir özelliğe dönüştürürdü. Sütunlar
başlıklardan tahmin ediliyor, tahmin ekranda gösteriliyor ve elle
düzeltilebiliyor. Eşlenemeyen sütun sessizce atılmıyor, "bu sütun
kullanılmadı" diye yazılıyor.

**2. Hiçbir satır sessizce düzeltilmez ve sessizce atlanmaz.** ⭐

Her satır üç durumdan birinde: hazır, uyarılı (aktarılır, işaretlenir),
hatalı (aktarılmaz, sebebi yazılır). "Anlamadığım satırı atlarım"
davranışı, 500 satırlık dosyadan 430 satır aktarıp kimseye söylememektir.

**3. Kendi CSV ayrıştırıcımız yazıldı — kütüphane değil.**

Çözülmesi gereken asıl sorun genel CSV değil, **Türkçe Excel'in CSV'si:**
noktalı virgül ayırıcı, BOM, CRLF, Windows-1254 kodlama, `4.300.000`
biçiminde sayı. Hazır kütüphanelerin çoğu virgül varsayar ve noktalı
virgüllü dosyayı **tek sütun** olarak okur — hata da vermez. Sessizce
yanlış çalışan içe aktarma, hata veren içe aktarmadan çok daha pahalıdır.

**4. Türkçe sayı ayrıştırma ayrı bir tehlike olarak ele alındı.**

`4.300.000` İngilizce ayrıştırıcıda `4,3` olur. Böyle bir hata endekse
girer ve fark edilmesi aylar sürer. Kural: iki ayırıcı varsa sondaki
ondalıktır; yalnız virgül varsa ondalıktır; yalnız nokta varsa son grup
tam 3 haneliyse binliktir. Belirsizlik tamamen yok edilemediği için
**önizleme çözümlenmiş sayıyı gösteriyor** — asıl güvence gözle doğrulama.

**5. Tarih `new Date(metin)` ile ayrıştırılmıyor.**

"03.08.2026" dizesini ortamlar farklı yorumlar, bazıları ay/gün sırasını
Amerikan varsayar. 3 Ağustos ile 8 Mart arasındaki fark endekste beş aylık
kaymadır. Elle ayrıştırılıyor, iki haneli yıl reddediliyor.

**6. Tarih UTC öğlen yazılıyor.**

Gece yarısı yazılsaydı saat dilimi kayması gözlemi bir önceki aya
taşıyabilirdi ve endeks ay bazlı. Entegrasyon testi bunu doğruluyor
(ayın 1'i sınavı).

**7. Güven varsayılanı "Düşük".**

ENDEKS-VERI-YONETIMI.md §5: geriye dönük kayıtlar düşük güvenle
işaretlenmeli, grafikte kesikli çizgiyle gösterilmeli. CSV yolu tipik
olarak geriye dönük veri taşır. Varsayılan görünür ve değiştirilebilir —
gizli bir kural değil.

**8. İstemcinin çözümlediği veriye güvenilmiyor.** ⭐

Önizleme tarayıcıda gösterilir ama içe aktarma o değerleri kabul etmez:
sunucu CSV metnini + eşlemeyi + ayarları **yeniden çözümler** ve yalnızca
kendi ürettiğini yazar. Kullanıcının seçebildiği tek şey hangi satırların
dışarıda kalacağı; değerler değil. Aksi hâlde ağ isteğini düzenleyen biri,
önizlemede gördüğünden bambaşka rakamları endeksin ham verisine
yazdırabilirdi.

**9. Yazma yolu Local API + `overrideAccess: false`.**

Toplu yazma, kancaları atlamak için bahane değil. `beforeChange` kancası
m² fiyatını, `ay` alanını ve özeti hesaplıyor; endeks bu alanlardan
besleniyor. Entegrasyon testi kancanın gerçekten çalıştığını doğruluyor.

**10. Çekirdek, sunucu eyleminden ayrı dosyada.**

`'use server'` dosyaları yalnızca async fonksiyon dışa aktarabilir, her
dışa aktarım bir uç noktaya dönüşür ve `headers()` bağımlılığı yüzünden
doğrudan test edilemez. Çekirdek `payload` ve `user`'ı parametre alıyor;
entegrasyon testi onu doğrudan çağırıyor.

### Testin yakaladığı gerçek hatalar

- **`"falan filan"` → `portal_ilan`.** Kaynak sezgisi alt dize araması
  yapıyordu; "falan filan" metni `ilan` alt dizesini içerdiği için
  tanınmadığı hâlde tanınmış sayılıyor ve uyarı bile üretmiyordu. Kelime
  sınırına çevrildi.
- **Kaynakta U+FFFD karakteri.** Font alt kümesi denetim testi (Faz E)
  kaynak dosyaya doğrudan yazılmış değiştirme karakterini yakaladı;
  kaçış dizisine çevrildi.

### Ölçüm ve doğrulama

- Birim: 48 test (26 ayrıştırıcı + 22 eşleme/doğrulama)
- Entegrasyon: 10 test, gerçek veritabanına karşı
- Duman testi: gerçek oturumla `/admin/gozlem-ice-aktar` açıldı, üç adım
  da basıldı, konsol temiz. Test kullanıcısı sonrasında silindi.
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1044 test) ✅ `build` ✅

### Bilinen sınırlar

- Tek seferde 5.000 satır / 2 MB tavanı (3,2 GB RAM koruması). Üstü için
  dosya bölünür; ekran bunu söylüyor.
- Geri alma yok. Yanlış aktarılan kayıtlar Gözlemler koleksiyonundan elle
  silinir; ekran bunu aktarımdan ÖNCE uyarıyor. Toplu geri alma için
  "içe aktarma partisi" kimliği tutmak gerekirdi — veri modelini bir
  özellik uğruna genişletmek yerine önizlemeye yatırım yapıldı.

---

## Faz 4 kalanı — AI doğal dil arama

Faz 4'ün açık kalan tek maddesi. Planlanan fazların tamamı böylece işlendi.

### Ne yapıldı

- `src/lib/arama/sema.ts` — filtre şeması + URL çevirisi (16 test)
- `src/lib/arama/motor.ts` — Claude API çağrısı, yapılandırılmış çıktı
- `src/lib/arama/eylemler.ts` — sunucu eylemi, hız sınırı
- `src/components/ilan/AkilliArama.tsx` — `/portfoy` üzerinde arama kutusu
- `@anthropic-ai/sdk` bağımlılığı (yalnızca sunucu tarafı)

### Kararlar ve gerekçeleri

**1. AI'nin ürettiği şey bir URL'dir, veritabanı sorgusu değil.** ⭐

Mimarinin kilit taşı. Model, sorguyu filtre nesnesine çevirir; kod onu
`/portfoy?tip=satilik&odaSayisi=3+1` adresine dönüştürür ve ziyaretçiyi
oraya yollar. Sonrası aylardır çalışan normal filtre yolu.

Üç şey birden kazanılıyor:
- **Güvenlik:** model sorgu üretmiyor, yeni saldırı yüzeyi yok.
- **Şeffaflık:** anlaşılan filtre mevcut filtre çubuğunda görünür.
- **Düzeltilebilirlik:** yanlış anlaşılan filtreyi ziyaretçi elle değiştirir.

**2. Model cevap üretmez, filtre üretir.**

PROJE-PLANI §4'ün vaadi. Modelden çıkan hiçbir metin ziyaretçiye
gösterilmez; fiyat, mahalle bilgisi, öneri hiçbiri modelden gelmez.
Halüsinasyon görse üretebileceği en kötü şey **yanlış bir filtredir** — ve
o filtre görünür durumda.

**3. Yapılandırılmış çıktı (`output_config.format`) + Zod.**

"JSON döndür" diye rica edip ayrıştırmak yerine şema API seviyesinde
zorlanıyor, dönen değer ayrıca Zod'dan geçiyor. Şema dışı hiçbir değer
geçemez: model `tip: "devren"` derse düşer, olmayan bir mahalle slug'ı
üretirse URL'ye yazılmaz.

**4. `anlasilmayan` alanı — sessiz yok saymaya karşı.** ⭐

Modelden, sorgunun filtreye çevrilemeyen kısımlarını ayrıca listelemesi
isteniyor ("OSB'ye 10 dakika", "güney cephe", "asansörlü"). Bunlar arayüzde
açıkça gösteriliyor. Sessizce yok saymak, ziyaretçiye isteğinin tamamının
uygulandığını düşündürürdü — aramanın en sinsi yalanı budur.

**5. Varsayılan KAPALI.**

`ANTHROPIC_API_KEY` yoksa kutu hiç basılmıyor. Çalışmayan bir arama kutusu
göstermek, olmayan bir özelliği varmış gibi sunmaktır. Filtreler her
hâlükârda çalışıyor; AI arama onların yerine değil yanına kondu.

**6. KVKK — yurt dışına veri aktarımı açıkça yazıldı.** ⚠️

Ziyaretçinin yazdığı metin Anthropic'in sunucularına gidiyor. Bu bir yurt
dışına aktarımdır ve sitenin Türkiye'de barındırılıyor olması bunu
değiştirmez. Alınan önlemler:
- Metin dışında hiçbir şey gönderilmiyor (IP, oturum, çerez, kimlik yok).
- Kutunun hemen altında, küçültülmeden yazıyor.
- Anahtar yoksa özellik yok.

⚠️ **Aydınlatma metnine bu aktarımın eklenmesi avukat işidir.** Metin hazır
olmadan anahtar üretimde tanımlanmamalı — SENDEN-BEKLENENLER.md'ye yazıldı.

**7. Model ortam değişkeniyle değiştirilebilir.**

Varsayılan `claude-opus-5`. Bu iş (kısa metinden yapılandırılmış çıktı)
daha küçük bir modelle de yapılabilir ve arama başına maliyet doğrudan
model seçimine bağlı. Bu bir maliyet kararı ve Aslıhan'ın; kodda
sabitlemek yerine `ANTHROPIC_ARAMA_MODELI` ile açık bırakıldı.

**8. Hız sınırı maliyet koruması.**

Her arama ücretli bir istek. Form sınırından ayrı bir kova: dakikada 10.
Gerçek ziyaretçiyi rahatsız etmez, betiği durdurur.

**9. Yapılandırma hatası günlüğe, ziyaretçiye değil.**

Geçersiz anahtarda ziyaretçi yalnızca "arama çalışmıyor" görür; anahtar
durumunu dışarıya sızdırmak bilgi verir. Ama sessiz kalırsak özellik
haftalarca bozuk kalır — `console.error` ile işletenin bakacağı yere yazılıyor.

### Ölçüm ve doğrulama

- 24 birim testi: şema reddi (uydurma tip/oda/sıralama), uydurma mahallenin
  URL'ye yazılmaması, ters fiyat aralığı, kapalı durum, ağa çıkmadan önceki
  doğrulama kapıları, SDK yüzeyinin varlığı
- Duman testi: anahtar **yokken** `/portfoy` açıldı → kutu basılmadı,
  filtreler çalıştı. Anahtar **varken** açıldı → kutu, KVKK ibaresi ve
  örnek metin basıldı.
- Geçersiz anahtarla gerçek ağ çağrısı yapıldı: istek serileşti, API'ye
  ulaştı, 401 döndü, hata yolu insani mesaj üretti ve anahtar durumunu
  sızdırmadı; günlüğe operatör uyarısı düştü.
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1006 test) ✅ `build` ✅

### ⚠️ Doğrulanmamış kalan tek yol: BAŞARILI yanıt

Geçerli bir `ANTHROPIC_API_KEY` olmadığı için **başarılı bir çağrının
çözümlenmesi** denenemedi. Doğrulanan: istek şekli (SDK tipleri + gerçek
401), hata yolları, kapalı durum, şema reddi. Doğrulanmayan: modelin gerçek
çıktısının şemaya uyması ve çevirinin kalitesi.

**Anahtar gelince yapılacak duman testi (2 dakika):**

1. `.env` → `ANTHROPIC_API_KEY=sk-ant-...`
2. `pnpm dev`, `/portfoy` aç
3. Şunu yaz: *"Muhittin'de 5 milyon altı 3+1, getirisi iyi olsun"*
4. Beklenen: `/portfoy?mahalle=muhittin&odaSayisi=3+1&enCokFiyat=5000000&siralama=carpan_artan`
   adresine gidilir, filtre çubuğu bu değerleri gösterir
5. Sonra şunu yaz: *"OSB'ye 10 dakika, güney cephe daire"* — "şunları
   filtreye çeviremedik" satırı görünmeli
6. Görünmüyorsa istem (`sistemIstemi`) ayarlanmalı; kod değil.

---

## Rol tabanlı yetkilendirme

Teknik borç listesindeki "`Kullanicilar.rol` alanı var ama erişim
kurallarına bağlı değil" maddesi kapatıldı. Bu bir güvenlik açığıydı:
`rol` alanı **zorunlu** ve doluydu ama hiçbir yerde okunmuyordu — giriş
yapan herkes yönetici kadar yetkiliydi.

### İki rol

| | yonetici | danisman |
| --- | --- | --- |
| Panele giriş | ✅ | ✅ |
| İlan, mahalle, POI, medya oluştur/güncelle | ✅ | ✅ |
| Talep, değerleme, danışman başvurusu güncelle | ✅ | ✅ |
| Gözlem gir (haftalık endeks rutini) | ✅ | ✅ |
| **Kayıt silme (her koleksiyon)** | ✅ | ❌ |
| **Vergi parametreleri** | ✅ | ❌ |
| **Hukuki sayfalar** (KVKK, gizlilik, kullanım koşulları) | ✅ | ❌ |
| **Kurumsal bilgiler** (yetki belgesi no) | ✅ | ❌ |
| **Endeks / değerleme ayarları** | ✅ | ❌ |
| **Site ve portföy vitrini, altbilgi** | ✅ | ❌ |
| **Kullanıcı oluştur / sil / rol değiştir** | ✅ | ❌ |
| Kullanıcı listesi | herkesi görür | yalnızca kendini |
| Kendi şifresi / telefonu | ✅ | ✅ |

### Kararlar ve gerekçeleri

**1. Emin olmadığım her yetki yöneticide kaldı.** ⭐

Aslıhan yönetici olduğu için danışmanı kısıtlamanın ona maliyeti yok. İki
yönde hata yapmanın maliyeti ise simetrik değil:

- Fazla kısıtladıysak → danışman "şuraya erişemiyorum" der, açarız.
- Az kısıtladıysak → yanlış vergi oranı yayınlanır, ilan silinir, biri
  kendini yönetici yapar. Bunlar geri alınırken kolay değil ve bir kısmı
  fark bile edilmez.

Gevşetilebilecek yetkilerin listesi SENDEN-BEKLENENLER.md'de.

**2. Silme her yerde yöneticide.**

Silme bu projede diğer işlemlerden farklı: bir ilan silindiğinde EİDS
kayıtları (taşınmaz numarası, yetki tarihleri) da gider ve bunlar yasal
dayanak. Bir gözlem silindiğinde endeksin geçmişi değişir. **Güncelleme
hatası düzeltilir, silme hatası düzeltilmez.**

**3. Üç yetki yükseltme kapısı birlikte kapatıldı.**

Biri açık kalsaydı diğer bütün kısıtlamalar anlamsız olurdu:
- `create` yöneticide değilse → danışman kendine yönetici hesabı açar
- `rol` alanı kilitli değilse → danışman kendi kaydından kendini yükseltir
  (kendi kaydını güncelleyebilmesi gerekiyor: şifre, telefon)
- `delete` yöneticide değilse → danışman tek yöneticiyi siler

**4. İlk kullanıcı daima yönetici — kilitlenme koruması.** ⚠️

Payload'ın ilk kullanıcı akışı erişim denetimini atlar ve `rol` alanını
varsayılan "danisman" ile açar. Aslıhan kurulumda bu alanı fark etmezse
**kendi panelinden kilitlenirdi** ve onu düzeltebilecek bir yönetici de
olmazdı. Kural saf fonksiyon olarak (`yeniKullanicininRolu`) yazıldı ki
test edilebilsin — bu hata üretimde, ilk kurulum anında ortaya çıkardı.

**5. Rolü çözülemeyen kullanıcı yönetici SAYILMAZ.**

Eski bir oturumda `rol` gelmiyorsa "herhalde yöneticidir" varsayımı
yetkilendirmeyi sessizce kapatmanın en yaygın yolu. Testi var.

### Testin yakaladığı gerçek hata

`yeniKullanicininRolu` fonksiyonuna kullanıcı **nesnesinden** rol okuyan
yardımcı verilmişti; oysa fonksiyona ham **rol dizesi** geliyor. Sonuç:
fonksiyon her rolü `null` çözüyor ve **her yeni kullanıcıyı sessizce
danışmana düşürüyordu.** Aslıhan hiç yönetici meslektaş ekleyemezdi ve
hata mesajı da almazdı — kayıt "başarıyla" oluşurdu.

Entegrasyon testindeki "yönetici vergi parametresi oluşturabilir" satırı
yakaladı: test yöneticisi aslında danışman olarak yaratılmıştı.

### Doğrulama

- **5 birim testi** — rol çözümleme, ilk kullanıcı kuralı, geçersiz rolün
  yöneticiye değil danışmana düşmesi
- **14 entegrasyon testi**, gerçek veritabanına karşı, `overrideAccess:
  false` ile (panelin kullandığı yolun aynısı). İki yönlü: hem yasakların
  tuttuğunu hem danışmanın günlük işini yapabildiğini kanıtlıyor.
- **Panel duman testi:** gerçek danışman hesabıyla giriş yapıldı; `/admin`,
  ilanlar, vergi parametreleri, kullanıcılar ve kurumsal bilgiler
  sayfalarının hepsi 200 döndü — fazla sıkı kural paneli çökertmiyor.
- **HTTP duman testi:** REST API üzerinden vergi parametresi oluşturma,
  kullanıcı oluşturma ve kurumsal bilgi güncelleme **403** döndü; kullanıcı
  listesi yalnızca kendi kaydını verdi. Kural yalnızca Local API'de değil,
  danışmanın gerçekten kullandığı yolda da bağlı.
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1118 test) ✅ `build` ✅

### Göç gerekmedi

Şema değişmedi — `rol` alanı zaten vardı. Geliştirme veritabanındaki tek
kullanıcı zaten `yonetici`, üretim veritabanında hiç kullanıcı yok
(ilk kurulum yapılmamış). Kimse kilitlenmiyor.

---

## İlan yayın onayı — onay kuyruğu

Aslıhan'ın kararı: yayına alma yöneticiye geçsin **ama operasyonu
tıkamadan.** Danışman hazırlar ve gönderir, yönetici doğrular ve yayınlar.

### Akış

```
danışman: ilanı hazırlar          → taslak
danışman: "yayına gönder"          → onay_bekliyor   (ziyaretçiye GÖRÜNMEZ)
yönetici: bildirim şeridinde görür → onay kuyruğu
yönetici: EİDS alanlarını doğrular → yayinda
danışman: vazgeçerse               → taslak (geri çekme)
```

### Kararlar ve gerekçeleri

**1. Onay, EİDS kancasının YERİNE GEÇMEZ — ÜSTÜNE BİNER.** ⭐

`eidsYayinEngeli` aynen çalışıyor: **yönetici bile** EİDS koşulları
sağlanmadan yayına alamıyor. Onay ikinci bir kapı, birincinin ikamesi
değil. Entegrasyon testi bunu ayrıca kanıtlıyor.

**2. Kural DEĞERE değil DEĞİŞİKLİĞE bakar.** ⭐ En kolay yapılacak hata

`durumDegisikligiGecerliMi` önce `onceki === hedef` kontrolü yapıyor.
Bu satır olmasaydı danışman **yayındaki bir ilanın fiyatını bile
güncelleyemezdi**: kısmi güncellemede hedef durum yine `yayinda` gelir ve
salt değere bakan bir kural her kaydetmeyi reddederdi. Hem birim hem
entegrasyon testi bu senaryoyu ayrı ayrı tutuyor.

**3. Kancanın sırası: onay → EİDS.**

Danışman eksik EİDS'li bir ilanı doğrudan yayına almaya çalıştığında
"EİDS eksik" değil "bu yönetici işi, onaya gönderin" mesajını görmeli.
İkincisi eyleme dönük olan.

**4. Kullanıcısız çağrılar kısıtlanmıyor.**

Bakım cron'u, içe aktarma ve seed kullanıcısız çalışır (`rol === null`).
Kısıtlansaydı **yetkisi dolan ilanı yayından kaldıran görev çalışamaz** ve
yasal engel kendi kendini kilitlerdi.

**5. Onay bildirimi yalnızca yöneticiye.**

Danışman kuyruğa bakıp bir şey yapamaz; ona göstermek üzerinde işlem
yapamayacağı bir uyarı biriktirir ve şeridin tamamını görmezden gelmeyi
öğretir. Bildirim `yasal` değil `onemli`: kuyrukta bekleyen ilan duran bir
iştir, ihlal değil — ikisini aynı ağırlıkta göstermek yasal olanı
görünmez kılar.

**6. Sahiplik kısıtı KONULMADI.**

Aslıhan "danışman kendi ilanını geri çekebilsin" dedi; ben bunu "geri
çekme mümkün olmalı" olarak uyguladım, "yalnızca kendi ilanı" olarak
değil. Sebep: danışman zaten her ilanı düzenleyebiliyor
(`update: yalnizcaPanel`); geri çekmeyi sahipliğe bağlamak tutarsız
olurdu. İlan bazlı sahiplik istenirse ayrı bir karar — SENDEN-BEKLENENLER.

### Göç — elle düzeltildi ⚠️

`payload migrate:create` iki şey üretti; biri istenmeyendi:

```sql
ALTER TYPE enum_ilanlar_durum ADD VALUE 'onay_bekliyor' BEFORE 'yayinda';
ALTER TABLE kullanicilar ALTER COLUMN rol DROP NOT NULL;   ← SİLİNDİ
```

İkinci satır, rol yetkilendirmesinde `rol` alanına eklenen **alan seviyesi
erişim kuralının** yan etkisi: Payload, erişim denetimli bir alanın
yazmadan çıkarılabileceğini varsayıp sütunu nullable işaretliyor.

Satır silindi. "Her kullanıcının bir rolü vardır" bir veri bütünlüğü
güvencesi ve kaybetmenin karşılığı yok — alan `required`, kanca her
oluşturmada rolü yazıyor, alan erişimi yalnızca güncellemede alanı düşürür
ve güncellemede sütun eski değerini korur.

⚠️ **Düzeltme:** İlk yazdığımda "sonraki `migrate:create` çağrıları bu
satırı yeniden önerecek" demiştim; **yanlış.** Payload canlı veritabanıyla
değil, göç dosyasının yanındaki `.json` anlık görüntüsüyle karşılaştırıyor
ve o görüntü sütunu zaten nullable kaydetti. Yani öneri tekrarlanmayacak.

Kalan fark şu: **anlık görüntü nullable diyor, veritabanı NOT NULL.**
Zararsız, çünkü hiçbir göç kısıtı düşürmüyor — göçlerden sıfırdan kurulan
bir veritabanı da NOT NULL olur. Fark yalnızca diff dosyasında.
(`ai_arama` göçü üretilirken doğrulandı: satır yeniden önerilmedi.)

`down` da düzeltildi: üretilen hâli enum'u doğrudan daraltıyordu ve
kuyrukta tek bir ilan varsa son dönüşüm patlayıp göçü yarıda bırakırdı.
Artık önce veri taşınıyor (`onay_bekliyor` → `taslak`), sonra tip
daraltılıyor.

### Doğrulama

- **13 birim testi** — geçiş kuralları, "durum değişmiyorsa serbest",
  kullanıcısız çağrı, tekil/çoğul dil
- **8 entegrasyon testi** — onaya gönderme, doğrudan yayına alamama, geri
  çekme, yayındaki ilanı düzenleyebilme, yöneticinin yayınlaması,
  **eksik EİDS'te yöneticinin de yayınlayamaması**, kuyruğun ziyaretçiye
  görünmemesi
- **4 bildirim testi** — kuyruk boşken sessiz, sayı ve bağlantı doğru,
  öncelik `onemli`
- **HTTP duman testi:** danışman hesabıyla `PATCH /api/ilanlar/:id`
  → `yayinda` **403** ve eyleme dönük Türkçe mesaj istemciye ulaştı;
  `onay_bekliyor` ve geri çekme geçti.
- **Panel duman testi:** yönetici panelinde "1 ilan yayın onayı bekliyor"
  göründü, aynı anda danışman panelinde **görünmedi**.
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1143 test) ✅ `build` ✅

---

## AI arama — KVKK onayına kadar KAPALI

Aslıhan'ın kararı: özelliği maliyet yüzünden değil, **yurt dışına veri
aktarımı** yüzünden ertele. Avukat metinleri gelmeden açılmayacak.

### Ne yapıldı

- `ai_arama` site bölümü eklendi, **varsayılan KAPALI**
- `/portfoy` kutusu artık **iki** koşula bağlı: bölüm açık **VE** anahtar tanımlı
- `docs/AI-ARAMA-KVKK-NOTU.md` — avukat için veri akışı notu
- Ham sorgunun hiçbir yere yazılmadığı doğrulandı

### Kararlar

**1. İki koşul, tek değil.**

Önceden yalnızca `ANTHROPIC_API_KEY` kontrol ediliyordu. Anahtarın bir gün
başka bir amaçla (örn. sunucu tarafı rapor üretimi) tanımlanması, arama
kutusunu istemeden açardı. Artık bölüm anahtarı ayrı bir karar noktası.

**2. Bölüm modeli genişletildi: her bölüm bir sayfa değil.**

`ai_arama`'nın rotası yok — mevcut bir sayfanın üzerindeki bileşen.
`rotalar: []` artık geçerli. Testteki değişmez kural zayıflatılmadı,
daraltıldı: "her bölümün rotası vardır" → **"rotasız bölüm gezinmede
görünmez"** (rotasız bir bölümü altbilgiye koymak hiçbir yere gitmeyen bir
bağlantı üretirdi).

Varsayılan kapalı bölümlerin listesi de teste açıkça yazıldı; "kapalı
olanları atla" demek, yeni bir bölümün yanlışlıkla kapalı doğmasını
gizlerdi.

**3. Ham sorgu saklanmıyor — zaten saklanmıyordu.**

Karar "ham sorguları loglama, sadece türetilmiş filtreyi sakla" idi.
Mevcut durum bundan daha katı: **hiçbir şey saklanmıyor.** Ne sorgu, ne
filtre; veritabanına da günlüğe de yazılmıyor. Türetilen filtre yalnızca
ziyaretçinin adres çubuğunda yaşıyor.

Filtre analitiği istenirse ayrı bir iş — istenmeden veri toplamaya
başlamıyorum. Günlüğe yalnızca yapılandırma hataları yazılıyor ve o
kayıtlar sorgu metnini içermiyor (kodda doğrulandı).

**4. Avukat notu hukuki metin değil.**

CLAUDE.md kural 3: hukuki metinleri ben yazmam. `AI-ARAMA-KVKK-NOTU.md`
bir aydınlatma metni değil, **avukatın metni yazabilmesi için teknik
tarif**: hangi veri, nereye, ne amaçla, ne saklanıyor, ziyaretçi ne
görüyor. Sonunda beş somut soru var (açık rıza gerekir mi, VERBİS'e
beyan gerekir mi, …).

### Göç notundaki hatam — düzeltildi

Önceki bölümde "sonraki `migrate:create` çağrıları `rol` NOT NULL düşürme
satırını yeniden önerecek" yazmıştım. **Yanlıştı.** Payload canlı
veritabanıyla değil, göçün yanındaki `.json` anlık görüntüsüyle
karşılaştırıyor; o görüntü sütunu zaten nullable kaydetmiş. `ai_arama`
göçü üretilirken doğrulandı: satır tekrarlanmadı. Not düzeltildi.

### Doğrulama

- 4 yeni bölüm testi (varsayılan kapalı, rotasız, gezinmede yok, 404 yapmıyor)
- Mevcut bölüm değişmezleri güncellendi, zayıflatılmadı
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1147 test) ✅ `build` ✅

### Açmak için üç adım (sırayla)

1. Avukat metni → Payload admin → Sayfalar
2. `.env` → `ANTHROPIC_API_KEY`
3. Payload admin → Ayarlar → Site Bölümleri → "AI doğal dil arama" aç

Üçü birden yapılmadan kutu ziyaretçiye görünmez.

---

## OpenStreetMap POI içe aktarma

Aslıhan'ın kararı: yaz — en yüksek kaldıraçlı iş, elle giriş aylar alır.
Şartları: ODbL atıf, `kaynak: osm` işareti, elle düzeltilmiş kayıt
ezilmesin, Çorlu sınırıyla kısıtla, kategori eşlemesi belgelensin.

### Ne yapıldı

- `IlgiNoktalari`: `kaynak`, `osmKimlik`, `elleDuzenlendi` alanları
- `src/lib/osm/eslesme.ts` — kategori eşleme tablosu (gerekçeleriyle)
- `src/lib/osm/sorgu.ts` — Overpass sorgusu ve cevap çözümleyici
- `src/lib/osm/iceAktarma.ts` — uzlaştırma ve yazma
- `/admin/osm-poi-ice-aktar` — önizlemeli sihirbaz (yalnızca yönetici)
- `/veri-kaynaklari` — ODbL lisansı ve kategori eşlemesi (yayında)
- `CevreBolumu` — POI görünen her yerde "© OpenStreetMap katkıcıları"

### Kararlar ve gerekçeleri

**1. Çorlu sınırı MAHALLE MERKEZLERİNDEN türetiliyor.** ⭐

Sabit bir Çorlu kutusu koda yazılmadı. İki sebep:
- **Uydurma veri riski:** Çorlu'nun sınır koordinatlarını ezberden yazmak,
  doğrulanmamış bir rakamı koda gömmek olurdu (CLAUDE.md kural 2).
- **Kendiliğinden doğru kalır:** yeni mahalle eklendiğinde kutu büyür;
  sabit bir kutu o mahalleyi dışarıda bırakır ve kimse fark etmezdi.

Merkez yoksa içe aktarma çalışmaz ve sebebini söyler. Kutu ülke ölçeğine
şişerse (bir mahallenin merkezi yanlış ile girilmişse) reddedilir.

**2. Elle düzeltilen kayıt ezilmez — iki parçalı koruma.** ⭐

`osmElleDuzenlemeIzi` kancası insan düzenlemesini işaretler; içe aktarma
işaretli kaydı atlar ve "korundu" diye sayar. İçe aktarıcı kendi
yazmalarında `context.osmIceAktarma = true` gönderiyor — bu bayrak
olmasaydı ilk içe aktarma her kaydı "elle düzenlendi" işaretler ve ikinci
içe aktarmada hiçbir şey güncellenmezdi.

**3. Sorgu, eşleme tablosundan türetiliyor.**

Sorgu elle yazılsaydı tabloya yeni bir tip eklenip sorguya eklenmemesi
(ya da tersi) an meselesiydi.

**4. Geniş sorulan anahtarlar — "neyin dışarıda kaldığını" görebilmek için.**

⚠️ İlk yazımda sorgu yalnızca eşlediğimiz **değerleri** istiyordu. Duman
testinde ortaya çıktı ki bu, "eşlenmeyen etiketler" raporunu **daima boş**
bırakıyor: sorduğumuz her şey zaten eşleşiyordu. Yani kodda ve arayüzde
verdiğim "eczaneleri de alalım mı sorusunu görerek sorabilirsiniz" sözü
tutulmuyordu.

`amenity`, `shop`, `leisure`, `office` artık **değer süzgeci olmadan**
soruluyor. `highway`, `railway`, `landuse`, `aeroway` dar kalıyor —
geniş sorulsa ilçedeki bütün yol ağı ve ray parçaları inerdi.

Gerçek ölçüm (Çorlu, 3 km pay): 277 eşleşen nokta, **126 eşlenmeyen tür** —
60 oyun alanı, 50 otopark, 34 restoran, 27 ibadethane, 21 eczane.
Artık soru sorulabilir.

**5. Adsız nokta atlanır ve sayılır.**

"En yakın okul: (isimsiz)" bilgi değil gürültü. Aynı ölçümde 111 adsız
nokta atlandı.

**6. Yalnızca yönetici.**

Yüzlerce kayıt oluşturuyor ve dış servise sorgu atıyor; danışmanın günlük
işi değil. Menü bağlantısı da danışmana gösterilmiyor — tıklayınca
"yetkiniz yok" diyen bir bağlantı, kullanılamayan bir menü öğesidir.

**7. Atıf kayıt bazında.**

Mesafe sorgusu artık `kaynak` da taşıyor; atıf yalnızca gerçekten OSM
kaydı gösterildiğinde basılıyor. **Elle toplanmış veriyi OSM'e atfetmek,
atfı unutmak kadar yanlış olurdu.**

**8. Scraping yasağıyla çelişmiyor.**

CLAUDE.md kural 6 ilan platformlarının kullanım koşullarını ihlal eden
otomatik veri çekmeye ait. OSM açık veridir, ODbL ile yeniden kullanım
için lisanslanmıştır ve Overpass API bu iş için yapılmış resmî arayüzdür.

### Testlerin yakaladığı gerçek hata

**Elle düzeltme koruması tamamen çalışmıyordu.** Kanca yalnızca
`data.elleDuzenlendi === false` kontrol ediyordu; oysa Payload kısmi
güncellemede kaydın mevcut `false` değerini de `data` içinde gönderiyor.
Sonuç: her insan düzenlemesi "kullanıcı işareti kaldırdı" sanılıyor ve iz
basılmadan geçiyordu — yani özelliğin tek vaadi tutmuyordu.

Doğru ayrım öncekiyle karşılaştırmak: işaret **daha önce true idi ve şimdi
false geldiyse** kullanıcı bilerek kaldırmıştır.

Ayrıca `ortam.test.ts` (ortam değişkeni belgeleme denetimi)
`OVERPASS_ADRESI`'nin `.env.example`'da eksik olduğunu yakaladı.

### Doğrulama

- **24 birim testi** — eşleme, kutu hesabı (boylam düzeltmesi dahil), ülke
  ölçeğine şişmiş kutunun reddi, sorgu biçimi, cevap çözümleme
- **6 entegrasyon testi** — kaynak izi, içe aktarıcının kendi yazmasının iz
  bırakmaması, **panelden düzenlemenin işaretlemesi**, **işaretli kaydın
  ezilmemesi**, işaretin kaldırılabilmesi, elle girilmiş kayda iz basılmaması
- **Gerçek Overpass duman testi** — yukarıdaki ölçüm. Test verisi silindi.
- Kapı: `typecheck` ✅ `lint` ✅ `test` (1185 test) ✅ `build` ✅

### Raporun ilk çıktısı: eczane ve çocuk oyun alanı eklendi

Eşlenmeyen tür raporu tam olarak amaçlandığı işi yaptı. Aslıhan raporu
okuyup karar verdi (12 Ağustos 2026):

- **`amenity=pharmacy` → `eczane`** — sağlık erişiminin günlük ölçüsü.
  Hastane "var mı yok mu" sorusunu yanıtlıyor, eczane "yürüme mesafesinde
  mi" sorusunu.
- **`leisure=playground` → `oyun_alani`** — çocuklu aile için mahalle
  kalitesinin doğrudan göstergesi. Parktan **ayrı** sayılıyor: her park
  oyun alanı içermiyor ve ikisi aynı şey değil.
- **`amenity=restaurant` → EKLENMEDİ.** Sinyal değeri düşük, merkeziyeti
  zaten AVM/market/ulaşım kriterleriyle ölçüyoruz, veriye gürültü ekler.

İkisi de yatırım skorunun **sosyal donatı** bileşenine giriyor
(`SOSYAL_DONATI_TIPLERI`), mahalle sayfasındaki çevre listesinde
görünüyor ve haritada ilgili renk grubuna düşüyor.

**Bilinçli dışlamalar artık yazılı.** `BILINCLI_DISARIDA` tablosu
eklendi: raporda düzenli görünen ama almamaya karar verdiğimiz türler,
gerekçesiyle. Rapor bunları "aktarılmadı, isterseniz ekleriz" diye değil
**"bilinçli olarak dışarıda — sebebi şu"** diye gösteriyor. Gerekçe
`/veri-kaynaklari` sayfasında da yayınlanıyor. Yazılı olmasaydı aynı soru
her içe aktarmada yeniden sorulur ve baştan tartışılırdı.

**Rapor kalıcılaştırıldı.** Önceden kapalı bir `<details>` içindeydi ve
yalnızca boş değilken görünüyordu. İkisi de değişti:

- Açık geliyor — kapalı bir rapor okunmayan rapordur.
- Boşken de görünüyor ("dışarıda kalan tür yok"). Yoksa "rapor çalıştı ve
  temiz çıktı" ile "rapor hiç üretilmedi" ayırt edilemezdi.
- 40'tan fazla tür varsa kaç türün gizlendiği yazılıyor; sessiz kırpma yok.

**Yayınlanan metodoloji düzeltildi.** `/veri-kaynaklari` sayfası
"eczane ... içe aktarılmıyor" diyordu; artık yanlıştı.

#### Göç geri alması yine elle düzeltildi

Üretilen `down` doğrudan enum'u yeniden kuruyordu. Tek bir eczane ya da
oyun alanı kaydı varsa son `USING tip::enum` dönüşümü patlar ve göç yarıda
kalırdı — `onay_bekliyor` göçündeki tuzağın aynısı.

Kayıtlar önce en yakın anlamlı tipe çekiliyor: `eczane → hastane`
(tipin etiketi zaten "Hastane / sağlık"), `oyun_alani → park`.

**Gerçek veriyle denendi:** iki kayıt eklendi, `migrate:down` çalıştırıldı,
kayıtlar `hastane` ve `park` olarak sağ çıktı, enum daraldı, hata yok.
Sonra göç yeniden uygulandı ve test kayıtları silindi.

- Kapı: `typecheck` ✅ `lint` ✅ `test` (1191 test) ✅ `build` ✅

### Bilinen sınırlar

- Tek seferde 3.000 nokta tavanı (kaza koruması).
- İçe aktarma mahalle ilişkisini kurmuyor — POI'nin hangi mahallede olduğu
  boş kalıyor. Mahalle sınırı (polygon) verisi girildiğinde PostGIS ile
  otomatikleştirilebilir; şimdilik yakınlık hesapları mahalle ilişkisine
  değil koordinata bakıyor, yani eksiklik bir şeyi bozmuyor.
- Overpass herkese açık sunucu kullanıyor; yoğun saatlerde yavaş olabilir.
  `OVERPASS_ADRESI` ile ayna adres verilebilir.

---

## Bilinen eksikler ve teknik borç

| Konu | Etki | Not |
| --- | --- | --- |
| **Tüm sayfalar dinamik render** | TTFB ve önbellek | Layout, çerez onayını okumak için `cookies()` çağırıyor; bu bütün rotaları dinamik yapıyor. Bilinçli takas — yasal güvence performanstan önce. Çözüm adayı: PPR / `cacheComponents` olgunlaştığında dinamik parçaları `Suspense` içine almak. |
| Lighthouse eşikleri engelleyici değil | Regresyon kaçabilir | Gerçek içerik gelince zorunlu yapılacak |
| Derleme: yerel 107 sn, **CI 37 sn** | Sorun değil | Eşik 150 sn'ye çekildi; CI bunun çok altında. `.next/cache` önbelleği eklendi ama Turbopack oraya yazmadığı için kazancı yok — ölçüm ve gerekçe "CI derleme önbelleği ölçümü" başlığında. |
| **Sunucu tarafı PDF yok** | Rapor e-postaya iliştirilemiyor | Faz 4: Playwright + headless Chrome ile `/rapor/*` rotaları render edilecek. Türkçe sorunu yok, `@media print` aynen geçerli. Chromium ~300 MB → kuyrukta çalışmalı. SMTP gelmeden anlamsız. |
| **AI aramanın başarılı yolu doğrulanmadı** | Anahtar gelene kadar bilinmiyor | Geçerli `ANTHROPIC_API_KEY` olmadığı için yalnızca hata/kapalı yolları denendi. Duman testi tarifi "Faz 4 kalanı" başlığında. |
| AI arama KVKK metni bekliyor | Üretimde açılamaz | Yurt dışına aktarım aydınlatma metnine eklenmeli — avukat işi. Anahtar tanımlanmadıkça özellik kapalı. |
| SMTP yok | Lead bildirimi gitmiyor | Kayıt düşüyor, e-posta gitmiyor. Bilgi bekleniyor. |
| E-posta bildirimi kodu yok | — | SMTP bilgileri gelince `yetkisiBitecekleriBildir` görevine eklenecek |
| `sharp` 0.34'e sabit | — | Payload sürüm yükseltmesinde 0.35 tekrar denenebilir |
| PostGIS `tiger`/`topology` şemaları | Disk | Düşük öncelik |
| `ilgi_noktalari.konum` üzerinde GiST indeks yok | Ölçekte sorgu süresi | Bilinçli. Payload'ın ürettiği göç, elle eklenen indeksi sessizce `DROP` edebilir; kazanç bu ölçekte ölçülemez. Tetik: 10.000+ POI kaydı. |
| Sürüş süresi (dakika) yok | "OSB'ye 10 dk" denemiyor | Rotalama servisi (OSRM) + yol ağı verisi gerekir. Mesafeler kuş uçuşu olarak, böyle etiketlenerek gösteriliyor. |
| ~~Rol tabanlı yetkilendirme~~ | ✅ | Kapatıldı — `yonetici` / `danisman` ayrımı erişim kurallarına bağlandı. Hangi yetkinin nerede olduğu "Rol tabanlı yetkilendirme" başlığında. |
| Gizli portföy modülü | ✅ | Faz 2B'de tamamlandı |
| Eşleştirme profili boş | Test sonuç üretmez | `Mahalleler → Eşleştirme profili` 4 alan doldurulmalı; SENDEN-BEKLENENLER md. 8 |
| Radar en az 4 mahalle ister | Sayfa boş durum gösterir | Verisi olan mahalle sayısı 4'e ulaşınca kendiliğinden açılır |

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

---

## Çalışma zamanı yapılandırması — üretimde dokuz değişken ölüydü

Frontend yeniden tasarımına başlamadan önce Aslıhan'ın istediği ön kontrol
(*"NEXT_PUBLIC_* taraması yapıldı mı? Harita şu an çalışıyor mu?"*) gerçek
bir arıza ortaya çıkardı ve arıza tek bir değişkenden büyüktü.

### Ne bozuktu

Next.js `NEXT_PUBLIC_*` değişkenlerini **derleme anında** pakete gömer —
sunucu tarafında bile. Üretim imajı GitHub Actions'ta derleniyor ve:

- `docker/Dockerfile` derleme aşamasında bu değişkenler için `ARG` yoktu,
- `.github/workflows/imaj.yml` `build-args` vermiyordu,
- `docker/compose.prod.yml` üçünü çalışma zamanı `environment:` olarak
  veriyordu — çoktan derlenmiş bir pakete etkisi yok.

Sonuç: yayına giden imajda dokuz değişken de boş dizeydi.

**Canlı sunucuda doğrulandı** (salt okunur):

```
$ docker exec aslihangyd-uygulama sh -c 'env | grep -i maptiler'
(çıktı yok)

$ curl -s http://127.0.0.1:3000/harita | grep -c api.maptiler.com
0
```

| Ne | Belirtisi |
| --- | --- |
| MapTiler anahtarı | `/harita` kalıcı boş durumda |
| Turnstile site anahtarı | Danışman başvuru formu bot korumasız |
| Umami | Analitik betiği hiç yüklenmiyor |
| Bunny kütüphane + CDN | Videolar "oynatıcı yapılandırılmadı" |
| WhatsApp / telefon / e-posta | CMS boşsa yedek de boş |

Hiçbiri hata vermiyordu. Harita özellikle can sıkıcı: OSM'den içe
aktardığımız POI verisinin göründüğü **tek yer** orası.

### Neden derleme argümanı değil, çalışma zamanı

İki seçenek vardı. `Dockerfile`a `ARG` ekleyip CI'da `build-args` geçmek
~25 satırla biterdi ve hiçbir bileşene dokunmayı gerektirmezdi. Yine de
çalışma zamanı seçildi, çünkü asıl düzeltilen şey **sessiz yanlış
yapılandırma** ve derleme argümanları onu yeni bir biçimde geri getiriyor:

- Değer GitHub ayarlarında yaşar; depodaki hiçbir test onu denetleyemez.
  Aslıhan on değişkenden dokuzunu girse harita çalışır, WhatsApp sessizce
  boş kalır.
- Telefon numarasını değiştirmek imajı yeniden derlemeyi ve yeniden
  dağıtmayı gerektirir.

Çalışma zamanında değer `.env` içinde — `PAYLOAD_SECRET`in yanında, zaten
düzenlenen tek dosyada — ve `ortam.test.ts` onun belgelendiğini **ve**
compose ile kaba ulaştığını denetleyebiliyor. Desen zaten `src/lib/site.ts`
içinde `SITE_ADRESI` için kurulmuştu; yalnızca yayılmamıştı.

### Ne yapıldı

Dokuz değişken ön eksiz adlara taşındı. Değerler sunucuda okunuyor,
istemci bileşenlerine prop olarak iniyor:

- `lib/harita/sunucu.ts` (yeni, `server-only`) → `HaritaSahnesi` →
  `Harita3B`. `haritaHazir: boolean` propu yerini `stilAdresi: string | null`
  aldı: tek kaynak, anahtar da beraberinde iniyor.
- `DroneVideo` sunucu bileşenine dönüştü, tıkla-oynat cephesi
  `DroneVideoOynatici`'ya ayrıldı. Çağrı yerleri değişmedi.
- Turnstile ve kurumsal iletişim yedekleri zaten sunucuda okunuyordu;
  yalnızca ad değişti.
- `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID` silindi — sunucudaki
  `BUNNY_STREAM_LIBRARY_ID` ile aynı değerin ikinci kopyasıydı.

`import 'server-only'` bilinçli: öneki kaldırmak tek başına yetmezdi, ön
eksiz bir değişken istemci paketinde sessizce `undefined` olur ve harita
yine açılmazdı — bu sefer sebebi görünmeden.

### Kanıt

Aynı derleme çıktısıyla, iki yön de ölçüldü. Derleme sırasında
`MAPTILER_ANAHTARI` **tanımsızdı**:

```
İstemci paketinde api.maptiler.com izi:   yok (yalnızca sunucu chunk'ında)

MAPTILER_ANAHTARI=TEST_ANAHTARI_12345 ile:
  .../style.json?key=TEST_ANAHTARI_12345   sayfada
  "Etkileşimli harita hazırlanıyor"        yok

Anahtarsız:
  api.maptiler.com                          yok
  "Etkileşimli harita hazırlanıyor"         var
```

Yani anahtar artık pakete gömülmüyor ve çalışma zamanında okunuyor —
düzeltilmek istenen şey tam olarak buydu.

### Kapılar

`src/lib/ortam.test.ts` iki yeni testle genişletildi:

1. **Kod `NEXT_PUBLIC_` okumuyor.** Tek muafiyet `src/lib/site.ts`
   içindeki belgelenmiş derleme zamanı yedeği.
2. **Kodun okuduğu her değişken compose ile kaba ulaşıyor.** Bu, asıl
   boşluğu kapatan test: `MAPTILER_ANAHTARI` `.env`de yazılı olabilirdi ve
   compose onu geçirmediği için yine ölü kalırdı. Belge testi yeşil,
   harita ölü.

### Yan bulgu: ham NUL baytı grep'i kör ediyordu

Teşhis sırasında `grep -rn "MAPTILER" src/` yalnızca `lib/harita/ayarlar.ts`
döndürdü ve **"anahtar istemcide kullanılmıyor"** sonucuna götürdü. Yanlıştı:
`Harita3B.tsx` `stilAdresi()` çağırıyordu.

Sebep: `Harita3B.tsx` içinde MapLibre "hiçbir zaman eşleşme" nöbetçisi
**ham bir NUL baytı** olarak yazılmıştı. `file` dosyayı "data" görüyor,
grep ikili sayıp **684 satırın tamamını sessizce atlıyordu.** Aynı desen
`scripts/lighthouse-ozet.mjs` içinde de vardı (bileşik anahtar ayracı).

İkisi de kaçış dizisine çevrildi — çalışma zamanı değeri birebir aynı,
dosyalar düz metne döndü. `Harita3B` içinde aynı nöbetçi iki yerde farklı
yazılmıştı (biri boşluk, biri NUL); tek sabitte birleştirildi.

Bu bilinçli bir tercihti ve `alfabe.test.ts` içinde gerekçesiyle muaf
tutulmuştu — ama bedeli (araçlara görünmezlik) hesaba katılmamıştı.
Muafiyet kaldırıldı, yerine `src/lib/kaynakHijyeni.test.ts` geldi: kaynak
dosyalarda sekme/satır sonu dışında ham kontrol karakteri yasak.

Not: testi yazarken kaçış dizisini örneklemek isterken **aynı hatayı
tekrar yaptım** — dosyaya ham NUL girdi ve yeni test onu ilk koşumda
yakaladı. Hatanın ne kadar kolay tekrarlandığının iyi bir ölçüsü.

### Belge düzeltmesi

`.env.production.example` hâlâ `https://aslihangyd.com:8443` yazıyordu.
O kurgu (Cloudflare origin sertifikası + dolu portlar) kaldırılmış,
`compose.prod.yml` 80/443 yayınlıyor. Porta takılı bir `SITE_ADRESI`
arama motoruna ulaşılamayan kanonik adresler bildirir — sessiz SEO hasarı.
Düzeltildi.

### Bilinen sınır

`ANTHROPIC_API_KEY` ve `ANTHROPIC_ARAMA_MODELI` compose'a **bilinçli
olarak eklenmedi**: AI arama avukat metinleri gelene kadar ertelendi
(KVKK — sorgu yurt dışına gidiyor). Anahtarı kaba hiç sokmamak, SiteSections
anahtarının üstüne ikinci bir kapı. Gerekçe hem compose'da hem testin muaf
listesinde yazılı.
## Frontend yeniden tasarımı — Aşama 1: palet ve tipografi

`docs/FRONTEND-YENIDEN-TASARIM.md` §1, §3 ve §10. Lacivert/bakır sistemi
tamamen gitti; yerine lacivert/adaçayı/gold geldi.

### Rampalar nasıl üretildi

Aslıhan altı taban renk verdi. Rampaların (50–900) geri kalanı **OKLab'de**
üretildi: taban renk kendi basamağında sabit, üstü neredeyse beyaza, altı
çok koyuya doğru algısal olarak eşit aralıklarla interpole edildi.

İlk denemede sRGB'ye yakın bir yaklaşım kullanıldı ve koyu taban renklerde
açık basamaklar **beyaza çöküyordu** (lacivert-50/100/200 üçü de `#ffffff`
çıktı). Çapa tabanlı interpolasyona geçilince rampa monotonlaştı; testlerden
biri artık tam olarak bunu denetliyor ("rampalar açıktan koyuya monoton").

Nötr rampasının ilk iki basamağı **türetilmedi**: 50 = kırık beyaz
`#F7F6F2`, 100 = açık gri `#E9ECEB`. İkisi farklı sıcaklıkta (biri sarıya,
diğeri yeşile çalıyor) ve bu paletin kendi tercihi; türetseydik ikisi de
aynı eksene düşerdi.

### Dokümandaki kontrast iddiaları — ölçüldü

| İddia | Doküman | Ölçülen | Sonuç |
| --- | --- | --- | --- |
| Adaçayı zemin + beyaz metin | 4,75 | **4,74** | ✅ AA geçiyor |
| Adaçayı METİN, kırık beyaz üstünde | 4,41 | **4,38** | ✅ doğru, AA geçmiyor |
| Gold zemin + antrasit metin | 6,8 | **6,89** | ✅ geçiyor |
| Gold METİN, kırık beyaz üstünde | 2,23 | **2,06** | ✅ ağır ihlal (dokümandan da kötü) |

Dördünün de **yönü** doğru çıktı. İki değerde küçük sapma var; ikisi de
kararı değiştirmiyor.

`adacayi-metin` için doküman `#3E6354` civarını öneriyordu. Ölçüm: kırık
beyazda **6,22:1**, açık gride **5,66:1**. AA'nın epey üstünde, önerilen
değer aynen alındı. (Eşiği kıl payı geçen en açık varyant `#467361` idi —
4,99/4,54; pay bırakmak için kullanılmadı.)

### Kontrast testinin yakaladığı beş gerçek sorun

Palet elle "iyi görünüyor" diye onaylanmadı; test **iki temada 94 çiftin**
hepsini ölçüyor ve beşi ilk denemede kırmızıydı:

1. **Karanlık tema yardımcı metni** `yuzey-2` üzerinde 3,91:1 — gözlem
   sayısı ("n = 23") çoğu zaman tam olarak orada duruyor. İki basamak açıldı.
2. **Karanlık tema hata metni** yeni lacivert yüzeyde 4,48:1 — kıl payı
   altında. Bir basamak açıldı.
3. **Karanlık tema adaçayı bağlantısı** tint yüzeyde 3,91:1. `300` → `200`.
4. **Karanlık tema buton hover'ı** 3,55:1 — hover koyu temada *açılıyordu*
   ve beyaz metni yutuyordu. Hover artık iki temada da koyulaşıyor.
5. **Gold rozetin metni.** Rozet zemini temaya göre değişmiyor ama
   `--color-metin` değişiyordu; koyu temada kırık beyaz metin gold üstünde
   2,06:1 veriyordu. Kural: zemin temaya göre değişmiyorsa üzerindeki metin
   de değişmez — rozet metni artık doğrudan antrasit.

### Gold'un 3:1 sorunu ve neden muafiyet değil

Açık zeminde gold-400 bir çizgi olarak **2,06:1** veriyor; WCAG 1.4.11'in
3:1 eşiğinin altında. Üç seçenek vardı: testi kırmak, eşiği düşürmek, ya da
kuralı doğru ifade etmek. Üçüncüsü seçildi:

- Gold çizgi **hiçbir bilgiyi tek başına taşımaz** — dekoratif içerik
  1.4.11 kapsamı dışında. Kombinasyon listesine bilinçli olarak eklenmedi
  ve *neden* eklenmediği listenin içine yazıldı.
- Anlam taşıyan gold öğe gerekirse ayrı jeton var: `--color-gold-guclu`
  (gold-600), açık zeminde **5,17:1** — ve o ÖLÇÜLÜYOR.
- `disiplin.test.ts` ayrıca `text-gold-*` kullanımını kovalıyor. İki ayrı
  kapı: biri "gold bir metin jetonuna bağlanmış mı", diğeri "bir bileşende
  gold metin yazılmış mı".

### Bakırın geri sızmaması

Yeniden tasarım bir iyileştirme değil yön değişikliğiydi. Eski rampanın tek
bir jetonu kalsaydı sonraki bir bileşende "elimde vardı" diye kullanılır ve
iki palet yan yana yaşamaya başlardı. İki test bunu engelliyor: jeton
haritasında `bakir` geçen ad kalmadığı, ve eski bakır hex değerlerinin
kaynağa geri girmediği.

Bakır kuralının **gerekçesi** korundu, rengi değişti: dolu adaçayı zemin
hâlâ yalnızca "Evimi değerlendir" ve "Erişim talep et" eylemlerinde.

### Tipografi

Ölçek büyüdü (§3): sayfa başlığı 34 → **44** (mobil 30), bölüm başlığı
22 → **32**, büyük rakam 32 → **40**. `eyebrow` jetonu eklendi: 12px,
0.08em harf aralığı, büyük harf, adaçayı.

Büyük rakamlara `-0.02em` harf aralığı verildi: `tabular-nums` rakamları
eşit genişliğe zorluyor ve büyük puntoda aralar açılıyor. Font altyapısı
(Inter + Source Serif 4, Türkçe alt küme, kendi barındırma) korundu.

### Yol boyunca bulunan ilgisiz bir hata

`bildirimler.entegrasyon.test.ts` içindeki `SIMDI` sabiti `2026-08-07`ye
sabitlenmişti ama ilanları oluşturan `eidsYayinEngeli` kancası gerçek
`Date.now()` okuyor ve devre dışı bırakılamıyor. `gunSonra(5)` o tarihten
tam beş gün sonra — **12 Ağustos 2026'da** — geçmişe düştü ve test o gün
kendiliğinden kırıldı. Kimse bir şey değiştirmemişti, takvim ilerlemişti.

Temiz ağaçta da kırık olduğu doğrulandı (palet değişikliğiyle ilgisiz).
`SIMDI` gerçek saate bağlandı: fikstürler artık kancanın gördüğü saatle
aynı eksende üretiliyor.

### Birleştirmede çıkan kalıntı: harita yedek renkleri

Palet dalı main'e alınırken `src/lib/harita/jetonlar.ts` içinde bir kalıntı
bulundu. MapLibre CSS değişkeni anlamıyor; bu dosya renkleri çalışma
zamanında `getComputedStyle` ile okuyor ve tarayıcı dışında **elle yazılmış
bir yedek listesine** düşüyor.

O liste eski paletten kalmıştı ve içindeki `--color-bakir-600`
globals.css'ten tamamen silinmişti. `getComputedStyle` bulunmayan jeton için
boş dize döndürüyor, kod da yedeğe düşüyor — yani **seçili mahalle sütunu,
palet değişmiş olmasına rağmen bakır çiziliyordu.** Ne derleme ne test hata
veriyordu; harita yalnızca yanlış renkteydi.

Seçili sütun `--color-aksan`a bağlandı, yedeklerin tamamı yeni palete
güncellendi ve `jetonlar.test.ts` eklendi: her yedek değerin globals.css'teki
karşılığıyla birebir aynı olduğunu **ve** başvurulan her jetonun gerçekten
var olduğunu denetliyor. İkincisi asıl arızayı kapatan kısım.

- Kapı: `typecheck` ✅ `lint` ✅ `test` (1217 test, 94'ü kontrast) ✅ `build` ✅
- Lighthouse ölçümü **yapılmadı** — bileşenler henüz eski düzende; anlamlı
  sayı Aşama 3'ten sonra çıkar.

---

## Frontend yeniden tasarımı — Aşama 2: çerçeve

`docs/FRONTEND-YENIDEN-TASARIM.md` §2, §4, §9.

### Yapılanlar

**Üst şerit** (`UstSerit`) — ince lacivert bant: telefon, e-posta, WhatsApp.
Masaüstünde görünür, mobilde gizli: 12px'lik bir çubuk telefonda 44px
dokunma hedefini karşılayamıyor ve ekranın üstünden yer çalıyor; aynı
bilgiler mobil menüde tam boyutta duruyor.

**Header** (`Baslik`) — yapışkan, kaydırınca gölge (kenarlık değil: sabit
bir çizgi sayfanın üstünü ikiye böler ve "uygulama" hissi verir). İki mega
menü, aktif sayfada gold 2px alt çizgi, sağda dolu adaçayı
"Evimi değerlendir".

**Altbilgi** — lacivert zemin, üstünde gold ince çizgi, dört sütun.
Yasal yükümlülükler aynen korundu: yetki belgesi numarası (boşsa görünür
uyarı), MERSİS, yatırım tavsiyesi feragati.

**Bölüm ilkelleri** — `Eyebrow` (12px, 0.08em, büyük harf, adaçayı),
`GoldAyrac` (dekoratif), `GuvenSeridi`. Dikey ritim 48/64/80px'den
56/80/112px'e çıktı; şartname masaüstünde 96–128px istiyor ve gerekçesi
görsel değil: "büyük şirket" hissinin en ucuz taşıyıcısı cömert boşluktur.

### Menü 404'e bağlanmıştı — duman testinde yakalandı

Şartname §4 "Endeks"i üst menüye koyuyor. Öğe site bölümü anahtarına
bağlandı ve yeterli sanıldı. Değildi: **`/endeks`in İKİ kapısı var** —
bölüm anahtarı VE veri eşikleri (CLAUDE.md 6c: katman başına en az 8
gözlem, en az 6 ay geçmiş).

Geliştirme veritabanında bölüm **açıktı**, eşikler sağlanmıyordu. Menüde
"Endeks" görünüyor, tıklayan **404** alıyordu. Derleme geçiyordu, testler
yeşildi; yalnızca gerçek sayfayı açınca görüldü.

Karar artık sayfanınkiyle **aynı yardımcıdan** geliyor
(`endeksSayfasiAcikMi`). O yardımcı da düzeltildi: sayfanın kapısı üç
koşula bakıyordu (`yayinIsaretli`, `kontrol.yayinlanabilir`, `seri`),
yardımcı yalnızca ikisine — üçüncüsünün tuttuğu bir durumda menü yine
404'e bağlanırdı.

⚠️ Sıra bilinçli: ucuz olan bölüm kontrolü önce, endeks hesabı sonra.
Bölüm kapalıyken gözlem okuyup seri üretmenin her sayfa isteğinde
karşılığı yok.

**Aynı hata ikinci bir yerde daha vardı:** yatırım simülatörü de bölüm
anahtarına bağlı (`simulator`) ve mega menü onu koşulsuz gösteriyordu.
Bu yüzden anahtar artık **elle yazılmıyor**, `BOLUMLER[].rotalar`
üzerinden otomatik bulunuyor — unutulması imkânsız.

`gezinme.test.ts` eklendi: her menü adresinin karşılığında gerçek bir
`page.tsx` olduğunu, kapatılabilir her sayfanın bölüm anahtarı taşıdığını
ve araçlar menüsünün `ARACLAR` listesinin tamamını kapsadığını denetliyor.

### Disiplin testlerinin yakaladıkları

Altbilgi logosunda "GYD" gold yazılmıştı. Lacivert üzerinde gold 6,69:1
ile **okunur** olurdu — ama "gold asla metin rengi değildir" kuralı
mutlak. İstisna açıldığı anda bir sonraki kullanım açık zeminde olur ve
2,06:1'e düşer. Kural korundu, aksan `notr-300`e çekildi.

Header'daki dolu adaçayı CTA ise kuralın izin verdiği iki eylemden biri;
`Baslik.tsx` gerekçesiyle izin listesine eklendi.

### Sabit lacivert yüzeyler kontrast testine girdi

Üst şerit ve altbilgi iki temada da lacivert. Zemin temaya göre
değişmiyorsa üzerindeki metin de değişmemeli — `--color-metin` açık temada
antrasite dönüyor ve lacivert üzerinde okunmazdı. Aynı tuzağa gold
rozetinde düşülmüştü. Beş yeni çift ölçülüyor (13,85 / 7,24 / 5,34 / 6,69).

### Bülten bandı ERTELENDİ

Şartname §9 altbilgide bülten aboneliği istiyor. Yapılmadı ve sebebi
teknik değil: pazarlama e-postası için **ayrı bir KVKK açık rızası**
gerekiyor ve o metni ben yazmıyorum (CLAUDE.md kural 3). Ayrıca gönderim
için bir e-posta sağlayıcısı bağlı değil.

Çalışmayan bir abonelik kutusu göstermek, bal küpü kuralının tersi olurdu:
değer vermeden iletişim bilgisi istemek. Metin ve sağlayıcı gelince
eklenecek; `docs/SENDEN-BEKLENENLER.md` içinde yazılı.

### Güven şeridi — uydurma rakam yok

Portföy ve mahalle sayısı veritabanından sayılıyor. "Ortalama işlem
süresi" ölçülebilir bir veri değil (Aslıhan'ın geçmiş işlem kayıtlarına
bağlı, elimizde yok) — `null` geçiliyor ve hücre kendi boş durumunu
gösteriyor. Sıfır yazmak yanlış bilgi, hücreyi gizlemek dört sütunluk
düzeni bozardı.

Duman testinde gerçek verilerle doğrulandı: 6 ilan, 3 mahalle, iki hücre
"Hazırlanıyor".

- Kapı: `typecheck` ✅ `lint` ✅ `test` (1238 test) ✅ `build` ✅
- Menüdeki 17 bağlantının hepsi çalışan sayfaya gidiyor (elle doğrulandı).
- Lighthouse hâlâ ölçülmedi: kart ve listeleme düzeni Aşama 3–4'te
  değişiyor, şimdi ölçülen sayı yanıltıcı olur.

---

## Frontend yeniden tasarımı — Aşama 3–6

Aşamalar 3, 4, 5 ve 6 sırayla yapıldı; her biri kendi dalında ve PR'ında.
Ayrıntılar PR açıklamalarında, burada kalıcı olması gereken kararlar var.

### Aşama 3 — kart ve ana sayfa

Kart 4:3 görsele geçti, fiyat 22px kendi jetonuyla, kira çarpanı satırının
üst çizgisi **gold** (şartnamenin gold'a ayırdığı üç yerden biri).

Ana sayfa şartnamenin bölüm sırasına kuruldu; hero arama widget'ı
listeleme sayfasının parametre sözleşmesini kullanıyor.

**Uydurulmayan iki şey:** hero görseli ve Aslıhan'ın fotoğrafı. Şartname
"Çorlu havadan" istiyor ama kullanım hakkı bize ait böyle bir görsel yok;
stok fotoğraf şartnamenin kendi yasağı (§2) ve hero LCP ögesi. İkisi de
tasarlanmış boş durumla duruyor, SENDEN-BEKLENENLER'de yazılı.

### Aşama 4 — listeleme ve yatırım filtreleri

Kira çarpanı, brüt getiri ve sanayiye mesafe filtreleri eklendi.

⚠️ **Şartname "dk" istiyordu, km kullanıldı.** Yol ağı verisi ve rotalama
motorumuz yok; tüm mesafeler kuş uçuşu ve `/veri-kaynaklari` sayfasında
bunu ziyaretçiye açıkça söylüyoruz. Filtrede "dk" yazmak o sayfayı
yalancı çıkarırdı.

⚠️ **Kaydırıcı yerine sayı kutusu.** Çift uçlu kaydırıcı klavyede iki
tutamağı ayırt ettirmiyor, ekran okuyucuda "hangi uç" belirsiz ve
dokunmatikte 44px hedefi iki tutamak için sağlanamıyor.

Sayfalama "Daha fazla göster"e döndü; sayfa boyutu 12 → 24. `goster`
URL'de tutuluyor — istemci state'i olsaydı liste SSR'dan çıkardı ve arama
motoru yalnızca ilk 24'ü görürdü.

`filtreSozlesmesi.test.ts` eklendi: aynı parametre adlarını üç dosya
kullanıyor ve biri saparsa hiçbir şey patlamaz, filtre sessizce uygulanmaz.

### Aşama 5 — ilan detayı

Yatırım göstergeleri sağ yapışkan karta taşındı (gold çerçeve, açık gri
zemin). Gömülü hesaplayıcı **ikinci bir hesap yazılarak değil**, araç
sayfasındaki formun kendisi ilanın rakamlarıyla doldurularak yapıldı —
aynı formülün iki yerde yaşaması ve ayrışması engellendi.

⚠️ Taşıma sırasında **yatırım tavsiyesi feragatini düşürmüştüm**; lint
"kullanılmayan import" diye yakaladı. Getiri rakamının göründüğü her yerde
o metin zorunlu (CLAUDE.md kural 5).

### Aşama 6 — ölçek disiplini ve bundle bütçesi

Sayfalarda **64 ayrı elle yazılmış punto** vardı (`text-[2rem]`,
`text-[1.375rem]`, `text-[0.9375rem]`…). Her biri tek başına makuldü ama
toplamı bir ölçek değil yığındı: iki sayfanın "bölüm başlığı" farklı
boydaydı ve kimse fark etmiyordu. Hepsi jetonlara bağlandı; gerçekten
ölçek dışı olan tek değer için yeni bir jeton açıldı (`--text-skor`, 48px).

`disiplin.test.ts` artık keyfi puntoyu da kovalıyor. Testi susturmanın
doğru yolu muafiyet değil, jeton eklemek.

#### ⭐ Tek sabit 63 kB taşıyordu

Bundle bütçesi ölçülünce `/portfoy` **274,9 kB gzip** çıktı (hedef 220) ve
en büyük ikinci parça **zod**du. Sebep: `AkilliArama` istemci bileşeni
`AZAMI_SORGU_UZUNLUGU` sabitini `sema.ts`ten alıyordu ve o dosya en üstte
zod import ediyor. Paketleyici bir modülü parça parça alamaz — tek bir
sayı için zod'un tamamı istemciye giriyordu.

Üstelik AI arama **varsayılan kapalı** (KVKK, aydınlatma metni bekliyor):
hiçbir ziyaretçi o kodu çalıştırmıyor ama herkes indiriyordu.

Sabit zod'suz bir modüle (`lib/arama/sabitler.ts`) taşındı, `sema.ts`
onu yeniden dışa aktarıyor (tek kaynak korundu).

**Ölçüm — aynı yöntemle önce ve sonra:**

| Sayfa | Önce | Sonra |
| --- | --- | --- |
| `/` (ana sayfa) | 201,9 kB | **201,9 kB** |
| `/portfoy` | 274,9 kB | **211,5 kB** |
| `/portfoy/[slug]` | 210,8 kB | **210,8 kB** |

Üçü de 220 kB bütçesinin altında. Şartnamenin bütçesi yalnızca ana sayfa
için ama listeleme sayfası da artık sınırın altında.

⚠️ Ölçüm yöntemi: çalışan sunucudan sayfa çekilip `<script src>` listesi
çıkarıldı ve her parça `Accept-Encoding: gzip` ile indirilip toplandı.
Derleme çıktısı bu sürümde rota başına boyut basmıyor.

⚠️ `/harita` 443,8 kB — maplibre-gl. Bilinçli ve belgeli: `next/dynamic`
+ `ssr: false` ile yalnızca o sayfada yükleniyor, başka hiçbir sayfaya
girmiyor.

#### Denenip geri alınan bir değişiklik

Önce `AkilliArama`yı `next/dynamic` ile yüklemeyi denedim. Ölçümde fark
yaratmadı (275,9 vs 274,9 — gürültü) çünkü sorun render değil import
zinciriydi. Kanıtlayamadığım bir iyileştirmeyi ve onu iddia eden yorumu
bırakmak yanlış olurdu; geri alındı ve asıl sebep bulunana kadar arandı.

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

---

## A paketi — Mahalle veri altyapısı (15 Ağustos 2026)

> ⚠️ **Bu paket veri GİRMEZ, veri girmeyi kolaylaştırır.**
> Tek bir mahalle nüfusu, tek bir m² fiyatı, tek bir koordinat
> uydurulmadı. Yazılan her şey ya bir komut (Aslıhan tıklayacak), ya bir
> içe aktarıcı (meşru kaynaktan çekecek), ya da bir boş durum
> (veri gelene kadar dürüstçe "veri yok" diyecek).

### Neden gerekliydi

Site kodu bitmişti ama mahalle tarafı boştu: sınır yok, merkez koordinatı
yok, resmî bir fiyat tabanı yok. POI içe aktarıcısı arama kutusunu mahalle
merkezlerinden türettiği için **o da çalışamıyordu** — veri olmadığı için
veri çekilemiyordu.

### A1 — Çorlu mahalle listesi (tek tıkla içe aktarma)

`/admin/mahalle-verisi` → 1. adım.

**⚠️ VELİMEŞE LİSTEDEN ÇIKTI.** Ergene ilçesinde, Çorlu'da değil. Eski bir
hataydı; `corluMahalleleri.test.ts`in ilk testi hem adı hem slug'ı arayarak
geri gelmesini engelliyor.

18 merkez mahalle + 9 kırsal mahalle (eski köy). Kayıtlar **yalnızca ad ve
merkez/kırsal işaretiyle** açılır; koordinat, sınır ve rakam **boş kalır**
ve `yayinda: false` doğar.

⚠️ **Tohum verisi olarak yazılmadı, komut olarak yazıldı.** Tohum betiği
geliştirme ortamında çalışır, üretimde çalışmaz; Aslıhan'ın panelden
tıklayabildiği bir düğme her ortamda çalışır ve ne yaptığını önce
gösterir (önizleme → yaz).

Listede olmayıp veritabanında bulunan kayıtlar (ör. eski Velimeşe)
**silinmez, yalnızca raporlanır.** Bir içe aktarıcının insan verisini
sessizce silmesi geri alınamaz bir iş olurdu.

### A2 — OSM'den mahalle sınırları

`/admin/mahalle-verisi` → 2. adım. Overpass API, `admin_level=10`
(Türkiye'de mahalle seviyesi).

#### ⭐ Tavuk-yumurta problemi ve çözümü

POI içe aktarıcısı arama kutusunu **mahalle merkezlerinden** türetiyor.
Ama merkezleri dolduran şey tam da bu adım. Çorlu koordinatını koda gömmek
CLAUDE.md'ye aykırıydı.

Çözüm: kutu değil **isim** sorgulandı.

```
relation["boundary"="administrative"]["admin_level"="6"]["name"="Çorlu"];
map_to_area->.ilce;
( relation(area.ilce)["admin_level"="10"]; way(area.ilce)[...]; );
```

Sıralama artık tutarlı: A1 adları açar → A2 sınır ve merkezi doldurur →
POI içe aktarıcısı çalışmaya başlar.

#### ⚠️ Elle düzeltilen sınır bir daha EZİLMEZ

OSM'de Türkiye mahalle sınırları eksik ve yer yer yanlış. İçe aktarılan
sınır `sinirKaynagi: 'osm'` işaretli; elle düzeltilen kayıt
`sinirElleDuzenlendi` iziyle korunur. İki bağımsız kapı var:

```ts
if (mahalle.sinirElleDuzenlendi) return 'korunacak'
if (mahalle.sinirVar && mahalle.sinirKaynagi !== 'osm') return 'korunacak'
```

⚠️ **İz kancası POI'dekinin kopyası DEĞİL** ve olmamalıydı. Mahalle kaydı
içerik için sürekli düzenleniyor ("Neden bu mahalle?" metni, fotoğraf,
skor). `osmElleDuzenlemeIzi`nin aynısı kullanılsaydı ilk içerik
düzenlemesinde sınır donardı ve bir daha hiç güncellenemezdi. Bu yüzden iz
yalnızca `sinir` ya da `merkez` **gerçekten değiştiğinde** basılıyor.

#### Komşu ilçe sızıntısı

Overpass alanı sınırında duran ilişkileri de döndürebiliyor. Ek geometri
filtresi yerine daha basit ve daha dürüst bir kural kondu: sınır ancak
**bizde o adla bir mahalle varsa** yazılır. Eşleşmeyen adaylar ve sınırı
gelmeyen mahalleler raporda ayrı ayrı listelenir.

Merkez, **alan ağırlıklı** centroid'den hesaplanıyor — köşe ortalaması
değil. Köşe ortalaması, sınırın yoğun çizildiği tarafa kayar.

⚠️ Elle girilmiş merkez korunur (`merkeziYaz` yalnızca merkez boşsa ya da
kaynak zaten `osm` ise açılır).

### A3 — Google Places (isteğe bağlı katman)

⚠️ **Scraping değil.** Resmî Places API (New), kendi anahtarımızla,
lisanslı uç noktadan. `/admin/google-places`.

**Varsayılan KAPALI ve iki koşul birden gerekiyor:** `GOOGLE_PLACES_API_KEY`
tanımlı **ve** Site Bölümleri → `google_places` açık. Anahtarı sunucuya
koymak katmanı açmaz; ücretli bir servisi kendiliğinden başlatmak yanlış
olurdu. Anahtar yoksa özellik sessizce kapalı, site OSM verisiyle aynen
çalışıyor.

#### ⭐ Şartnameden bilinçli sapma — RAPOR EDİLDİ

Şartname "POI varlığını ve kategorisini sakla, detayı istek anında çek"
diyordu. Uygulanan şey daha dar: **katman hiç POI kaydı üretmiyor.**

Sebep şartnamenin kendi kısıtı: Places verisi önbelleklenemez. Google'ın
döndürdüğü adı ve kategoriyi bir POI kaydına yazmak, o veriyi
önbelleklemenin ta kendisi olurdu. Bu yüzden katman **zenginleştirme**
olarak kuruldu: mevcut (OSM ya da elle girilmiş) bir noktaya yalnızca
`googlePlaceId` bağlanıyor; ad, adres ve çalışma saati **hiçbir yere
yazılmıyor**, ziyaretçi sorduğu anda çekilip gösteriliyor ve gösterildiği
yerde Google atfı duruyor.

`kaynak: 'google'` seçeneği koleksiyonda duruyor ama onu **yalnızca insan**
seçebiliyor (Google Haritalar'da bulup elle giren biri için). Otomatik ekran
o değeri hiç yazmıyor.

#### Maliyet kapıları

| Kapı | Ne yapıyor |
| --- | --- |
| Site Bölümleri anahtarı | Katmanı insan açar, anahtar tek başına açmaz |
| Ziyaretçi tıklaması | Sayfa açılışında çağrı YOK; "Çalışma saatleri"ne basılınca |
| Dakikada 20 istek | Ziyaretçiye açık detay eylemine hız sınırı |
| Parametre bizim POI kimliğimiz | Yer kimliği veritabanından okunuyor — uç, Places'in ücretsiz vekili olamıyor |
| Aylık sayaç | `GooglePlacesKullanimi` global'i, panelde görünür, salt okunur |

⚠️ Otomatik kapanma **yok**. Katmanı kapatmak insan kararı olarak bırakıldı:
kendiliğinden kapanan bir özellik, neden kapandığı anlaşılmadan aylarca
kapalı kalırdı.

⚠️ Ziyaretçiye açık detay çağrısı **ayrı dosyada** (`lib/google/detayEylemi.ts`).
`eylemler.ts` içindeki her şey yönetici kapısının arkasında; bu değil. Aynı
dosyada dursalardı güvenlik denetimi (ve `formKorumasi.test.ts`) tek bir
sınıf görürdü — oysa iki ayrı saldırı yüzeyi var.

### A4 — ⭐ Rayiç bedel

Paketin en değerli parçası. Belediye takdir komisyonu rayiç bedelleri
**resmî ve kamuya açık**; bir ilan platformunun yasadışı alternatifi değil,
ondan daha sağlam bir taban.

Yeni koleksiyon `RayicDegerler`: mahalle, sokak (isteğe bağlı), yıl,
m² rayiç bedel, arsa rayiç bedel, kaynak (belediye / TKGM / elle), notlar.

⚠️ **Veri girilmedi.** Koleksiyon boş; CSV içe aktarıcı hazır.

#### Üç yerde işe yarıyor

1. **Tapu harcı gerçekleşti** — harç matrahı satış bedelinin altına
   inemiyor:
   ```ts
   const { matrah, rayicMiBelirledi } = harcMatrahi(fiyat, girdi.rayicBedel)
   ```
   `/araclar/alim-maliyeti` mahalle + brüt m² girilince rayici kendisi
   buluyor ve harcı rayiç belirlediyse bunu **ekranda söylüyor**.
2. **Yıllık güncellendiği için tarihsel seri** — aynı (mahalle, sokak, yıl)
   üçlüsüne ikinci kez içe aktarma **upsert**; düzeltilmiş belediye tablosu
   ikinci kez yüklenince kopya üretmiyor.
3. **⭐ Rayiç/piyasa oranı** — "Bu mahallede piyasa fiyatı rayiç bedelin
   ~3,2 katı." Türkiye'de bunu yayınlayan yok. Mahalle sayfasında,
   istatistik ızgarasının **altında** ayrı bir başlık altında (ızgaraya
   sokmak, onu diğer rakamlarla aynı cinsten göstermek olurdu — değil).

⚠️ **Kaynak ve yıl HER GÖSTERİMDE görünüyor.** Rayiç ≠ piyasa değeri ve bu
iki cümlelik açıklama bileşenden kaldırılamaz.

#### CSV içe aktarıcı

Belediye tabloları PDF/Excel geliyor. `/admin/rayic-ice-aktar`: dosya ya da
yapıştırma, düzenlenebilir sütun eşlemesi, satır satır onay kutusu.

⚠️ Bilinmeyen mahalle adı **hata**, tahmin değil. Yanlış mahalleye yazılan
bir rayiç, harç hesabını sessizce bozardı.

⚠️ 100 ₺ altı / 500.000 ₺ üstü m² değeri **uyarı** üretiyor (hata değil).
Sebep: Türkçe Excel'in ondalık ayıracı, `1.250,00`u 125.000 yapabiliyor ve
bu sessizce geçerdi.

Gözlem içe aktarıcısının sütun eşleştiricisi kopyalanmadı;
`lib/csv/sutun.ts`e çıkarıldı ve gözlem tarafı da ona bağlandı — iki
içe aktarıcı tek Türkçe-Excel eşleştiricisi paylaşıyor.

### A5 — Veri kaynakları şeffaflığı

`/veri-kaynaklari` artık **canlı**: kayıt sayıları ve `updatedAt`
damgaları veritabanından okunuyor, elle yazılmış tarih yok.

Veri türü tablosu: kaynak · güncelleme sıklığı · kayıt sayısı · son
güncelleme. OSM bölümü sınırları da kapsayacak şekilde genişledi, rayiç
bölümü eklendi (hangi belediye, hangi yıl), Google bölümü yalnızca katman
açıksa çıkıyor.

⚠️ Sayfanın en üstünde çerçeveli uyarı: **"Piyasa fiyatları kendi
gözlemlerimize dayanır ve istenen fiyattır."**

⚠️ Sorgu patlarsa sayfa sıfırlara düşüp yine basılıyor. ODbL atfı yasal
yükümlülük; bir veritabanı hatası onu ekrandan kaldıramamalı.

### Göçler

İkisi de oluşturuldu ve uygulandı:

| Göç | İçerik |
| --- | --- |
| `20260814_203859_mahalle_yerlesim_ve_sinir_kaynagi` | `yerlesim_turu`, `sinir_kaynagi`, `sinir_osm_kimlik`, `sinir_elle_duzenlendi` |
| `20260814_210730_rayic_google_ve_kullanim_sayaci` | `rayic_degerler`, `google_places_kullanimi`, `ilgi_noktalari.google_place_id`, `site_bolumleri.google_places`, enum'a `'google'` |

⚠️ İkincisinin `down`u enum'u daraltıyor ve `kaynak='google'` olan bir POI
varsa **hata verir**. Bilinçli: sessizce `'elle'`ye çevirmek verinin
nereden geldiği bilgisini kaybederdi.

### Kapı

```
pnpm typecheck  ✅
pnpm lint       ✅
pnpm test       ✅  64 dosya / 1395 test
pnpm build      ✅
```

Yol boyunca üç muhafız test düştü ve **üçü de kodu düzelterek** geçirildi,
muafiyet eklenerek değil:

- `ortam.test.ts` — `GOOGLE_PLACES_API_KEY` iki örnek dosyaya da gerekçesiyle
  belgelendi.
- `siteBolumleri.test.ts` — `google_places` sıralı listeye ve varsayılan
  kapalılar listesine gerekçesiyle yazıldı ("MALİYET: ücretli servis").
- `formKorumasi.test.ts` — üç yeni sunucu eylemi sınıflandırıldı. Bu sırada
  `googleDetayiGetir`in **ziyaretçiye açık ve para harcayan** bir eylem
  olduğu fark edildi; ayrı dosyaya çıkarılıp hız sınırı eklendi. Test
  defter tutmak için düştü, gerçek bir açık buldurdu.

### ⚠️ Sırada Aslıhan'ın işi var, kodun değil

Bu paket boş bir altyapı teslim ediyor. Doldurma sırası **zorunlu**:

1. `/admin/mahalle-verisi` → 1. adım (mahalle listesi)
2. `/admin/mahalle-verisi` → 2. adım (OSM sınırları) — 1 olmadan çalışmaz
3. OSM POI içe aktarma — 2 olmadan arama kutusu yok
4. `/admin/rayic-ice-aktar` — belediye rayiç tablosu
5. (isteğe bağlı) Google Places anahtarı + bölüm anahtarı

Ayrıntı: docs/SENDEN-BEKLENENLER.md → "A paketi sonrası".

---

## B paketi — Bohem / pudra paleti (15 Ağustos 2026)

> ⚠️ **Bu üçüncü palet ve Aslıhan "son olsun" dedi.** Lacivert gitti.
> Kararın kendisi Aslıhan'ın; buradaki iş onu ÖLÇMEK ve sisteme bağlamak.

### Onaylanan yedi renk

| Renk | Değer | Rol |
| --- | --- | --- |
| Kırık beyaz | `#FBFAF7` | **ANA ARKA PLAN** — değişmez |
| Krem | `#F2EBE3` | Bölüm ayrımı, kart zemini |
| Pudra gülü | `#E8CFC8` | Yumuşak bant, hero, aksan kartı — **yalnızca zemin** |
| Terracotta | `#A85A42` | Ana vurgu, dolu bant, başlık aksanı |
| Adaçayı | `#4F7C6A` | CTA — önceki paletten **korundu** |
| Soft gold | `#C9A96E` | Dekoratif — önceki paletten **korundu** |
| Koyu kakao | `#3D2B2F` | **METİN**, başlıklar — laciverti değiştirdi |

### ⭐ Ölçüm Aslıhan'ı haklı çıkardı

Şartname şöyle diyordu: *"Terracotta metin olarak sınırda olabilir;
geçmezse koyulaştırılmış bir varyantını ayrı bir jeton olarak üret."*

Ölçüldü:

| Terracotta #A85A42, metin olarak | Oran | AA |
| --- | --- | --- |
| Kırık beyaz üzerinde | 4,78:1 | ✅ kıl payı |
| **Krem üzerinde** | **4,22:1** | ❌ |
| **Pudra gülü üzerinde** | **3,37:1** | ❌ |

Yani rampanın 600 basamağı, **paletin kendi kullanım kuralının istediği
zeminlerde** okunmuyor: bantlar ve başlıklar krem ve pudra üzerinde
duruyor. Koyulaştırılmış varyant üretildi:

`--color-vurgu: #844632` → kırık beyaz **6,92** · krem **6,12** · pudra **4,88**

⚠️ Değer OKLab'de tonu koruyarak arandı (%16 siyaha doğru); gözle
seçilmedi. Pudra üzerinde 4,50 veren daha açık bir aday da geçiyordu ama
eşiğe sıfır payla oturuyordu — bir basamak daha koyulaştırıldı.

### Rampa mimarisi

Beş rampa: `kakao` · `terracotta` · `adacayi` · `gold` · `notr`.

#### ⭐ Terracotta rampası İKİ ÇAPALI

Pudra gülü, terracotta'nın açık ucundan türetilseydi `#E4C3B9` çıkıyordu —
yakın ama Aslıhan'ın verdiği renk değil. Rampa iki onaylı değere birden
çapalandı (200 = pudra, 600 = terracotta) ve arası interpole edildi. İki
renk de birebir korunuyor, ikisi de tek aileye bağlı.

#### Nötr rampası yeniden ısıtıldı

Eski nötrler maviye çalıyordu ve kremin yanında kirli duruyordu. Yeni
rampa kırık beyaz → krem → sıcak koyu nötr ekseninde.

⚠️ `notr` iki temada iki ayrı iş yapıyor: açık temada YÜZEY, koyu temada
METİN. Kakao rampasıyla görünürdeki örtüşme bu yüzden gerçek değil.

### Kontrast testinin bulduğu üç şey

Testi geçirmek için değer değiştirmedim; test değeri değiştirtti.

#### 1. `metin-3` bir basamak koyulaştı

kakao-600 kırık beyazda 5,05 veriyor ama **krem üzerinde 4,46** — ve
"n = 23" gibi yardımcı metinler tam olarak krem tint bölümlerde duruyor.
600 → 700.

#### 2. ⭐ Dolu CTA butonu koyu temada görünmez olmuştu

adaçayı-600, kakao-900 zeminden yalnızca **2,79:1** ayrışıyor. WCAG
1.4.11 bileşen sınırı için 3:1 istiyor — yani buton sayfadan ayırt
edilemiyordu. Eski lacivert zeminde oran 3,15'ti ve kıl payı geçiyordu;
kakao daha açık olduğu için o pay kapandı.

Çözüm bir jeton eklemek oldu: `--color-aksan-uzeri`. Koyu temada buton
**açılıyor** (adaçayı-400) ve metin kakaoya dönüyor — 4,94:1 hem metin
oranı hem ayrışma. Hover da açılıyor; koyulaşan bir zemin koyu metni
yutardı.

⚠️ Buton `text-white` yazmayı bıraktı. Test de `BEYAZ` sabitini bıraktı:
artık jetonu jetona karşı ölçüyor.

#### 3. Dolu terracotta bantta opaklık kullanılamıyor

Koyu kakao bantlarda ikincil metin `text-white/80` ile yumuşatılıyordu ve
orada 9,08 veriyor. Terracotta üzerinde aynı yumuşatma **3,82** — AA'nın
altı. `/90` bile 4,39.

Sonuç: terracotta bantta metin **tam beyaz**, hiyerarşi punto ve boşlukla
kuruluyor. Kural `Bolum.tsx` içinde yazılı ve `disiplin.test.ts` sınıfın
başka yerde yazılmasını engelliyor.

### Yol boyunca bulunan üç mevcut hata

Palet işi değildi, palet işi bulmasını sağladı.

| Hata | Sonucu |
| --- | --- |
| `SkorRadari` `var(--color-lacivert)` okuyordu — böyle bir jeton **hiç yoktu** | Radar çokgeni tarayıcı varsayılanıyla çiziliyordu |
| Aynı dosya `var(--color-cizgi)` okuyordu — o da yok | Radar ızgara çizgileri aynı durumda |
| Onay kutuları `accent-lacivert` yazıyordu — Tailwind bu sınıfı **hiç üretmiyordu** | Onay kutuları tarayıcı varsayılanı mavi |

Üçü de gerçek jetonlara bağlandı (`gosterge`, `kenar`, `vurgu`).

### Muhafız testlerinin kendisi de düzeltildi

İki test, koruduğu şeyi değil kendi sabitini savunuyordu:

- `jetonlar.test.ts` beklenen değeri `'#f7f6f2'` diye yazıyordu. Yedek
  tablosu doğru güncellendiği hâlde test kırmızıya döndü. Artık beklenen
  değer paletten okunuyor.
- `disiplin.test.ts`'in sosyal görsel izin listesi de sabitti — ve sosyal
  medya görseli **iki palet öncesinin laciverti**ni taşıyordu (`#0F1E33`),
  test de o eski değeri "izinli" saydığı için susmuştu. Liste artık
  globals.css'ten okunuyor.

⚠️ Bir muhafız testi, koruduğu şeyin kaynağına bağlanmalı. Sabit yazılmış
bir beklenti, ikinci palet değişiminde sessizce yanlış tarafı savunur.

### Kullanım kuralları nereye uygulandı

| Yer | Önce | Sonra |
| --- | --- | --- |
| Ana sayfa hero | koyu lacivert + beyaz metin | **pudra gülü + koyu kakao metin** |
| Ana sayfa çağrı bandı | koyu lacivert | **dolu terracotta** |
| Ticari çağrı bandı | koyu lacivert | **dolu terracotta** |
| Gizli portföy bandı | koyu lacivert | **koyu kakao** (anlatılan şey "saklı olan") |
| Üst şerit, altbilgi | lacivert | **koyu kakao** |
| Bağlantı ve başlık aksanı | lacivert | **terracotta (koyulaştırılmış)** |
| Grafik/çubuk dolgusu | lacivert-700 | **terracotta-600** |
| Bilgi kutusu | lacivert-600 | **nötr kakao** |

⚠️ Bilgi kutusu bilinçli olarak marka renginden çıkarıldı. Terracotta ile
boyansaydı "bilgi" ile "vurgu" görsel olarak eşitlenirdi; bilgi kutusu
dikkat çekmemeli.

⚠️ **Hata rengi de kaydırıldı.** Eski `#A33A32`nin OKLCh tonu 27,7°,
terracotta'nınki 37,9° — on derece, aynı sayfada ikisini ayırt etmeye
yetmiyordu. Marka lacivertken sorun yoktu, terracotta olunca doğdu. Yeni
değer `#9A2B3A`, tonu 17,4°.

### Adlandırma

`lacivert-*` jetonları silinmedi, **yeniden adlandırıldı**: 37 dosyada
`kakao-*`. "Lacivert" adlı bir jetonun kakao değeri taşıması, dosyayı
okuyan herkesi yanıltırdı. `kontrast.test.ts` artık bakır gibi laciverti
de kovalıyor: geriye tek jeton kalsa bir sonraki bileşende "elimde vardı"
diye kullanılır ve iki palet yan yana yaşamaya başlardı.

Bileşen değişkenleri de anlamına göre yeniden adlandırıldı:
`Rozet ton="lacivert"` → `ton="vurgu"` (renk değil rol),
`Buton gorunum="lacivert"` → `gorunum="kakao"`,
`Bolum zemin` iki yeni değer aldı: `pudra` ve `terracotta`.

### Kapı

```
pnpm typecheck  ✅
pnpm lint       ✅
pnpm test       ✅  64 dosya / 1413 test
pnpm build      ✅
```

Kontrast testi **iki temada da** koşuyor ve 60'a yakın renk çifti ölçüyor;
listeye altı yeni çift eklendi (pudra zemininin üzeri, dolu terracotta
bant, krem üzerinde vurgu, hero eyebrow).

Derlenen CSS ayrıca elle doğrulandı: `--color-zemin` tek kök bildirimi +
tek `[data-tema='koyu']` geçersiz kılması (Tailwind 4'ün `@theme` tuzağı
tekrarlanmamış), `lacivert` dizesi sıfır kez geçiyor, `accent-vurgu`
sınıfı artık gerçekten üretiliyor.

---

## C paketi — Güneş zaman çubuğu (15 Ağustos 2026)

Güneş Haritası'nın gün toplamına saat saat kırılım eklendi.

### Neden gün toplamı yetmiyor

"Güney cephe ~8 saat güneş alıyor" doğru ama eksik bir cümle: o sekiz
saatin sabah mı akşam mı olduğu, oturma odasının ne zaman ısınacağını
belirliyor.

⭐ Ölçüm bunu somutlaştırdı: **doğu ve batı cepheler ekinoksta gün
toplamında 20 dakikadan az fark ediyor** — yaşarken hiç benzemiyorlar.
Doğu sabah, batı akşam. Çubuğun var olma sebebi tam olarak bu fark.

### ⭐ Ölçümün öğrettiği: güney cephe yazın kazanmıyor

Çorlu'da 21 Haziran günü 21 Aralık gününden **357 dakika (~6 saat)** uzun.
Buna rağmen güney cephenin doğrudan güneş süresi **485 ve 480 dakika** —
arada 5 dakika var.

Sebep geometrik: kışın güneş güneydoğudan doğup güneybatıdan batıyor, yani
gün boyu cephenin önünde. Yazın kuzeydoğudan doğup kuzeybatıdan batıyor ve
günün ilk ve son saatlerini cephenin ARKASINDA geçiriyor.

⚠️ Bu testi ilk yazışımda "kışın daha uzun olmalı" diye iddia ettim; 5
dakikayla kırmızıya döndü. Gökyüzü ikisini de haklı çıkarmıyor — doğru
iddia "fark yok" ve asıl anlatılmaya değer olan da bu. Test o hâliyle
duruyor.

### Zaman ekseni — mevsimler karşılaştırılabilir olmalı

İlk tasarımda çubuk her mevsimde kendi gün doğumundan gün batımına
uzanıyordu. Çubuk her zaman tam genişlikte çizildiği için **kışın 9 saat,
yazın 15 saat aynı uzunlukta görünüyordu** — mevsim seçicisinin göstermesi
gereken tek şey, tam da görünmez oluyordu.

Eksen artık dört günün BİRLEŞİMİNDEN türetiliyor (Çorlu için 05–20).
Gündüz bloğu yazın uzuyor, kışın kısalıyor; gece saatleri çubukta açıkça
duruyor.

⚠️ Pencere koda gömülmüyor, konumdan hesaplanıyor. Testi 60° enlemde
pencerenin genişlediğini doğruluyor.

### Dört durum, dört biçim

| Durum | Görünüm | Anlamı |
| --- | --- | --- |
| Doğrudan | tam yükseklik gold | saatin tamamı güneşli |
| Kısmen | **yarım yükseklik** gold | güneş o saat içinde cepheye teğet geçiyor |
| Gölge | boş krem | güneş ufkun üstünde ama bu cepheyi görmüyor |
| Gece | **çapraz tarama** | güneş ufkun altında |

⚠️ **Renk tek başına bilgi taşımıyor (WCAG 1.4.1).** Gold dolgu krem
üzerinde 1,89:1 — blokları ayırt etmeye yeten bir oran değil ve zaten
dekoratif gold kuralı gereği olamaz. Bu yüzden dört durum renkten bağımsız
olarak da farklı (yükseklik ve desen), ve aynı bilgi üç yerde daha var:
çubuğun altındaki özet cümlesi, seçilen saatin metin okuması, ve çubuğun
`aria-label`ındaki saat aralıkları ("doğrudan güneş 08:00–19:00
saatlerinde").

### ⚠️ Hücreler düğme değil — dokunma hedefi kararı

16 saatlik bir eksende hücreler telefonda ~18 px genişliğe düşüyor ve WCAG
2.2'nin 24×24 dokunma hedefi sınırının altında kalırdı.

Şartname bu durum için "3'er saatlik gruplar" öneriyordu. Gruplama sınırı
çözerdi ama **üç farklı durumu tek kutuya sıkıştırırdı** — çubuğun
anlatmak istediği şeyi silerdi.

Çözüm rolleri ayırmak oldu: çubuk `role="img"` (grafik), gerçek denetim
altındaki saat okuması ve onun 44 px'lik ok düğmeleri. Fare ve dokunmayla
hücre seçmek bunun üstüne binen bir kısa yol; klavye ve ekran okuyucu için
hiçbir şey kaybolmuyor. Saat etiketleri 3'er saatte bir yazılıyor.

⚠️ Yatay kaydırma hiçbir ekran boyutunda oluşmuyor — hücreler `flex: 1`.

### Köşe daireler

Her cephe kendi çubuğunu alıyor; **toplanmıyorlar.** Aynı saatte iki cephe
birden güneş alabiliyor ve toplam, günün uzunluğunu aşabilirdi.

⭐ Saat okuması ise TEK: azimut ve yükseklik cepheden bağımsız, gökyüzü
tek. Başlık bir kez yazılıp altına cephe cephe durum listeleniyor —
"14:00 · Güney cephe: gölgede · Batı cephe: doğrudan güneş alıyor".

### Çözünürlük birleştirildi

Gün toplamı 20 dakikalık örneklemeyi kullanıyordu; saatlik çubuk için bu
çok kaba (bir saat ya 0, ya 20, ya 40, ya 60 dakika güneş alabilirdi).
İkisi de **5 dakikaya** çekildi.

⚠️ İki ayrı aralık kullanmak daha kötü olurdu: aynı sayfada "yazın ~9
saat" ile çubuğun topladığı saat birbirini tutmazdı. Test ikisinin eşit
olduğunu doğruluyor.

Güneş konumu hesabı da tek çekirdeğe indi (`konumHesapla`): aynı
matematiği ikinci kez yazmak, azimutun öğleden sonra düzeltmesi gibi ince
bir adımın iki yerde sessizce ayrışmasına açık kapı bırakırdı.

### Bir sunum kusuru testle bulundu

Saat ipucu önce **saatin ortasındaki** örneği gösteriyordu. Yaz sabahı
05:00 saatinde güneş 05:36'da doğuyor; ortası (05:30) hâlâ ufkun altında.
Hücre doğru biçimde "gölgede" işaretliydi ama ipucu **"yükseklik -2°, bu
cephe: gölgede"** diyordu — çelişkili okunan bir cümle.

Artık saatin **en yüksek** anı gösteriliyor: gündüz saatlerinde ortadan
bir iki derece farklı, gün doğumu/batımı saatlerinde doğru tarafta.

### Maliyet — ölçüldü

| | |
| --- | --- |
| İstemciye eklenen | **10,9 kB gzip** |
| Ana sayfa JS | **207,4 kB gzip** — değişmedi, bileşen orada yüklenmiyor |
| Ek kütüphane | **yok** — düz HTML/CSS, grafik kütüphanesi eklenmedi |

Yöntem: bileşen bağlıyken ve bağlı değilken iki üretim derlemesi alınıp
`.next/static/chunks` toplam gzip boyutu karşılaştırıldı. Ana sayfanın
yüklediği 12 parçanın hiçbiri güneş kodunu taşımıyor — doğrulandı.

⚠️ Yorumda önce "~3 kB" yazıyordu; tahmindi ve **yanlıştı**. Bu projede
ölçülmemiş bir rakamı yorumda bırakmak, ekranda uydurma veri göstermekle
aynı sınıfta. Ölçüldü ve düzeltildi.

⚠️ Maliyet yalnızca ilan ve mahalle DETAY sayfalarına biniyor.

### Boş durumlar

| Eksik olan | Davranış |
| --- | --- |
| Cephe yönü | Çubuk hiç basılmıyor; gün doğumu/batımı ve "cephe yönü girilmemiş, tahmin etmiyoruz" notu duruyor |
| Mahalle merkez koordinatı | Bütün güneş bölümü gizli (çağrı yerlerinde zaten böyleydi) |

⚠️ İkinci bir "cephe girilmemiş" kutusu göstermemek bilinçli: aynı
eksikliği iki kez söylemek olurdu.

### Kapı

```
pnpm typecheck  ✅
pnpm lint       ✅
pnpm test       ✅  65 dosya / 1446 test (zaman çubuğu için 31 yeni test)
pnpm build      ✅
```

Testler fiziği sınıyor, kodun çalıştığını değil: kuzey cephe kışın güneş
göremez, güney cephe öğlen her mevsimde görür, doğu sabah batı akşam alır,
gün doğumunu içeren saatte yükseklik negatif görünmez.

### Lighthouse'un bulduğu üç erişilebilirlik hatası

⚠️ **Üçü de B ve C paketlerinden ÖNCE de vardı** — A paketinin ölçümünde
(eski palet) birebir aynı hatalar, aynı skor (94). Yani palet değişikliği
bunları getirmedi, **görülmesini sağladı**. Kontrast benim alanım olduğu
için burada kapatıldı.

| Hata | Ölçüm | Düzeltme |
| --- | --- | --- |
| Altbilgideki "yetki belgesi girilmedi" uyarısı | **2,01:1** | Yeni jeton `--color-uyari-koyu-bant` (7,28:1) |
| Güven şeridindeki "Hazırlanıyor" | **2,42:1** | `metin-pasif` → `metin-3` (6,12:1) |
| `<dl>` içinde geçersiz `<p>` | — | İkinci bir `<dd>` |

#### 1. Uyarı metni kendi bandında okunmuyordu

Altbilgi iki temada da koyu. `uyari-metin` açık zemin için tasarlanmış bir
jeton ve koyu kakao bant üzerinde 2,01:1 veriyordu (eski lacivert bantta
2,28). Tanıdık tuzak: **zemin değişmiyorsa üzerindeki metin de
değişmemeli** — gold rozetinde ve üst şeritte aynısına düşülmüştü.

⚠️ Yeni jeton gold rampasından besleniyor ama `text-gold-*` sınıfı değil.
"Gold asla metin rengi değildir" kuralı aslında "AÇIK ZEMİNDE metin
olamaz" diyor (orada 2,14:1); koyu kakao üzerinde 7,28:1. Ayrı bir jeton,
istisnayı kullanımın kendisine değil bir isme bağlıyor.

#### 2. "Hazırlanıyor" pasif jetonla yazılmıştı

`metin-pasif` **devre dışı bileşenler** için ve WCAG 1.4.3'ün muafiyeti de
yalnızca onları kapsıyor. "Hazırlanıyor" ise gerçek içerik — muafiyet
orada geçerli değildi.

#### 3. ⚠️ Kontrast testinin kendi sınırı görüldü

Bu çiftlerin ikisi de testte **yoktu**. Jetonlar doğru ölçülüyordu; yanlış
yerde kullanılıyorlardı.

Ders listenin kendisiyle ilgili: bir jetonun ölçülmüş olması, **her zemin
üzerinde** ölçülmüş olduğu anlamına gelmiyor. Yeni çift listeye eklendi ve
gerekçesi testin içine yazıldı.

### Lighthouse — medyan (3 koşum, CI)

3 sayfa × 2 cihaz × 3 koşum = 18 rapor. Aşağıdaki tablo üç erişilebilirlik
düzeltmesinden SONRAKİ ölçüm (C paketi dalı, CI koşumu 31880471250).

| Cihaz | Sayfa | Performans | Erişilebilirlik | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Masaüstü | Ana sayfa | **100** | **100** | **100** | 0,74 s | 0,000 |
| Masaüstü | /portfoy | **100** | **100** | **100** | 0,81 s | 0,000 |
| Masaüstü | /mahalleler | **100** | **100** | **100** | 0,72 s | 0,000 |
| Mobil | Ana sayfa | 92 | **100** | **100** | 3,28 s | 0,000 |
| Mobil | /portfoy | 87 | **100** | **100** | 3,94 s | 0,000 |
| Mobil | /mahalleler | 91 | **100** | **100** | 3,49 s | 0,000 |

⭐ **Erişilebilirlik altı ölçümün hepsinde 100** ve raporda kalan hata yok.
Düzeltmelerden önce 94–97'ydi. Hedef ≥95 idi; aşıldı.

Karşılaştırma için düzeltmelerden ÖNCE (B paketi dalı): masaüstü ana sayfa
94, /portfoy 97, /mahalleler 96.

⚠️ Mobil performans 87–92 aralığında ve koşumdan koşuma ~2 puan geziniyor;
zaman çubuğu bu üç sayfanın hiçbirinde yüklenmiyor (yalnızca detay
sayfalarında), yani aradaki fark gürültü.

⚠️ Mobil LCP 3,3–3,9 s ve hedef 2,5 s. Bu **yeni değil** ve kararı
"Gerçek kullanıcı Core Web Vitals ölçümü" bölümünde duruyor: Lighthouse
mobil ölçümü simülasyon, CDN yok, ve kalan yükün %93,8'i çatı. Karar
gerçek kullanıcı verisi görülmeden verilmeyecek.

⚠️ Mobil LCP 3,3–3,7 s ve hedef 2,5 s. Bu **yeni değil** ve kararı
"Gerçek kullanıcı Core Web Vitals ölçümü" bölümünde duruyor: Lighthouse
mobil ölçümü simülasyon, CDN yok, ve kalan yükün %93,8'i çatı. Karar
gerçek kullanıcı verisi görülmeden verilmeyecek.

---

## OSM mahalle sınırı sorgusu sıfır sonuç döndürüyordu (15 Ağustos 2026)

Aslıhan A paketinin 2. adımını çalıştırdı ve şunu gördü:

```
0 yeni · 0 tazelenecek · 0 korunacak · 0 eşleşmedi
27 mahallenin hepsi "OSM'de sınırı bulunamayan" listesinde
```

Belirtiyi doğru okuyan tespit şuydu: **"0 eşleşmedi" olması önemli.** Veri
gelip eşleşememesi başka, hiç veri gelmemesi başka. İkincisiydi.

### Teşhis — iki ayrı hata üst üste binmiş

Sorgu Overpass'te elle çalıştırıldı ve gerçekten boş döndüğü doğrulandı.
Sonra varsayımlar tek tek sınandı.

**1 · `admin_level=10` varsayımı yanlıştı.**

İlçe seviyesi (6) doğruydu — `relation/1771127`, `admin_level=6`, `name=Çorlu`.
Ama Çorlu alanı içindeki idari sınırlar sorulunca çıkan tablo şuydu:

| admin_level | öğe |
| --- | --- |
| 6 | 1 (Çorlu'nun kendisi) |
| **8** | **87 — bunların 26'sı adlı mahalle ilişkisi** |
| 10 | **0** |

Yani Çorlu'nun 26 mahallesi OSM'de `admin_level=8` ile kayıtlı. Kodda 10
yazıyordu, çünkü OSM belgeleri Türkiye için mahalle seviyesini 10 gösterir.
**Belgelenmiş seviye ile fiilen etiketlenmiş seviye aynı olmak zorunda
değil.** OSM gönüllü katkıdır: şema tavsiyedir, veri gerçektir.

**2 · `out geom tags;` üye geometrisini bastırıyordu — asıl katil bu.**

Seviye 8'e çevrilince sorgu 87 öğe döndürdü, adlar da doğruydu. Ama
çözümleyici yine **0 aday** üretti: 59 adsız atlandı, 28 "geometrisiz".

Ham cevaba bakılınca sebep görüldü — ilişkilerde `members` alanı **hiç
yoktu**:

```
Muhittin anahtarları: ['type', 'id', 'bounds', 'tags']    ← members YOK
```

Overpass'te `out` ifadesinin iki ayrı boyutu var:

- **ayrıntı seviyesi** — `ids` · `skel` · `body` · `tags` · `meta`
- **geometri kipi** — `geom` · `bb` · `center`

`tags` bir ayrıntı seviyesidir ve "yalnızca kimlik + etiket" demektir:
**ilişkinin üyelerini bastırır.** Üye kalmayınca `geom` de tutunacak bir şey
bulamayıp kaba dikdörtgeni (`bounds`) döndürür. Çözümleyici bunu haklı
olarak "geometrisiz" sayıp atlıyordu — kaba bir dikdörtgeni mahalle sınırı
diye yazmak, haritada sessizce yanlış alan göstermek olurdu.

`out body geom;` ile aynı sorgu:

```
Muhittin anahtarları: ['type', 'id', 'bounds', 'members', 'tags']
  üye sayısı: 6 | roller: {'outer': 5, 'label': 1} | geometrisi olan: 5
```

⚠️ POI sorgusundaki `out center tags` **doğrudur** ve buraya örnek
alınmamalı: orada nokta/alan merkezleri isteniyor, üye geometrisi değil.
İki sorgunun ihtiyacı farklı olduğu için kipleri de farklı. POI içe
aktarmanın çalışıp sınır içe aktarmanın çalışmamasının sebebi buydu.

### ⚠️ Test hatayı koruyordu

`sinirSorgusu.test.ts` içinde şu satır vardı:

```ts
// Geometri olmadan poligon kurulamaz.
expect(sorgu).toContain('out geom tags;')
```

Yorum doğru, beklenen değer yanlış. Yeşil bir test, sorgunun 26 mahallenin
hepsini sessizce düşürdüğü gerçeğini üstüne mühür basarak koruyordu.

Testin doğrulaması gereken şey "bu dize burada mı" değil, **"sorgu üye
geometrisi istiyor mu"** idi. Yeni hâli iki yönlü: doğru kipin varlığı VE
yanlış kipin yokluğu (`/^out\b.*\btags\b/m` eşleşmemeli).

Bu, projedeki ikinci "kendi sabitini savunmayan koruma testi" vakası —
öncekiler `jetonlar.test.ts` ve `disiplin.test.ts`'teki İZİNLİ kümesiydi.

### Düzeltmeler

| # | Ne | Neden |
| --- | --- | --- |
| 1 | `out geom tags;` → `out body geom;` | Üye geometrisi olmadan poligon kurulamaz |
| 2 | Tek seviye yerine küme: `admin_level~"^(8\|9\|10)$"` | Tek varsayımı başka bir tek varsayımla değiştirmemek için. Seviye yarın 10'a düzeltilirse de çalışır |
| 3 | Yol tarafına `["name"]` şartı | Adsız yollar zaten ilişkilerin parçası; cevabın üçte ikisi onlardı ve panelde "59 sınır atlandı" satırı veri kaybı izlenimi veriyordu. Cevap 87 → 28 öğe |
| 4 | `remark` alanı kontrolü | Overpass aşırı yüklendiğinde HTTP 200 + boş `elements` + `remark` döndürebiliyor. Bu kontrol olmadan **sunucu arızası ile "bölgede sınır yok" ekranda AYNI görünür** |
| 5 | Panelde sıfır-aday uyarısı | "Hiç veri gelmedi" ile "geldi ama eşleşmedi" ayrı gösteriliyor artık |

5. maddenin gerekçesi bu arızanın kendisi: panel sıfır sonucu "OSM'de sınır
yok, elle çizin" diye gösterdi. Aslıhan o ekrana bakıp 27 mahalleyi elle
çizmeye başlasaydı günler boşa giderdi. Bir ilçenin tek bir mahallesinin
sınırsız olması normal; **hepsinin birden olması bizim tarafımızda bir
sorundur.**

### Uçtan uca doğrulama

Düzeltilmiş kodun ürettiği sorgu canlı Overpass'e gönderildi, cevap gerçek
çözümleyiciden geçirildi:

```
adaylar=26  adsizAtlandi=0  geometrisizAtlandi=2
✅ EŞLEŞEN 26 · ⚠️ EŞLEŞMEYEN 0 · ❌ BULUNAMAYAN 1 (Yeşiltepe)
enlem aralığı:  41,0711 – 41,1802
boylam aralığı: 27,6590 – 27,9556
```

Geometrinin gerçekten doğru olduğu ayrıca kontrol edildi: hesaplanan
Muhittin merkezi **41,15250 / 27,81267**, Çorlu merkezi olarak bilinen
41,15525 / 27,81286 ile neredeyse aynı. "Veri geldi" ile "veri doğru" ayrı
şeyler; ikincisi ölçüldü.

`geometrisizAtlandi=2` beklenen: `Ali Osman Çelebi Bulvarı` ve
`Salih Omurtak Caddesi` — sınır olarak etiketlenmiş iki cadde. Kapalı halka
oluşturmadıkları için düşüyorlar ve hiçbir mahalle adıyla eşleşmiyorlar.

### ⚠️ Yeşiltepe muhtemelen Çorlu'da değil — Velimeşe'nin aynısı

OSM'de Çorlu içinde Yeşiltepe yok. Nominatim'de arandığında çıkan tek kayıt:

```
boundary/administrative — Yeşiltepe Mahallesi, Ergene, Tekirdağ
```

Velimeşe ile birebir aynı durum: 6360 sayılı kanunla Ergene ilçesi
kurulurken oraya geçmiş olabilir. **Listeden kaldırılmadı** — bu gerçek
dünyaya dair bir iddia ve `corluMahalleleri.ts` Aslıhan'ın onayladığı bir
liste. Karar onun; teyit gelirse tek satırlık değişiklik.

Bu teyit edilirse merkez mahalle sayısı 18, kırsal 8, toplam **26** olur ve
OSM kapsaması **%100**'e çıkar.

### Elle giriş yolu neden genişletilmedi

İstek şuydu: "OSM'de Çorlu mahalle sınırları gerçekten yoksa elle giriş
yolunu kolaylaştır — mahalle merkezini haritadan tıklayarak seç."

Şart gerçekleşmedi: sınırlar OSM'de **var** ve 26'sı otomatik geliyor.
Elle merkez girmesi gereken tek kayıt Yeşiltepe ve o da muhtemelen listeden
çıkacak. Tek bir kayıt için harita seçici yazmak, çözülmüş bir soruna araç
üretmek olurdu. Gerekirse ayrı iş olarak durur.

POI tarafı zaten sınıra bağlı değil: `merkezlerdenKutu` yalnızca `merkez`
alanını okuyor, `sinir` alanına hiç bakmıyor. Merkez + yarıçap yeterli
şartı **kod seviyesinde zaten sağlanıyordu**, doğrulandı.

---

## Otomatik merkez yedeği — sınırı olmayan mahalle konumsuz kalmasın (15 Ağustos 2026)

Sınır sorgusu düzeltildikten sonra kalan şart şuydu: **Aslıhan tek koordinat
bile girmeyecek.** Sınır düzeltmesi 26 mahalleyi getiriyordu ama OSM'de sınır
kapsaması garanti değil; sınırsız kalan bir mahalleye merkez elle girilmesini
beklemek bu şartı çiğnerdi.

### İki kademeli çözüm, tek sorgu, tek tık

Aynı Overpass sorgusuna ikinci bir `out` ifadesi eklendi:

```
(  … boundary=administrative, admin_level ~ ^(8|9|10)$, name … );
out body geom;                        ← 1. kademe: poligon + alan merkezi
(  … place ~ ^(suburb|neighbourhood|quarter|village|town|hamlet)$, name … );
out center tags;                      ← 2. kademe: yalnızca merkez
```

| Kademe | Kaynak | Verdiği |
| --- | --- | --- |
| 1 | `boundary=administrative` ilişkisi | Sınır poligonu **+** alan ağırlıklı merkez |
| 2 | `place=*` yerleşim düğümü | Yalnızca merkez — poligon yok |
| — | hiçbiri | **Boş bırakılır**, koordinat uydurulmaz |

⚠️ **2. kademede `sinir` alanına DOKUNULMUYOR.** Yer düğümü bir noktadır;
etrafına daire çizip poligon uydurmak, haritada gerçek sanılan sahte bir
alan gösterirdi. Merkez var, sınır yok — ekranda da tam böyle görünüyor.

⚠️ **`locality` kasten dışarıda.** Çorlu içinde 142 tane var ve bunlar
mevkî/tarla adları. Bir mahalleyle adaş olan biri, mahallenin merkezini
kilometrelerce öteye taşırdı. **Yanlış merkez, eksik merkezden kötüdür:**
eksik olan panelde görünür, yanlış olan sessizce yanlış harita gösterir.

⚠️ Elle girilmiş merkez ezilmiyor — 2. kademe yalnızca `merkez` alanı BOŞ
olan mahallelere bakıyor. 1. kademedeki `merkeziYaz` korumasının aynısı.

### Ölçülen kapsama — canlı Overpass, gerçek çözümleyici

```
sınır adayı=26  adsız=0  geometrisiz=2   merkez adayı=34

1. kademe (sınır poligonu + merkez): 26
2. kademe (yalnızca merkez):          0
hiçbiri:                              1  (Yeşiltepe)
TOPLAM OTOMATİK KONUM:               26/27
```

⚠️ **Dürüst not: 2. kademe bugün Çorlu için sıfır ek mahalle çözüyor.**
26'sının zaten sınırı olduğu için devreye girmiyor. Bu bir kazanç değil,
emniyet ağı: OSM'de bir mahallenin sınırı silinir ya da hiç çizilmemiş bir
mahalle listeye eklenirse, merkez yine otomatik gelecek. Bunu "26'yı 27'ye
çıkardı" diye sunmak yanlış olurdu.

### ⚠️ Koruma testi bu sefer DOĞRU KODU engelledi

Sınır düzeltmesinde yazdığım koruma şuydu:

```ts
expect(/^out\b.*\btags\b/m.test(sorgu)).toBe(false)
```

"Hiçbir `out` satırında `tags` geçmesin" diyordu. İkinci kademe eklenince
kırıldı — çünkü yer düğümleri için **`out center tags;` DOĞRUDUR**: `center`
üye geometrisine ihtiyaç duymaz, `tags` orada zararsızdır.

Yasak olan `tags`'in kendisi değil, **`geom` ile birlikte kullanılması**.
Test gerçek değişmezi ifade etmediği için önce hatayı korumuştu (eski hâli),
sonra doğru kodu engelledi (fazla geniş hâli). Şimdi tam olarak değişmezi
ölçüyor: aynı `out` satırında `geom` ve `tags` birlikte bulunamaz.

Bir koruma testinin iki yönlü yanlış olabileceğinin kaydı olarak duruyor.

### Nominatim neden 3. kademe olarak EKLENMEDİ

İstekte yedek yol olarak sorulmuştu. Eklenmedi, gerekçesi şu:
**Nominatim OSM verisini indeksler.** Bir mahalle OSM'de ne sınır ne yer
düğümü olarak varsa, Nominatim'de de yoktur — üçüncü kademe aynı kuyudan
ikinci kez su çekmek olurdu. Ayrıca Nominatim'in kullanım politikası saniyede
1 istek ve toplu kullanımı men ediyor; 27 mahallelik bir döngü sınırda kalırdı.

Doğrulandı: Yeşiltepe Nominatim'de Çorlu içinde aranınca **sonuç yok**.

### ⚠️ Yeşiltepe bir veri boşluğu DEĞİL, liste hatası

Üç bağımsız kaynak aynı şeyi söylüyor:

| Kaynak | Sonuç |
| --- | --- |
| OSM sınır sorgusu (Çorlu alanı) | yok |
| OSM yer düğümü sorgusu (Çorlu alanı) | yok |
| Nominatim ad araması | `Yeşiltepe Mahallesi, Ergene, Tekirdağ` |
| Posta kodu rehberleri | Ergene / 59930 |

**Velimeşe ile birebir aynı durum.** Hiçbir lisanslı üçüncü taraf kaynak bu
mahalleyi Çorlu'ya taşıyamaz, çünkü Çorlu'da değil.

`corluMahalleleri.ts` listesinden **kaldırılmadı** — bu gerçek dünyaya dair
bir iddia ve liste Aslıhan'ın onayladığı bir liste. Teyit gelirse tek satır:
merkez 18 + kırsal 8 = **26**, otomatik kapsama **%100**.

### Üçüncü taraf kaynak araştırması

İstekte "hiçbiri olmazsa lisanslı kaynak öner" deniyordu. Bugün öneri
gerektiren bir mahalle **yok**: tek boşluk yanlış ilçeye ait bir kayıt.
Gerçek bir boşluk çıkarsa sıralama şu olurdu — ⚠️ lisans şartları
DOĞRULANMADI, araştırılması gereken bir liste olarak duruyor:

| Kaynak | Not |
| --- | --- |
| OpenStreetMap | Bugün kullandığımız. ODbL, atıf zorunlu, türetilmiş veri yayınlanabilir |
| TKGM Parsel Sorgu | Resmî kadastro; API var. Yeniden yayın lisansı **belirsiz**, kurumla teyit gerekir |
| NVİ Adres Kayıt Sistemi | Mahalle kodlarının resmî kaynağı; geometri kamuya açık indirilebilir değil |
| HGM / Atlas | Resmî harita; lisans kısıtlayıcı |
| data.gov.tr | İçerik ve lisans veri kümesine göre değişiyor |

⚠️ Bu tablodaki hiçbir lisans iddiası doğrulanmadı ve doğrulanmadan
kullanılmamalı. OSM dışına çıkmak gerekirse önce hukuki teyit alınmalı —
CLAUDE.md kural 6'nın (scraping yasağı) mantığı burada da geçerli.

### Yeşiltepe listeden çıkarıldı (15 Ağustos 2026)

Aslıhan teyit etti; `corluMahalleleri.ts`'ten kaldırıldı. Yeni sayılar:
**18 merkez + 8 kırsal = 26 mahalle**, otomatik konum kapsaması **%100**.

Koruma testi Velimeşe ile birleştirildi: ikisi de 6360 sayılı kanunla Ergene
kurulurken oraya geçmiş, ikisi de listeye bir kez yanlışlıkla girmişti.
Yanlış ilçenin mahallesi listede kalırsa görünür bir hata vermiyor —
sessizce konumsuz bir kayıt olarak duruyor ve her içe aktarmada
"bulunamadı" listesini kirletiyor. Test artık ikisini birlikte savunuyor.

⚠️ Kayıt zaten açılmışsa panelden silinmesi gerekiyor: içe aktarma hiçbir
kaydı silmez, yalnızca "listede olmayan kayıtlar" başlığı altında gösterir.
Panel metni ve kılavuz ikisini de adıyla anıyor.

---

## Overpass 504'ü — dayanıklı içe aktarma (15 Ağustos 2026)

Aslıhan'ın bildirdiği durum: 504 hem sınır hem POI içe aktarmada
**tekrarlıyor**. Doğru teşhis kendisinden geldi — bu bir kerelik arıza
değil, ücretsiz ve paylaşımlı bir kaynağın normal davranışı. Her denemede
şansa bağlı kalmak kabul edilemez.

### Beş cephe

| # | Ne | Nerede |
| --- | --- | --- |
| 1 | Üstel beklemeyle otomatik yeniden deneme (5/15/45 sn, 4 deneme) | `lib/osm/yenidenDeneme.ts` + `components/osm/denemeliCalistir.ts` |
| 2 | Yedek sunucu — her deneme başka aynaya | `lib/osm/istemci.ts` |
| 3 | Sorguyu parçalama | `sinirSorgusu.ts` (2 faz) · `iceAktarma.ts` (kutu kutu) |
| 4 | Kısmi sonuç saklama + "kalanları tekrar dene" | `hazirlikDeposu.ts` + iki sihirbaz |
| 5 | Aynısı POI'de | `lib/osm/iceAktarma.ts`, `OsmSihirbazi.tsx` |

### ⚠️ Yeniden deneme neden İSTEMCİDE

Sunucu eyleminin içinde olsaydı kullanıcı bir dakika boyunca donmuş bir
butona bakardı — ne olduğunu bilmeden, iptal edemeden. Sunucu eylemi ara
durum yayınlayamaz. Şimdi her bekleme saniye saniye geri sayılıyor:
*"OpenStreetMap sunucusu yoğun, 15 sn sonra tekrar denenecek (2/4)"*.

Bekleme sayıları tek kaynakta (`yenidenDeneme.ts`) — ekranda sayan ile
uygulayan aynı değeri okumalı.

### ⚠️ Geometri istemciye inmiyor

Parçalı akışta döngüyü istemci sürüyor. En kolay yol her parçanın sonucunu
istemciye yollayıp yazma anında geri almak olurdu — ve bu, ağ isteğini
düzenleyen birinin panelde gördüğünden bambaşka bir poligon yazdırmasına
kapı açardı.

Onun yerine parça sonuçları sunucuda `HazirlikDeposu` içinde birikiyor.
İstemci yalnızca "kaçıncı parça, kaç kayıt geldi" görüyor.

İkinci faydası nezaket: **önizleme ile yazma arasında Overpass'a ikinci kez
sorulmuyor.** Eski akış yazarken bütün sorguyu baştan çalıştırıyordu — yani
paylaşımlı kaynağa iki kat yük ve 504 için iki kat fırsat.

### Sınır sorgusu ikiye bölündü

| Faz | Sorgu | Ağırlık |
| --- | --- | --- |
| 1 | `map_to_area` + `out tags;` — kimlikler ve yer düğümleri | 13 KB, **2,1 sn** |
| 2 | `relation(id:…); out body geom;` — grup grup | grup başına 0,3–9,5 sn |

2. fazda `map_to_area` yok, alan taraması yok. Ağır olan üye koordinatları
gruplara bölündü; bir grup düşerse yalnızca o grup yeniden isteniyor.

### Grup boyutu tahminle değil ÖLÇÜMLE seçildi

Önce 5 yazmıştım. Canlı ölçüm:

```
beşerli gruplar → 6 grubun 3'ü ilk denemede 429/504
tek ilişki      → 0,6–2,6 sn, düzenli başarı
```

Üç, bu ikisi arasında bilinçli orta yol: 26 mahalle için dokuz istek. Daha
küçültmek istek sayısını gereksiz artırırdı; Overpass'ın kullanım politikası
toplam işlem yükünü de sayıyor.

### ⚠️ 429'un sebebi parçalamanın kendisiydi

İlk ölçümde altı grubun üçü **429 (çok fazla istek)** aldı. Sebep şuydu:
altı istek de arka arkaya **aynı sunucuya** gidiyordu. Parçalamak, tek bir
sunucuya yağmur yağdırmaya dönüşmüştü.

İki düzeltme:
- Sunucu seçimi artık `dagitim + denemeSirasi` ile yapılıyor — her parça
  farklı aynadan başlıyor
- Nezaket aralığı süreç geneli değil **sunucu başına** (2 sn); farklı
  aynalara giden istekler birbirini beklemiyor

### ⚠️⚠️ HER AÇIK ÖRNEK KÜRESEL VERİ SUNMUYOR — az kalsın kaçıyordu

Listeye `overpass.osm.ch` de konmuştu. Ölçüm çıktısındaki bayt sayıları
tuhaftı: o sunucudan gelen dört grup **272 bayt** idi. Kontrol edildi:

```
overpass-api.de   → 1 öğe, "Muhittin Mahallesi"
overpass.osm.ch   → 0 öğe, remark yok, hata yok, HTTP 200
```

O örnek yalnızca İsviçre bölgesini sunuyor ve Türkiye kimlikleri için
**sessizce boş cevap** veriyor. Fark edilmeseydi dört grup "başarıyla" boş
gelir, **12 mahalle hiçbir hata mesajı olmadan sınırsız kalırdı.**

Projenin sürekli savaştığı arıza sınıfının ta kendisi: sunucu arızası ile
"kayıt yok" ekranda aynı görünür.

İki koruma eklendi:
1. `overpass.osm.ch` listeden çıkarıldı; kalan üç sunucunun küresel veri
   sunduğu ölçümle doğrulandı. Bir test o adresi geri koymayı zorlaştırıyor.
2. **Yapısal kapı:** 2. faz adı sanı belli kimlikleri istiyor ve onların var
   olduğunu 1. fazda gördük. Sıfır öğe dönmesi geçerli bir başarı değil —
   `yeniden_denenebilir` sayılıyor ve bir sonraki ayna deneniyor. Bu kapı,
   ileride yapılandırılacak herhangi bir bölgesel aynayı da yakalar.

Bayt sayısına bakmasaydım bu hata testlerden, tip denetiminden ve
derlemeden geçip yayına giderdi. "Yeşil" ile "doğru" ayrı şeyler.

### Uçtan uca ölçüm — düzeltilmiş yapılandırma

```
grup 0 (3 ilişki): ✅ overpass-api.de        0,5 sn, 3 öğe (deneme 1)
grup 1 (3 ilişki): ✅ overpass.kumi.systems  5,5 sn, 3 öğe (deneme 1)
grup 2 (3 ilişki): ✅ overpass.private.coffee 73,1 sn, 3 öğe (deneme 1)
grup 3 (3 ilişki): ✅ overpass-api.de        1,6 sn, 3 öğe (deneme 1)
grup 4 (3 ilişki): ✅ overpass.kumi.systems  6,6 sn, 3 öğe (deneme 1)
grup 5 (3 ilişki): ✅ overpass.private.coffee 9,5 sn, 3 öğe (deneme 1)
grup 6 (3 ilişki): ✅ overpass-api.de        0,3 sn, 3 öğe (deneme 1)
grup 7: ✗ kumi 000 → ✅ private.coffee  6,9 sn (deneme 2)
grup 8: ✗ private.coffee 000 → ✗ overpass-api.de 504 → ✅ kumi (deneme 3)

9/9 grup · 26/26 ilişki · 12 istek · 584 sn
```

⚠️ **Dürüst not: 584 sn'nin çoğu iki bağlantı zaman aşımı.** Yedi grup ilk
denemede ve saniyeler içinde geldi; iki grup dakikalar sürdü. Yani "artık
hızlı" demek yanlış olur — doğru olan şu: **artık şansa bağlı değil.**
İlerleme çubuğu ve kısmi sonuç, uzun süren durumu katlanılır kılıyor.

### Nezaket

Overpass'ın açık örnekleri ücretsiz. Dört koruma birlikte:

- `User-Agent` projeyi ve adresi tanıtıyor (kullanım politikasının isteği)
- Aynı sunucuya iki istek arasında en az 2 sn
- En fazla 4 deneme, üstel bekleme (5/15/45 sn)
- **400 ve 403 yeniden DENENMEZ** — ilki bizim hatamız, ikincisi "yeter
  artık" demektir. İkisinde de ısrar etmek kaynağı kötüye kullanmaktır

### Yapılandırma

Yeni ortam değişkeni **eklenmedi**. `OVERPASS_ADRESI` artık virgülle
ayrılmış liste kabul ediyor; tek adres yazan mevcut kurulumlar aynen
çalışmaya devam ediyor. Yeni bir değişken, sunucudaki `.env`i düzenlemeyi
unutan birini sessizce yedeksiz bırakırdı.

### 429'a özel davranış ve işlemler arası soğuma (15 Ağustos 2026)

Bir önceki iş 504'ü çözdü ama yeni bir belirti çıktı: **sınır içe aktarmanın
hemen ardından POI denenince 429.** Sebep açık — sınır işlemi 12 istek
göndermişti ve iki ekran Overpass açısından aynı istemci.

#### 429 diğer hatalardan ayrıldı

Önceki hâlde 429 da `yeniden_denenebilir` sayılıyordu, yani 5 sn sonra
tekrar deneniyordu. Bu yanlış yön: **504 "yetişemedim", 429 "seni
kısıtladım" demek.** İkincisinde ısrar kısıtlama penceresini uzatır.

| | 504 / 5xx | 429 |
| --- | --- | --- |
| Anlamı | Sunucu şu an yetişemedi | Bizi geçici olarak kısıtladı |
| Bekleme | 5 · 15 · 45 sn | **60 · 180 · 180 sn** |
| `Retry-After` | — | varsa ona uyulur |
| Deneme sayısı | 4 | **4 — değişmedi** |
| Ekran metni | "sunucu yoğun" | "kota sınırı, bu bir hata değil" |

⚠️ **Deneme sayısı ARTIRILMADI.** 429'da doğru tepki daha çok denemek değil,
daha çok beklemek. Bir test bunu kilitliyor: merdiven uzadı, basamak sayısı
değil.

⚠️ `Retry-After` merdivenin önünde ama merdivenden kısa olamaz
(`Math.max`). Sunucu ne kadar beklememizi istediğini söylediyse tahmin
yürütmenin anlamı yok; ama söylediğinden hızlanmak da 429'da yanlış yön.
Başlığın iki biçimi de okunuyor (saniye ve HTTP tarihi) ve saçma değerlere
karşı 5 dakikalık üst sınır var — bozuk bir başlık paneli yarım saat
dondurmasın.

⚠️ Ekran metni bunun bir **arıza olmadığını** açıkça söylüyor. "Hata" diye
okuyan biri butona tekrar tekrar basar ve tam olarak yapılmaması gerekeni
yapar. Kota mesajı ayrıca `aktarim-hata` / `osm-hata` sınıfıyla, normal
yeniden denemeden görsel olarak da ayrı gösteriliyor.

⚠️ **Doğrulanamayan nokta, dürüstçe:** `Retry-After` ayrıştırması birim
testleriyle sınandı ama **gerçek bir Overpass 429 cevabında bu başlığın
gönderildiği gözlemlenmedi** — kasten 429 tetiklemek kaynağı kötüye
kullanmak olurdu. Başlık yoksa merdiven zaten devreye giriyor; yani başlık
hiç gelmese de davranış doğru.

#### İşlemler arası soğuma uyarısı

`istemci.ts` artık herhangi bir sunucuya yapılan **son isteğin anını** da
tutuyor. Beş dakikadan yeniyse iki sihirbaz da açılışta uyarı gösteriyor:

> **Sınır içe aktarma az önce çalıştı.** İki işlem aynı OpenStreetMap
> kotasını paylaşıyor; hemen başlarsanız sunucu bizi kısıtlayabilir (429).
> ~4 dk bekleyip denemeniz daha hızlı sonuçlanır. Yine de şimdi
> başlayabilirsiniz.

⚠️ **Buton ENGELLENMİYOR.** Acele eden birinin işini durdurmak bizim işimiz
değil; ne olacağını söylemek işimiz. Uyarı yalnızca işlem başlamadan önce
görünüyor — başladıktan sonra o istekleri zaten biz yapıyoruz.

⚠️ Uyarı **iki ekranda da** var. İstek yalnızca POI ekranı içindi ama durum
simetrik: POI önce çalışırsa sınır içe aktarma aynı duvara toslar.

---

## Marka ve Görünüm paneli (15 Ağustos 2026)

Aslıhan logoyu, site adını ve renkleri kod bilmeden değiştirebiliyor.
Açılan şey sınırlı ve bu bilinçli: **on anlamsal renk yuvası**, logo, site
adı, slogan, OG görseli. Kapalı kalanlar: serbest CSS/HTML, tipografi,
boşluk/köşe/gölge jetonları, rampa basamakları.

Tipografi özellikle kapalı — font Türkçe alt kümeye bağlı; değiştirilirse
alt küme bozulur ve harfler kutu olur.

### ⚠️ Çalışma zamanı — `NEXT_PUBLIC_*` tuzağının aynısı

`globals.css` derleme anında paketlenir. Renkleri oraya yazsaydık Aslıhan
panelde rengi değiştirir, kaydeder ve **hiçbir şey olmazdı** — üstelik
sebebini anlamasının yolu olmazdı. 12 Ağustos'ta dokuz değişkenin birden
ölmesinin sebebi tam olarak buydu.

Palet veritabanından okunup `<head>` içine bir `<style>` bloğu olarak,
**sunucuda** basılıyor. Sunucuda basılması FOUC'u da çözüyor: ilk boyamada
doğru renkler yerinde.

**Canlı ölçüm** — aynı çalışan sunucu, derleme yok:

```
ÖNCE   --color-zemin:#fbfaf7
       (veritabanında değiştirildi, imaj DERLENMEDİ)
SONRA  --color-zemin:#eef6f2
       manifest.webmanifest background_color: #eef6f2
```

### Kontrast kapısı — dört katman, dördü de farklı işe yarıyor

| Katman | Neyi korur | Canlı ölçüldü mü |
| --- | --- | --- |
| Panel bileşeni | Neyin neden geçmediğini anlatır, alternatif önerir | — |
| Alan `validate` | Kaydetmeyi engeller, hatalı yuvayı işaretler | ✅ |
| Sunucu kancası | Local API, seed, betikler | ✅ |
| Çalışma zamanı yedeği | Elle SQL ve bozuk eski kayıt | ✅ |

Canlı doğrulama:

```
1) payload.updateGlobal ile AA'sız palet
   → kanca engelledi: "açık temada 3 renk çifti WCAG AA eşiğinin altında"
2) kanca ATLANARAK doğrudan SQL ile aynı palet yazıldı
   → site yine de --color-metin:#3d2b2f yayınladı (varsayılana düştü)
```

⚠️ **"Kaydet butonunu pasifleştir" DENENDİ VE VAZGEÇİLDİ.** Payload'ın
`setDisabled(true)` çağrısı formun tamamını kilitliyor — renk alanları
dahil. Yani kapı kapanınca kullanıcı sorunu düzeltemez hâle geliyordu.
Kapının amacı kötü paleti engellemek, kullanıcıyı hapsetmek değil.
`validate` ile hem engel var hem yön gösterme: hatalı yuva kırmızı,
sebep hemen altında.

### ⚠️ İstekte verilen terracotta kapıdan geçmiyor

Şartname vurgu rengi için `#A85A42` yazıyordu. Ölçüm:

| Çift | Oran | Sonuç |
| --- | --- | --- |
| `#A85A42` / ana zemin `#FBFAF7` | 4,78 | geçer |
| `#A85A42` / **krem bölüm zemini** `#F2EBE3` | **4,22** | **kalır** |
| `#844632` / krem bölüm zemini | 5,64 | geçer |

Sitedeki `#844632` tam da bu yüzden türetilmişti. Varsayılan olarak
şartnamedeki değeri koysaydık kapı ilk açılışta kırmızı yanardı. Bir test
bu somut vakayı belgeliyor: **"renk kartelasında güzel duruyor" ile
"sitede okunuyor" ayrı şeyler.**

### Favicon — 404 çözüldü, ölçüldü

⚠️ Projede hiç ikon dosyası yoktu: ne `src/app/favicon.ico` ne `public/`
altında bir şey. Lighthouse raporundan **öncesi**:

```
best-practices: 96  (altı ölçümün hepsinde)
düşen tek denetim: errors-in-console
tek konsol hatası: http://localhost:3000/favicon.ico → 404
```

Beş rota eklendi ve hepsi marka panelindeki kare simgeden **sharp** ile
üretiliyor: `favicon.ico` · `apple-touch-icon.png` (180) · `icon-192.png` ·
`icon-512.png` · `manifest.webmanifest`.

⚠️ **Simge yüklenmemiş olsa bile ikon üretiliyor.** "Aslıhan bir görsel
yükleyene kadar 404 devam etsin" demek sorunu çözmemek olurdu. Simge yoksa
site adının baş harfinden, marka renkleriyle bir monogram üretiliyor.

⚠️ ICO kabı **elle yazıldı** — sharp ICO yazamıyor. `/favicon.ico` adresine
PNG servis etmek çoğu tarayıcıda çalışır ama "çalışır" ile "doğru" aynı şey
değil. ICO, PNG'yi saran 22 baytlık basit bir kap. Doğrulandı:

```
$ file favicon.ico
MS Windows icon resource - 1 icon, 32x32 with PNG image data,
32 x 32, 8-bit/color RGBA, non-interlaced, 32 bits/pixel
```

Canlı yanıtlar: `/favicon.ico` 200 (636 B) · `/apple-touch-icon.png` 200
(3,6 kB) · `/icon-192.png` 200 (3,9 kB) · `/icon-512.png` 200 (14,6 kB) ·
`/manifest.webmanifest` 200.

⚠️ İkonlar **veritabanı erişilemezken bile** döndü (ilk denemede sunucu
yanlış konağa bağlanıyordu ve ana sayfa 500 veriyordu). Yedek mekanizması
tasarlandığı gibi çalıştı: favicon sitenin geri kalanına bağlı değil.

### Logo yokken site kırılmıyor

Başlıktaki marka bugüne kadar elle yazılmış "Aslıhan GYD" metniydi. Artık
`MarkaLogosu` bileşeni: logo varsa görsel, yoksa **metin yedeği**. Dosya
silinse ya da veritabanı okunamasa da marka görünür.

⚠️ Tema-duyarlı logo seçimi CSS ile, JS ile değil. Tema `data-tema` ile ve
istemcide seçiliyor; sunucu hangisinin geçerli olduğunu bilmiyor. İki
logoyu da basıp birini CSS ile gizlemek, ilk boyamada doğrusunun
görünmesini garanti ediyor — tema titreme önleyicisinin çözdüğü sorunun
aynısı.

⚠️ Altbilgi bandı iki temada da koyu: orada `daimaKoyuZemin` ile koyu logo
yeğleniyor, yoksa ana logo, o da yoksa metin.

### Logo boyut bütçesi — kapı değil ayna

50 kB'ı aşan logo **engellenmiyor**, uyarılıyor. Görsel bütçe rozetiyle
aynı ilke: bazen büyük logo bilinçli karardır ve içerik girişini bloke
etmek Aslıhan'ı panelde durdururdu.

⚠️ Renk kapısı bundan farklı ve farklı olmalı: kontrast erişilebilirlik,
dosya boyutu performans. Birincisi pazarlık konusu değil, ikincisi duruma
göre değişir.

### Yeni bağımlılık: `@payloadcms/ui`

Proje bugüne kadar özel panel bileşenlerini sunucu bileşeni olarak yazdı ve
bu paketi doğrudan bağımlılık yapmaktan kaçındı (`GorselButceRozeti`
yorumunda gerekçesi yazılı: "gerekli de değil").

Burada gerekli oldu: "renk seçildiği ANDA kontrast gösterilsin" ve "canlı
önizleme" istekleri canlı form durumunu okumayı gerektiriyor. Kaydedilmiş
veriyi okuyan bir sunucu bileşeniyle yapılamaz. Sürüm diğer `@payloadcms/*`
paketleriyle aynı: `3.87.0`.

### İki koruma testi bu işte konuştu

**1 · Tasarım disiplini testi ham hex yakaladı.** `RenkAlani.tsx` içinde
`#000000` iki kez geçiyor — `<input type="color">` somut değer bekliyor ve
yer tutucu biçimi gösteriyor. Muafiyet eklendi ama dosyanın kendi
kültürüne uyarak **bedeliyle**: yeni bir test o dosyada yalnızca nötr giriş
değerlerine izin veriyor. Bir marka rengi oraya sabitlenirse palet
değiştiğinde panel eski markada kalırdı.

**2 · Kendi testim yanlış kapsamdaydı.** `paletCss` enjeksiyon testinde
`expect(css).not.toContain('--color-zemin:')` yazmıştım ve kırmızı verdi.
Kod doğruydu: açık tema zehirli değeri süzmüş, **koyu tema kendi geçerli
zeminini yazmıştı.** İddia açık tema bloğuna daraltıldı. Test, süzgecin
çalışmadığını değil kendi kapsamının yanlış olduğunu göstermişti.

### Doğrulanmayan tek nokta

⚠️ **Mobil panel görsel olarak denenmedi.** CSS yapısal olarak hazırlandı —
dokunma hedefleri en az 44 px (WCAG 2.2), kontrast tablosu kendi içinde
yatay kayıyor, hazır palet kartları `auto-fill` ızgarada. Ama bu ortamda
tarayıcı yok; gerçek bir telefonda açılıp denenmesi gerekiyor.

---

## /harita boş geliyordu — teşhis ve dayanıklılık (16 Ağustos 2026)

Belirti: katman kontrolleri ve mahalle listesi çalışıyor, harita altlığı yok.

### ⚠️ Sorulan soru yanlış yeri işaret ediyordu

Soru şuydu: *"MapTiler .env'de eski adla dolu, yeni adla boş. Geri düşüş
diğer değişkenlerde çalışıyor, MapTiler neden kapsam dışı?"*

**Kapsam dışı değildi.** Üç ayrı düzeyde ölçüldü:

| Ölçüm | Sonuç |
| --- | --- |
| `ayar('MAPTILER_ANAHTARI')` birim testi (yeni ad boş, eski ad dolu) | `TEST_ANAHTAR_123` döndü |
| `haritaStilAdresi()` | Geçerli stil adresi üretti |
| **Gerçek üretim derlemesi**, `MAPTILER_ANAHTARI=""` + eski ad dolu | Anahtar sunucuda render edilen HTML'e ulaştı |

`ayarlar.ts` içindeki `ham()` `process.env[ad]` ile **dinamik** okuma
yapıyor; Next.js dinamik erişimi derleme anında gömemiyor. `compose.prod.yml`
eski adları da geçiriyor. Yani zincirin hiçbir halkası kopuk değildi.

### Asıl sebep: katmanlarımız altlığın başarısına bağlıydı

```ts
harita.on('load', () => {
  kagitTonunaCevir(harita)
  katmanlariKur(harita)   // ← mahalle sınırları, sütunlar, POI'ler
  setHazir(true)
})
```

MapLibre `load` olayını **yalnızca stil başarıyla yüklendiğinde** ateşliyor.
MapTiler 401/403 döndüğünde ya da anahtar hiç yokken `load` hiç gelmiyor ve
**bizim poligonlarımız da hiç eklenmiyordu.**

Üstelik sahne, anahtar yokken haritanın YERİNE bir boş durum kutusu
koyuyordu — yani elimizdeki veri, dış bir servisin durumuna bağlanmıştı.

⚠️ **Mahalle sınırları bizim verimiz; MapTiler yalnızca taban görüntü.**
Altlık gelmediğinde sınırların da kaybolması için hiçbir teknik sebep yoktu,
yalnızca kurulum sırası öyleydi.

### Düzeltme

Stil artık **önce çözülüyor, harita sonra kuruluyor** (`lib/harita/stil.ts`):

```
stiliCoz(adres) → { durum, stil }
  anahtar_yok   → yerel stil
  reddedildi    → yerel stil + kod
  ulasilamadi   → yerel stil + sebep
  uzak          → MapTiler stili
```

MapLibre'ye artık **adres değil çözülmüş stil nesnesi** veriliyor; `load`
her hâlükârda ateşleniyor, katmanlar her hâlükârda ekleniyor.

⚠️ **Ek istek yok:** stil JSON'unu biz alıp nesne olarak veriyoruz, MapLibre
aynı adresi ikinci kez istemiyor. Hata sınıflandırması bedavaya geliyor.

⚠️ Yedek stilde `glyphs` **yok ve olamaz** — yazı tipi kaynağını da MapTiler
sağlıyor. Bu yüzden yedek kipte metin katmanları hiç eklenmiyor; eklenseydi
her karo için konsola hata yağar ve yine hiçbir etiket çizilmezdi. Etiketsiz
bir sınır haritası, hiç harita olmamasından kat kat iyi.

### Üç arıza, üç ayrı mesaj

| Durum | Ekranda |
| --- | --- |
| Anahtar yok | "Harita anahtarı girilmemiş… MAPTILER_ANAHTARI yapılandırılmalı." |
| 401 / 403 | "Harita anahtarı reddedildi (403)… **MapTiler hesabındaki origin kısıtını kontrol edin.**" |
| Ağ / diğer | "Harita servisine ulaşılamadı… bağlantınızı kontrol edip sayfayı yenileyin." |

Üçü de "sınırlar çiziliyor ama sokak altlığı yok" diye başlıyor: harita
bozuk değil, eksik.

⚠️ Bu mesaj `hata` şeridinde değil ayrı bir **bilgi** şeridinde. İkisini
aynı kutuya koymak, çalışan bir haritayı bozukmuş gibi gösterirdi.

⚠️ HTTP 200 her zaman stil demek değil: yanlış yapılandırılmış bir vekil ya
da yakalama portalı 200 ile HTML döndürebilir. Biçim kontrolü olmasa
MapLibre'ye çöp verilir ve hata anlaşılmaz bir yerde patlardı.

### Uçtan uca doğrulama — gerçek derlenmiş sunucu

`MAPTILER_ANAHTARI=""` ve `NEXT_PUBLIC_MAPTILER_API_KEY=""` (yani hiç
anahtar yok), üç mahalleye gerçek OSM sınırı yazılmış hâlde:

```
✅ eski boş durum ("Etkileşimli harita hazırlanıyor"): yok
✅ veri boş durumu ("Harita verisi henüz girilmedi"):  yok
✅ poligon geometrisi HTML'de:                          var
✅ harita kapsayıcısı:                                  var
```

⚠️ **Doğrulanmayan kısım, dürüstçe:** sunucunun poligon verisini gönderdiği
ve harita bileşeninin kurulduğu ölçüldü. Tuvale gerçekten çizildiği bir
tarayıcı gerektiriyor ve bu ortamda tarayıcı yok. Sınıflandırma ve yerel
stilin dış istek yapmaması birim testleriyle kapatıldı.

### Kalıcı koruma

`ayarlar.test.ts`e eklenen test, **eski adı tanımlı HER ayarın** geri
düşüşünü tek tek sınıyor. "Şu değişken neden kapsam dışı?" sorusu bir daha
sorulmak zorunda kalmasın diye; biri listeden düşerse orada kırmızı yanar.
## Ana sayfa hero slider (16 Ağustos 2026)

Yeni global: **Ana Sayfa Hero**. Slaytlar, otomatik geçiş anahtarı ve
geçiş süresi panelden yönetiliyor.

### Üç yol, üç farklı JS maliyeti

| Durum | Ne çizilir | İstemci JS |
| --- | --- | --- |
| Slayt yok | Mevcut metin hero'su | **0** |
| Tek slayt | Sunucuda basılmış tek görsel | **0** |
| Çok slayt | Aynı işaretleme + kumanda | +3,1 kB gzip |

⚠️ **Koşullu render tek başına yetmezdi.** Kumanda bileşeni `next/dynamic`
ile ayrı parçaya alınmasaydı, tek slaytlı bir sayfada da ana parçaya girer
ve indirilirdi. İsteğin "tek slayt varsa slider mekanizması hiç
yüklenmesin" şartı tam olarak bunu diyor.

Ölçüm:

```
main (öncesi)        /  12 dosya  202,0 kB gzip
hero-slider (sonrası)/  12 dosya  202,0 kB gzip     ← değişmedi
kumanda parçası                     3.114 bayt gzip  ← ayrı, tembel
eşik                              220,0 kB
```

### ⚠️ Slaytlar sunucuda basılıyor, istemcide değil

Hero sayfanın LCP öğesi. Slaytlar istemcide çizilseydi ilk boyama JS'in
inip çalışmasını beklerdi. Kumanda yalnızca **hangisinin görüneceğini**
yönetiyor; işaretlemeyi sunucu basıyor. JS hiç gelmese bile ilk slayt
görünüyor ve okunuyor.

### LCP ve CLS — gerçek HTML'de doğrulandı

Gerçek derlenmiş sunucudan, iki slaytlı veriyle:

```
preload as=image            : 1  (yalnızca ilk slayt, responsive srcset)
ilk slayt style             : opacity:1        ← sunucuda görünür
başlık HTML'de              : var
sizes="100vw"               : var
ikinci slayt loading="lazy" : var
aspect-ratio kapsayıcı      : var              ← CLS 0
```

⚠️ `sizes="100vw"` olmadan tarayıcı en büyük varyantı iner ve 80 kB'lık
mobil hero bütçesi anlamını kaybederdi.

⚠️ En-boy oranı **sabit ve slayta göre değişmiyor**. Slayt başına yükseklik
açılsaydı geçişte düzen zıplar ve CLS bozulurdu.

### ⚠️⚠️ İLK SÜRÜM LCP'Yİ BOZDU — ÖLÇÜLDÜ, DEĞİŞTİRİLDİ

CI'daki Lighthouse ilk sürümü ölçtü:

| Ölçüm | LCP önce | LCP sonra | Perf |
| --- | --- | --- | --- |
| Mobil ana sayfa | 3,30 s | **3,67 s** | 92 → 89 |
| Masaüstü ana sayfa | 0,75 s | 0,78 s | 100 |

Ağ isteklerine bakınca sebep göründü:

```
33,5 kB  Image  demo-hero-900.jpg&w=750   ← LCP öğesi
33,4 kB  Image  demo-hero-901.jpg&w=750   ← İKİNCİ SLAYT, inmemeliydi
```

⚠️ **`loading="lazy"` YETMİYOR.** Slaytlar `inset-0` ile görüntü alanının
**içinde** duruyor — yalnızca saydamlıkları sıfır. Tembel yükleme ise
görüntü alanı **dışındaki** görselleri erteliyor. İkinci slaydın görseli
LCP görseliyle bant genişliği için yarışıyordu.

Düzeltme: sunucu artık **yalnızca ilk slaydı** basıyor. Sonrakiler kumanda
tarafından, ilk kez gösterildiklerinde istemcide kuruluyor. LCP öğesi olan
ilk slayt sunucuda ve `priority` ile kalıyor.

`yuklenenler` kümesi bir kez gösterilen slaytları hatırlıyor: ileri-geri
gidildiğinde yeniden kurulmuyorlar.

⚠️ Kayıt EFEKTTE değil geçişin kendisinde yapılıyor. İlk hâlim
`useEffect(() => setYuklenenler(...), [aktif])` idi ve lint haklı olarak
uyardı: efektte durum yazmak fazladan bir render turu doğurur ve slaydın
kurulmasını bir kare geciktirir.

Bir test bu gerilemeyi kilitliyor: **sunucu bileşeni slaytlar üzerinde
döngü kurmamalı.**

### ⚠️ Lighthouse'un slider'ı gerçekten ölçmesi için tohuma slayt eklendi

Slider slayt yokken hiç render edilmiyor — yani boş veritabanında
Lighthouse onu hiç ölçmez ve "LCP bozulmadı" demek **ölçülmemiş bir iddia**
olurdu. `scripts/seed.ts` artık iki demo slayt basıyor (birincisi LCP
öğesi, ikincisi tembel) ve CI koşumu gerçek slider'lı sayfayı ölçüyor.

⚠️ Otomatik geçiş tohumda da KAPALI — üretim varsayılanıyla aynı. Açık
tohumlamak, ölçtüğümüz sayfayı gerçekte yayınlanacak sayfadan farklı
kılardı.

### Erişilebilirlik

- Klavye sağ/sol ok tuşları
- `aria-live` **yalnızca otomatik geçişte** "polite" — elle geçişte
  kullanıcı ne yaptığını zaten biliyor, her tıklamada duyuru gürültü olurdu
- Duraklat düğmesi (yalnızca otomatik geçiş açıkken; kapalıyken
  duraklatılacak bir şey yok)
- Fare üzerine gelince ve odak alınca otomatik geçiş duruyor
- Nokta göstergeleri 44 px dokunma hedefi (WCAG 2.5.8)

⚠️ `prefers-reduced-motion` otomatik geçişi **tümden kapatıyor**, süreyi
kısaltmıyor. WCAG 2.2.2'nin konusu hareketin kendisi, hızı değil.

⚠️ Görünmeyen slayt `inert` ile klavye sırasından da çıkarılıyor;
`opacity: 0` tek başına odaklanmayı engellemiyor.

### ⚠️ Otomatik geçiş varsayılan KAPALI

Hem erişilebilirlik hem LCP kararı: her otomatik geçiş bir boyama daha
demek ve LCP ölçümünün ortasında yeni bir büyük görsel çizmek ölçülen
değeri kötüleştiriyor. Açmak Aslıhan'ın kararı; varsayılan açık gelmesi
bizim kararımız olurdu ve yanlış olurdu.

Geçiş süresi 4 saniyenin altına inemiyor: okumaya vakit bırakmayan bir
slider, olmayan bir slider'dan kötüdür.

### ⚠️ Disiplin testi buton seçimini düzeltti

Hero eylemini adaçayı butonla yazmıştım; `disiplin.test.ts` yakaladı —
adaçayı çağrıları 4 ile sınırlı ve bu beşincisi olurdu.

Test haklıydı ama asıl mesele daha derindi: **koyu fotoğraf üzerinde
adaçayı zaten doğru cevap değil.** Karartma oranı kullanıcıya bağlı olduğu
için buton-zemin kontrastı öngörülemez hâle gelirdi. Yeni `acikBant`
görünümü eklendi — beyaz zemin, kakao metin; karartmadan bağımsız olarak
fotoğraftan ayrışıyor.

Ölçüm: metin açık temada **13,24:1**, koyu temada **7,23:1**.

⚠️ Kontrast testine yeni çift EKLENMEDİ: WCAG oranı simetrik olduğu için
mevcut `BEYAZ / kakao-yuzey` çifti aynı sayıyı zaten ölçüyor. Ayrı çift
eklemek aynı ölçümü ikinci kez yapmak olurdu; onun yerine mevcut çiftin
kapsamı yazıldı.

### Arama kartı slaydın üstüne bindirilmedi

Metin hero'sunda kart hero'ya biniyor (-3rem) çünkü altındaki zemin sakin.
Fotoğraf üstünde aynı şey iki sorun doğururdu: kart slaydın başlığıyla
çakışır ve okunurluğu **kullanıcının seçtiği karartma oranına** bağlı hâle
gelir. Slider varken kart hero'nun altında, kendi zemininde duruyor.

### Panelde açılmayanlar

Geçiş efekti seçimi, slayt başına yükseklik ve video slayt bilinçli olarak
yok. Sırasıyla: her efekt ek JS ve ek boyama; değişken yükseklik CLS'i
bozar; video LCP'yi ölçülemez hâle getirir.
