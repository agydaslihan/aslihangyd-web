# 14 Eylül 2026 — EİDS akışı: eksik erken ve kaynağıyla görünüyor

## Neden

Kural doğru çalışıyordu ve **aynen kalıyor**. Sorun akıştaydı: ilan baştan
sona dolduruluyor, sonda altı EİDS eksiği birden çıkıyordu. Yetki belgesi
mülk sahibinden e-Devlet üzerinden geliyor ve dakikalar içinde
halledilmiyor; engeli sonda görmek yapılan işin boşa gitmesi demekti.

⚠️ **Hiçbir koşul gevşetilmedi.** Sayaç, rozet ve ipuçları aynı
`eidsDegerlendir` motorundan besleniyor; gerçek kapı hâlâ sunucudaki
`eidsYayinEngeli` kancası.

## Yapılanlar

| # | İstek | Nerede |
| --- | --- | --- |
| 1 | EİDS adımı kategoriden hemen sonra | `lib/sihirbaz/sema.ts` — sıra `kategori → tapu → temel → …` |
| 2 | Her alanın yanında kaynak | `lib/eids/ilerleme.ts` → `eidsKaynagi()`; sihirbaz alanları VE panel formu |
| 3 | Canlı sayaç "EİDS: 6 eksikten 2'si tamamlandı" | `EidsHazirlikPaneli` + `role="progressbar"` |
| 4 | Taslak düğmesi belirgin | EİDS eksikken "sessiz" stilini bırakıyor |
| 5 | Listede "EİDS eksik (4)" rozeti | `components/panel/IlanDurumHucresi.tsx` |

### Kaynak metni TEK yerde

⚠️ Aynı ipucu üç yerde görünüyor: sihirbaz alanı, panel formu, EİDS
paneli. Üçü de `EIDS_GEREKLILIKLERI`'nden okuyor. Ayrı ayrı yazılsaydı biri
güncellenir, ikisi eskide kalırdı. Bir test her alanın `eidsKaynagi(...)`
çağırdığını denetliyor.

### Taşınmaz numarası için ikinci kaynak: TTBS

Ticaret Bakanlığı il müdürlüklerinin duyurusuna göre işletmenin
**TTBS → Yetki Belgelerim / EİDS İlan Yayınlama İzinlerim** ekranı "ilan
yayınlama izni verilen taşınmazların numaralarını (ID)", izin verenin
adını ve **yetki bitiş tarihini** listeliyor. Yani yetki verildikten sonra
danışman bu iki bilgiyi mülk sahibine sormadan bulabiliyor. İpucu
metinlerine eklendi.

⚠️ Aynı duyuru yetki BAŞLANGIÇ tarihini saymıyor; o ipucuna TTBS
yazılmadı.

### Sayaç eşlemesi atlanamaz

Engel kodu → gereklilik tablosu `Record<EidsEngelKodu, …>`. Eşlenmeyen bir
kod sayacı sessizce yanıltırdı (ilan yayına alınamazken "hepsi tamam").
Tip derlemede, test her koşumda yakalıyor. Ayrıca "eksik yoksa motor da
yayınlanabilir diyor" iddiası dört girdiyle kilitli.

## TKGM ada/parsel önerisi — YAZILMADI

Araştırma sonucu:

| Soru | Cevap |
| --- | --- |
| Programatik erişim | Resmi, belgelenmiş, herkese açık API **yok**. `megsisapi.tkgm.gov.tr` dışarıya kapalı (bağlantı reddedildi). MEGSİS WMS/WFS protokolle "kurum, kuruluş ve belediyeler"e. |
| Kullanım koşulları (V-1.0) | Madde 3: servislere izinsiz doğrudan/dolaylı erişim yasak. Madde 4: sonuçların **ticari amaçla kullanılması yasak**. |
| Kota / kimlik doğrulama | Yayımlanmış bilgi yok — madde 3 yüzünden soru anlamsız. |

⚠️ GitHub'daki cURL sınıfları dahili servise izinsiz erişiyor: madde 3
ihlali ve kural 6 kapsamında scraping. Kullanılmadı.

⚠️ "TKGM'de sorgula" düğmesi de **eklenmedi**: madde 4'ün emlak
işletmesine uygulanıp uygulanmadığı hukuki bir soru
(`SENDEN-BEKLENENLER.md` §9). Ada/parsel için gösterilen kaynak tapu
belgesi.

## Koordinat: yer tutucu değer ayrı tanınıyor

İlan #2'nin `POINT(1 1)`'i önceden yalnızca "Çorlu dışında" sayılıyor ve
kullanıcıya **"enlem ve boylamı karıştırmış olabilirsiniz"** deniyordu.
Yanlış tavsiye: ortada karıştırılacak bir konum yok.

Yeni durum `yer_tutucu`: iki değer de **tam sayı derece** (1° ≈ 111 km;
hiçbir binayı göstermez). Mesaj alanı boş bırakmayı öneriyor, takas
önerilmiyor, panel haritasında işaretçi çizilmiyor. Kutu denetiminden
ÖNCE çalışıyor — `41, 28` Çorlu kutusuna düşse de bir bina değil.

### Tarama artık kodda

`lib/konum/tarama.ts`. 13 Eylül taraması psql'e yapıştırılan bir sorguydu
ve aralık kuralını SQL'de **ikinci kez** yazıyordu. Şimdi SQL yalnızca
okuyor; sınıflandırmayı panelle aynı motor yapıyor.

### Kalıcı test — CI'da

`lib/konum/konum.entegrasyon.test.ts`, gerçek PostgreSQL'e karşı:

- İki üretim kaydının birebir aynısı Payload'dan yazılıyor, tarama
  ikisini de buluyor (`ters` + düzeltilmiş değer; `yer_tutucu` + takassız)
- Doğru kayıt ve konumsuz kayıt taramaya TAKILMIYOR — her şeyi bozuk
  sayan bir tarama da ilk iki testi geçerdi
- Doğru koordinat Payload → PostGIS → Payload gidiş-dönüşünde aynı sırada

⚠️ **Testin bir şey kanıtladığı ölçüldü:** taramada `ST_X`/`ST_Y`
geçici olarak takas edildi → iki test kırıldı ("ters bulunuyor", "doğru
kayıt takılmıyor"). Geri alındı.

## Üretim verisi — gerçek koordinatlar

Aslıhan iki ilanın gerçek koordinatını verdi; önceki "takas" ve "NULL"
kararları bununla iptal edildi.

| İlan | Önceki | Yeni (enlem, boylam) | Denetim |
| --- | --- | --- | --- |
| #2 KERVANCI CITY 3 | `POINT(1 1)` | 41.148842727251576, 27.783358710222803 | aralıkta, motor `tamam` |
| #4 UYSAL PIAZZA | `POINT(41.150169137 27.828600915)` (ters) | 41.15039784455594, 27.82859549672979 | aralıkta, motor `tamam` |

#4 için takasla hesaplanan değer gerçeğe ≈ 25 m uzaktı — takas doğruydu,
ama kesin değer varken hesaplanmış değer kullanılmadı.

⚠️ Güncelleme tek bir `DO` bloğunda: yeni değerler veritabanında da aralık
denetiminden geçiyor, her kayıt yalnızca beklenen eski durumdaysa
değişiyor ve her biri tam 1 satır etkilemezse hiçbir şey yazılmıyor.
Geliştirme veritabanında önce reddetme yolu (kayıt yok → geri çevrildi),
sonra geçici kayıtlarla başarılı yol denendi ve geri alındı; basamaklar
birebir korundu, SRID 4326.

⚠️ Üretim veritabanına bu oturumdan yazma izni yok; sorgu Aslıhan
tarafından sunucuda çalıştırılıyor.

## Gerçek tarayıcıda ölçüm — iki hata yakaladı

Derlenmiş uygulama `127.0.0.1:3100`'de, geliştirme veritabanına karşı,
CDP üzerinden gerçek fare/klavye olaylarıyla denendi.

### 1. Panel koordinat alanı yazılanı SİLİYORDU (13 Eylül işi)

Yeni ilanda enlem kutusuna yazıp boylama geçince **enlem boşalıyordu**.

Sebep: `KonumAlaniIstemci` metni `value` değişince tazeliyordu. Enlem tek
başına yazılınca boylam boş olduğu için forma `null` gidiyor, `value`
`undefined → null` değişiyor ve bileşen bunu "dışarıdan gelen değişiklik"
sanıp iki kutuyu da sıfırlıyordu. Kayıtlı bir ilanda "41." yazmak da aynı
yoldan iki kutuyu birden siliyordu.

⚠️ 13 Eylül ölçümü bunu göremedi: değerler tek seferde ve boylam önce
dolacak sırayla yazılmıştı. Kullanıcının gerçek yazma sırası (önce enlem —
düzeltmenin ta kendisi) hiç denenmemişti.

Düzeltme `TurkceSayiAlani`'nın kalıbı (sözleşme testi `dogrula.test.ts` içinde): metin yalnızca `initialValue`
değişince (yükleme, kayıt sonrası) tazeleniyor. Harita tıklaması ve takas
metni zaten kendileri yazıyor.

### 2. Sayaç "0’si" yazıyordu

Ek sabit `’si` idi; yalnızca 2 ve 7'de doğru. `lib/metin/iyelik.ts`
sayının okunuşunun son kelimesine göre ek seçiyor: 0’ı, 1’i, 3’ü, 6’sı,
40’ı.

### Ölçülenler

| Denetim | Sonuç |
| --- | --- |
| Sihirbaz adım sırası | Kategori → **Tapu ve EİDS** → Temel → … ✓ |
| Sayaç | "EİDS: 6 eksikten 0’si tamamlandı" (→ hata 2), `role="progressbar"`, `aria-valuemax=6` ✓ |
| Alan yanı kaynak — sihirbaz | altı alanın altısı ✓ |
| Alan yanı kaynak — panel formu | ada, parsel, taşınmaz no, iki tarih ✓ |
| Taslak düğmesi EİDS eksikken | `sessiz` sınıfı yok ✓ |
| `1, 1` | yer tutucu uyarısı, takas düğmesi yok ✓ |
| Ters değer | "karıştırmış olabilirsiniz" + takas düğmesi ✓ |
| Gerçek koordinat (#4) | uyarı yok ✓ |
| Kontrast (AA) — iki tema | sayaç 12,08 / 16,55 · kaynak metni 5,26 / 8,07 · eksik etiketi 8 / 10,73 · başlık 12,08 / 16,55 ✓ |

## ⚠️ Yerel `next start` üretim ayarlarını yüklüyor

Proje dizininde `.env.production` var ve `next start` (üretim kipi) onu
`.env`'in ÜSTÜNE yüklüyor. İlk denemede uygulama `postgres` sunucusuna
— üretim compose ağının adına — bağlanmaya çalıştı; kabuktan
çözülemediği için üretime ulaşmadı.

Yerel doğrulama `NODE_ENV=test pnpm start` ile yapıldı: `@next/env` test
kipinde `.env.production`'ı hiç okumuyor. Bu makine üretim sunucusu da
olduğu için yerel sunucunun hangi veritabanına bağlandığı her seferinde
doğrulanmalı (duman kullanıcısıyla giriş yalnızca geliştirme
veritabanında çalışır).

## ⚠️ Tarayıcıda YENİDEN ölçülemeyenler

İki düzeltmeden sonra ikinci derleme **sistem belleği azaldığı için
durduruldu**. Bu makine aynı zamanda üretim sunucusu (3,3 GB RAM); üretim
uygulaması ayakta kaldı (`healthy`, anasayfa 200), ama derleme burada
tekrar denenmedi — canlı siteyi riske atmaya değmez.

Bu yüzden şunlar yerelde gerçek tarayıcıda ölçülmedi, **CI'a kaldı**:

- Panel koordinat alanında düzeltmenin tarayıcıdaki davranışı (kök neden
  ve sözleşme testi var; tarayıcı tekrarı yok)
- Liste rozetinin görünümü ve kontrastı (geliştirme veritabanında taslak
  ilan yoktu; geçici ilanla ölçüm betiğin sonraki adımı çöktüğü için
  yazdırılamadı — geçici ilan silindi, doğrulandı)
- İlerleme çubuğunun grafik kontrastı (WCAG 1.4.11) ve yer tutucu uyarı
  kutularının kontrastı
- Derleme, gezinme dumanı, Lighthouse — CI iş akışları her PR'da koşuyor

## Kalıcı kural: üretim sunucusunda derleme yok

Yukarıdaki bellek olayından sonra (Aslıhan'ın kararıyla) CLAUDE.md'ye
yazıldı ve koda bağlandı: `scripts/sunucu-korumasi.mjs`, `pnpm build` ve
`pnpm start`ın ilk adımı.

| Durum | Karar |
| --- | --- |
| `pnpm build`, `/srv/aslihangyd` var | ✗ reddedilir — `NODE_ENV=test` de açmaz |
| `pnpm build`, CI / `docker build` | ✓ işaret dizini yok |
| `pnpm start`, `.env.production` var, `NODE_ENV≠test` | ✗ reddedilir |
| `NODE_ENV=test pnpm start` | ✓ `.env.production` okunmaz |

Sunucuda ölçüldü: `pnpm build` derlemeye hiç başlamadan çıkış 1 verdi
(15 sn zaman sınırıyla, `next build` süreci oluşmadı); `pnpm start` çıkış
1, `NODE_ENV=test` ile çıkış 0.

⚠️ `npx next build` doğrudan çağrılırsa koruma atlanır. `next.config.ts`
içine faz denetimi eklemek bunu da kapatırdı, ama config yükleme yolu
ancak derlemeyle doğrulanabiliyor ve derleme artık sunucuda yapılmıyor —
yazılmadı.

## Tarayıcı doğrulaması CI'a taşındı — panel davranışı turu

**Karar (Aslıhan):** tarayıcı doğrulaması CI'da. Hazır derlemeyi sunucuya
indirmek reddedildi: canlı siteyle aynı makinede ikinci uygulama
koşturmak, az önce kaçınılan riskin başka biçimi. CI doğrulaması her PR'da
tekrarlanıyor ve kayıt bırakıyor.

`scripts/gezinme-dumani.mjs` dördüncü tur: **panel davranışı**.

| Denetim | Nasıl |
| --- | --- |
| Yeni ilanda enlem yaz → Tab → boylam yaz | `Input.insertText` + gerçek `Tab`; iki kutu da duruyor mu |
| Kayıtlı ilanda "41." | seç + yaz; iki kutu da korunuyor mu |
| Sayaç ve iyelik eki | ada → parsel → taşınmaz no → yetkili → başlangıç → bitiş: `0’ı 1’i 2’si 3’ü 4’ü 5’i` → "hepsi tamamlandı"; `aria-valuenow` ve eksik listesi her adımda |
| Liste rozeti | REST'ten açılan taslak: "EİDS eksik (6)", ada girilince "(5)"; yayındaki ilanda rozet yok |
| Çizilen kontrast, iki tema | rozet, adım göstergesi (etkin/bekleyen/numara/ilerleme metni), sayaç, kaynak metni, ipucu; çubuk dolgu–iz ve çerçeve–zemin ≥ 3:1 |

⚠️ `6’sı` tarayıcıda görünmüyor: altı koşul tamamlanınca özet "6 koşulun
hepsi tamamlandı" diyor. Ek birim testinde (`lib/metin/iyelik.test.ts`).

⚠️ Beklenen metinler betikte elle yazılı; `src/lib/olcum/gezinmeDumani.test.ts`
onları `sayiIyelik()` ve `eidsIlerlemesi()` çıktısıyla karşılaştırıyor —
motor değişip betik eskide kalırsa önce birim testi kırılıyor. Aynı dosya
`(pointer: fine)` yamasının yerinde durduğunu da denetliyor.

⚠️ Deneme kaydı `DUMAN-DAVRANIS` önekiyle REST'ten açılıyor ve `finally`
içinde siliniyor.

⚠️ **Tur yerelde koşulmadı.** Sunucuda derleme yok; 3000 portundaki
üretim uygulamasına karşı koşmak üretim veritabanına deneme ilanı yazmak
olurdu. İlk gerçek koşumu CI'da.

### Süre

Her turun süresi günlüğe, toplamı CI iş özetine yazılıyor; 900 sn'yi
aşarsa `::warning::`.

**Ölçüldü (4 CI koşumu):** toplam 209–236 sn; eşiğin (900 sn) dörtte biri.

| Tur | Süre |
| --- | --- |
| hareket açık | 101–104 sn |
| az hareket | 80–82 sn |
| panel (oturumlu) | 23–25 sn |
| panel davranışı | 5–27 sn (kararlı hâli 14 sn) |

Paralelleştirme gerekmiyor.

### Hesaplayarak düzeltilen kontrastlar

Tur yazılırken Payload tema değişkenleri (`@payloadcms/next` stilleri)
okunarak hesaplandı; ölçülse kırılacaklardı:

| Öğe | Önce | Sonra |
| --- | --- | --- |
| İlerleme çubuğu dolgu–iz | açık 2,97 · koyu 2,73 | iz zemin rengi + çerçeve: açık 4,0 · koyu 4,6 |
| Bekleyen adım metni (`elevation-500`) | açık 3,95 (beyaz zemin) | `elevation-600`: açık 5,9 · koyu 7,8 |
| Adım yüzdesi | aynı token | `elevation-600` |
| `.sihirbaz-ipucu` (kaynak metinleri burada) | açık 3,95 | `elevation-600` |

⚠️ `elevation-500` iki temada da aynı gri (rgb 128) — koyu tema onu
EZMİYOR. Aynı token üç yerde daha duruyor ve **bu PR'da değiştirilmedi**
(kapsam dışı, ölçülmüyor): `.sihirbaz-birim`, `.sihirbaz-gostergeler dt`,
`.sihirbaz-gostergeler-not`.

## İlk CI koşumu kırmızı — teşhis CI çıktısından, sunucuda derleme yok

PR #114 ve #115 açıldığında CI ve Lighthouse kırmızıydı, üretim imajı
yeşildi. Tahmin edilmedi: iki tur teşhis kodu CI'a gönderildi, cevap
çıktıdan okundu. **İki hata da testteydi, kodda değil.**

### 1. Harita worker denetimi — desen eskimişti

`scripts/harita-worker-duman.mjs` derleme çıktısında
`WORKER_URL = \`/maplibre/` arıyordu ve iki koşumda da bulamadı. Teşhis
çıktısı:

```
(0,i.setWorkerUrl)(`/maplibre/${(0,i.getVersion)()}/maplibre-gl-worker.mjs`)
"setWorkerUrl",0,function(t){tB.WORKER_URL=t}
```

Çağrı derlemede duruyor. Kurulum `Harita3B`den `lib/harita/workerAdresi.ts`e
taşınınca (13 Eylül) küçültücü MapLibre'nin tek satırlık fonksiyonunu
çağrı yerine AÇMAYI bıraktı. Desen iki biçimi de kabul ediyor; hiçbiri
yoksa çağrı gerçekten düşmüştür.

### 2. Panel davranışı — Payload sekme yarışı

Aynı kod üç koşumda üç sonuç verdi: geçti / "41." sonrası kutular `[]` /
kutular hiç görünmedi. Zaman çizelgesi kutuların 3 sn boyunca hiç geri
gelmediğini, istisna olmadığını gösterdi — çökme değil.

Kaynak `@payloadcms/ui` (Tabs alanı + Preferences sağlayıcısı): sayfa
açılınca kayıtlı sekme `/api/payload-preferences/…` ile soruluyor. İstek
dönmeden tıklanan sekme, istek dönünce açılış etkisi tarafından ESKİ
sekmeye geri alınıyor. Test sayfa açılır açılmaz tıklıyordu.

Düzeltme testte: tercih isteği bekleniyor, sekme 1 sn gözlem penceresinde
kalıcı olmalı, dönerse yeniden deneniyor. Sonraki iki koşumda ilk
denemede kalıcı; çizelge `6ms ["41.","27.827424"] @Konum ve tapu` —
yazılan korunuyor, 14 Eylül'deki silme düzeltmesi tarayıcıda kanıtlandı.

⚠️ Aynı yarış, sayfa açılır açılmaz sekme değiştiren gerçek bir kullanıcıda
da yaşanabilir (sekme geri zıplar). Payload'ın davranışı; bizim kodumuzda
değil.

### 3. Lighthouse — süre de gerileme de değildi

Duman adımı engelleyici; kırılınca Lighthouse'a sıra gelmedi. Yeşil
koşumlar main'e giren son PR'ın (#113, `d54f3af`) ölçümüyle karşılaştırıldı.
Özet betiği runner hızı oynadığında skor yerine BAYT karşılaştırmayı
şart koşuyor:

| Sayfa (mobil) | Taban toplam | #114 | #115 |
| --- | --- | --- | --- |
| anasayfa | 391 kB | 392 kB | 391 kB |
| mahalleler | 384 kB | 384 kB | 383 kB |
| portfoy | 459 kB | 460 kB | 459 kB |

JavaScript her sayfada birebir aynı (184 / 178 kB). Skorlar: masaüstü
98–100, mobil 88–93, erişilebilirlik / en iyi uygulamalar / SEO 100.

⚠️ **Hedefi tutmayan iki değer — bu PR'dan önce de vardı:**

| | Taban (#113) | Bu PR | Hedef |
| --- | --- | --- | --- |
| Mobil LCP | 3,3–3,7 sn | 3,1–3,8 sn | < 2,5 sn |
| Masaüstü anasayfa CLS | 0,088 | 0,088 | 0 (kapı) / < 0,1 (CLAUDE.md) |

Ayrı iş olarak ele alınmalı; bu PR'da değiştirilmedi.
