# Mobil menü açılmıyordu — bir CSS içeren blok kuralı

**18 Ağustos 2026** · arayüz · mobil gezinme, odak tuzağı

Hamburger düğmesine basılıyor, menü gelmiyordu. Mobil ziyaretçi sitede
hiçbir yere gidemiyordu ve CI yeşildi.

## Kök sebep — düğme de durum da doğruydu

Panel DOM'a giriyordu. Görünmeyişinin sebebi bir yerleşim kuralı:

- Panel `position: fixed`
- Header `backdrop-blur-md` taşıyor → `backdrop-filter` uyguluyor
- **`backdrop-filter` uygulayan öğe, `fixed` konumlu torunları için İÇEREN
  BLOK oluyor** — `filter` ve `transform` ile aynı davranış

Panel header'ın içinde çizildiği için `top-18 bottom-0` görüntü alanına
değil 72 piksellik header kutusuna göre çözülüyordu:

```
top: 72px  +  bottom: 0  +  içeren blok yüksekliği 72px  →  YÜKSEKLİK 0
```

Yani panel açılıyordu; yüksekliği sıfırdı.

Doğrulandı: derlenmiş CSS'te `.backdrop-blur-md` gerçekten `backdrop-filter`
üretiyor, `.h-18` ve `.top-18` ikisi de `calc(var(--spacing) * 18)`.

## ⚠️ F paketi bunu kırmadı — yapı en baştan böyleydi

İlk teşhis "F paketinde menü yapısı değişti, orada kırıldı" yönündeydi.
Kaynak geçmişi bunu desteklemiyor: `MobilMenu` başlığın içinde ve
`backdrop-blur-md` header'da, **Aşama 2'den (`8789e99`) beri** aynı
biçimde duruyor. F yalnızca menü öğelerini süzüyor; panelin konumuna
dokunmadı.

Anlaşılan mobil menü bugüne kadar hiç sınanmadı. Sebebi bulmadan
"son değişiklik kırdı" varsaymak, F'yi geri almaya ve hatanın yerinde
kalmasına götürürdü.

## Düzeltme

Panel `<header>`ın dışına, kardeş olarak taşındı.

⚠️ Header'dan bulanıklığı kaldırmak da çözerdi ama yanlış çözüm olurdu:
bulanıklık yapışkan başlığın okunurluğunu sağlıyor. Doğru olan, `fixed`
paneli o içeren bloğun dışına çıkarmak.

## Klavye ve odak — istendiği gibi kontrol edildi, eksikti

- **Odak tuzağı yoktu.** Panel görüntü alanını kaplıyor ve arka plan
  `overflow: hidden` ile kilitli; tuzak olmadan Tab, ziyaretçiyi
  GÖRÜNMEYEN bağlantılar arasında dolaştırıyordu. Klavye kullanıcısı için
  menü kapalıya eşdeğerdi.
- **Odak panele taşınmıyordu.** Açılışta ilk bağlantıya gidiyor,
  kapanışta açan düğmeye dönüyor.
- **Diyalog semantiği yoktu:** `role="dialog"`, `aria-modal`, `aria-label`
  eklendi.

⚠️ Ve tuzağı eklerken yeni bir sorun doğdu: başlıktaki kapatma düğmesi
panelin DIŞINDA kaldığı için Tab ile ulaşılamaz hâle geldi. Escape bir
çıkış yolu ama tek çıkış yolu olamaz — dokunmatik ekran okuyucu kullanan
biri Escape'e basamaz. Panelin içine kapatma düğmesi kondu.

## ⚠️ jsdom testi bu hatayı YAKALAYAMAZDI

"Düğmeye bas, panel DOM'da mı" diye soran bir etkileşim testi **yeşil
verirdi**: panel gerçekten DOM'daydı. jsdom yerleşim hesaplamıyor,
yüksekliğin sıfır olduğunu göremez.

Bu sınıf hatayı ancak gerçek bir tarayıcı ya da **kuralın kendisini**
denetleyen yapısal bir test yakalar. Test o yüzden "tıkla ve bak" değil
"kural bozulmuş mu" biçiminde:

> `fixed` bir örtü, `backdrop-filter`/`filter`/`transform` uygulayan bir
> atanın içinde duramaz.

⚠️ Yakaladığı doğrulandı: panel header'ın içine geri konup koşturuldu,
test sebebi cümleyle açıklayarak kırmızı verdi.

Ayrıca denetleniyor: düğme durumu çeviriyor mu, aria bağı doğru mu, sayfa
değişince kapanıyor mu, menü öğeleri ve mega alt öğeleri çiziliyor mu,
Escape çalışıyor mu, odak tuzağı iki yönde sarıyor mu, panelde kapatma
düğmesi var mı, gövde kaydırması kilitleniyor mu.
