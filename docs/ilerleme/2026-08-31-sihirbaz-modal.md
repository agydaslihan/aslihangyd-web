# 31 Ağustos 2026 — İlan sihirbazı modal akışa dönüştü

Panelin ana ekranında **"İlan ver"** düğmesi; basınca sayfa değişmiyor,
modal açılıyor.

⚠️ **İçerideki sihirbaz sayfadakiyle AYNI bileşen.** İkinci bir sihirbaz
yazmak, EİDS kapısının, otomatik kaydetmenin ve şemanın iki ayrı
kopyasını doğururdu; ikisinin ayrıştığı gün hangisinin doğru olduğu
sorulamazdı. Modal yalnızca bir kabuk.

⚠️ `/admin/portfoy-sihirbazi` rotası **duruyor**: derin bağlantı, yer imi
ve yeni sekmede açma çalışmaya devam ediyor.

## On adım

```
✓ Kategori   2 Temel   3 Tapu ve EİDS   4 Nitelikler   5 Fiyat
6 Fotoğraflar   7 Açıklama   8 Video ve tur   9 Ön izleme   10 Yayın
```

Şartname dokuz adım sayıyor; kodda on çünkü "Ön izleme" ile "Yayın" ayrı
ekranlar — biri gösteriyor, diğeri karar aldırıyor.

**Kategori ayrı adım** çünkü sonraki adımların **ne soracağını**
belirliyor: kiralıkta tahmini kira sorulmuyor, arsada oda sayısı
anlamsız. İkisini formun ortasına gömmek, kullanıcıyı doldurduğu
alanların bir kısmının anlamsızlaşacağı bir seçime sonradan götürürdü.

⚠️ **Üçüncü sütun ("alt tür") yok çünkü veri modelinde yok.** Boş bir
üçüncü sütun çizmek, doldurulamayan bir alan göstermek olurdu. Alt tür
gerekirse önce `Ilanlar` koleksiyonunda bir alan açılmalı.

## ⚠️ Pasif düğme bir kapı değil

Son adımda "Yayına al" düğmesi EİDS eksikken pasif ve sebebi yazılı. Ama
**pasiflik DOM'dan kaldırılabilir** ve sunucu eylemi doğrudan
çağrılabilir.

Gerçek kapı yine `eidsYayinEngeli` kancası. Yeni `ilaniYayinaAl` eylemi
`durum`u **sunucuda** yazıyor ve yazma Local API + `overrideAccess: false`
ile gidiyor; koşullar sağlanmıyorsa Payload reddediyor ve **kancanın
mesajı aynen** gösteriliyor (ikinci bir metin yazmak, iki mesajın
ayrıştığı bir gün üretirdi).

⚠️ `durum` hâlâ istemciden gelmiyor: şemada o alan yok. İstemci yalnızca
"bu ilanı yayına al" diyor.

## Bir gösterge yalan söylüyordu

İlk hâlde "Ön izleme" ve "Yayın" adımları **%100 ve yeşil onaylı**
görünüyordu — kullanıcı oraya hiç gitmemişken. Sebep basit: doldurulacak
alanları yok, payda sıfır.

Tamamlanmış görünen bir adım, **atlanabilir görünen** bir adımdır. Bu
adımlar artık yüzde göstermiyor ve genel yüzde yalnızca ölçülebilir
adımlardan hesaplanıyor. Tarayıcıda doğrulandı.

## Erişilebilirlik

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- **Odak tuzağı iki yönde de kapalı** — Shift+Tab ilkten sona döner; tek
  yönlü tuzak tuzak değildir
- **Odak geri veriliyor**; verilmezse ekran okuyucu kullanan kişi sayfanın
  başına düşer
- **ESC kapatıyor ama önce soruyor** — yanlışlıkla basmak yarım saatlik
  girişi silerdi
- Arka plan kaydırması kilitli
- Örtüye basınca kapanıyor, ama **içeriden başlayıp dışarıda biten bir
  sürükleme** (metin seçimi) kapatmıyor
- Dokunma hedefleri 44 px, mobilde modal tam ekran

## Görsel dil

⚠️ **Palet korundu**; canlılık kontrast, onay işaretleri ve durum
renkleriyle geliyor. Tamamlanan adım **✓** ile işaretli — renk tek
taşıyıcı değil (WCAG 1.4.1). Kategori seçimi hem onay işareti hem
`aria-pressed` taşıyor.

Bir test, eklenen CSS bloklarının panel temasının değişkenlerini
kullandığını denetliyor. ⚠️ İddia dosyanın tamamına değil **eklenen
bloklara** bakıyor: dosyada bu işten önce de ham renkler vardı ve hepsini
bu değişikliğe bağlamak, ilgisiz bir borcu bu testin sırtına yıkmak
olurdu.

## Bir karakter font alt kümesinde yoktu

Kapatma düğmesinde `✕` (U+2715) kullanmıştım; `lib/tipografi/alfabe.test.ts`
yakaladı. Alt kümede olmayan bir karakter yedek fontla çizilir ve düğme
başka bir yazı tipiyle görünür. İkon SVG'ye çevrildi — fonta bağımlılık
kalmadı.

19 iddia: `src/lib/sihirbaz/modal.test.ts`.
