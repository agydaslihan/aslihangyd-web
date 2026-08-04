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
| 2 | Harita, hesaplayıcılar, ticari dikey | ⏳ sırada |
| 2B | Bal küpü modülleri, CRM, portföy yönetimi | ⏳ |
| 2C | Gözlem girişi ve endeks altyapısı | ⏳ |
| 3 | Drone / 360° medya | ⏭️ atlandı — altyapı hazır |
| 4 | Yatırım skoru, AI arama, raporlar | ⏳ |
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

87 saniye. CLAUDE.md eşiği 90 saniye — **sınıra yakın.** Sebep büyük ölçüde
Payload admin panelinin derlenmesi. Faz 2'de artarsa araştırılacak.

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

**Faz 2** — MapLibre harita + POI katmanları, PostGIS yakınlık sorguları,
4 hesaplayıcı (`TaxParameters` koleksiyonu CMS'ten), mahalle karşılaştırma
aracı, `/ticari` dikeyi, SEO derinleştirme, Umami analitik.

⚠️ Hesaplayıcılar için vergi/harç oranları gerekiyor ve bunlar **koda
gömülmeyecek** (CLAUDE.md kural 4). Oranlar gelene kadar hesaplayıcılar
"parametre tanımlı değil" boş durumu gösterecek.
