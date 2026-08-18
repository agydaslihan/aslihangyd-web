# Alan adı sağlığı kontrolü — izlemenin kör noktası

**18 Ağustos 2026** · izleme · alan adı, DNS, RDAP

Site saatlerce erişilemez kaldı. Sunucu sağlıklıydı, Cloudflare sağlıklıydı,
`/api/saglik` 200 dönüyordu. Sorun kayıt kuruluşundaydı — alan adına
`clientHold` konmuştu — ve hiçbir izleme yakalamadı.

## ⚠️ Neden hiçbir izleme görmedi

Alan adı DNS'ten düştüğünde sunucuya **hiç istek gelmez**. Sunucuyu izleyen
her kontrol "her şey yolunda" der, çünkü **kendi tarafından** bakıyordur.

İzlemenin kör noktası buydu: her ölçüm içeriden yapılıyordu. Bu kontrol
dışarıdan bakıyor.

## Ne kontrol ediliyor

1. **Kayıt kuruluşu durumu** — `clientHold`, `serverHold`,
   `redemptionPeriod`, `pendingDelete`, `inactive` → kritik.
   `pendingTransfer` gibi durumlar uyarı.
2. **Bitiş tarihi** — 60 günden az uyarı, 30 günden az kritik, geçmişse
   ayrı bir cümleyle kritik.
3. **Dış DNS çözümlemesi** — 1.1.1.1 ve 8.8.8.8 üzerinden.

⚠️ **Kendi DNS'imiz bilinçli olarak kullanılmıyor** — arızanın kör noktası
tam olarak buydu. Sunucunun çözümleyicisi önbellekten cevap verip düşmüş bir
alan adını "çalışıyor" gösterebilir. Ziyaretçinin gördüğü, bu iki genel
çözümleyicinin gördüğüdür.

## ⚠️ WHOIS değil RDAP

RDAP, WHOIS'in resmî halefi: HTTPS üzerinden JSON, durum listesi ve
tarihler yapısal. Klasik WHOIS 43. porta düz metin konuşuyor ve her kayıt
kuruluşunun çıktısı farklı biçimde — ayrıştırıcısı kaçınılmaz olarak
kırılgan olurdu. Bu kontrolün amacı sessizce yanılmamak; kırılgan bir
ayrıştırıcı tam tersini yapardı.

Yeni bağımlılık yok: `fetch` ve Node'un kendi `dns` modülü yetiyor.

⚠️ İki durum biçimi de tanınıyor: WHOIS `clientHold`, RDAP `client hold`
yazıyor. Yalnızca birini tanıyan bir kontrol, kaynağı değiştiğinde sessizce
"sorun yok" derdi.

## ⚠️ Yanlış alarma karşı iki önlem

**1. Kontrol alan adı.** Sunucudan dışarı DNS engelliyse bizim alan adımız
da "çözülmüyor" görünür ve her gün "site erişilemez" uyarısı düşerdi.
Aynı çözümleyiciye bilinen bir alan adı da soruluyor:

- kontrol çözülüyor, bizimki çözülmüyor → sorun **bizde**
- ikisi de çözülmüyor → sorun **ağda**, karar "bilinmiyor"

**2. Yerel adres atlanıyor.** Geliştirme ortamında `SITE_ADRESI` genellikle
`localhost`; o adresin kayıt kuruluşu da DNS kaydı da yok. Bunu hata saymak
geliştiricinin panelinde her gün kırmızı satır üretirdi ve gerçek uyarıları
gölgelerdi. Hata değil, **atlama** olarak raporlanıyor.

Yanlış alarm veren bir uyarı kısa sürede görmezden gelinir — kontrolün var
olma sebebini yok eder.

## ⚠️ Panelde yasal uyarıların da üstünde

Yeni bir öncelik sınıfı eklendi: `erisim`, `yasal`ın da üstünde.

Site erişilemezse EİDS uyarısını okuyacak bir panel de yok. Erişilebilirlik
diğer her şeyin **ön koşulu**. Aynı seviyeye konsaydı sıralaması tesadüfe
kalırdı.

⚠️ **Bayat kayıt sessizce güven vermiyor:** son sorgunun üzerinden 26 saatten
fazla geçtiyse ayrı bir uyarı düşüyor. "Sağlıklı" yazan üç günlük bir satır,
bugün alan adı düşmüş olsa bile panelde yeşil görünürdü.

⚠️ Hiç sorgulanmamışsa da uyarı var: "sorun yok" ile "hiç bakılmadı" farklı
şeyler.

## Nezaket

Şartnamenin şartı: kayıt kuruluşunu yorma.

- Sorgu **günde bir kez**, yalnızca bakım göreviyle
- Sonuç `alan-sagligi` globaline yazılıyor; panel şeridi **o kaydı okuyor**,
  hiç sorgu yapmıyor. Şerit her sayfa açılışında çalışıyor — oradan
  sorulsaydı günde yüzlerce istek giderdi.
- Tek istek, yeniden deneme yok
- `User-Agent` projeyi tanıtıyor

## ⚠️ İki hata yalnızca ÇALIŞTIRINCA göründü

Kurallar testle doğruydu, sorgu çalışmıyordu.

**1. `User-Agent` Türkçe yazılmıştı** ve `fetch` her çağrıda düşüyordu:

```
Cannot convert argument to a ByteString because the character at index 22
has a value of 305 which is greater than 255
```

HTTP başlık değerleri latin-1; "ı" geçmiyor. Yani **RDAP sorgusu üretimde de
hiç çalışmayacaktı** ve kontrol sessizce "durum okunamadı" derdi — tam da
kaçındığımız sessizlik. Ölçüm başlığında da aynı tuzağa düşülmüştü.

**2. `localhost` için kontrol "site erişilemez" diyordu.** Yerel adres
koruması bu yüzden eklendi.

Bu yüzden `scripts/alan-denetim.mjs` var: bakım görevinin yaptığı işin
aynısını hiçbir şey yazmadan koşturuyor.

⚠️ `sorgu.ts` içinde `import 'server-only'` **yok** ve bu bilinçli: dosya
`node:dns/promises` içe aktarıyor, istemci paketine girmesi zaten derleme
anında patlar. Buna karşılık işaret, teşhis betiğini engelliyordu — elle
sorgulanamayan bir sağlık kontrolü, teşhis anında en çok ihtiyaç duyulan
şeyi kaybettirir.

## Doğrulama — gerçek alan adına karşı

Kurallar birim testiyle (24 test), zincirin tamamı **üretim yolundan**:

```
$ curl "…/api/bakim?gorev=alan-sagligi" -H "authorization: Bearer …"
{"gorevler":[{"anahtar":"alan-sagligi","islenen":1,
  "detay":["aslihangyd.com → saglikli: Alan adı sağlıklı; bitişe 350 gün var."]}]}

kayıt: aslihangyd.com | saglikli | durumlar: active | kalanGun: 350
       cozumleme: Cloudflare (1.1.1.1): çözülüyor · Google (8.8.8.8): çözülüyor
```

RDAP gerçekten cevap veriyor, iki dış çözümleyici de sorgulanıyor ve sonuç
önbelleğe yazılıyor.

## İşletme rehberi

`docs/ISLETME-REHBERI.md` §8c: "Site açılmıyor ama sunucu 200 dönüyor" —
DNS zincirinin dışarıdan nasıl kontrol edileceği, RDAP/WHOIS durum satırının
nasıl okunacağı (tablo hâlinde), hangi bulguda kime başvurulacağı.

⚠️ `clientHold` genellikle ödemeden ya da **doğrulanmamış iletişim
bilgisinden** gelir; ICANN e-posta doğrulamasını zorunlu tutuyor. Rehberde
yazılı.
