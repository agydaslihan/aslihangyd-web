# Dağıtım tek komut, şema bütünlüğü denetleniyor

**20 Ağustos 2026** · süreç · dağıtım, sessiz arıza

18–20 Ağustos'ta sayfa içerikleri sürümü dağıtıldı, göç adımı atlandı ve
**ölü bir özellik iki gün canlı göründü**.

## ⚠️ Neden kimse fark etmedi

Site hiç bozulmadı: bütün sayfalar 200, `/api/saglik` "saglikli", 24 saatte
tek hata satırı yok. Sebebi, içerik okuyucularındaki `try/catch` blokları —
eksik tabloyu yakalayıp koddaki varsayılan metne düşüyorlardı.

Geri düşüşler **doğruydu**: ziyaretçi bir göç yüzünden 500 görmemeli. Ama
bir yan etkileri vardı — gürültülü bir arızayı **sessiz bir özellik
kaybına** çevirdiler. Panelde "Sayfa İçerikleri" açılıp kaydedilseydi hata
verecekti; kimse denemediği için iki gün geçti.

13 Ağustos'taki aynı hata gürültülüydü (ana sayfa 500) ve aynı gün
düzeltildi. Bu sefer sessizdi ve daha uzun sürdü.

## 1 · Dağıtım tek komut

`scripts/dagit.sh`: imajları çeker (göçmen dahil), bekleyen göçleri
**listeler**, göçü **uygular**, uygulamayı yeniler, sağlığı doğrular, eski
imajları temizler.

⚠️ `set -euo pipefail`: bir adım başarısızsa sonrakiler çalışmıyor. Göç
başarısızken uygulamayı yenilemek, tam olarak kaçındığımız duruma —
şemayla uyumsuz kod — götürürdü.

⚠️ `.env` okunamıyorsa betik ne yapılacağını yazıp duruyor; sessizce boş
değişkenlerle kap yeniden yaratmıyor.

ISLETME-REHBERI §5.3 artık dört komut yerine bunu çağırıyor. Adımları
belgede sıralamak yetmedi: dört komutu elle yazan kişi birini atlayabiliyor
ve **iki kez atladı**.

## 2 · Şema bütünlüğü denetimi

Açılıştan 15 saniye sonra, kodun beklediği tablolar veritabanındakilerle
karşılaştırılıyor. Eksik varsa:

- Panel şeridinde **"Bütünlük"** etiketiyle kırmızı uyarı: kaç tablo eksik,
  hangileri, ne yapılacağı (`--profile gocmen` komutu)
- Sunucu günlüğünde `console.error` satırı

⚠️ **Beklenen liste elle yazılmıyor**, Payload'ın kendi tablo kaydından
(`payload.db.tables`) geliyor. Elle tutulan bir liste, tam da denetlemek
istediğimiz şeyi — birinin bir adımı atlamasını — kendi içinde tekrarlardı:
yeni koleksiyon eklenir, listeye eklenmesi unutulur, denetim sessizce eksik
kalır.

⚠️ **Uygulama çökmüyor, ziyaretçi etkilenmiyor.** Denetim `void` ile
çağrılıyor (açılışı bekletmiyor), gecikmeli başlıyor (kap ile veritabanı
aynı anda kalkıyor; ilk saniyede sorulan soru yanlış alarm üretir) ve her
hatayı yutuyor. Bir bütünlük kontrolünün siteyi düşürmesi, korumaya
çalıştığı şeyden büyük zarar olurdu.

⚠️ **Tek sorgu**: tablo başına gidiş-dönüş açılışta 63 sorgu demek olurdu.

### Öncelik: bütünlük, yasalın üstünde

Yeni bir sınıf eklendi: `butunluk`, `erisim` ile `yasal` arasında.

Gerekçesi ince: eksik bir tablo, dağıtımın yarım kaldığı anlamına geliyor ve
şeritteki **diğer uyarıların dayandığı varsayımları geçersiz kılıyor** —
EİDS sayımı eksik bir tablodan okuyorsa "0 ilan" der ve sorun yokmuş gibi
görünür. Yani bütünlük sorunu, yasal uyarıyı **yanlış gösterebilir**.

Erişimin altında çünkü site hâlâ açık; yasalın üstünde çünkü yasal uyarının
doğruluğunu belirliyor.

⚠️ "Hiç denetlenmedi" durumu şeritte sessiz — denetim açılıştan 15 sn sonra
koşuyor ve o pencerede paneli açan biri yanlış uyarı görmemeli.

## Doğrulama — simüle edilerek

Bir tablo geçici olarak yeniden adlandırıldı ve sunucu başlatıldı:

```
/            200      ← site etkilenmedi
/iletisim    200
/portfoy     200

[sema] ⚠️ 1/63 TABLO EKSİK — göç uygulanmamış olabilir. Eksikler: altbilgi_ayarlari
[sema] Çözüm: docker compose --profile gocmen run --rm gocmen
```

Tablo geri alındı, denetim tekrar temiz döndü.

## ⚠️ Yol boyunca iki tanıdık tuzak

**1. Edge derlemesi.** Denetim önce `instrumentation.ts` içine yazıldı ve
derleme kırıldı: Next o dosyayı Edge için de derliyor ve `@payload-config`
doğrudan oradan içe aktarılınca `node:path` Edge paketine çözülmeye
çalışılıyor. Çalışma zamanı kontrolü yetmiyor — hata derleme anında. Aynı
dosyada `process.once` ile de yaşanmıştı. Payload içe aktarımı
`server-only` bir ara modüle alındı; ölçüm yazıcısı zaten bu desendeydi.

**2. Yorum, kendi testini kırdı.** "Kaynakta `@payload-config` geçmesin"
denetimi, o kararın **gerekçesini** anlatan yorumla eşleşip kırmızı verdi.
Bu projede **dördüncü** kez. Denetim yorumsuz koda bakacak hâle getirildi.

## Bu, dördüncü sessiz arızaydı

1. Kullanıcı rolü okunamıyordu → yetki kontrolü sessizce geçiyordu
2. OSM "elle düzenlendi" koruması çalışmıyordu
3. Turnstile site anahtarı boştu → formlar bot korumasız
4. Göç uygulanmadı → yeni özellikler ölü, site "sağlıklı"

Dördünün ortak yanı: **hata yok, davranış yanlış.** Bu paket o sınıfın şema
ayağını kalıcı olarak kapatıyor — 14 denetimle.
