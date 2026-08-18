# Sayfa içerikleri, danışman-ol görselleri, altbilgi ve opsiyonel slider metni

**18 Ağustos 2026** · içerik · CMS, erişilebilirlik

Dört paket: sayfa metinleri düzenlenebilir (C), danışman-ol görselleri (D),
altbilgi (E), slider başlığı opsiyonel (F).

## C · Sayfa içerikleri

Yeni global **Sayfa İçerikleri**: iletişim, değerleme, araçlar, portföy,
mahalleler. Her sayfa için başlık, açıklama; uygun olanlarda serbest metin
ve görsel.

⚠️ **Altı ayrı global değil, tek global + sekmeler.** Her sayfaya ayrı
global açmak yan menüye satırlar eklerdi ve o menü zaten uzun. "Sayfa
metinlerini nereden değiştiriyordum?" sorusunun tek cevabı olsun.

⚠️ **`Danışman Ol` ve `Hakkımızda` bilinçli olarak dışarıda.** İkisinin de
kendi globali var ve yayında. Buraya ikinci bir kopya açmak aynı sayfanın
metnini iki yerde tutmak olurdu: biri güncellenir, diğeri unutulur ve
hangisinin kazandığı ancak sayfaya bakılınca anlaşılır. Bu paketin görsel ve
metin alanları o globallerin **içine** eklendi.

⚠️ **Hiçbir alan zorunlu değil ve tasarımın özü bu.** Boş bırakılan alanda
koddaki mevcut metin görünmeye devam ediyor. Zorunlu yapılsaydı içerik
yazılana kadar kayıt kaydedilemez, sayfalar boşalırdı. Yedek metin de
bileşende değil **çağıran sayfada** duruyor: varsayılanları tek dosyada
toplamak, o dosyayı hiçbir sayfaya ait olmayan bir metin deposuna çevirirdi.

⚠️ Editör `Hakkimizda`dakiyle aynı ve **tek yerde tanımlı**. İki yerde ayrı
kurulsaydı biri gevşetildiğinde diğeri fark edilmeden sıkı kalırdı.

## D · Danışman-ol görselleri

Üst bant görseli, madde başına küçük görsel, sayfa içi serbest görseller ve
form üstü zengin metin — hepsi mevcut `DanismanOl` globaline eklendi.

⚠️ **Görsel yoksa mevcut düz tasarım aynen kalıyor.** Hero görseli arka
planda duruyor ve yoksa hiçbir şey değişmiyor. Görsel varken karartma
katmanı ekleniyor: metin beyaz ve açık renkli bir fotoğrafta okunmaz hâle
gelirdi (WCAG 1.4.3).

⚠️ Madde listesi ya tamamen panelden ya tamamen koddan. Yarısı panelden
yarısı koddan gelen bir liste tutarsız görünür ve "neden bu maddeyi
silemiyorum" sorusunu doğururdu.

## E · Altbilgi

Tanıtım metni ve beş sütun başlığı düzenlenebilir. Sosyal medya hesapları
artık **çiziliyor** — alanlar `KurumsalBilgiler`de zaten vardı ama altbilgide
hiç gösterilmiyordu.

⚠️ **Burada olmayan üç şey ve sebepleri:**

1. **Logo** — `MarkaGorunum`dan geliyor. İkinci bir yükleme alanı, iki logo
   arasında hangisinin kazandığını belirsizleştirirdi.
2. **Sosyal hesaplar** — `KurumsalBilgiler`de ve orada sıralanabiliyor. Aynı
   gerekçe: tek kaynak.
3. **Yetki belgesi numarası ve feragat metni** — ⚠️ düzenlenebilir DEĞİL ve
   olmamalı. İkisi de yasal zorunluluk (kural 1 ve 5). Panelde bir metin
   kutusuna konsaydı yanlışlıkla silinebilirdi ve bunun farkına ancak
   denetimde varılırdı.

⚠️ Her başlığın bir varsayılanı var: altbilgi sitenin her sayfasında, içerik
girilmedi diye başlıksız sütun göstermek düzenlenebilirliğin bedeli olamaz.

## F · Slider başlığı opsiyonel

Başlık, alt başlık ve buton artık isteğe bağlı. Üçü de boşsa slayt yalnızca
fotoğraf: **karartma da çizilmiyor** — karartma metnin okunabilmesi için
var, okunacak metin olmayan slaytta yalnızca fotoğrafı bozar.

⚠️ **Erişilebilirlik kapısı: metinsiz slaytta görselin alt metni ZORUNLU.**
Başlık varsa ekran okuyucu en azından o cümleyi okuyor. Başlık yoksa
slaytta okunacak hiçbir şey kalmıyor ve ekran okuyucu kullanan ziyaretçi boş
bir slayt görür.

⚠️ **İki kapı birden:** panelde kaydetme doğrulaması ve sunucuda çözümleme.
Panel kapısı tek başına yetmez — eski kayıtlar ve elle düzenlenen veri
oradan geçmiyor.

⚠️ Boş bir `<h1>` de basılmıyor: ekran okuyucuda "başlık, boş" diye okunur
ve başlık hiyerarşisine boş bir düğüm ekler.

## Doğrulama

Derleme geçtikten sonra **çalışan sunucuda** her sayfa denendi — derlemenin
geçmesi sayfanın açıldığı anlamına gelmiyor:

```
/            200      /araclar       200
/portfoy     200      /degerleme     200
/iletisim    200      /danisman-ol   200 (bölüm açıkken)
/mahalleler  200
```

⚠️ `/danisman-ol` kapalıyken 404 — beklenen davranış (bölüm varsayılan
kapalı). Sayfa çok değiştiği için bölüm geçici olarak açılıp içeriğin
gerçekten basıldığı doğrulandı, sonra geri kapatıldı.

İstemci JS: `/` 205,4 kB gzip (eşik 220), `/danisman-ol` 204,3 kB.
