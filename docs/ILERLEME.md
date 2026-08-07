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
| 2B+ | Kalan bal küpü modülleri + raporlar | ✅ 4 modül + PDF rapor — bkz. aşağısı |
| 2B++ | Portföy giriş sihirbazı | ✅ Admin'in yanında, EİDS canlı geri bildirimli |
| 2C | Gözlem girişi ve endeks altyapısı | ✅ (sayfa kapalı — tasarım gereği) |
| 3 | Drone / 360° medya | ⏭️ atlandı — altyapı hazır |
| 4 | Yatırım skoru, AI arama, raporlar | 🟡 Skor + raporlar tamam; AI arama yapılmadı |
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
| Derleme: yerel 107 sn, **CI 37 sn** | Sorun değil | Eşik 150 sn'ye çekildi; CI bunun çok altında. `.next/cache` önbelleği eklendi ama Turbopack oraya yazmadığı için kazancı yok — ölçüm ve gerekçe "CI derleme önbelleği ölçümü" başlığında. |
| **Sunucu tarafı PDF yok** | Rapor e-postaya iliştirilemiyor | Faz 4: Playwright + headless Chrome ile `/rapor/*` rotaları render edilecek. Türkçe sorunu yok, `@media print` aynen geçerli. Chromium ~300 MB → kuyrukta çalışmalı. SMTP gelmeden anlamsız. |
| SMTP yok | Lead bildirimi gitmiyor | Kayıt düşüyor, e-posta gitmiyor. Bilgi bekleniyor. |
| E-posta bildirimi kodu yok | — | SMTP bilgileri gelince `yetkisiBitecekleriBildir` görevine eklenecek |
| `sharp` 0.34'e sabit | — | Payload sürüm yükseltmesinde 0.35 tekrar denenebilir |
| PostGIS `tiger`/`topology` şemaları | Disk | Düşük öncelik |
| Rol tabanlı yetkilendirme | — | `Kullanicilar.rol` alanı var ama henüz erişim kurallarına bağlı değil; CRM fazında |
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
