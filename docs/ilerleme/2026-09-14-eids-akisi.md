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
