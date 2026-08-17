# F paketi — Menü yönetimi

**16 Ağustos 2026** · gezinme · bölüm anahtarları, menü sırası

Danışman Ol ve Harita artık üst menüde ve ikisi de panelden açılıp
kapanabiliyor. Menü sırası da panelden ayarlanıyor.

### Üç ayrı karar, üç ayrı yer

| Soru | Nerede | Kim karar verir |
|---|---|---|
| Menüde ne var? | kod (`UST_MENU_YAPISI`) | uygulama |
| Hangisi görünür? | Ayarlar → Site Bölümleri | Aslıhan (yayın kararı) |
| Hangi sırada? | Ayarlar → Menü Düzeni | Aslıhan (editoryal tercih) |

⚠️ Serbest bir "menü yöneticisi" (ad ve adres elle yazılan) üçünü tek yerde
toplardı — ve ilk yanlış yazılan adreste menü sessizce 404'e bağlanırdı.

### ⚠️ Menü Düzeni ekranı SIRALAR, TANIMLAMAZ

Bu, ekranın bütün tasarımını belirleyen kural. Somut karşılıkları:

1. **Listede olmayan başlık kaybolmaz** — menünün sonuna iner. Koda yeni
   bir giriş eklendiğinde ya da bir satır yanlışlıkla silindiğinde sayfa
   erişilemez olmasın diye.
2. **Tanınmayan anahtar yok sayılır** — kaldırılmış bir girişin kaydı
   menüye boş öğe basmamalı.
3. **Tekrar eden anahtar kaydedilmez.** Çizim tarafı ikinciyi zaten
   atlıyor ama panelde "ekledim, görünmedi" en kötü geri bildirim; hata
   sebebiyle birlikte söyleniyor.

⚠️ Bir başlığı tamamen kaldırmak için Site Bölümleri'nden kapatmak
gerekiyor — yalnızca menüden düşürmek "kapattım ama Google hâlâ
gösteriyor" durumunu üretirdi.

### ⚠️ Sıralama anahtarı adrese ya da ada bağlı DEĞİL

Panelde saklanan şey kalıcı anahtar (`portfoy`, `harita`, …). "Hakkımızda"
yeniden adlandırıldığında ya da `/portfoy` taşındığında Aslıhan'ın kurduğu
sıra bozulmamalı.

### ⚠️ Önce süz, sonra diz

`menuyuSirala(menuyuSuz(...))`. Ters sırada çalıştırılsaydı "listede yoksa
sona ekle" kuralı **kapalı bir öğeyi menüye geri koyabilirdi**. Test bu
sıranın sonucunu kilitliyor.

### Harita da kapatılabilir bir bölüm oldu

Yeni bölüm anahtarı `harita`, **varsayılan açık** — bugün yayında olan bir
sayfanın bu sistem eklendi diye kaybolması gerileme olurdu.

Kapatma gerekçesi teknik olabilir: MapTiler anahtarı bitmiş ya da kota
dolmuş. O durumda sayfayı bozuk bırakmaktansa kapatmak dürüst davranış —
ve kapatınca menüden, altbilgiden ve site haritasından birlikte kalkıyor,
`/harita` 404 dönüyor.

⚠️ Kapı sayfanın **en başında**: harita ilan, mahalle ve POI'yi birden
okuyor; kapıyı aşağı koymak kapalı bir bölüm için üç sorgu çalıştırmak
olurdu.

### ⚠️ Endeks'in ikinci kapısı sıralamadan sonra da duruyor

SiteSections açık olsa bile veri eşiği (katman başına 8 gözlem, 6 ay
geçmiş — CLAUDE.md 6c) sağlanmadıysa Endeks menüde görünmüyor. Sıralama
eklenirken en kolay hata süzülmüş listeyi bırakıp ham yapıyı dizmek
olurdu; testle kapatıldı.
