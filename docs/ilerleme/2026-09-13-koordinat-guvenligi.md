# 13 Eylül 2026 — Koordinat: ters girilen değer artık yakalanıyor

## Tarama sonucu

| Kaynak | Kayıt | Bozuk |
| --- | --- | --- |
| İlanlar (elle girilen) | 2 | **2** |
| Mahalleler (OSM içe aktarma) | 26 | 0 |
| İlgi noktaları (OSM içe aktarma) | 544 | 0 |

⚠️ **Desen tek başına teşhis.** İçe aktarılan 570 kaydın hepsi doğru,
elle girilen iki kaydın ikisi de bozuk. Kırılan şey veri değil, FORM.

| Kayıt | Saklanan | Sorun |
| --- | --- | --- |
| İlan #4 UYSAL PIAZZA | `POINT(41.150169137 27.828600915)` | Enlem/boylam **ters** — nokta Suudi Arabistan'da |
| İlan #2 KERVANCI CITY | `POINT(1 1)` | Gine Körfezi; gerçek konum **bilinmiyor** |

## Kök neden

Payload'ın `point` alanı GeoJSON sırasını (`[boylam, enlem]`) izliyor ve
panele önce **"Boylam"** kutusunu basıyor. İnsanın bildiği sıra bunun
tersi: koordinat her yerde "enlem, boylam" diye okunur — haritada, GPS'te,
tapuda. Form alışkanlığın tersini soruyor.

## Yapılanlar

### 1. Sıra düzeltildi — enlem önce

`src/components/panel/KonumAlani.tsx` Payload'ın varsayılan editörünün
yerine geçiyor. Üç koleksiyonda birden: `Ilanlar.konum`,
`Mahalleler.merkez`, `IlgiNoktalari.konum`.

⚠️ **Saklama sırası DEĞİŞMEDİ.** Veritabanında ve Payload dizisinde sıra
hâlâ GeoJSON. Değişen tek şey ekrandaki sıra; dönüşüm
`lib/konum/dogrula.ts` içinde tek bir yerde.

⚠️ Sihirbazda da aynı sıra — üstelik orada **elle giriş alanı hiç yoktu**,
yalnızca GPS düğmesi vardı. Masaüstünde çalışan biri için koordinat
girmenin yolu yoktu.

### 2. Uyarı + tek tıkla düzeltme

Ters koordinat **tanınıyor**: takas edildiğinde Çorlu'ya düşüyorsa, bu
tesadüf değil. Uyarı hatanın adını koyuyor ve **"Enlem ve boylamı takas
et"** düğmesi sunuyor.

⚠️ "Yanlış" deyip bırakmak, aynı hatanın ikinci kez yapılmasına açık kapı
bırakırdı. Düzeltme, şikâyetin yanında duruyor.

⚠️ **ENGELLEMİYOR, uyarıyor** — `validate` kullanılmadı. Çorlu kutusu
bilerek geniş (enlem 40.9–41.4, boylam 27.5–28.1) ve Ergene ile Çerkezköy
içeride kalıyor: portföy oraya uzandığında araç engel olmamalı. Kutunun
işi coğrafi kesinlik değil, **mertebe** hatasını yakalamak.

### 3. Mini harita + haritadan seçim

Alanın altında canlı harita: değer girildiğinde işaretçi oraya gidiyor,
haritaya tıklayınca koordinat kutulara yazılıyor, işaretçi sürüklenebilir.

⚠️ **Harita kutulardan SONRA.** Elle giriş tam yetkili yol; harita bir
kolaylık. Klavye kullanıcısı haritayı atlayıp alanları doldurabiliyor ve
harita `aria-hidden` — gezinilecek bir şey yok, yedek yol var.

⚠️ Kamera yalnızca nokta görüş alanının DIŞINDAYSA kayıyor. Her rakam
değişiminde zıplasaydı, kullanıcı haritayı elle kaydırdıktan sonra
yazmaya devam edemezdi.

## Ayrı ayrıştırıcı — ve sebebi

⚠️ `lib/csv/ayristir.ts` içindeki `sayiyaCevir` burada **kullanılamaz**.
O ayrıştırıcı son grubu tam üç haneli olan noktayı binlik ayırıcı sayıyor:

    sayiyaCevir('41.150')  →  41150      ✗ Kuzey Kutbu'nun ötesi
    koordinatCoz('41.150') →     41.15   ✓

Koordinatta binlik ayırıcı yoktur — değer zaten −180…180 arasında. Bir
test bu farkı kilitliyor.

## Worker modülü ayrıldı

⚠️ Panele ikinci bir harita eklendi. MapLibre worker kurulumu `Harita3B`
içinde kalsaydı yeni bileşen worker'sız kalır ve harita **sessizce boş**
çizerdi — 24 Ağustos'taki arızanın aynısı, ikinci kez.

Kurulum `lib/harita/workerAdresi.ts` içine taşındı ve test artık tek bir
dosyaya değil, `maplibre-gl`den **değer içe aktaran her dosyaya** bakıyor:
liste kendi kendini genişletiyor. Yalnızca tip içe aktaranlar muaf —
`import type` derlemede siliniyor, çalışma zamanında kütüphane yüklenmiyor.

## Gerçek tarayıcıda ölçüldü

| Ölçüm | Sonuç |
| --- | --- |
| Alan sırası | `["Enlem (kuzey–güney)", "Boylam (doğu–batı)"]` ✓ |
| Girdi tipi | ikisi de `text` + `inputMode="decimal"` ✓ |
| Ters değer yazıldı | uyarı çıktı, sınıf `konum-uyari-ters` ✓ |
| Takas düğmesi | `41.150169 / 27.828601`, uyarı kayboldu ✓ |
| Harita | tuval 703×318, işaretçi 1 ✓ |
| Haritaya tıklama | `41.1553 / 27.812946` yazıldı, işaretçi düştü ✓ |

⚠️ Harita tıklaması ilk denemede çalışmadı ve bir an kod hatası sanıldı.
Sebep ölçümdü: `Input.dispatchMouseEvent` **görünüm** koordinatı alıyor ve
harita ekranın altındaydı. `scrollIntoView` sonrası tıklama yerini buldu.

## Yoldan çıkan bir zaman bombası

`iceAktarma.entegrasyon.test.ts` içindeki mükerrer testi **kodda hiçbir
değişiklik olmadan** kırmızıya dönmüştü: satır tarihi `08.08.2026` diye
sabit yazılmış, mükerrer sorgusu ise son 30 günü tarıyor. 7 Eylül'de o
tarih pencereden çıktı. Tarih artık pencerenin ortasından hesaplanıyor.

31 iddia: `src/lib/konum/dogrula.test.ts`.

## ⚠️ Bozuk iki kayıt HENÜZ DÜZELTİLMEDİ

Veri değişikliği onay bekliyor — özellikle #2'nin gerçek konumu bilinmiyor
ve uydurma koordinat yazmak CLAUDE.md kural 2'ye aykırı. Araç hazır:
Aslıhan panelden haritaya tıklayarak ikisini de düzeltebilir.
