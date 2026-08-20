# Vitrin ve hareket katmanı — ana sayfanın yeniden tasarımı

**20 Ağustos 2026** · dal: `feature/yeni-tasarim`

Ana sayfaya yeni bir vitrin (hero), siteye bir hareket dili ve kartlara
gerçek 3B derinlik eklendi. Yol boyunca üç sessiz tasarım hatası ortaya
çıktı; ikisi üretimdeydi.

---

## 1. Hareket katmanı — sitenin ilk animasyon jetonları

`globals.css` içine **HAREKET KATMANI** eklendi. Öncesinde sitede tek bir
hareket jetonu yoktu; her bileşen kendi süresini ve eğrisini elle yazıyordu.

| Jeton | Değer | Nerede |
| --- | --- | --- |
| `--cikis` | `cubic-bezier(0.23, 1, 0.32, 1)` | giren/çıkan her şey |
| `--giris-cikis` | `cubic-bezier(0.77, 0, 0.175, 1)` | ekranda yer değiştiren |
| `--cekmece` | `cubic-bezier(0.32, 0.72, 0, 1)` | çekmece/panel |
| `--sure-basma` … `--sure-sahne` | 140–620 ms | süre ölçeği |

⚠️ **`ease-in` hiçbir arayüz hareketinde kullanılmıyor.** Yavaş başlar; tam
da kullanıcının en dikkatle baktığı ilk anda gecikme hissi verir. Aynı
süredeki `ease-out` daha hızlı *hissettirir*.

Katman üç şeyi tüm siteye tek yerden veriyor:

- **Basma geri bildirimi** — her düğme ve bağlantı `:active` durumunda
  `scale(0.97)`. Arayüzün dokunuşu duyduğunu söyleyen en ucuz sinyal.
- **`[data-yukselen]`** — hover'da 4 px kalkma. ⚠️ `(hover: hover) and
  (pointer: fine)` kapısının ardında: dokunmatik cihazlar dokunmayı hover
  sayıyor ve kapı olmasa kart parmağın altında yapışık kalırdı.
- **`[data-sahne]`** — kaydırdıkça oturan bölüm girişi.

⚠️ **`prefers-reduced-motion` bloğu genişletildi:** sahne geçişi tümden
kapanıyor ve basma ölçeklemesi devre dışı. WCAG 2.3.3'ün konusu hareketin
kendisi, hızı değil.

## 2. `Sahne` — içerik animasyona bağlı değil

`components/hareket/Sahne.tsx`, IntersectionObserver ile giriş yapıyor.

⚠️ **Öğe varsayılan olarak GÖRÜNÜR.** "Bekliyor" durumunu bileşen
JavaScript indikten sonra veriyor. JS hiç inmezse, gözlemci
desteklenmezse ya da bir hata olursa içerik olduğu gibi durur.

Ters kurulum — CSS'te gizle, JS ile göster — çok daha yaygın ve çok daha
kırılgan: tek bir betik hatası sayfayı boş bırakır.

Gözlemci ilk girişte kendini söküyor; yukarı kaydırınca tekrar oynayan bir
giriş, ikinci görüşte gösterişe dönüşür ve okumayı böler.

⚠️ Sahne geçişi **`BolumBasligi` içine** bağlandı, sayfalara tek tek değil:
40'tan fazla yerde tekrar etmek, ilk unutulan yerde ritmi bozmak demekti.
Yalnızca başlık bloğu sarılıyor — uzun bir tablo tek parça belirseydi
hareket "sayfa geç yüklendi" gibi okunurdu.

## 3. Vitrin — 3B, ama üç boyutlu model değil

### Neden three.js değil

Gerçek bir 3B motoru (three.js ~150 kB gzip, Spline daha fazlası) iki sert
kuralı birden çiğnerdi: ana sayfa istemci JS bütçesi ve mobil LCP hedefi
2,5 sn. Trafiğin ~%75'i mobil.

Kartlara derinliği veren şey model değil **perspektif**: `perspective` +
`rotateX/rotateY`, tarayıcının kendi derleyicisinde GPU'da koşan gerçek bir
3B dönüşüm. Sıfır bayt. Sitenin ağır 3B gösterisi zaten var ve yerinde
duruyor: `/harita` sayfasındaki MapLibre `fill-extrusion` sütunları.

`components/hareket/EgilenKart.tsx`:

- Azami **6–7°** — büyük açı "oyuncak" hissi verir ve metni okunmaz yapar.
- ⚠️ Yalnızca `pointerType === 'mouse'`; dokunmatikte parmak zaten kartın
  üstünde ve eğilme kaydırmayı bozan bir titremeye dönüşüyor.
- ⚠️ Dönüşüm **doğrudan öğeye** yazılıyor, CSS değişkenine değil: değişken
  kalıtsal, üst öğede değiştirmek bütün çocukları her karede yeniden
  hesaplatırdı.
- Sürekli açık 140 ms'lik geçiş yumuşatma görevi görüyor — her kare hedefe
  atlamak yerine yaklaşıyor, yani yay hissi veriyor; ayrılışta da aynı geçiş
  kartı geri oturtuyor.

### Sahnede stok fotoğraf yok, gerçek ilan var

Referans tasarımın hero'su kocaman bir şehir fotoğrafına dayanıyordu.
Elimizde Çorlu'nun telifli bir fotoğrafı yok ve başka bir şehrin görselini
Çorlu diye koymak **kural 2'nin (uydurma veri yasak) görsel karşılığı**
olurdu.

Yerine sahnede yayındaki gerçek bir ilan duruyor — kendi fotoğrafı, fiyatı
ve kira çarpanıyla, üç ayrı `translateZ` düzleminde. Portföy boşsa sahne
`null` dönüyor ve vitrin tek sütuna düşüyor.

⚠️ Kira çarpanı yoksa rozet **hiç çizilmiyor**. "—" yazan bir rozet,
rakamın var olduğunu ama okunamadığını ima ederdi.

### Metin fotoğrafın üstüne basılmıyor

Klasik "kocaman fotoğraf, üstüne karartma, üstüne beyaz başlık" düzeni
reddedildi: o düzende okunurluk fotoğrafın açık ya da koyu olmasına
bağlanıyor ve kontrast, görseli yükleyen kişinin seçtiği karartma oranının
eline geçiyor.

## 4. Düzen kararı — vitrin daima açılış, slider onun altında

Önceki düzen "slayt varsa slider, yoksa metin hero'su" idi. Yeniden
tasarımda bu bir soruna dönüştü: **yeni vitrin yalnızca slayt yokken
görünüyordu** ve Aslıhan'ın ana sayfasında slaytlar var — yani sitenin yeni
yüzünü hiç görmeyecekti.

Diğer uç — slaytları vitrinin içine sıkıştırmak — daha kötüydü: slider 21:9
oranına göre kurulmuş, dar bir sütunda ince bir şeride düşüyor ve Faz 3'te
gelecek drone görüntüsünün yeri o tam genişlik.

İkisi de tam boyunda ve kendi işini yapıyor: vitrin sayfanın sözünü
söylüyor, slider Aslıhan'ın kareleriyle onu gösteriyor. Slider yoksa bant
hiç çizilmiyor.

### `sayfaHerosu` — tek bayrak, iki sonuç

"Sayfanın hero'su olmak" iki şeyi birden belirliyor ve ikisi asla
ayrışmamalı:

- `<h1>` mi `<h2>` mi — sayfada tek bir `<h1>` olabilir.
- `priority` mi değil mi — LCP öğesi tektir.

Ayrı iki prop olsaydı biri unutulduğunda **iki `<h1>`** (ekran okuyucuda iki
konu) ya da **iki `priority` görsel** (birbirinin bant genişliğini yiyen iki
LCP adayı) çıkardı. İkisi de ekranda hiçbir iz bırakmadan geçer.

Üretilen HTML'de gerçekten iki `<link rel="preload" as="image">` görüldü ve
ikisi **aynı dosyayı** işaret ediyordu: öne çıkan ilan ızgarasının ilk kartı
da `oncelikli` alıyordu. Yeni düzende o ızgara ilk ekranın çok altında;
öncelik kaldırıldı. Ölçüldü: ana sayfada artık tek görsel ön yüklemesi var.

---

## 5. Yol boyunca çıkan üç sessiz hata

Yeni bir denetim yazılırken bulundular: **Tailwind, tanımsız yardımcı sınıfı
sessizce atar.** `shadow-kart-yuksek` yazıldığında — ki öyle bir jeton yok —
hata vermiyor, uyarmıyor, o sınıfı hiç üretmiyor. `tsc` de yakalayamıyor:
`className` bir dizge.

| Sınıf | Sorun | Nerede |
| --- | --- | --- |
| `rounded-alan` | `--radius-alan` yok → AI arama kutusu ve düğmesi sitedeki tek köşesiz alanmış | üretimde |
| `text-vurgu-uzeri` | `--color-vurgu-uzeri` yok → dolu terracotta zeminde metin `--color-metin`de kalıyordu, **~2,4:1** | üretimde |
| `shadow-kart-yuksek` | jeton yok → gölge hiç çizilmiyordu | bu PR'da yazıldı |

⚠️ İkincisi bir **erişilebilirlik hatası** ve AI arama varsayılan KAPALI
olduğu için üretimde hiç göze görünmedi.

Çözüm kuralı gevşetmek değil jetonu eklemek oldu: `--color-vurgu-uzeri`
tanımlandı, açık ve koyu temada ayrı ayrı, ve **kontrast sözleşmesine
bağlandı** (`kontrast.test.ts`). Jeton eklemenin bedeli ölçülmeyi kabul
etmektir.

### Kalıcı denetim

`disiplin.test.ts` içine yeni bir blok: `text/bg/border/shadow/rounded`
sınıfları tanımlı bir jetona çözülüyor mu?

⚠️ Testi susturmanın doğru yolu muafiyet eklemek **değil**: ya sınıfı var
olan jetona çevir, ya da jetonu `globals.css`e ekle.

Tek muafiyet `Harita3B.tsx` ve gerekçesi var: MapLibre'nin stil şartnamesi
`fill-extrusion-color`, `text-halo-width` gibi tireli özellik adları
kullanıyor ve bunlar Tailwind'in ad uzayıyla birebir çakışıyor.

### Nadirlik kuralı da devreye girdi

Vitrinin düğmeleri ilk hâlinde elle yazılmıştı ve birincil eylem `bg-aksan`
alıyordu. Tasarım disiplini testi haklı olarak kırmızıya döndü: dolu adaçayı
zemin yalnızca iki eylemin ("Evimi değerlendir", "Erişim talep et") hakkı.
Düğmeler `Buton` bileşenine geri bağlandı; birincil eylem dolu kakao —
aynı görsel ağırlık, nadirlik harcanmadan.

---

## Doğrulama

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — temiz
- `pnpm vitest run` — 74 dosya, **1734 test** yeşil
- Üretim imajıyla 11 sayfa duman testi — hepsi 200
- Üretilen HTML ölçüldü: **1 adet `<h1>`**, **1 adet görsel ön yüklemesi**
