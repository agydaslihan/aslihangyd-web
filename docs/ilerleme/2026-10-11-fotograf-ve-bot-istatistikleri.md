# 11 Ekim 2026 — Mevcut ilana fotoğraf yükleme + bot ve arama motoru istatistikleri

İki iş, iki bağımsız bulgu. İkisinin de ortak yanı şu: **var olduğu sanılan
bir şey yoktu ve hiçbir denetim bunu söylemiyordu.**

---

## A. Mevcut ilana fotoğraf yükleme

### Kontrol sonucu: çalışıyordu, ama kullanılamıyordu

Soru "bu zaten çalışıyor mu?" idi. Cevap ikisinin arasında:

| Ekran | Toplu yükleme | Sürükle-bırak | Sıralama | Toplu silme | Kapak işareti |
| --- | --- | --- | --- | --- | --- |
| Sihirbaz (**yeni** ilan) | ✓ | ✓ | ✓ | ✓ | ✓ |
| İlan düzenleme (**mevcut** ilan) | ✗ | ✗ | Payload satır sürükleme | ✗ | ✗ |

Mevcut ilanda fotoğraf eklemek **mümkündü**: Payload'ın dizi alanı
çalışıyor. Ama yol şuydu — *Satır ekle → çekmece aç → dosya seç → çekmece
kapat*. Yirmi fotoğraf için bu turun yirmi kez yürünmesi gerekiyordu;
çoklu dosya seçimi, sürükle-bırak ve toplu silme yoktu, "ilk fotoğraf
kapaktır" kuralı da ekranda hiç görünmüyordu.

Yani eksik olan şey bir özellik değil, **aynı işin iki ekranda iki farklı
zorlukta olması**.

### Yapılanlar

**1. Yükleyici sihirbazdan ÇIKARILDI** → `src/components/medya/GorselYukleyici.tsx`

PR #108'de yazılan toplu yükleme `PortfoySihirbazi.tsx` içinde yerel bir
fonksiyondu (`GorselAdimi`). Çıkarıldı; stili de taşındı
(`gorselYukleyici.css`, 132 satır `sihirbaz.css`'ten düştü). Sınıflar
`sihirbaz-*` → `gorsel-*`: bileşen artık sihirbaza ait değil.

⚠️ **İkinci bir yükleme yolu YAZILMADI.** Sunucu eylemi de taşındı
(`lib/sihirbaz/gorselEylemleri.ts` → `lib/medya/eylemler.ts`). Tür
süzgeci, 20 MB sınırı, alt metin politikası ve bütçe uyarısı tek yerde;
bir düzeltme iki ekrana birden iniyor.

**2. Payload'ın dizi arayüzü DEĞİŞTİ, veri modeli DEĞİŞMEDİ**

`Ilanlar.gorseller` alanına `admin.components.Field` verildi. Köprü
(`GorselAlani` + `GorselAlaniIstemci`) yükleyiciyi Payload'ın form
durumuna bağlıyor.

⚠️ **Göç gerekmedi.** Satırlar hâlâ `{ gorsel: medya }` taşıyor; site
tarafındaki okuma yollarının hiçbiri değişmedi. `upload hasMany`'ye
geçmek daha temiz bir model verirdi ama mevcut kayıtların göçü ve her
okuma yolunun değişmesi karşılığında — kazanç arayüzdeyken.

⚠️ Form durumuna dokunma yolu **Payload'ın kendi arayüzü**:
`addFieldRow` / `moveFieldRow` / `removeFieldRow`. Diziyi silip baştan
kurmak satır kimliklerini her seferinde değiştirir ve değişen her satır
veritabanında silinip yeniden yazılır; onun yerine fark uygulanıyor
(çıkarılanlar sondan başa silinir, kalanlar taşınır, yeniler eklenir).

⚠️ Önizlemeler **sunucu kabuğunda** indiriliyor. Payload'ın form durumu
yalnızca kimliği taşıyor; dosya adı ve küçük resim adresi yok. İstemciden
`/api/medya?where[id][in]=…` çağırmak panele her ilan açılışında fazladan
bir tur ekleyecekti.

**3. Yan bulgu — yazılan alt metin HİÇBİR YERE GİTMİYORDU**

Sihirbazın görsel adımında her satırda bir alt metin kutusu vardı.
Kaydetme yolu ise yalnızca görsel kimliklerini gönderiyor
(`veriyeCevir.ts` → `gorseller: ids`); yazılan metin bileşenin yerel
durumunda kalıp **kayboluyordu**. Kullanıcı erişilebilirlik borcunu
kapattığını sanıyor, borç duruyordu.

Düzeltme: `gorselAltMetniniKaydet` eylemi, odak çıkışında `medya`
kaydına yazıyor. Alt metin ilana değil **medyaya** ait — aynı görsel iki
ilanda kullanılırsa metni de aynıdır.

⚠️ Otomatik üretilmiş metin kutuya **yazılmıyor** (`altOtomatik`
işaretliyse boş geliyor). Yazılsaydı insan eliyle yazılmış gibi görünür,
odak çıkışında aynen geri yazılır ve işaret sessizce kalkardı — borç
panelden kaybolurdu.

**4. Yan bulgu — `✕` font alt kümesinde YOKTU ve test bunu görmüyordu**

Silme düğmesindeki `✕` (U+2715) font alt kümesinde yok: tarayıcı sessizce
yedek fonta düşüyor. `alfabe.test.ts` tam bunu yakalamak için var ve
aylarca yeşil kaldı.

Sebep, testin kendi ölçüm aracı: yorum soyucusu `/* … */` arıyordu ve
**`accept="image/*"` dizesindeki `/*` onun için bir yorum açılışıydı**.
O dizeden sonraki ilk `*/` uzakta bir JSDoc bloğunun sonundaydı; arada
kalan onlarca satır sessizce tarama dışı kalıyordu. (`otomatikKayit.test.ts`
aynı tuzağı bir kez yaşamış ve ham kaynağa dönerek çözmüştü — kök sebep
duruyordu.)

İki düzeltme birden: karakter `×` (U+00D7, alt kümede var) oldu **ve**
soyucu artık yorum açılışının önündeki karaktere bakıyor — gerçek bir
yorum daima satır başı, boşluk ya da açılış karakterinden sonra gelir.

> Katı soyucuyla tüm depo yeniden tarandı: başka körlük çıkmadı.

**5. Duman testine panel turu eklendi** (3. adım)

Bağlantı bir **yapılandırma zinciri**: koleksiyonun `admin.components.Field`
değeri → Payload içe aktarma haritası → sunucu kabuğu → istemci köprüsü.
Halka koparsa birim testleri yeşil kalır (hepsi kaynağa bakıyor), Payload
alanı sessizce **boş** çizer. Yeni tur mevcut bir ilanı açıyor, Medya
sekmesine geçiyor ve bakıyor: sürükle-bırak alanı çizildi mi, dosya seçici
`multiple` taşıyor mu, **Payload'ın "Satır ekle" arayüzü yerini bıraktı mı**
(bırakmadıysa iki yükleme yolu bir arada duruyor), ipucu metni iki temada
AA geçiyor mu.

### ⚠️ Google Drive YAPILMADI — gerekçe koda yazıldı

Talimat gereği ve gerekçesiyle: Drive'ın bant genişliği kotası var ve
trafik artınca görseller düşer; `next/image` dış bağlantıyı
boyutlandıramaz, WebP/AVIF üretemez, tembel yükleyemez; görsel bütçesi
sistemi devre dışı kalır; doğrudan bağlantı biçimi belgelenmemiş. Disk
sıkışırsa çözüm S3 uyumlu bir depo (Cloudflare R2), Payload'ın kendi
depolama eklentisiyle — yükleme eylemi hiç değişmeden. Ayrı bir iş.

---

## B. Bot ve arama motoru istatistikleri

### ⚠️ Kontrol sonucu: EVET, mevcut sayılar bot trafiğini içeriyordu

Soru şartnamede bir uyarı olarak duruyordu ("şu anki sayılar bot trafiğini
içeriyorsa o da bir hata — kontrol et"). Cevap: içeriyordu, ve en kötü
biçimde — **görünmez olarak.**

`proxy.ts` her isteği `sayfaSay()` ile sayıyordu ve bot süzgeci yoktu.
Googlebot'un `User-Agent` dizesi şöyle:

```
Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X …) AppleWebKit/537.36
(KHTML, like Gecko) Chrome/125… Mobile Safari/537.36
(compatible; Googlebot/2.1; +http://www.google.com/bot.html)
```

Yani `tarayiciAilesi()` onu **chrome**, `cihazSinifi()` onu **mobil**
sayıyordu. Üç sonucu birden vardı:

1. "Sayfa görüntüleme" sayacı tarama isteklerini de topluyordu;
2. **"Trafiğin ~%75'i mobil" varsayımını doğrulamak için bakılan grafik**,
   Googlebot'un mobil tarayıcısını ziyaretçi sanıyordu;
3. dönüşüm oranının **paydası** şişiyordu — talep sabit, görüntüleme fazla
   → oran olduğundan **küçük** görünüyordu.

`cihazSinifi()` değişmedi ve değişmemeli; onu "bot farkındası" yapmak iki
ayrı yerde iki ayrı bot listesi tutmak olurdu. Hatayı kapatan şey o
fonksiyona **hiç ulaşılmaması**: `proxy.ts` botu tanır tanımaz erken
dönüyor.

⚠️ **Geriye dönük düzeltme İMKÂNSIZ.** Ham `User-Agent` hiçbir yere
kaydedilmiyor (KVKK kararı, doğru karar) — dolayısıyla eski günlerin
sayılarını ayrıştırmanın bir yolu yok. Her gün satırı artık bir
`botAyrimi` bayrağı taşıyor; bayrağı olmayan günler panelde
**"bu pencerenin N gününde insan ve bot sayaçları ayrıştırılmamıştı"**
uyarısı olarak görünüyor. Gizlemek, haftalık karşılaştırmayı sessizce
yanlış yapmak olurdu.

### Sınıflandırma — `src/lib/olcum/bot.ts`

Dokuz sınıf: Googlebot · Bingbot · YandexBot · AhrefsBot · SemrushBot ·
GPTBot · ClaudeBot · PerplexityBot · diğer.

⚠️ **`diger` bir çöp kovası değil.** O sınıftaki her satır UA'dan
çıkarılmış bir **adla** saklanıyor (`applebot`, `oai-searchbot`,
`bytespider`…). Adsız bir "diğer" toplamı, yeni bir botun trafiğini fark
etmemizi engellerdi — tanınmayan arama motorunun alan adıyla kalması
kararının aynısı.

⚠️ **Her sınıfın ne işe yaradığı da yazılı.** "AhrefsBot 4.200 istek"
satırı tek başına karar aldırmıyor: biri arama sonucuna çıkmanın yolu
(Googlebot — çok gezmesi iyi haber), biri rakip analizi aracı (Ahrefs —
arama sonucuna katkısı yok, bant genişliği tüketir), biri yapay zekâ
eğitim toplayıcısı (GPTBot — engellenip engellenmemesi bir **içerik hakkı**
kararı, teknik değil). Üçüne aynı tepkiyi vermek yanlış olur.

⚠️ **`includes('bot')` YAZILMADI** ve bu bir hata düzeltmesi: **CUBOT bir
Android telefon markası** ve `User-Agent` dizesinde geçiyor
(`CUBOT_NOTE_20`). Düz bir alt dize araması o telefonun sahibini rapordan
düşürürdü. Desen kelime sınırına bakıyor.

⚠️ **Boş `User-Agent` insan sayılıyor.** Gizlilik eklentileri başlığı hiç
göndermiyor; onları bot kovasına atmak gerçek ziyaretçileri düşürürdü.
Hata yönü bilinçli: insan sayısını olduğundan **büyük** gösterir.

⚠️ **Headless Chrome bot sayılıyor.** Duman testi ve Lighthouse her PR'da
sitede dolaşıyor; insan kovasına girdiklerinde "bu hafta ne oldu?" kutusu
CI koşularını trafik sanıyordu.

⚠️ **Ham `User-Agent` yine hiçbir yere kaydedilmiyor.** Bu dosya ham
dizeyi bir kovaya çevirip **atıyor**; `diger` sınıfındaki ad
harf/rakam/tire ile sınırlı ve 32 karaktere kırpılı — bir insan tarayıcısı
yanlışlıkla bot sayılsa bile sürüm + işletim sistemi dizesi veritabanına
girmiyor.

### Raporlananlar

| Soru | Nerede |
| --- | --- |
| Bot türüne göre istek sayısı | `botIstekleri` → panel tablosu |
| Hangi sayfalar, hangi sıklıkta | `botSayfalari` → en çok taranan 25 |
| İlk ve son tarama zamanı, sayfa bazında | `botSayfalari.ilkMs` / `sonMs` |
| Yanıt kodu dağılımı | `botDurumlari` + türetilen 200 |
| ⭐ **Hiç taranmamış sayfalar** | Site haritası − taranan rotalar |
| robots.txt engelli yollar, sitemap sayfa sayısı ve son değişiklik | `seo` bölümü |

### ⚠️ Yanıt kodunda dürüstlük sınırı

**Vekil katmanı yanıtı GÖRMÜYOR.** `NextResponse.next()` isteği aşağıya
geçiriyor, durum kodu orada üretiliyor; Next'in ara katmanı yanıtın
durumunu okuyamaz. Dolayısıyla:

- **404** → `(site)/not-found.tsx` içinde sayılıyor (o sayfa çiziliyorsa
  durum 404'tür). `headers()` o sayfayı dinamik yapıyor; kabul edilen
  maliyet — 404 seyrek isteniyor ve veri çekmiyor.
- **5xx** → `instrumentation.onRequestError` (bot dalı `hataSay`'a
  DÜŞMÜYOR: "hata oranı %4" cümlesinin paydası ziyaretçi olmalı).
- **200** → **sayaç değil, türetme** (toplam − 404 − 5xx). 301 ve 304 bu
  türetmede 200 tarafında kalıyor. Yaklaşıklık panelde yazılı.

### ⚠️ Performans: ayrı DB yazması YOK

Şartnamenin sert kuralı korundu. Bot istekleri **aynı tamponda, aynı gün
satırına, aynı boşaltmada** yazılıyor; eklenen şey yeni bir yazma yolu
değil yeni bir **boyut** (3 dizi + 3 sütun).

İki küçük mekanizma gerekti:

- `bosalt()` koşuluna `botToplam` eklendi. Girmeseydi yalnızca bot gelen
  bir günde (yeni site, gece saatleri) tampon hiç boşalmaz, tarama verisi
  bellekte birikip yeniden başlatmada giderdi — **hem de hatasız
  görünerek.**
- `birlestir()` artık birleştirme **kipi** alıyor (`topla` / `enBuyuk` /
  `enKucuk`). Eskiden kural tek satırdı: `ad === 'enYavasMs' ? max : topla`.
  `ilkMs` toplanırsa ilk tarama zamanı 1970'in katlarına çıkardı.
  ⚠️ `enKucuk` kipinde **sıfır "yok" demek**: düz bir `Math.min` panelde
  1 Ocak 1970 yazdırırdı.

### ⚠️ `robots.txt` ve `sitemap.xml` bot sayacına GİRİYOR, insan sayacına girmiyor

`sayilirMi()` o iki yolu insan ziyareti saymıyor ve doğru yapıyor ("en çok
görüntülenen sayfa" listesinde durmaları anlamsız). Bot için tam tersi:
**"Googlebot site haritasını en son ne zaman çekti"** SEO'nun en doğrudan
sorusu ve cevabı yalnızca o iki istekte var. Bot süzgeci bu yüzden
insanınkinden geniş (`BOT_EK_YOLLARI`).

### ⭐ Hiç taranmamış sayfalar

Taranmayan sayfa arama sonucunda **yoktur**. Liste site haritasının **kendi
üreticisinden** okunuyor (`app/sitemap.ts`), elle listelenmiyor — ikinci
bir liste, haritaya yeni sayfa eklendiğinde panelin onu görmemesi demekti.

⚠️ **robots.txt'te engelli yollar listeden düşüyor.** Taramaya kapattığımız
bir adresi "taranmamış" diye raporlamak, kendi kararımızı arıza olarak
göstermek olurdu — ve her bakışta göz ardı edilen bir uyarı, uyarı olmaktan
çıkar.

⚠️ **Ters yön de raporlanıyor**: taranan ama haritada olmayan rota. Ya eski
bir adres (yönlendirme gerekir) ya da bir yere koyduğumuz kırık bağlantı.

⚠️ **Pencere 180 gün, 7 değil.** Bu ölçekte arama motoru her sayfayı
haftada bir gezmiyor; yedi günlük bir pencerede sağlıklı sayfaların yarısı
"taranmamış" görünür ve liste işe yaramaz hâle gelirdi.

### Saklama: 180 gün — ve neden 90 değil

⚠️ **Bot verisi kişisel veri değil**; botlar kişi değil, çerez yazılmıyor,
IP okunmuyor, ham UA kaydedilmiyor. 90 gün kuralı bir **KVKK taahhüdüdür**
ve bu sütunları kapsamıyor.

⚠️ **O hâlde neden bir sınır var: DİSK.** Tarama verisi rota başına satır
üretiyor; ilan ve mahalle sayfaları arttıkça gün satırı büyüyor. Sınırsız
bırakmak, hiç kimsenin bakmadığı bir tabloyu yıllarca büyütmek olurdu.

⚠️ **Neden tam olarak 180:** "hiç taranmamış sayfa" sorusunun cevap
penceresi. Altı ay, "bu sayfa gerçekten hiç taranmadı" diyebilmek için
gereken en kısa süre; daha kısası yanlış alarm üretir, daha uzunu disk için
gerekmeyen maliyet.

⚠️ **İki eşik aynı sayıya çekilmemeli**: 90 bir taahhüt, 180 bir disk
kararı. Birleştirmek ya taahhüdü gevşetmek ya diski gereksiz yere
daraltmaktır. Gerekçe `BOT_SAKLAMA_GUN` üzerinde ve
`docs/KVKK-ANALITIK.md` §4b'de yazılı.

⚠️ Satır **silinmiyor**, ayrıntı boşaltılıyor: `botToplamIstek` kalıyor.
"Geçen yıl bu ay ne kadar tarandık" bir SEO sorusudur ve tek sayıyla
cevaplanıyor.

Görev ayrı değil: `olcum-ayrinti-sil` içinde, iki eşikle. Ayrı bir görev
ayrı bir cron satırı, ayrı bir künye ve ayrı bir "çalışmadı" arıza yüzeyi
demekti.

### Neden `rapor.ts` içinde değil

Şartnamenin açık şartı "insan trafiğinden ayrı tutulsun". Bot sayılarını
`Rapor` nesnesinin içine koymak, iki paydanın aynı yapıda yan yana durması
demekti — ve bir gün biri "toplamı" alırken ikisini topluyordu. Ayrı modül,
ayrı nesne, ayrı ekran bölümü: **karışma kod seviyesinde zorlaşıyor.**

Aritmetik ayrıca saf bir dosyada (`botToplama.ts`): `botRaporu.ts`
`@payload-config` ve `app/sitemap` içe aktarıyor, birim testinden
çağrıldığında Payload yapılandırmasının tamamı yüklenirdi. Test edilmesi
gereken şey ise aritmetik — `tipler.ts` / `rapor.ts` ayrımının aynısı.

---

## Dosya özeti

**A — fotoğraf**

| Dosya | Ne |
| --- | --- |
| `components/medya/GorselYukleyici.tsx` + `.css` | **yeni** — paylaşılan yükleyici (sihirbazdan çıkarıldı) |
| `components/medya/GorselAlani.tsx` | **yeni** — Payload alanının sunucu kabuğu (önizleme indirir) |
| `components/medya/GorselAlaniIstemci.tsx` | **yeni** — form durumu köprüsü |
| `lib/medya/eylemler.ts` | **yeni** (taşındı) — yükleme + alt metin kaydı |
| `lib/sihirbaz/gorselEylemleri.ts` | **silindi** |
| `collections/Ilanlar.ts` | `gorseller` alanına özel `Field` |
| `components/sihirbaz/PortfoySihirbazi.tsx` | `GorselAdimi` çıktı (−270 satır) |
| `components/sihirbaz/sihirbaz.css` | −132 satır (taşındı) |
| `lib/tipografi/alfabe.test.ts` | yorum soyucusu körlüğü düzeltildi |
| `scripts/gezinme-dumani.mjs` | 3. adım: fotoğraf yükleyici turu |

**B — bot**

| Dosya | Ne |
| --- | --- |
| `lib/olcum/bot.ts` | **yeni** — sınıflandırma (ham UA kaydedilmiyor) |
| `lib/olcum/botToplama.ts` | **yeni** — saf aritmetik, kapsam hesabı |
| `lib/olcum/botRaporu.ts` | **yeni** — DB + sitemap/robots okuması |
| `lib/olcum/tampon.ts` | bot sayaçları, `bosalt()` koşulu |
| `lib/olcum/yazici.ts` | bot sütunları, birleştirme kipleri |
| `collections/GozlemGunluk.ts` | 3 dizi + 3 sütun |
| `proxy.ts` | bot/insan ayrımı, erken dönüş |
| `instrumentation.ts` | bot 5xx ayrı kovada |
| `components/olcum/BotDurumu.tsx` | **yeni** — 404 sayacı |
| `app/(site)/not-found.tsx` | sayaç bağlandı |
| `components/olcum/OlcumGorunumu.tsx` | üç yeni kutu |
| `lib/bakim/gorevler.ts` + `kunye.ts` | 180 gün bot temizliği |
| `docs/KVKK-ANALITIK.md` | §4b bot ölçümü |
| `migrations/20261011_214235_bot_istatistikleri.ts` | **yeni** |

## Testler

`src/lib/olcum/bot.test.ts` — 46 iddia: gerçek `User-Agent` dizeleriyle
sınıflandırma (CUBOT telefonu dâhil), proxy ayrımının kaynak seviyesinde
denetimi, tampon sayaçları, birleştirme kipleri, kapsam hesabı,
robots.txt durumu, saklama eşikleri, panel bölümü.

`src/lib/medya/altMetni.test.ts` — iddialar yükleyiciye taşındı, dört yeni
iddia eklendi (alt metin kaydı, sihirbazın kopya taşımadığı, düzenleme
ekranının aynı bileşeni çizdiği, Drive yolunun olmadığı).

⚠️ Tarayıcı doğrulaması CI'da: `scripts/gezinme-dumani.mjs` 3. adım.
