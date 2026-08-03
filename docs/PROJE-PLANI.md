# aslihangyd.com — Uçtan Uca Proje Planı

**Proje:** Çorlu odaklı gayrimenkul danışmanlık ve yatırım platformu
**Alan adı:** aslihangyd.com
**Sunucu:** Ubuntu 26.04 LTS (self-hosted)
**Geliştirme yöntemi:** Claude Code agent + GitHub
**Doküman tarihi:** Ağustos 2026

---

## 0. Yönetici Özeti

Verdiğiniz belgede güçlü bir **görsel deneyim vizyonu** var: drone, 360° tur, interaktif harita, dijital mahalle sayfaları. Bu vizyon doğru ve Çorlu ölçeğinde gerçekten fark yaratır.

Ancak belge, bir web sitesi tarifidir — **bir iş modeli tarifi değildir.** Üç kritik boşluk var:

1. **Hukuki uyum sıfır.** Türkiye'de 1 Şubat 2026'dan itibaren satılık taşınmaz ilanlarında EİDS yetki doğrulaması zorunlu. Kendi sitenizde bile "Doğrulanmış İlan" statüsünü göstermeniz gerekiyor. Bu, veritabanı şemanızı gün 1'den itibaren belirler — sonradan eklenemez.
2. **Para kazanma mekanizması yok.** Belgede ziyaretçiyi *etkileme* var, ziyaretçiyi *müşteriye çevirme* yok. Portföy toplama motoru (satıcı tarafı) hiç düşünülmemiş — halbuki emlak işinde asıl kıtlık alıcıda değil, portföydedir.
3. **Ticari segment eksik.** Çorlu ve Çerkezköy OSB'de fabrika, depo, sanayi arsası. Tek işlemde konut komisyonunun 10–50 katı. Belge tamamen konut odaklı.

Bu plan, sizin vizyonunuzu koruyup bu üç boşluğu kapatır.

---

## 1. Stratejik Değerlendirme — Eksikler ve Öneriler

### 1.1 Rekabet avantajınız drone değil

Drone videosu **kopyalanabilir.** Rakibiniz 6 ay sonra aynısını çeker. Gerçek, savunulabilir üç varlık:

| Varlık | Neden savunulabilir | Ne zaman başlamalı |
|---|---|---|
| **Münhasır portföy** | Sözleşmeye bağlı, rakip erişemez | Gün 1 |
| **Zaman serisi fiyat verisi** | 2 yıl sonra kimsede olmaz, taklit edilemez | **Gün 1 — siteden önce** |
| **Marka otoritesi** | "Çorlu = Aslıhan" refleksi | 6. aydan itibaren |

> **En önemli tavsiyem:** Site hazır olmadan, bugün, bir Excel dosyası açın. Çorlu'da gördüğünüz her ilanın (mahalle, m², oda, fiyat, kat, yaş, tarih) kaydını tutmaya başlayın. Site 3 ay sonra yayına girdiğinde elinizde 3 aylık gerçek veri olur ve "ortalama m² fiyatı" grafiğiniz uydurma değil, gerçek olur. Bu veri 2028'de sizin en değerli varlığınız olacak.

### 1.2 Üç ayrı kullanıcı, üç ayrı yolculuk

Belgede sadece bir persona var (İstanbul'dan gelen yatırımcı). Gerçekte üç var:

**A. Yerel oturum amaçlı alıcı** — "Çocuğumun okuluna yakın 3+1"
→ İhtiyacı: mahalle yaşam kalitesi, okul, ulaşım. Drone içeriği tam bunlara hitap eder.

**B. İstanbul'dan yatırımcı** — "Getirisi ne, ne zaman amorti eder?"
→ İhtiyacı: **rakam.** Kira çarpanı, amortisman süresi, bölge fiyat trendi, kira artış oranı. Drone videosu bunu satmaz, tablo satar. Belgede bu tamamen eksik.

**C. Mülk sahibi / satıcı** — "Evim ne eder?"
→ **Sitenin en kârlı sayfası budur.** "Ücretsiz Değerleme" formu = portföy makinesi. Belgede hiç yok.

**D. Ticari yatırımcı** — "Çorlu OSB'de 5.000 m² depo"
→ Tek işlem = 30 konut işlemi. Ayrı bir dikey olarak kurgulanmalı.

### 1.3 Çorlu'nun gerçek yatırım hikâyesi

Site "Neden Çorlu?" sorusuna veriyle cevap vermeli. Öne çıkarılacak değer sürücüleri:

- Çorlu ve Çerkezköy Organize Sanayi Bölgeleri — istihdam ve kira talebi motoru
- Halkalı–Kapıkule hızlı tren hattı ve Çorlu istasyonu
- Tekirdağ–Çorlu Atatürk Havalimanı
- İstanbul'a mesafe ve TEM/D-100 bağlantısı
- Şehir hastanesi ve sağlık altyapısı
- Üniversite / öğrenci nüfusu (kiralık talebi)

Her mahalle sayfasında "bu mahalle hangi sürücüden besleniyor" anlatısı olmalı. Bu, ilan sitelerinin asla yapamayacağı şey.

### 1.4 Yatırımcı araç seti (belgede yok, mutlaka olmalı)

Bunlar hem SEO trafiği hem lead getirir:

1. **Kira Getiri Hesaplayıcı** — brüt/net getiri %, kira çarpanı, amortisman yılı
2. **Konut Kredisi Hesaplayıcı** — taksit, toplam maliyet, erken kapama
3. **Alım Maliyeti Hesaplayıcı** — tapu harcı, döner sermaye, DASK, ekspertiz, komisyon → "gerçek maliyet"
4. **Değer Artış Kazancı Vergisi Hesaplayıcı** — 5 yıl kuralı, enflasyon endekslemesi
5. **Kira Geliri Vergi Hesaplayıcı** — istisna, götürü/gerçek gider
6. **Mahalle Karşılaştırma** — 2–3 mahalleyi yan yana koy
7. **Yatırım Skoru** — metodolojisi açık yayınlanmış puanlama

> **Uyarı:** Hesaplayıcılardaki oran ve tutarlar (harç oranları, istisna tutarları, DASK tarifesi) her yıl değişir. Bunları koda gömmeyin — CMS'te düzenlenebilir "Vergi Parametreleri" koleksiyonunda tutun ve her sayfada "son güncelleme tarihi" gösterin.

### 1.5 Yatırım Skoru metodolojisi şeffaf olmalı

"Bu mahalle 87/100" demek, gerekçesi yoksa hem güvenilmez hem hukuken risklidir. Önerdiğim model — ağırlıklar sitede yayınlanır:

| Kriter | Ağırlık | Veri kaynağı |
|---|---|---|
| Fiyat artış trendi (24 ay) | %25 | Kendi topladığınız ilan verisi |
| Kira çarpanı | %20 | Kendi kira ilanı verisi |
| Sanayi/istihdam yakınlığı | %15 | Mesafe hesabı (PostGIS) |
| Ulaşım erişilebilirliği | %15 | Mesafe hesabı |
| Sosyal donatı (okul/sağlık/park) | %15 | POI verisi |
| Devam eden projeler / arz baskısı | %10 | Manuel giriş |

Her mahalle sayfasında skorun kırılımı radar grafiği olarak gösterilir. **"Yatırım tavsiyesi değildir"** ibaresi her skor bileşeninin altında yer alır.

### 1.6 Sahibinden entegrasyonu hakkında net uyarı

Belgede "Sahibinden entegrasyonlu site" fikri geçiyor. Bunu **planlamayın:**

- Sahibinden.com'un genel kullanıma açık bir API'si yok
- Kullanım koşulları otomatik veri çekmeyi yasaklar
- Veri tabanı hakkı (FSEK) ihlali riski taşır
- Teknik olarak da bot koruması sürekli değişir, sürdürülemez

**Yasal alternatifler:**
1. Kendi portföyünüz (asıl doğru yol — münhasır içerik = SEO avantajı)
2. Emlakjet / Hepsiemlak gibi platformların **resmi XML feed / partner programları** (sözleşme ile)
3. Yerel meslektaşlarla karşılıklı portföy paylaşım anlaşması (MLS mantığı)
4. Manuel giriş — CMS'i hızlı giriş için optimize edin (30 saniyede ilan girilebilmeli)

### 1.7 İçerik ve otorite stratejisi

- **Çeyreklik "Çorlu Gayrimenkul Raporu" (PDF)** — e-posta karşılığı indirilir. Lead listesi + basın alıntısı + backlink kaynağı.
- **Mahalle rehberleri** — her mahalle için 800+ kelime *özgün* içerik. Sadece veri tablosu koyarsanız Google "thin content" sayar ve sıralamaz.
- **YouTube** — drone videolarının ikinci evi. Sitede sadece gömülü tutmak trafiğin yarısını çöpe atmaktır.
- **Google Business Profile** — yerel SEO'nun tek en yüksek etkili adımı. Site kadar önemli.

---

## 2. Hukuki ve Regülasyon Gereksinimleri

> Aşağıdakiler bilgilendirme amaçlıdır, hukuki danışmanlık değildir. Bir avukat ve mali müşavirle teyit edin.

### 2.1 Faaliyet izni

| Belge | Kim alır | Not |
|---|---|---|
| **Taşınmaz Ticareti Yetki Belgesi** | İşletme | Ticaret Bakanlığı, TTBS üzerinden başvuru |
| **MYK Sorumlu Emlak Danışmanı Seviye 5** | Kişi | Yetki belgesinin ön şartı |
| **Vergi levhası + oda kaydı + iş yeri** | İşletme | İş yeri ikamet amaçlı kullanılamaz |

Yetki belgesi olmadan ilan yayınlayamazsınız — kendi sitenizde de.

### 2.2 EİDS — Elektronik İlan Doğrulama Sistemi ⚠️ **En kritik teknik gereksinim**

1 Şubat 2026'dan itibaren satılık taşınmaz ilanlarında yetki doğrulaması zorunlu hale geldi. Mülk sahibi e-Devlet'ten "EİDS Taşınmaz İlanı Yetkilendirme İşlemleri" ile işletmenizi yetkilendirir; yetki süresi en az 3 ay. Düzenlemeler kendi web sitenizde ve sosyal medyada yayınladığınız ilanları da kapsıyor — "Doğrulanmış İlan" statüsünün belirtilmesi gerekiyor.

**Bunun yazılıma yansıması (pazarlığa kapalı):**

```
Listing koleksiyonunda ZORUNLU alanlar:
  - il, ilce, mahalle
  - ada, parsel                        (tapu bilgisi)
  - tasinmazNo                         (EİDS taşınmaz numarası)
  - eidsYetkiBaslangic, eidsYetkiBitis (tarih)
  - eidsDurum: yetkili | süresi_doldu | yetkisiz | tapusuz | yabanci_malik

YAYINLAMA KURALI (kod seviyesinde engel):
  eidsDurum != "yetkili" VEYA eidsYetkiBitis < bugün
  → ilan "yayında" statüsüne ALINAMAZ.

OTOMATİK GÖREV (günlük):
  Yetkisi 15 gün içinde bitecek ilanlar → uyarı e-postası
  Yetkisi biten ilanlar → otomatik yayından kaldır
```

EİDS yetkilendirmesi, yönetmeliğin gerektirdiği yetkilendirme sözleşmesi, taşınmaz gösterme belgesi ve aracılık sözleşmesi düzenleme zorunluluğunu **ortadan kaldırmaz.** CMS'e bu belgeleri ilana iliştirme alanı ekleyin.

### 2.3 KVKK

- Aydınlatma metni, açık rıza metni, çerez politikası, gizlilik politikası
- **Çerez onayı alınmadan analitik/pazarlama çerezi çalışmamalı** (teknik olarak engellenmeli, sadece banner göstermek yetmez)
- Form verilerinin saklama süresi tanımlı olmalı, süresi dolan kayıt otomatik silinmeli
- Veri sorumlusu sıfatıyla VERBİS kayıt yükümlülüğünüzü kontrol edin
- İlgili kişi başvuru formu (silme/erişim talebi) sitede bulunmalı
- Sunucunuzun Türkiye'de olması yurt dışına veri aktarımı sorununu büyük ölçüde çözer — avantajınız

### 2.4 Diğer

- **ETBİS**: Hizmet sağlayıcı olarak internet sitesi bildirim yükümlülüğünüzü kontrol edin
- **Mesafeli satış / ön bilgilendirme**: Site üzerinden ücretli hizmet (danışmanlık paketi vb.) satıyorsanız gerekli
- **Reklam mevzuatı**: "Garantili getiri", "%X kazanç" gibi ifadeler Reklam Kurulu yaptırımı doğurur. Tüm getiri gösterimlerinde "geçmiş veriler gelecek getiriyi garanti etmez" ibaresi
- **"Yatırım danışmanlığı" ifadesi**: Sermaye piyasası mevzuatında lisanslı bir faaliyettir. Gayrimenkul için farklı bir alan olsa da, karışıklık yaratmamak adına site dilinde "gayrimenkul danışmanlığı" / "portföy yönetimi" tercih edin ve her analiz sayfasına yatırım tavsiyesi olmadığı ibaresini koyun

### 2.5 Drone çekimleri ⚠️

- SHGM (Sivil Havacılık Genel Müdürlüğü) İHA kaydı; 500 gr üzeri araçlar için pilot belgesi
- Uçuş izni ve NOTAM kontrolü
- **Çorlu'da havalimanı var** — havalimanı çevresi kısıtlı/yasak bölgedir. Uçuş öncesi her lokasyonu mutlaka kontrol edin
- OSB ve askeri tesis çevresinde çekim yasaktır
- Kişilerin ve özel mülklerin tanınabilir görüntülenmesi KVKK kapsamındadır — plaka ve yüz bulanıklaştırma iş akışına dahil edilmeli
- **Öneri:** Bunu kendiniz yapmayın. Lisanslı bir drone operatörüyle çalışın; hem hukuki risk operatöre geçer hem çıktı kalitesi yüksek olur

---

## 3. Site Mimarisi

```
/                               Ana sayfa — harita + öne çıkan portföy + değerleme CTA
/portfoy                        İlan listesi (filtre, harita görünümü)
/portfoy/[slug]                 İlan detayı — 360 tur, drone, hesaplayıcı, EİDS rozeti
/mahalleler                     Mahalle indeksi + karşılaştırma aracı
/mahalleler/[slug]              Mahalle mini-portalı ⭐ (SEO ana motoru)
/harita                         Tam ekran interaktif Çorlu haritası ⭐
/ticari                         Sanayi / depo / arsa dikey sayfası ⭐ (yeni)
/degerleme                      Ücretsiz değerleme formu ⭐ (portföy motoru)
/araclar/kira-getirisi          Hesaplayıcılar
/araclar/kredi
/araclar/alim-maliyeti
/araclar/deger-artis-vergisi
/yatirim-rehberi                Blog / rehber
/raporlar                       Çeyreklik PDF raporlar (e-posta ile)
/hakkimizda                     Aslıhan + yetki belgesi numarası (zorunlu)
/iletisim
/kvkk, /cerez-politikasi, /gizlilik, /kullanim-kosullari
/admin                          Payload CMS yönetim paneli
```

### Mahalle sayfası şablonu (SEO motoru)

```
┌─ Hero: Drone videosu (poster + lazy load)
├─ Mahalle Yatırım Skoru: 87/100 + radar grafik + metodoloji linki
├─ Rakamlar: ort. m² satış | ort. kira | kira çarpanı | 12 ay değişim %
├─ Fiyat trend grafiği (kendi zaman serinizden)
├─ Mini harita: POI katmanları (okul, sağlık, market, park, sanayi, ulaşım)
├─ 360° sokak turu
├─ "Neden bu mahalle?" — 800+ kelime özgün analiz
├─ Bu mahalledeki portföyümüz
├─ Karşılaştır: [Muhittin] vs [Şeyhsinan]
└─ CTA: WhatsApp + "Bu mahallede evim var, değerlendirin"
```

**Schema.org:** `RealEstateAgent`, `Place`, `RealEstateListing`, `FAQPage`, `BreadcrumbList` — yapılandırılmış veri yerel SEO'da doğrudan etki eder.

---

## 4. Teknoloji Yığını

| Katman | Seçim | Gerekçe |
|---|---|---|
| Framework | **Next.js 16.2.x** (App Router, TypeScript) | SSG/ISR → SEO için en iyisi. Node 20+ gerekir, Node 22 LTS kullanın |
| CMS | **Payload CMS 3.85+** | Next.js'in *içine* kurulur, ayrı servis yok. TypeScript-native, self-hosted, veri sizde |
| Veritabanı | **PostgreSQL 17 + PostGIS 3.5** | Coğrafi sorgular (yarıçap, mesafe, poligon) için şart |
| Stil | **Tailwind CSS 4** | |
| Harita | **MapLibre GL JS + MapTiler** | Google Maps ölçekte pahalılaşır. MapLibre açık kaynak |
| Video | **Bunny Stream** veya Cloudflare Stream | ⚠️ 4K drone videosunu kendi sunucunuzda barındırmayın — bant genişliği sunucuyu düşürür |
| 360° tur | **Pannellum / Panoee** (Insta360 çıktısıyla) | Matterport aylık abonelik yükü getirir; başlangıçta gereksiz |
| Medya depolama | **Cloudflare R2** (veya MinIO self-host) | R2'de çıkış trafiği ücretsiz |
| Arama | PostgreSQL FTS → (Faz 4) Meilisearch | Başta yeterli, sonra yükseltilir |
| AI arama | **Claude API** (doğal dil → JSON filtre) | Model *cevap* değil, *filtre* üretir — halüsinasyon riski sıfırlanır |
| Cache / kuyruk | Redis 7 | |
| Reverse proxy | **Caddy 2** | Otomatik Let's Encrypt TLS, tek satır config |
| Konteyner | Docker + Docker Compose | |
| CDN / WAF | **Cloudflare** (ücretsiz plan) | DDoS koruması + önbellek + gerçek IP gizleme |
| CI/CD | GitHub Actions → GHCR → SSH deploy | |
| Analitik | **Umami** (self-host) | KVKK dostu, çerezsiz mod var |
| Hata izleme | Sentry (self-host veya ücretsiz kota) | |
| Uptime | Uptime Kuma | |
| Yedekleme | **restic** → R2/Backblaze B2 | Şifreli, artımlı, otomatik |

**Neden Payload ve WordPress değil:** WordPress emlak temaları hızlı başlar ama harita, PostGIS sorguları, yatırım skoru ve EİDS iş kuralları için sürekli eklenti savaşı verirsiniz. Payload'da veri modeli sizin TypeScript kodunuz olur — Claude Code agent ile çalışmak için de ideal.

---

## 5. Veri Modeli (Payload Koleksiyonları)

```typescript
Listings            // İlanlar
  temel:            baslik, slug, aciklama, tip(satilik|kiralik),
                    kategori(konut|isyeri|arsa|depo|fabrika)
  konum:            il, ilce, mahalle(rel), konum(point), ada, parsel
  EİDS (zorunlu):   tasinmazNo, eidsDurum, eidsYetkiBaslangic, eidsYetkiBitis
  fiyat:            fiyat, paraBirimi, aidat, tahminiKira
  nitelik:          brutM2, netM2, odaSayisi, banyo, bulunduguKat, toplamKat,
                    binaYasi, isinma, esyali, krediyeUygun, tapuDurumu
  medya:            gorseller[], droneVideoId, sanalTurUrl, katPlani
  hesaplanan:       kiraCarpani, brutGetiri, amortismanYili
  belgeler:         yetkilendirmeSozlesmesi, gostermeBelgesi
  durum:            taslak | yayinda | rezerve | satildi | yetki_bitti
  danisman:         rel(Users)

Neighborhoods       // Mahalleler
  ad, slug, sinir(polygon), merkez(point), nufus
  ortalamaM2Satis, ortalamaKira, kiraCarpani, degisim12Ay
  yatirimSkoru{ toplam, kirilim{...}, hesaplanmaTarihi }
  droneVideoId, sanalTurUrl
  icerik(richText, min 800 kelime), ozet, seoBaslik, seoAciklama
  oneCikanOzellikler[]

POIs                // İlgi noktaları
  ad, tip(okul|hastane|market|avm|park|sanayi|durak|istasyon)
  konum(point), mahalle(rel), detay

PriceHistory        // ⭐ Zaman serisi — en değerli varlığınız
  mahalle(rel), tarih, ortalamaM2, ortalamaKira, ilanSayisi,
  medyanFiyat, kaynak(kendi_gozlem|resmi|ilan_platformu), notlar

Leads               // Talepler
  ad, telefon, email, tip(alici|satici|kiraci|ticari|degerleme)
  ilgiliIlan(rel), ilgiliMahalle(rel)
  butce, kriterler, mesaj
  kaynak(organik|whatsapp|instagram|google_ads|dogrudan)
  skor(0-100), durum(yeni|arandi|randevu|teklif|kazanildi|kaybedildi)
  kvkkOnay, kvkkOnayTarihi, saklamaBitis   // KVKK zorunlu
  notlar[], sonTemas

Valuations          // Değerleme talepleri (portföy motoru)
  adres, mahalle(rel), m2, odaSayisi, binaYasi, kat, durum
  iletisim, tahminiDeger, gerceklesenDeger, sonuc

Projects            // Devam eden inşaat projeleri
  ad, firma, mahalle(rel), konum, teslimTarihi, konutSayisi,
  fiyatAraligi, durum, gorseller

Reports             // Çeyreklik PDF raporlar
  baslik, donem, pdf, ozet, indirmeIcinEmailGerekli

TaxParameters       // ⚠️ Vergi/harç oranları — koda gömmeyin
  anahtar, deger, gecerlilikYili, aciklama, guncellemeTarihi

Posts, Pages, Media, Users
```

---

## 6. Sunucu Kurulumu — Adım Adım

### 6.1 Minimum donanım

| Faz | vCPU | RAM | Disk |
|---|---|---|---|
| MVP | 2 | 4 GB | 60 GB |
| Faz 3+ | 4 | 8 GB | 160 GB SSD |

Video CDN'de olacağı için disk baskısı düşük kalır.

### 6.2 İlk sıkılaştırma

```bash
# --- root olarak ---
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban unattended-upgrades \
               ca-certificates gnupg htop restic

# Yönetici kullanıcı
adduser aslihan
usermod -aG sudo aslihan
rsync --archive --chown=aslihan:aslihan ~/.ssh /home/aslihan

# SSH sıkılaştırma
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?Port 22/Port 2222/' /etc/ssh/sshd_config     # opsiyonel
systemctl restart ssh

# Güvenlik duvarı
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp      # SSH portunuz
ufw allow 80,443/tcp
ufw enable

# Otomatik güvenlik güncellemeleri
dpkg-reconfigure -plow unattended-upgrades

# Brute-force koruması
systemctl enable --now fail2ban

# Swap (4 GB RAM ise şart)
fallocate -l 4G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 6.3 Docker

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io \
               docker-buildx-plugin docker-compose-plugin
usermod -aG docker aslihan
```

> Ubuntu 26.04 için Docker deposunda paket yoksa, bir önceki LTS kod adını (`noble`) kullanabilirsiniz.

### 6.4 Dizin yapısı

```bash
sudo mkdir -p /srv/aslihangyd/{app,data/{postgres,redis,media},backups,logs}
sudo chown -R aslihan:aslihan /srv/aslihangyd
```

### 6.5 DNS ve Cloudflare

1. Alan adını alın (aslihangyd.com)
2. Nameserver'ları Cloudflare'e yönlendirin
3. `A` kaydı: `@` → sunucu IP, proxy **açık** (turuncu bulut)
4. `A` kaydı: `www` → sunucu IP, proxy açık
5. SSL/TLS modu: **Full (Strict)**
6. "Always Use HTTPS" açık, "Auto Minify" kapalı (Next.js zaten optimize)

---

## 7. GitHub ve CI/CD

### 7.1 Depo yapısı

```
aslihangyd-web/                 (private repo)
├── src/
│   ├── app/(site)/             Genel site
│   ├── app/(payload)/          CMS admin
│   ├── collections/            Payload koleksiyonları
│   ├── components/
│   ├── lib/                    hesaplayıcılar, skorlama, EİDS kuralları
│   └── payload.config.ts
├── docker/
│   ├── Dockerfile
│   ├── compose.prod.yml
│   └── Caddyfile
├── .github/workflows/deploy.yml
├── scripts/                    backup.sh, restore.sh, seed.ts
├── CLAUDE.md                   ⭐ Agent'ın kalıcı hafızası
└── docs/
```

### 7.2 Branch akışı

- `main` → production (koruma açık, doğrudan push kapalı)
- `develop` → staging
- `feature/*` → PR ile develop'a

### 7.3 Deploy kullanıcısı (sunucuda)

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /home/deploy/.ssh && sudo chmod 700 /home/deploy/.ssh
# GitHub Actions'ın public key'ini authorized_keys'e ekleyin
sudo chown -R deploy:deploy /home/deploy/.ssh
```

`deploy` kullanıcısında **sudo yetkisi olmasın.** Sadece Docker çalıştırabilsin.

### 7.4 GitHub Secrets

```
SSH_HOST, SSH_PORT, SSH_USER (=deploy), SSH_PRIVATE_KEY
ANTHROPIC_API_KEY
DATABASE_URI, PAYLOAD_SECRET
BUNNY_API_KEY, BUNNY_LIBRARY_ID
R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET
MAPTILER_KEY
SMTP_HOST, SMTP_USER, SMTP_PASS
```

### 7.5 Deploy akışı

```
push to main
  → GitHub Actions
      1. pnpm install --frozen-lockfile
      2. tsc --noEmit  (tip kontrolü)
      3. eslint
      4. next build
      5. docker build → ghcr.io/<kullanici>/aslihangyd:sha
      6. SSH → sunucu:
           docker compose pull
           docker compose run --rm app pnpm payload migrate
           docker compose up -d --no-deps app
           docker image prune -f
      7. Health check: curl -f https://aslihangyd.com/api/health
      8. Başarısızsa → önceki image'a rollback
```

### 7.6 Yedekleme (cron)

```bash
# /etc/cron.d/aslihangyd-backup
0 3 * * * deploy /srv/aslihangyd/app/scripts/backup.sh
```

`backup.sh`: `pg_dump` + medya klasörü → `restic` ile şifreli olarak R2/B2'ye.
**Ayda bir geri yükleme testi yapın** — test edilmemiş yedek, yedek değildir.

---

## 8. Claude Code Kurulumu

### 8.1 Kurulum

Claude Code Ubuntu 20.04+ destekler, 4 GB+ RAM ister. Yerel kurulum Node.js gerektirmez ve arka planda otomatik güncellenir.

```bash
# aslihan kullanıcısı olarak (root DEĞİL)
curl -fsSL https://claude.ai/install.sh | bash

# PATH'e ekle
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

claude --version
claude doctor
```

Alternatif olarak imzalı apt deposundan da kurulabilir (bkz. resmi dokümantasyon).

### 8.2 Kimlik doğrulama

Claude Code için Pro, Max, Team, Enterprise veya Console hesabı gerekir — ücretsiz plan Claude Code içermez.

Sunucuda tarayıcı olmadığı için API anahtarı yöntemi daha pratiktir:

```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
source ~/.bashrc
```

`ANTHROPIC_API_KEY` tanımlıysa Claude Code tarayıcı açmak yerine anahtarı bir kez onaylamanızı ister.

### 8.3 Güvenlik kuralları ⚠️

1. **Claude Code'u production sunucusunda değil, ayrı bir geliştirme dizininde/sunucusunda çalıştırın.** Agent'ın canlı veritabanına yazma yetkisi olmamalı.
2. `.env` dosyaları asla repoya girmez → `.gitignore` ilk satır
3. `git status` ve `git diff` olmadan hiçbir commit'e onay vermeyin
4. `.claude/settings.json` ile izinleri kısıtlayın
5. Agent'ın ürettiği migration'ları önce staging'de çalıştırın

### 8.4 Proje ayarları

```json
// .claude/settings.json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf*)",
      "Bash(docker compose down*)",
      "Read(./.env*)",
      "Bash(psql*production*)"
    ]
  }
}
```

### 8.5 CLAUDE.md

Depo kökünde `CLAUDE.md` dosyası agent'ın kalıcı hafızasıdır. İçeriği için `MASTER-PROMPT.md` dosyasının 2. bölümüne bakın.

---

## 9. Faz Planı

### Faz 0 — Temel (Hafta 0–2) · Kod yok

- [ ] Taşınmaz Ticareti Yetki Belgesi süreci başlat
- [ ] aslihangyd.com alan adını al, Cloudflare'e bağla
- [ ] Sunucuyu sıkılaştır (Bölüm 6)
- [ ] GitHub organizasyonu + private repo
- [ ] Claude Code kur ve doğrula
- [ ] **Fiyat verisi toplamaya BUGÜN başla** (Excel yeter)
- [ ] Marka: logo, renk paleti, tipografi
- [ ] Google Business Profile aç ve doğrula
- [ ] KVKK metinlerini avukata hazırlat
- [ ] Drone operatörüyle görüş, uçuş izinlerini araştır

### Faz 1 — MVP (Hafta 3–6)

- [ ] Next.js + Payload iskeleti, PostgreSQL + PostGIS
- [ ] Koleksiyonlar: Listings, Neighborhoods, Leads, Media, Users
- [ ] **EİDS iş kuralı ve yayınlama engeli** (bunu Faz 1'de yapın)
- [ ] Kurumsal sayfalar + KVKK/çerez altyapısı (onay öncesi tracker çalışmaz)
- [ ] İlan listesi + detay + filtre
- [ ] 5 pilot mahalle sayfası (gerçek içerikle)
- [ ] Lead formu + WhatsApp CTA + e-posta bildirimi
- [ ] CI/CD hattı çalışır durumda
- [ ] Yedekleme + geri yükleme testi
- [ ] **Yayın:** temel ama tam uyumlu site

### Faz 2 — Yatırımcı Katmanı (Hafta 7–10)

- [ ] MapLibre interaktif harita + POI katmanları
- [ ] PostGIS yakınlık sorguları ("sanayiye 10 dk")
- [ ] 4 hesaplayıcı + TaxParameters koleksiyonu
- [ ] Mahalle karşılaştırma aracı
- [ ] `/degerleme` sayfası ⭐ portföy motoru
- [ ] `/ticari` dikeyi ⭐
- [ ] Schema.org + sitemap + robots + OG görselleri
- [ ] Umami analitik

### Faz 3 — Görsel Deneyim (Hafta 11–14)

- [ ] Drone çekim programı (izinli, 6 mahalle)
- [ ] Bunny Stream entegrasyonu + HLS oynatıcı
- [ ] 360° tur altyapısı (Pannellum)
- [ ] Mahalle sayfalarına video hero
- [ ] YouTube kanalı + çapraz yayın
- [ ] Core Web Vitals optimizasyonu (video LCP'yi bozmasın)

### Faz 4 — Zekâ Katmanı (Hafta 15–18)

- [ ] Yatırım Skoru motoru + metodoloji sayfası
- [ ] Radar grafikler
- [ ] AI doğal dil arama (Claude API → JSON filtre → PostGIS)
- [ ] PriceHistory grafikleri
- [ ] İlk çeyreklik rapor PDF + e-posta yakalama
- [ ] Lead skorlama

### Faz 5 — Çorlu Live (Sürekli)

- [ ] Yıllık tekrar drone çekimleri, önce/sonra karşılaştırma
- [ ] Zaman serisi görselleştirme
- [ ] Proje takip haritası
- [ ] Yatırımcı bülteni

---

## 10. Maliyet Tahmini

> Fiyatlar yaklaşıktır, mutlaka güncel tarifeleri kontrol edin.

**Aylık işletme:**

| Kalem | Tahmin |
|---|---|
| VPS (4 vCPU / 8 GB) | $20–40 |
| Bunny Stream (video) | $10–30 |
| Cloudflare R2 | $2–10 |
| MapTiler | $0–25 (ücretsiz kota geniş) |
| Anthropic API (AI arama) | $10–50 (kullanıma bağlı) |
| E-posta servisi | $0–15 |
| Cloudflare CDN/WAF | $0 (ücretsiz plan) |
| **Toplam** | **~$45–170 / ay** |

**Tek seferlik:**

| Kalem | Tahmin |
|---|---|
| Alan adı (yıllık) | $10–20 |
| Yetki belgesi + MYK Seviye 5 + harç | Bakanlık tarifesi |
| Drone çekimi (6 mahalle, operatör) | Yerel teklif alın |
| 360° kamera (Insta360 X5 sınıfı) | Cihaz fiyatı |
| Logo / marka kimliği | Ajans/freelance |
| Hukuki metinler (avukat) | Avukat tarifesi |

---

## 11. Risk Kaydı

| Risk | Etki | Önlem |
|---|---|---|
| **EİDS uyumsuzluğu** | Yetki belgesi iptali dahil ağır idari yaptırım | Kod seviyesinde yayın engeli, otomatik yetki süresi takibi |
| Sahibinden scraping girişimi | Hukuki dava, IP engeli | **Yapmayın.** Kendi portföy + resmi feed |
| Video sunucuyu düşürür | Site erişilemez | CDN zorunlu, self-host asla |
| Drone izinsiz uçuş | İdari para cezası, cihaza el koyma | Lisanslı operatör, her uçuş öncesi NOTAM |
| Thin content cezası | SEO çöker | Mahalle başına 800+ kelime özgün içerik |
| Tek sunucu arızası | Tam kesinti | Günlük yedek + aylık restore testi + Cloudflare önbellek |
| Agent'ın hatalı kodu prod'a gitmesi | Veri kaybı | Staging zorunlu, migration önce staging'de, tip kontrolü CI'da |
| Vergi oranları eskir | Yanlış hesaplama, itibar kaybı | TaxParameters CMS'te + "son güncelleme" gösterimi |
| KVKK ihlali | İdari para cezası | Onay öncesi tracker engeli, saklama süresi otomasyonu |
| Yatırım skoru "tavsiye" sayılır | Hukuki risk | Metodoloji şeffaf + her sayfada feragat ibaresi |

---

## 12. Başarı Metrikleri

**Ay 3:** Site canlı · 10+ mahalle sayfası indekslenmiş · 20+ ilan · ilk 10 lead
**Ay 6:** Ayda 1.000+ organik ziyaretçi · "çorlu satılık daire" ilk sayfa · ayda 30+ lead · 3+ münhasır portföy
**Ay 12:** Ayda 5.000+ ziyaretçi · 6 mahalle drone içeriği · 1.000+ bülten abonesi · ölçülebilir işlem hacmi

**Haftalık takip edilecekler:** organik trafik, mahalle sayfası → lead dönüşüm oranı, değerleme formu doldurma sayısı, WhatsApp tıklama oranı, Core Web Vitals.

---

## 13. Bugün Yapılacak 5 Şey

1. **aslihangyd.com'u kaydettirin** — birisi almadan
2. **Yetki belgesi sürecini başlatın** — en uzun süren adım bu
3. **Fiyat takip Excel'ini açın** — siteden bağımsız, bugün
4. **Sunucuyu sıkılaştırın** (Bölüm 6.2)
5. **GitHub repo + Claude Code kurulumu** — sonra `MASTER-PROMPT.md`'yi agent'a verin
