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

- [ ] **Mahalle Eşleştirme profili — her mahalle için 4 puan (0–100)**
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

- [ ] **Bakım anahtarı ve cron kurulumu** (Faz 1.10 — ZORUNLU)
      `.env` → `BAKIM_ANAHTARI=$(openssl rand -hex 32)`
      Cron kurulumu: `docs/ISLETME-REHBERI.md` bölüm 6
      Olmazsa: Yetkisi dolan ilanlar **otomatik yayından kalkmaz** ve
      saklama süresi dolan kişisel veriler silinmez. Bu iki iş de yasal
      yükümlülük — kurulumu atlanmamalı.

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

**Geriye kalan üç modül** hâlâ bekliyor ve öncelik sıranı istiyorum:

| Modül | Neden yapılmadı |
| --- | --- |
| CRM eşleştirme motoru | Portföy–talep eşleştirmesi anlamlı miktarda veri gerektiriyor; şu an eşleştirilecek yeterli kayıt yok |
| Portföy giriş sihirbazı | Payload admin şu an yeterli; sihirbaz bir hız optimizasyonu |
| Sosyal medya materyal üretimi | Görsel şablon kararları marka kimliği netleşince anlamlı |

Bir cümle yeter — tasarımı ben yaparım.

### 4b. Derleme süresi eşiği aşıldı — karar gerekiyor

Derleme süresi **87 sn → 107 sn** çıktı; kendi koyduğumuz 90 sn eşiği aşıldı.

**Sebep bağımlılık değil** — bu fazda hiçbir paket eklenmedi. Artış 8 yeni
sayfadan geliyor, rota başına ~2,5 sn. Yani orantılı ve beklenen bir artış.

**Seçenekler:**
1. Eşiği 120 sn'ye çek (bence doğrusu bu — site büyüdükçe derleme uzar)
2. CI'da derleme önbelleği kur (biraz iş, süreyi tekrar aşağı çeker)
3. Şimdilik yoksay

Karar senin; bunlardan biri olmadan eşik anlamsız bir uyarı olarak kalır.

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

Elinde Excel/Sheets varsa CSV içe aktarma yazabilirim — **sütun düzenini
bana gönder**, tahmin edip iki kez yazmak istemiyorum.

### 7. Marka rengi ve tipografi onayın var mı?

**Şu anki durum:** Kendi seçtiğim paletle ilerledim — sıcak kağıt zemini,
derin lacivert, veri vurguları için pirinç sarısı. Emlak sitelerinin
kırmızı "ACİL SATILIK" estetiğinden bilinçli olarak uzak durdum.

Başlıklarda Source Serif 4, arayüzde Inter kullanıyorum.

**Senden istediğim:** Siteye bak, beğenmezsen söyle — değiştiririm.
Logon varsa gönder, yerleştireyim.
