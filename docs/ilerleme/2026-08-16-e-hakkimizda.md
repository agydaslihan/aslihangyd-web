# E paketi — /hakkimizda CMS'ten yönetiliyor

**16 Ağustos 2026** · içerik · sınırlı editör, portre

Yeni global: **Hakkımızda Sayfası**. Giriş cümlesi, zengin metin, portre ve
ek görseller panelden yönetiliyor.

### ⚠️ Editör SINIRLI ve bu bilinçli

Açık: başlık (h2/h3), kalın, italik, madde/numaralı liste, bağlantı.
Kapalı: renk, punto, hizalama, tablo, gömülü HTML, alıntı.

Serbest bir editör tasarımı iki haftada bozar — marka panelinde yuva
sayısını on ile sınırlamanın gerekçesinin aynısı. Ayrıca **punto ve renk
açılırsa kontrast kapısının dışında bir metin katmanı doğar**: panelde
ölçülmeyen, sitede okunmayan.

⚠️ `h1` editörde YOK. Sayfanın `h1`i başlıkta ve tek olmalı; ikinci bir
`h1` ekran okuyucu gezinmesini ve SEO'yu bozar.

### ⚠️ Yasal bilgiler buraya taşınmadı

Yetki belgesi, MERSİS ve vergi bilgileri `KurumsalBilgiler`den otomatik
gelmeye devam ediyor. İki yerde tutulsaydı biri güncellenip diğeri
unutulur ve sayfa kendi kendisiyle çelişirdi.

### ⚠️ Eski içerik orphan bırakılmadı

Sayfa daha önce `Sayfalar` koleksiyonundaki `hakkimizda` kaydından
besleniyordu. Global boşsa o kayda düşülüyor — oraya metin girilmişse
geçişte sessizce kaybolmasın diye. Yedek, taşınma tamamlanınca
kaldırılabilir.

⚠️ Boş bir zengin metin alanı "dolu" görünebiliyor: lexical hiç yazı
yazılmasa da tek boş paragraflı bir kök döndürüyor. Öyle bir değeri içerik
saymak boş durumun hiç görünmemesine yol açardı — `doluIcerik` bunu
süzüyor.

### Yerleşim

Portre metnin YANINDA, üstünde değil: metnin ilk satırı sayfanın en çok
okunan yeri ve bir fotoğraf onu aşağı iterdi. Mobilde alt alta düşüyor.
Ek görseller sayfanın altında, `loading="lazy"`.

### ⚠️⚠️ Göç tuzağına İKİNCİ kez düşüldü — artık test var

E paketinin göçü de `mahalle_yaklasik` sütununu yeniden eklemeye çalıştı.
Sebep aynı: main'deki son şema fotoğrafı (`hero_slider`) #58 birleşmeden
önce alınmış ve o sütunu bilmiyor. D paketindeki düzeltme henüz main'de
olmadığı için tuzak tekrarlandı.

Elle budandı — ve bu sefer **statik bir test yazıldı**
(`src/lib/gocler.test.ts`):

- aynı sütun iki göçte eklenmiyor
- aynı tablo iki göçte oluşturulmuyor
- `index.ts` sırası dosya adı sırasıyla aynı

⚠️ Testin yakaladığı doğrulandı: hata geri konup koşturuldu, iki göçü de
adıyla gösterip kırmızı verdi.

⚠️ Bu test SQL ayrıştırmıyor, DESEN arıyor. Amaç eksiksiz doğrulama değil;
tam olarak yaşanan arızayı bir daha yaşamamak. İki kez düşülen bir tuzak,
üçüncüsünü hak etmiyor.

### ⚠️ Göç testi `src/migrations/` içinde DURAMAZ

İlk hâli oradaydı ve **`pnpm payload migrate` komutunu tümden kırdı**:

```
TypeError: Cannot read properties of undefined (reading 'config')
    at src/migrations/migrations.test.ts:61
```

Payload göç dizinindeki **her** dosyayı içe aktarıyor; `.test.ts` ayrımı
yapmıyor. Test yüklenince vitest koşum bağlamı dışında `describe()`
çağrılıyor ve komut ölüyor.

Yani göçleri koruyacak test, göç adımının kendisini imkânsız hâle
getiriyordu — CLAUDE.md §5.3'ün koşulsuz zorunlu adımını. Dosya
`src/lib/gocler.test.ts` altına taşındı; göç dizinine yalnızca **okumak**
için bakıyor.

⚠️ Bu, testin kendisinin bir üretim arızası ürettiği ikinci durum. Ders
aynı: bir dizinin sahibi bir çerçeveyse (Payload burada), o dizine
çerçevenin beklemediği dosya konmaz.

## ⚠️ Sıra denetimi `index.ts`ten dosya adına taşındı

Göç indeksi depodan çıktı (bkz. `2026-08-17-ilerleme-kaydi-bolundu.md`):
Payload ona ihtiyaç duymuyor ve her göçte sonuna satır eklendiği için göç
içeren her ikinci PR'da çakışıyordu.

Bunun bedeli, sıralamanın **tamamen dosya adına** bağlanması. Damgası bozuk
ya da tekrar eden bir dosya göçleri sessizce yanlış sırada çalıştırır —
şemayı hiç geçmediği bir durumdan geçirir. Denetim o yüzden buraya taşındı:
her göç dosyasının damgası kalıba uygun, benzersiz ve alfabetik sırası
kronolojik olmak zorunda.
