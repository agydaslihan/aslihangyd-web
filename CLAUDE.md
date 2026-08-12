# CLAUDE.md — aslihangyd.com

## Proje
Çorlu (Tekirdağ) odaklı gayrimenkul danışmanlık ve yatırım platformu.
Sahibi: Aslıhan. Alan adı: aslihangyd.com

Rakiplerden farkı: ilan listelemek değil, Çorlu'yu dijital olarak
deneyimletmek ve yatırımcıya veriyle karar aldırmak.

## Dil
- Kullanıcıya görünen HER ŞEY Türkçe (arayüz, CMS etiketleri, hata mesajları,
  e-postalar, dokümantasyon)
- Kod, değişken adları, commit'lerin teknik kısmı İngilizce olabilir
- Benimle iletişim Türkçe

## Teknoloji yığını
Next.js 16.2.x (App Router) · TypeScript strict · Node.js 22 LTS
Payload CMS 3.85+ (aynı uygulamada) · PostgreSQL 17 + PostGIS 3.5
Tailwind CSS 4 · MapLibre GL JS + MapTiler · Redis
Docker Compose · Caddy 2 · pnpm · vitest

Yığını değiştirmeden önce sor.

## ⚠️ İhlal edilemez kurallar

### 1. EİDS (Elektronik İlan Doğrulama Sistemi)
Türkiye'de yasal zorunluluk. 2026 itibarıyla satılık taşınmaz ilanları
sadece mülk sahibinin e-Devlet üzerinden yetkilendirdiği, Taşınmaz Ticareti
Yetki Belgesi sahibi işletmelerce verilebilir. Kendi web sitemizdeki
ilanlar da kapsam dahilinde.

→ eidsDurum 'yetkili' değilse veya yetki süresi dolmuşsa ilan YAYINLANAMAZ.
→ Bu kural kod seviyesinde zorlanır (hook), sadece uyarı DEĞİL.
→ Bu kuralı gevşetme, bypass ekleme, "geliştirme modunda atla" yapma.
→ Tüm ilanlarda "Doğrulanmış İlan" rozeti + taşınmaz numarası görünür.

### 2. Uydurma veri yasak
Gerçek fiyat, kira, nüfus, m² verisi bilmiyorsan alanı boş bırak ve
"AslihanTarafindanDoldurulacak" yaz. Bu bir yatırım sitesi; uydurma rakam
hem itibar hem hukuki risktir. Örnek veri gerekiyorsa açıkça
"ÖRNEK VERİ — YAYINLANMAYACAK" etiketle.

### 3. Hukuki metin yazma
KVKK, gizlilik, kullanım koşulları metinlerini SEN yazma. İskelet oluştur,
içeriği avukat verecek.

### 4. Vergi/harç oranları koda gömülmez
Tapu harcı, DASK, istisna tutarları, gelir vergisi dilimleri → hepsi
TaxParameters koleksiyonunda, CMS'ten düzenlenebilir. Her hesaplayıcıda
"veriler [tarih] itibarıyladır" ibaresi.

### 5. Yatırım tavsiyesi feragati
Her hesaplayıcı, yatırım skoru ve getiri gösteriminde:
"Bu bilgiler yatırım tavsiyesi niteliğinde değildir. Geçmiş veriler
gelecekteki getiriyi garanti etmez."

### 6. Scraping yasak
Sahibinden.com veya başka bir ilan platformundan otomatik veri çekme kodu
YAZMA. Kullanım koşulları ihlali ve veri tabanı hakkı riski. Sadece kendi
portföyümüz, elle girilen gözlemler ve resmi/sözleşmeli feed'ler.

### 6b. Bal küpü kuralı — değer önce, iletişim sonra
Hiçbir araç (değerleme, quiz, simülatör, hesaplayıcı) sonucunu iletişim
bilgisi arkasında kilitlemez. Sonuç önce görünür; iletişim sadece
derinleştirme (PDF rapor, kişiye özel analiz) için istenir.

### 6c. Endeks dürüstlüğü
Çorlu Konut Endeksi yalnızca yeterli gözlem varken yayınlanır.
- Bir katman (mahalle × oda tipi) için minimum 8 gözlem
- Toplam minimum 6 ay geçmiş veri
- Bu şartlar sağlanmadan /endeks sayfası YAYINA ALINMAZ (kod seviyesinde engel)
- Endeksin adı "İstenen Fiyat Endeksi"dir — gerçekleşen satış fiyatı değilse
  bunu gizleme
- Her endeks değerinin yanında gözlem sayısı (n) gösterilir

### 7. Sırlar
Hiçbir API anahtarı, şifre, token koda girmez. Hepsi .env.
.env dosyaları .gitignore'da. Örnekler .env.example'da placeholder ile.

### 8. Çerez onayı
Onay alınmadan analitik/pazarlama scripti YÜKLENMEZ. Banner göstermek
yetmez; script enjeksiyonu onaya bağlı olmalı.

## İş kuralları

### İlan durumları
taslak → yayinda → rezerve → satildi
Ayrıca: yetki_bitti (EİDS süresi dolmuş, otomatik)

### Hesaplanan alanlar (hook ile)
kiraCarpani      = fiyat / (tahminiKira * 12)
brutGetiri       = (tahminiKira * 12) / fiyat * 100
amortismanYili   = kiraCarpani

### Yatırım Skoru (0–100)
fiyatTrendi(%25) + kiraCarpani(%20) + sanayiYakinligi(%15) +
ulasim(%15) + sosyalDonati(%15) + arzBaskisi(%10)

Metodoloji /yatirim-skoru-metodolojisi sayfasında yayınlanır.
Skorun kırılımı her mahalle sayfasında radar grafikle gösterilir.

### Mahalle Eşleştirme Testi
Ölçüt ağırlıkları KODDA (`src/lib/eslestirme/motor.ts`) ve
/mahalle-eslestirme-metodolojisi sayfasında yayınlanır — bunlar metodolojidir.
Mahalle öznitelikleri CMS'te (`Mahalleler.eslestirmeProfili`), başlangıç
değeri konulmaz — bunlar veridir. Yatırım skorundaki ayrımın aynısı.
Eşleştirme portföyden bağımsızdır; ilan sayısı hesaba girmez.

### Bölge Radarı
Yeni skor ÜRETMEZ; sinyal üretir. İkinci bir puan, Yatırım Skoruyla
çeliştiğinde ikisini birden değersizleştirirdi. Sinyaller mutlak eşiğe değil
mahalle medyanına göre hesaplanır. Veri zayıflığı gizlenmez, sinyal olarak
gösterilir.

### Portföy giriş sihirbazı
Payload admin'in YERİNE değil YANINDA durur (`/admin/portfoy-sihirbazi`).
Kayıt daima `taslak`; `durum` alanı şemada yoktur, istemci yayın durumu
dayatamaz. Yazma yolu Local API + `overrideAccess: false` — kancalar ve
erişim kuralları aynen çalışır. EİDS paneli bir kapı değil ayna; gerçek kapı
`eidsYayinEngeli` kancasıdır ve panel aynı motoru kullanır.
⚠️ Admin görünümleri oturumsuz da ÇALIŞIR — görünüm gövdesinde
`if (!req.user) return null` kapısı zorunludur.

### Raporlar
PDF, kütüphaneyle değil yazdırma yoluyla üretilir (`@media print` +
tarayıcının "PDF olarak kaydet"i). Gerekçe: pdf-lib'in standart fontları
Türkçe karakterleri kodlayamıyor ve 23 MB. Ayrıntı docs/ILERLEME.md.
Rapor URL'si SONUÇ değil GİRDİ taşır; sunucu aynı motorlarla yeniden
hesaplar — aksi halde adres çubuğu düzenlenerek sahte rapor üretilebilirdi.

### Mahalle sayfası zorunlu bölümleri
1. Drone video hero (poster + lazy load)
2. Yatırım skoru + radar
3. Temel rakamlar (m² satış, kira, çarpan, 12 ay değişim)
4. Fiyat trend grafiği
5. Mini harita + POI katmanları
6. 360° tur
7. "Neden bu mahalle?" — min 800 kelime özgün içerik
8. Bu mahalledeki portföy
9. Mahalle karşılaştırma
10. CTA (WhatsApp + değerleme)

## Kod standartları
- TypeScript strict, `any` yasak (gerekçesiz)
- Server Components varsayılan; 'use client' sadece gerektiğinde
- Zod ile tüm form ve API girdileri doğrulanır
- PostGIS sorguları raw SQL ile, parametreli (SQL injection'a karşı)
- Erişilebilirlik: semantik HTML, klavye navigasyonu, WCAG AA kontrast
- Mobil öncelikli (trafiğin ~%75'i mobil)
- Görseller: next/image, AVIF/WebP
- Video: ASLA self-host etme, CDN (Bunny Stream) üzerinden HLS

## Performans hedefleri
LCP < 2.5s · CLS < 0.1 · INP < 200ms
Lighthouse: Performance ≥90, SEO ≥95, Accessibility ≥95

## Klasör yapısı
src/app/(site)       genel site
src/app/(payload)    CMS admin
src/collections      Payload koleksiyonları
src/components       UI bileşenleri
src/lib              iş mantığı
src/lib/eids         EİDS kuralları (izole + test edilmiş)
src/lib/calculators  hesaplayıcılar
src/lib/scoring      yatırım skoru
docker/              Dockerfile, compose, Caddyfile
scripts/             backup, restore, seed
docs/                Türkçe dokümantasyon

## Git
Branch: main (prod) / develop (staging) / feature/*
Commit: Conventional Commits, açıklama Türkçe
  örn: feat: EİDS yetki süresi kontrolü eklendi
main'e doğrudan push YOK — PR üzerinden

## Her fazın sonunda
pnpm typecheck && pnpm lint && pnpm test && pnpm build → hepsi temiz

## Teknik borç (kapatılacak)
- [x] ~~`vitest.config.ts` içindeki `passWithNoTests: true`~~ — Faz 1.4'te
      kaldırıldı. EİDS birim + entegrasyon testleri yazıldı.
- [ ] postgis imajının tiger/topology şemaları → temizlenebilir, düşük öncelik
- [ ] `sharp` 0.34'e sabitlendi: 0.35'in tip imzası Payload'ın
      `SharpDependency` tipiyle uyuşmuyor. Payload sürüm yükseltmesinde
      tekrar denenebilir.

## Test katmanları
- `*.test.ts` — birim testi, bağımlılık yok, milisaniyeler içinde koşar
- `*.entegrasyon.test.ts` — gerçek PostgreSQL'e karşı Payload Local API ile
      koşar. EİDS ve KVKK kurallarının **gerçekten bağlı olduğunu** kanıtlar;
      birim testi kuralın doğru hesaplandığını, entegrasyon testi kuralın
      atlanamadığını gösterir. `pnpm test` ikisini de çalıştırır ve
      `DATABASE_URI` ister.

## Faz durumu

**Planlanan fazların tamamı işlendi.** Sıradaki iş koddan değil, veriden ve
karardan geliyor — bkz. docs/SENDEN-BEKLENENLER.md.

- [x] Faz 1  — MVP (iskelet, veri modeli, EİDS, KVKK, temel sayfalar, CI/CD)
- [x] Faz 2  — Harita, hesaplayıcılar, ticari dikey, PostGIS yakınlık
- [x] Faz 2B — Bal küpü modülleri, portföy yönetimi/CRM, sosyal medya
              (bkz. BAL-KUPU-VE-PORTFOY-YONETIMI.md)
- [x] Faz 2C — Gözlem giriş sistemi, CSV içe aktarma, endeks altyapısı
              (bkz. ENDEKS-VERI-YONETIMI.md) — /endeks sayfası veri
              eşikleri sağlanana kadar KAPALI, tasarım gereği
- [~] Faz 3  — Drone/360 medya, CDN → talimat gereği ATLANDI.
              Altyapı hazır bekliyor: medya alanları, oynatıcı iskeleti,
              boş durum tasarımı. Gerçek medya ve CDN hesabı gerekiyor.
- [x] Faz 4  — Yatırım skoru, raporlar, AI doğal dil arama
              ⚠️ AI arama varsayılan KAPALI: anahtar + KVKK metni bekliyor
- [~] Faz 5  — Çorlu Live zaman serisi → talimat gereği ATLANDI

## İlgili dokümanlar
- ASLIHANGYD-PROJE-PLANI.md          genel plan, hukuk, altyapı
- BAL-KUPU-VE-PORTFOY-YONETIMI.md    Faz 2B modül şartnamesi
- ENDEKS-VERI-YONETIMI.md            endeks metodolojisi ve veri operasyonu

## Çorlu bağlamı (içerik yazarken kullan)
Değer sürücüleri: Çorlu ve Çerkezköy OSB · Halkalı–Kapıkule hızlı tren ve
Çorlu istasyonu · Tekirdağ–Çorlu Atatürk Havalimanı · İstanbul yakınlığı ve
TEM/D-100 bağlantısı · şehir hastanesi · öğrenci nüfusu

Pilot mahalleler: Muhittin, Alipaşa, Şeyhsinan, Hıdırağa, Velimeşe, Önerler

Not: Bu sürücülerin güncel durumunu doğrulamadan içerikte kesin ifade
kullanma. Emin değilsen Aslıhan'a sor.

## Emin olmadığında
SOR. Özellikle: hukuki konular, gerçek Çorlu verileri, vergi oranları,
EİDS akış detayları, marka tercihleri. Varsaymak yerine sormak her zaman
daha ucuz.
