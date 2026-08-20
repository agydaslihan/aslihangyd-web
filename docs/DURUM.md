> # ⚠️ BU BELGE ESKİDİ — 6 AĞUSTOS 2026 DURUMU
>
> Bu denetimden sonra tasarım sistemi tamamen değişti (Aurora Luxury),
> ölçüm altyapısı kuruldu ve 33 sayfanın tamamı yeniden ele alındı.
> Buradaki modül durumları hâlâ doğru ama **görünüm, tipografi ve
> performans bölümleri geçersiz**.
>
> Güncel kaynaklar:
> - Tasarım: [`docs/AURORA-LUXURY.md`](AURORA-LUXURY.md)
> - Ne yapıldı: [`docs/ilerleme/`](ilerleme/) (her PR kendi dosyasında)
> - Senden bekleyenler: [`docs/SENDEN-BEKLENENLER.md`](SENDEN-BEKLENENLER.md)

# Durum Denetimi

**Tarih:** 6 Ağustos 2026
**Kapsam:** Faz 1 → Faz 4, tasarım aşamaları, üretim yolu, bakım
**Yöntem:** Kod okundu, testler koşturuldu, çalıştırılabilenler çalıştırıldı.
Çalıştırılamayanlar **açıkça öyle işaretlendi.**

---

## Durum etiketleri

| Etiket | Anlamı |
| --- | --- |
| **bitti** | Yazıldı **ve** gerçekten çalıştığı görüldü (test, canlı derleme ya da elle koşturma) |
| **yazıldı-ama-hiç-çalıştırılmadı** | Kod var, tip denetiminden geçiyor, ama gerçek ortamda **bir kez bile** koşmadı |
| **eksik** | Hiç yazılmadı |

⚠️ "Test var" ile "çalıştı" aynı şey değil. Birim testi mantığın doğru
hesaplandığını gösterir; bir dağıtım betiğinin çalıştığını yalnızca
çalıştırmak gösterir.

---

## 1. Faz 1 — Temel

| Modül | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| Veri modeli (10 koleksiyon, 6 global) | **bitti** | 7 migration uygulandı, `payload migrate` koştu | — |
| EİDS yayın engeli kancası | **bitti** | Entegrasyon testi: yayına alma **Local API'den hiçbir yolla** yapılamıyor; testin `payload.db.updateOne`'a inmesi gerekti | — |
| EİDS kuralları (saf mantık) | **bitti** | 40+ birim testi | — |
| KVKK onay/saklama | **bitti** | Birim + entegrasyon testi; çerez kapısı üretim derlemesinde 6 senaryoda denendi | — |
| Türkçe slug | **bitti** | Birim testi + çakışma çözümü entegrasyon testinde bulundu ve düzeltildi | — |
| Erişim kuralları | **bitti** | Entegrasyon testleri ziyaretçi bağlamıyla koşuyor | — |
| Tarih (Europe/Istanbul) | **bitti** | Birim testi | — |
| Biçimlendiriciler | **bitti** | Birim testi | — |
| Temel sayfalar | **bitti** | Üretim derlemesinde 12 rota 200 döndü | — |
| Çerez onayı → betik enjeksiyonu | **bitti** | Üretim derlemesinde doğrulandı: onaysız `<script>` HTML'e hiç girmiyor | — |
| SEO (sitemap, robots, OG) | **bitti** | Üretim derlemesinde kanonik/OG/sitemap/robots doğrulandı | — |
| CI iş akışı | **bitti** | GitHub Actions'ta koşuyor (PostGIS servisiyle) | — |

---

## 2. Faz 2 — Harita, hesaplayıcılar, ticari

| Modül | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| 7 hesaplayıcı | **bitti** | 100+ birim testi; sayfalar 200 dönüyor | — |
| Vergi parametreleri (CMS) | **bitti** | Koleksiyon var, hesaplayıcılar boş durumu doğru gösteriyor | Oranlar girilmemiş — hesaplayıcılar "parametre eksik" diyor |
| Ticari dikey (`/ticari`) | **bitti** | Rota 200 | — |
| 3B harita (`/harita`) | **kısmen** | Sayfa 200, paneller/gösterge render oluyor. **Ama harita hiç görüntülenmedi** — MapTiler anahtarı var, gerçek mahalle koordinatı yok | Sütunlar, tıklama, 2B/3B geçişi **hiç görülmedi**. Kod doğru olabilir, kanıtı yok |
| POI katmanları | **yazıldı-ama-hiç-çalıştırılmadı** | Katman tanımları var, POI verisi yok → hepsi "veri yok" pasif | — |

---

## 3. Faz 2B — Bal küpü ve portföy yönetimi

| Modül | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| Değerleme motoru + sihirbaz | **bitti** | Birim testi + sayfa 200 | Katsayılar girilmemiş → değerleme üretmiyor |
| Gizli portföy (maskeleme) | **bitti** | Sunucu tarafı `select` ile alan sınırlama; kod incelendi | — |
| Mahalle eşleştirme testi | **bitti** | Birim testi + sayfa 200 | Mahalle profilleri boş → sonuç üretmez |
| Yatırım simülatörü | **bitti** | Birim testi + sayfa 200 | — |
| Kira mı satın alma mı | **bitti** | Birim testi + sayfa 200 | — |
| Bölge radarı | **bitti** | Birim testi + sayfa 200 | En az 4 mahalle verisi ister, yok |
| PDF rapor (yazdırma yolu) | **yazıldı-ama-hiç-çalıştırılmadı** | Rotalar 200 dönüyor; **hiçbir rapor gerçekten yazdırılmadı / PDF'e kaydedilmedi** | `@media print` çıktısı bozuk olabilir, Türkçe karakter iddiası denenmedi |
| Portföy giriş sihirbazı | **bitti** | Entegrasyon testi (Local API, `overrideAccess: false`) | — |
| Lead skorlama | **bitti** | Birim testi; kanca her kaydetmede çalışıyor | — |
| **CRM eşleştirme motoru** | **kısmen** | ✅ `src/lib/crm/eslestirme.ts` (26 birim testi) + talep kaydında "Eşleşen portföy" sekmesi; panelde duman testiyle doğrulandı. Sert eleme ile puanlama ayrı; eksik bilgi cezalandırılmaz | Ters yön ("bu ilana kim uyar?"), kanban ve "bugün aranacaklar" **hâlâ yok**. Aslıhan yeni ilan girince kime haber vereceğini elle bulacak |
| **Sosyal medya materyali** | **kısmen** | ✅ `/admin/sosyal-materyal`: 1080×1080 ve 1080×1920 görsel, metin taslağı, etiket, UTM'li bağlantı, "Tümünü indir". Türkçe karakterler üretilen PNG'de doğrulandı; çalışma anı font indirmesi teste bağlandı | **Instagram grid'i yok** — hesap erişim jetonu gerekiyor. ⚠️ Otomatik yayın bilinçli olarak yok ve eklenmeyecek |

---

## 4. Faz 2C — Endeks altyapısı

| Modül | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| Gözlem koleksiyonu | **bitti** | Migration uygulandı | — |
| Endeks motoru (katmanlı medyan) | **bitti** | Birim testi | — |
| Kalite kontrolleri | **bitti** | Birim testi | — |
| Yayın kapısı | **bitti** | `/endeks` üretim derlemesinde **404** dönüyor; `/endeks-metodolojisi` 200; site haritasında yok | — |
| CSV içe aktarma | **eksik** | Hiç yazılmadı | Gözlem girişi tek tek panelden yapılacak |

---

## 5. Faz 3 — Drone / 360° medya

Talimat gereği **atlandı**; yalnızca altyapı hazırlığı yapıldı.

| Parça | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| `droneVideoId` alanı (İlanlar + Mahalleler) | **bitti** | Koleksiyon şemasında var, migration uygulandı | — |
| `sanalTurUrl` alanı | **bitti** | Şemada var; mahalle sayfası bağlantı olarak gösteriyor | — |
| Medya koleksiyonu video MIME reddi | **bitti** | Kod incelendi — video yükleme engelli (CDN kuralı) | — |
| **Bunny Stream oynatıcı bileşeni** | **eksik** | `src/components` altında video/oynatıcı bileşeni **yok** | Video kimliği girilse bile oynatılamaz |
| **Pannellum 360° görüntüleyici** | **eksik** | Hiçbir yerde geçmiyor; `sanalTurUrl` yalnızca dış bağlantı | 360° tur site içinde açılmıyor |
| Boş durum tasarımları | **bitti** | Mahalle sayfasında hero boş durumu çalışıyor | — |

---

## 6. Faz 4 — Yatırım skoru

| Modül | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| Skor motoru (6 bileşen, ağırlıklar) | **bitti** | Birim testi; ağırlıklar CLAUDE.md ile birebir | — |
| Asgari kapsam kuralı (%70) | **bitti** | Birim testi | — |
| Skor kancası (CMS) | **bitti** | Kanca kaydetmede çalışıyor | — |
| Radar grafiği | **bitti** | Mahalle sayfasında render oluyor | Veri yok → boş durum |
| Metodoloji sayfası | **bitti** | 200 | — |
| **Ham ölçüm → puan dönüştürücüler** | **yazıldı-ama-hiç-çalıştırılmadı** | `fiyatTrendiPuani`, `mesafePuani`, `donatiPuani` **hiçbir yerden çağrılmıyor** — yalnızca testleri var. CMS 0–100 puanı doğrudan istiyor | Aslıhan "sanayiye 2 km" yerine "75 puan" girmek zorunda; dönüştürme elle ve öznel |
| AI doğal dil arama | **eksik** | Hiç yazılmadı | — |
| Sunucu tarafı PDF | **eksik** | Hiç yazılmadı (SMTP gelmeden anlamsız) | Rapor e-postaya iliştirilemiyor |

---

## 7. Tasarım aşamaları (A–E)

| Aşama | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| A — Tasarım sistemi | **bitti** | 34 renk çifti × 2 tema AA testi; disiplin testi tüm `.tsx` tarıyor | — |
| B — 3B harita | **kısmen** | Kod + testler tamam, **harita hiç görüntülenmedi** (yukarıya bakın) | — |
| C — Portföy tema sıraları | **bitti** | Üretim derlemesinde dört sıra render oldu, ölçüt metinleri doğrulandı | — |
| D — Site bölümleri | **bitti** | Anahtarın **üç etkisi de** canlı derlemede iki yönde denendi | — |
| E — Geriye dönük uyarlama | **kısmen** | Sekiz otomatik ölçüt geçti; **mobilde manuel kontrol yapılamadı** (sunucuda tarayıcı yok) | Dokunma/kaydırma davranışı gerçek cihazda görülmedi |

---

## 8. ⚠️ Üretim yolu — buradaki hiçbir şey gerçek sunucuda çalışmadı

Bu bölüm denetimin en önemli kısmı. **Yazılmış ama çalıştırılmamış her
komut şüphelidir.**

| Parça | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| `docker/Dockerfile` | **bitti** | ✅ 7 Ağu 2026: ilk derlemede **kırık çıktı** (`public/` dizini yok). Düzeltildi; 452 MB imaj derlendi, kap çalıştırıldı, `/api/saglik` 200, healthcheck **healthy**. Son imajda `.env`/`.git` yok, `node_modules` 58 MB | Gerçek üretim donanımında (3,2 GB RAM) derlenmedi — imaj CI'da derleniyor, sunucuda derlenmeyecek |
| `docker/compose.prod.yml` | **kısmen** | `config` doğrulaması geçiyor; `gocmen` profil izolasyonu sınandı (profilsiz görünmüyor). Uygulama kabı **elle** çalıştırılıp doğrulandı | Tüm yığın (Caddy + postgres + redis + uygulama) birlikte hiç ayağa kalkmadı; sertifika ve 8443 gerçek ortamda denenmedi |
| `docker/Caddyfile` | **kısmen** | `caddy validate` → *Valid configuration*; gerçek IP zinciri **yerel Caddy 2.10 ile sahte üst sunucuya karşı denendi ve çalıştı** | Gerçek sertifikayla, gerçek Cloudflare arkasında denenmedi |
| **İmaj iş akışı** | **bitti** | ✅ `.github/workflows/imaj.yml` yazıldı: uygulama + göçmen imajlarını derler ve GHCR'a yayımlar, PR'da yalnızca derler. Her iki hedef de yerelde derlenip çalıştırıldı | ⚠️ İş akışının GitHub'da koştuğu **henüz görülmedi** — ilk koşu bu PR'da. **Dağıtım yapmaz**, bilinçli: göçün ne zaman koşacağına insan karar verir |
| `/srv/aslihangyd` dizin yapısı | **yazıldı-ama-hiç-çalıştırılmadı** | Yalnızca belgede komut olarak var | — |
| `deploy` kullanıcısı | **yazıldı-ama-hiç-çalıştırılmadı** | Belgede geçiyor, oluşturulmadı | — |
| Migration üretim yolu | **bitti** | ✅ Boş veritabanında dokuz göç sıfırdan koştu (41 tablo). ⚠️ Üretim imajında göç **çalıştırılamıyordu** — standalone çıktıda ne kaynak ne CLI var. Ayrı `gocmen` imajı eklendi, `migrate` ve `migrate:status` kapta çalıştırılarak doğrulandı; §5.2–5.3'e yazıldı | ⚠️ C ve D dallarının birleşmesinden kalan bozuk şema fotoğrafı da burada bulundu; düzeltilmeseydi ilk kurulum `relation already exists` ile kırılırdı |
| `scripts/yedekle.sh` | **bitti** | ✅ Gerçek restic deposuna karşı çalıştırıldı: döküm + `forget --prune` + `check` hepsi geçti | ⚠️ `restic` **sunucuda kurulu değil** olabilir; §7'nin ilk adımı budur. Uzak depo (S3/B2/sftp) hiç denenmedi — yerel depoyla sınandı |
| `scripts/geri-yukle.sh` | **bitti** | ✅ Tam döngü: yedek al → ayrı veritabanına geri yükle → doğrula. **41 tablonun tamamında satır sayıları birebir aynı**, PostGIS geometrisi (SRID 4326) bozulmadan geldi. İlk koşuda iki hata çıktı (hedef veritabanı oluşturulmuyordu; hata tuzağı çıkış kodunu hep 0 yazıyordu), düzeltildi | Medya dosyalarının geri yüklenmesi denenmedi (geliştirmede yüklü medya yok) |
| `.env` konumu | **bitti** | ✅ Davranış kanıtlandı: `--env-file` olmadan `config` bile `required variable POSTGRES_DB is missing` ile düşüyor. Rehberde bayrağı unutan **4 komut** vardı, hepsi düzeltildi | Konum değişmedi (kökte); her komut `--env-file .env` taşımak zorunda |
| `.env.production.example` | **bitti** | ✅ Yazıldı; her satır ⚠️ FARKLI / ✅ AYNI / 🆕 YALNIZCA ÜRETİM olarak işaretli. `src/lib/ortam.test.ts` kodun okuduğu her değişkenin belgelendiğini sınıyor — denetimde 8 belgesiz değişken ve bir yanlış ad (`..._NUMARASI` ↔ `..._NUMARA`) çıkmıştı | — |

### ✅ Bu makinede denendi — 7 Ağustos 2026

Docker CLI mevcut (29.7.1). 3. aşamada Dockerfile derlemesi, kap
çalıştırma, yedekleme ve geri yükleme **gerçekten koşturuldu.**

Sonuç: bu bölümdeki "yazıldı-ama-hiç-çalıştırılmadı" satırlarının
çoğu **bitti**'ye döndü — ama bedava değil. Altı gerçek hata çıktı ve
ikisi dağıtımı ilk adımında durduracak cinstendi (imaj hiç derlenmiyordu;
göç üretimde çalıştırılamıyordu). Ayrıntı: `docs/ILERLEME.md` → "3. aşama".

**Hâlâ denenmemiş olanlar:**

- Tüm yığının (Caddy + postgres + redis + uygulama) birlikte ayağa kalkması
- Gerçek Cloudflare origin sertifikasıyla 8443 yayını
- `DOCKER-USER` güvenlik duvarı kuralları
- Uzak restic deposu (S3/B2/sftp) — yerel depoyla sınandı
- `/srv/aslihangyd` dizin yapısı ve `deploy` kullanıcısı
- İmaj iş akışının GitHub'da koşması

Bunlar gerçek sunucu olmadan denenemez.

---

## 9. Cron ve bakım görevleri

| Parça | Durum | Kanıt | Risk |
| --- | --- | --- | --- |
| Üç bakım görevi (EİDS×2, KVKK) | **bitti** | Entegrasyon testi + uç canlı derlemede 10 senaryoda denendi | — |
| `/api/bakim` kimlik doğrulama | **bitti** | 401/400/200 canlı doğrulandı | Anahtarsızken 404 dalı denenemedi (`.env` artık anahtarı içeriyor) |
| `scripts/bakim.sh` | **kısmen** | Altı çıkış yolu denendi ve doğru davrandı — **ama yerel `pnpm start`'a karşı**, üretim kabına karşı değil | — |
| Cron dosyası | **yazıldı-ama-hiç-çalıştırılmadı** | `/etc/cron.d/aslihangyd-bakim` **kurulmadı** | ⚠️ Kurulmazsa yetkisi dolan ilan yayında kalır (yasal) ve KVKK verisi silinmez (yasal) |
| Nöbetçi satırı | **kısmen** | Grep mantığı dört senaryoda denendi; cron'da hiç koşmadı | — |
| Log döndürme | **yazıldı-ama-hiç-çalıştırılmadı** | Belgede logrotate yapılandırması var, kurulmadı | Günlük dosyası sınırsız büyür |

---

## 10. Bilinen açık hatalar

| Hata | Durum | Kanıt |
| --- | --- | --- |
| `/portfoy` geliştirmede 1–13 sn, tekrar isteklerde hızlanmıyor | **doğrulanmadı — ölçülecek** | Kullanıcı bildirdi. Henüz sorgu sayımı yapılmadı |
| `allowedDevOrigins` sabit IP gömülü | **kısmen** | `next.config.ts` içinde `['192.168.1.113']` var ama **ortam değişkeninden okunmuyor** |
| `[DEMO]` kayıtlar sitede görünüyor | **açık** | Seed betiği `NODE_ENV=production` ise duruyor, ama **geliştirme veritabanında yüklü demo veri üretim veritabanına taşınırsa** koruma yok. CI kontrolü yok |
| Ham ölçüm → puan dönüştürücüler bağlı değil | **açık** | Yukarıda Faz 4'te |

---

## 11. `SENDEN-BEKLENENLER.md` maddeleri — hâlâ geçerli mi?

| Madde | Durum |
| --- | --- |
| Yetki belgesi no, MERSİS, ticaret unvanı | **geçerli** — altbilgide her sayfada uyarı görünüyor |
| KVKK metinleri (avukat) | **geçerli** |
| WhatsApp numarası, iletişim bilgileri | **geçerli** |
| Mahalle analiz metinleri (6 × 800 kelime) | **geçerli** |
| Mahalle rakamları | **geçerli** — bu olmadan harita, radar, skor, endeks hepsi boş |
| Mahalle sınırları + **merkez noktaları** | **geçerli ve kritik** — harita sütunları buna bağlı |
| Logo / marka | **geçerli** |
| Eşleştirme profili (4 puan × mahalle) | **geçerli** |
| MapTiler anahtarı | **✅ artık gerekli değil** — `.env`'de tanımlı görünüyor |
| Vergi/harç oranları | **geçerli** |
| POI verisi | **geçerli** |
| SMTP | **geçerli ve önemi arttı** — EİDS uyarısının tek kanalı günlük dosyası |
| Umami | **geçerli** |
| Sunucu/deploy erişimi | **geçerli** |
| Yedekleme hedefi (restic) | **geçerli** |
| Bunny Stream | **geçerli** — ama oynatıcı bileşeni de yok (Faz 3) |
| Anthropic API anahtarı | **geçerli** |
| Bakım anahtarı | **✅ tamamlandı** |
| Cron kurulumu | **geçerli — sunucuda yapılacak** |
| Turnstile anahtarları | **geçerli**, `.env.example`'a eklenemedi (izin dışı) |

---

## 12. En büyük üç risk

**1. Üretim yolunun tamamı kanıtsız.**
Dockerfile bir kez bile derlenmedi, compose bir kez bile ayağa kalkmadı,
deploy iş akışı hiç yazılmadı ve `compose.prod.yml`'in çektiği imajı üreten
hiçbir mekanizma yok. Bugün "dağıt" densе **ilk adımda durur.**

**2. Yedekleme hiç denenmedi.**
`yedekle.sh` ve `geri-yukle.sh` yazıldı, çalıştırılmadı. Veri kaybı anında
öğrenilecek bir şey değil.

**3. Bakım cron'u kurulmadı.**
İki yasal yükümlülük (EİDS yayından kaldırma, KVKK silme) bugün
otomatik çalışmıyor. Kod hazır, cron dosyası sunucuya konmadı.

---

## 13. Eksik modüller özeti

Hiç yazılmamış olanlar:

- CRM'in kalanı (Faz 2B) — kanban, ters yön eşleştirme, "bugün aranacaklar".
  Talep→portföy eşleştirmesi 4. aşamada yapıldı.
- Instagram grid'i (Faz 2B) — hesap erişim jetonu bekliyor. Görsel ve metin
  üretimi 4. aşamada yapıldı.
- Pannellum ile kendi barındırdığımız 360° panoramalar — panorama yükleme
  alanı ve göç gerekiyor; test edilecek gerçek 360° görsel yok.
- Bunny Stream oynatıcı bileşeni (Faz 3)
- Pannellum 360° görüntüleyici (Faz 3)
- GitHub Actions deploy iş akışı + imaj üretimi
- `.env.production.example`
- CSV içe aktarma (Faz 2C)
- AI doğal dil arama (Faz 4)
- Sunucu tarafı PDF (Faz 4)
