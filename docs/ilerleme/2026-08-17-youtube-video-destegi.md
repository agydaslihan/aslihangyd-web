# YouTube video desteği ve video hatalarının doğru yere taşınması

**17 Ağustos 2026** · medya · YouTube, Bunny, hata mesajları

Drone videoları hazır, Bunny Stream hesabı değil. Google Drive linki verildi
ve sayfa "Video oynatıcı henüz yapılandırılmadı" dedi.

## ⚠️ Mesaj yalnızca genel değil YANLIŞTI

Yapılandırma sorunlu değildi, **kaynak** sorunluydu. Bu ayrım önemli çünkü
mesajı iyileştirmek yetmezdi: doğru mesajın da yeri yanlıştı.

**Ziyaretçi Bunny'yi yapılandıramaz, YouTube linki de veremez.** Ona
"yapılandırılmamış" demek hem iç jargon sızdırmak hem mesajı yanlış kişiye
vermek. Sitede artık çözülemeyen videoda **hiçbir şey çizilmiyor**; teşhis,
hatayı yapan ve düzeltebilecek kişinin çalıştığı yerde:

1. **Kaydetme doğrulaması** — desteklenmeyen link kaydedilemiyor, sebebi o
   anda okunuyor. Asıl kapı bu.
2. **"Video durumu" göstergesi** — kayıt ekranında yeşil/sarı/kırmızı, ne
   yapılacağını yazıyor.
3. **Alan yardım metni** — desteklenen ve desteklenmeyen servisleri sayıyor.

## Google Drive neden desteklenmiyor

Talep edildiği gibi desteklenmiyor ve **sebebi söyleniyor**: paylaşım adresi
video dosyası değil HTML sayfası döndürüyor, ayrıca bant genişliği kotası
var. Aynı gerekçelerle Dropbox, WeTransfer, OneDrive, iCloud da reddediliyor;
Vimeo gerçek bir video servisi ama bu sitede desteklenmiyor.

Her sağlayıcı **adıyla** ve bir `neden` cümlesiyle reddediliyor — "çalışmaz"
demek kullanıcıyı aynı hatayı tekrar yapmaya bırakır.

## ⚠️ Alan adı eşleşmesi — ilk hâli sessizce çalışmıyordu

Desenler `(^|\.)drive\.google\.com` biçimindeydi ve **tam adrese**
uygulanıyordu. `https://drive.google.com/...` dizgesinde `drive`ın solunda ne
dizge başı ne nokta var — eğik çizgi var. Sonuç: **Google Drive linki
destekleniyor gibi geçiyordu.** Test yakaladı.

Artık alan adı çıkarılıp onun üzerinde eşleşiliyor. Yan kazanç: yanlış pozitif
de kapandı — `youtube.com/watch?v=drive.google.com` artık Drive sayılmıyor.

## YouTube tarafı

- Beş biçim de kabul ediliyor: `watch?v=`, `youtu.be/`, `/embed/`,
  `/shorts/`, `/live/` ve çıplak kimlik. Beşi de aynı videoyu gösteriyor;
  birini kabul edip diğerini reddetmek hatayı kullanıcıya yıkmak olurdu.
- **Liste dışı (unlisted) videolar çalışıyor** — kimlik biçimi aynı, ek iş
  yok. Yazılı olması bilinçli: ileride sorulduğunda cevabı kodda.
- ⚠️ `youtube-nocookie.com` kullanılıyor — KVKK kararı (CLAUDE.md kural 8).
  Normal alan adı çerçeve yüklenirken çerez atıyor.
- `rel=0`: video sonunda rakip ilan önerilmesin. `hl=tr`: oynatıcı düğmeleri
  de kullanıcıya görünen metin.

## ⚠️ Kapak görseli kendi sunucumuzdan geçiyor

Kapağı doğrudan `i.ytimg.com`'dan çekmek, **sayfa açılır açılmaz** Google'a
istek atmak demek: ziyaretçinin IP'si ve `Referer` başlığı oraya ulaşır, hem
de hiçbir onay alınmadan. Bu, tıkla-oynat cephesinin bütün amacını boşa
çıkarırdı.

Araya vekil kondu (`/api/video-kapak/youtube/[kimlik]`): tarayıcı yalnızca
bizim alan adımıza istek atıyor, YouTube'a giden çağrıyı sunucu yapıyor ve bir
gün önbellekliyor.

⚠️ Kimlik doğrudan dış adrese girdiği için desenle süzülüyor — süzülmese bu
uç, isteyen herkesin istediği adrese istek attığı bir vekile (SSRF) dönüşürdü.
Gerçek sunucuya karşı ölçüldü:

```
geçerli kimlik        → 200  image/jpeg  65.324 bayt
../etc denemesi       → 404
kısa kimlik           → 404
olmayan video         → 404
```

⚠️ `maxresdefault` her videoda yok (yalnızca yüksek çözünürlüklü yüklemelerde
üretiliyor); üç aday sırayla deneniyor ve gelen şeyin gerçekten görsel olduğu
`content-type` ile doğrulanıyor — YouTube bulunmayan kapak için bazen 200 ile
yer tutucu döndürüyor.

## ⚠️ Iframe deseni aynen korundu

Şartnamenin şartı: iframe asla otomatik yüklenmesin (700 kB+, LCP'yi öldürür).
Mevcut Bunny cephesi aynen kullanılıyor; oynatıcı yalnızca dokunulunca DOM'a
giriyor. Denetim testle kilitli: kapak düğmesi bölümünde `<iframe>` olamaz.

## ⚠️ Göç veri kaybı üretecekti — yakalandı

`video_kaynagi` sütunu `DEFAULT 'yok'` ile eklendiği için **mevcut satırların
hepsi "video yok"** oluyordu: Bunny kimliği girilmiş bir kaydın videosu şema
göçünden hemen sonra sessizce görünmez hâle gelirdi — hata da vermeden, çünkü
teknik olarak her şey doğru. Göçe veri güncellemesi eklendi (kimliği dolu
kayıtlar `'bunny'` işaretleniyor) ve çözücüye ayrıca tolerans konuldu.

⚠️ Göç dosyası bir kez derlenemedi: SQL yorumuna yazdığım **ters tik**,
şablon dizgesini sonlandırıyordu.

## Bunny'ye geçiş yolu açık

Kaynak seçimi **kayıt başına**: bir mahalle Bunny'ye geçerken diğeri
YouTube'da kalabiliyor. Toplu geçiş beklemek, ilk videonun yayınlanmasını
Bunny hesabına bağlamak olurdu.

## Küçük ama önemli iki düzeltme

**Ortam okuması istemciye sızacaktı.** `video.ts` panel bileşeninde de
kullanılıyor ve `bunny.ts`'i içe aktarıyordu — o da `ayar()` üzerinden sunucu
yapılandırma adlarını istemci paketine taşırdı. Biçim denetimi `video.ts`'e
taşındı, `bunny.ts` onu yeniden dışa aktarıyor. İki kopya düzenli ifade
tutmak ilk değişiklikte ayrışırdı.

**Mesajlar iki yerde yazılıydı.** Panel göstergesi kendi cümlelerini
kuruyordu; artık `videoDurumMesaji()` tek kaynak ve test bunu kilitliyor —
yoksa panel ile kaydetme doğrulaması farklı şey söyleyebilirdi.

⚠️ Ve yine: "eski hata metni kalmadı" denetimi ilk koşumda kırmızı verdi,
çünkü `DroneVideo.tsx` açıklaması o metni **tarihçe olarak** alıntılıyor.
Ölçüm testlerindeki tuzağın aynısı; denetim yorumsuz koda bakacak hâle
getirildi.
