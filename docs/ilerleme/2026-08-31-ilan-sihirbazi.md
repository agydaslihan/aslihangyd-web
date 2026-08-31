# 31 Ağustos 2026 — İlan giriş sihirbazı: sekiz adım, saha kullanımı

Mevcut portföy sihirbazı beş adımdı ve masaüstünde, veriler elde hazırken
doldurulmak üzere tasarlanmıştı. Şartname sahayı istiyor: Aslıhan daireyi
gezerken, telefondan, elinde tapu fotokopisiyle.

⚠️ **Mevcut sihirbaz genişletildi, yenisi yazılmadı.** Şema, sunucu eylemi,
EİDS motoru ve gösterge hesabı aynı yerde kaldı; adımlar, otomatik
kaydetme ve medya üstüne bindi.

## Sekiz adım

| # | Adım | İçerik |
| --- | --- | --- |
| 1 | Temel | İşlem türü, kategori, mahalle, başlık |
| 2 | Tapu ve EİDS | Ada, parsel, taşınmaz no, yetki tarihleri, GPS |
| 3 | Nitelikler | m², oda, banyo, kat, yaş, ısınma, cephe, donanım |
| 4 | Fiyat | Satış/kira, para birimi, aidat, pazarlık payı |
| 5 | Görseller | Yükleme, sıralama, kapak |
| 6 | Açıklama | Kısa özet, ilan metni, şablon önerisi |
| 7 | Video ve tur | YouTube/Bunny, 360° tur adresi |
| 8 | Yayın | Kontrol listesi ve görünürlük |

⚠️ **Tapu ve EİDS aynı adımda**, çünkü ikisi de aynı belgeden okunuyor:
ada, parsel ve taşınmaz numarası tapuda yan yana duruyor ve yetkilendirme
de o taşınmaza veriliyor. Ayırmak, aynı kâğıdı iki kez çıkarmak olurdu.

## "Tüm alanlar opsiyonel" — bir istisnayla

Talimat "EİDS hariç tüm alanlar opsiyonel" diyordu. Uyguladım; **başlık
dahil**. Ama bir alan gerçekten zorunlu kaldı ve sebebi bizim tercihimiz
değil:

⚠️ **Mahalle zorunlu.** `Ilanlar.mahalle` koleksiyonda `required` ve
varsayılanı yok; mahalle yatırım skorunu, haritayı, eşleştirmeyi ve
karşılaştırmayı besliyor. Mahallesiz bir kayıt bu sistemlerin hiçbirine
giremez. Ekranda bu açıkça yazıyor: "Kaydı açmak için önce mahalle seçin.
Diğer alanların hepsini sonra doldurabilirsiniz."

Başlık boş bırakılırsa eylem tarihli bir taslak adı üretiyor
("Taslak — 31 Ağustos 2026 14:05") — uydurma değil, açıkça geçici bir ad.

`tip` ve `kategori` gönderilmezse koleksiyonun **kendi varsayılanları**
(`satilik` / `konut`) yazılıyor. Sihirbaz aynı değerleri ekranda seçili
gösteriyor, yani kullanıcı ne kaydedileceğini görüyor. İkisinin aynı
kaldığı test ile koleksiyon kaynağına karşı denetleniyor.

## Otomatik kaydetme — ve açtığı risk

30 saniyede bir ve adım geçişlerinde kaydediyor. Bu, eylemin imzasını
değiştirmeyi gerektirdi: eski hâl yalnızca `create` yapıyordu ve her
otomatik kayıt yeni bir taslak açardı — yarım saatlik bir giriş otuz kopya
taşınmaz üretirdi. Artık ilk çağrı kaydı açıyor, sonrakiler güncelliyor.

⚠️ **Bu, yeni bir saldırı yüzeyi açtı ve kapatıldı.** İlan kimliği artık
istemcide tutuluyor; istemcide tutulan her kimlik değiştirilebilir bir
kimliktir. Yayındaki bir ilanın kimliği gönderilseydi otomatik kaydetme
onu sessizce ezerdi: fiyat, açıklama, fotoğraflar.

Kayıt her güncellemede **önce okunuyor** ve `durum` `taslak` değilse işlem
reddediliyor. Okuma da `overrideAccess: false` ile, yani başkasının kaydı
okunamıyor.

## Yayın adımı: kapı değil, ayna

⚠️ Sihirbazdan yayına **alınmıyor**. Kayıt daima taslak; `durum` alanı
şemada yok ve eşleme onu sabit yazıyor. Son adımdaki kontrol listesi
`eidsDegerlendir` motorunu çağırıyor — kendi kuralını üretmiyor. İkinci bir
kapı, ikisinin ayrıştığı gün EİDS kuralını delerdi (CLAUDE.md kural 1).

Uçtan uca doğrulandı: sınama kaydı yayına alınmaya çalışıldı ve kanca
reddetti.

## Saha ayrıntıları

- **GPS.** Taşınmazın önünde duran biri için koordinatı elle girmek
  imkânsız. İki koordinat birden yazılıyor — tek koordinat haritada Gine
  Körfezi'ne düşer.
- **Fotoğraf.** `accept="image/*"` var, `capture` **yok**: `capture`
  yazmak galeriyi kapatıp yalnızca kamerayı açardı. Sahada çekilen kadar
  önceden çekilmiş fotoğraf da yükleniyor.
- **Kapak = sıranın başı.** Koleksiyon "ilk fotoğraf kapaktır" diyor. Ayrı
  bir kapak işareti, iki kaynağın çeliştiği bir gün üretirdi.
- **Sürükle-bırak tek yol değil.** Sürükleme klavyeyle kullanılamıyor;
  yukarı/aşağı düğmeleri aynı işi yapıyor ve dokunmatikte daha güvenilir.
  Dokunma hedefleri 44 px.
- **Alt metin.** `medya.alt` koleksiyonda `required`; erişilebilirlik
  sonradan eklenen bir şey değil. Sihirbaz bağlamdan taslak bir metin
  öneriyor, kullanıcı ekranda görüp düzeltiyor.
- **Çıkış uyarısı** yalnızca kaydedilmemiş değişiklik varken. Her
  ayrılışta soran bir uyarı refleksle kapatılır — ve gerçekten
  gerektiğinde de kapatılır.
- **Mobil.** Dar ekranda adım şeridi yatay kayıyor; alt alta dizilmeleri
  formu ekrandan taşırıyordu.

## Öneri, doldurma değil

Aynı mahalledeki benzer ilanlardan ısıtma, kullanım durumu ve tapu durumu
öneriliyor: "Aynı mahalledeki benzer ilanların 7/9 tanesinde doğalgaz
(kombi)." Alan kendiliğinden **dolmuyor**; tıklanınca doluyor.

⚠️ Sessizce dolan bir alan, kontrol edilmeden kaydedilen bir alandır. Bu
bir ilan sitesi; "asansör var" yazan ama asansörü olmayan bir ilan hukuki
risk. Fiyat, m² ve oda sayısı hiç önerilmiyor — bunlar taşınmazın kendi
olguları, komşu ilandan kopyalanacak şeyler değil (kural 2).

Öneri için en az üç benzer ilan gerekiyor; ikisine bakıp "genelde şudur"
demek veriden çok tahmin üretmek olurdu.

## Zengin metin: editör konmadı

Lexical'ın tamamını sahada telefondan kullanılacak bir ekrana indirmek
yüzlerce kB demekti; üstelik Payload admin'de zaten tam editör var.
Sihirbaz düz metin alıyor, boş satırla ayrılmış paragrafları Lexical
paragraflarına çeviriyor. Panelde açınca metin olduğu gibi duruyor ve
biçimlendirilebiliyor.

Şablonlar **iskelet veriyor, metin yazmıyor**: köşeli parantezler
doldurulmadıkça metin açıkça yarım görünüyor. İçine rakam ya da iddia
yazılmış bir şablon, kontrol edilmeden yayınlanan bir metin üretirdi.

## Bir kopya kaldırıldı

Entegrasyon testi eylemin yazma yolunu **kopyalıyordu** ve kendi yorumu
riski itiraf ediyordu: "ayrışırsa test yanlış şeyi doğrular hale gelir."
Kopyalamak zorundaydı, çünkü eşleme bir sunucu eylemi dosyasındaydı ve
oradan senkron fonksiyon dışa aktarılamıyor.

Eşleme `lib/sihirbaz/veriyeCevir.ts`e taşındı; artık eylem de test de aynı
kodu çağırıyor.

## Uçtan uca doğrulama

```
1) yalnızca mahalle → şema: true
   taslak açıldı: 8567 | durum: taslak | tip: satilik | kategori: konut
2) güncellendi | cephe: ['guney','bati'] | asansör: true
   konum: [27.81,41.15] | tur: https://kuula.co/share/abc
   kira çarpanı (kanca): 20.83 | brüt getiri: 4.8 | açıklama paragrafı: 2
3) yayın reddedildi ✓: EİDS koşulları sağlanmıyor
4) sınama kaydı silindi
```

## Ölçüm notu

İki tuzak kaydedilmeye değer:

1. **Sunucu eylemi dosyası sabit dışa aktaramıyor.** `ASGARI_BENZER`
   sabitini oraya koymak "modülün hiç dışa aktarımı yok" hatası ve 500
   üretti; hata mesajı sebebi göstermiyordu.
2. **Yorum soyucusu `accept="image/*"` ifadesinde kırıldı.** İçindeki
   `/*`, blok yorum başlangıcı sanılıp dosyanın yarısı yutuldu. O iddia
   ham kaynağa bakıyor.
