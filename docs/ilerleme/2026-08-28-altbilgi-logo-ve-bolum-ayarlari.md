# Altbilgi logosu (A2–A3) ve ana sayfa bölüm ayarları (C1–C4)

**Tarih:** 28 Ağustos 2026
**Dal:** `feat/altbilgi-logo-ve-bolum-ayarlari`

## A2 — Altbilgi logosu hizası

İki şey birden bozuktu ve ikisi de "hata vermeyen" sınıftan: site çalışır,
testler yeşildir, yalnızca altbilgi hizasız durur.

1. **Logo metne yapışıktı.** Logo, tanıtım metniyle aynı `gap-2` yığınının
   içindeydi; 56 px'lik bir logonun altında 8 px boşluk ikisini tek blok
   gibi okutuyordu.
2. **Kutu yüksekliği İÇERİĞE göre değişiyordu.** Logo yüklüyse 56 px, metin
   yedeğindeyse satır yüksekliği kadar. Beş sütunlu ızgarada bu, komşu
   sütunların üst hizasını kaydırıyordu.

Çözüm ikisini ayırmak: logo `h-14` **sabit** ve `justify-start` ile sola
hizalı kendi kutusunda, tanıtım metni `mt-4` ile ayrı. Kutu yüksekliği
içerikten bağımsız olduğu için sütun düzeni logo yüklense de yüklenmese de
aynı kalıyor.

⚠️ `justify-start` şart: `object-contain` dar bir logoyu kutuya **ortalar**
ve sütun başlığının sol kenarıyla hizası kayar.

## A3 — Altbilgide logo opsiyonel

Marka panelinde yeni anahtar: **"Altbilgide logo göster"** (varsayılan
açık).

⚠️ **Kapalıyken görsel gizlenmiyor, yerine SİTE ADI geliyor.** "Logo yok"
ile "logo istenmiyor" ayrı durumlar; ikisinde de sütun kimliksiz kalmamalı.
`MarkaLogosu` yeni bir `metneZorla` bayrağı aldı — kararı çağırana
bırakıyor, bileşen hangi kuralın işlediğini bilmek zorunda değil.

⚠️ Varsayılan **açık** ve okuma başarısız olduğunda da açık: kapalı
varsayılan, paneli hiç açmamış bir kurulumda logoyu sessizce gizlerdi.
Eski kayıtlar için `!== false` kullanılıyor.

Uçtan uca denendi: logo yüklü → görsel, anahtar kapalı → "Aslıhan GYD"
yazısı, ikisinde de kutu yüksekliği ve sol hiza aynı.

## C1 — Sıralama zaten çalışıyor

Doğrulandı (bu turdan önce de ölçülmüştü): panelden kapatılan bölüm
sayfadan kalkıyor, sıra HTML'e yansıyor.

## C2 — Sürükle-bırak ZATEN VAR

Payload'ın dizi alanı satırları tutamaçtan sürükleyerek diziyor
(`__draggable-rows`, `DraggableSortableItem`). Sıra numarası alanı hiç
eklenmemişti — gerekçesi ilk günden yazılıydı: *"sayı alanı olsaydı iki
satıra aynı numarayı yazmak mümkün olurdu ve çakışmayı çözmek için görünmez
bir kural gerekirdi."* Yeni kod yazılmadı; onaylandı.

## C3 — Bölüm içi görünüm ayarları

Her satıra üç açılır liste eklendi: **zemin** (varsayılan / beyaz / bej /
koyu), **dikey boşluk** (dar / normal / geniş), **hizalama** (sol / orta).

⚠️ **Değer kümeleri kapalı, serbest CSS yok.** Serbest bir renk ya da
piksel girişi, tasarım sisteminin dışına çıkan tek bir bölüm üretmeye
yeter; sonra o bölüm "neden farklı görünüyor" sorusunun cevapsız kaldığı
yer olur. Seçenekler koddaki kümelerden **türetiliyor** — elle yazılmış bir
liste, yeni bir değer eklendiğinde güncellenmeyi unuturdu.

⚠️ **"Varsayılan" zemin beyaz DEMEK DEĞİL:** bölümün kendi tasarlanmış
zeminini koru demek. Çorlu deneyimi ve çağrı bandı kendi bantlarını
taşıyor; hepsini kâğıda çevirmek onları tanınmaz hâle getirirdi.

⚠️ **Boşluk EKLENİYOR, EZİLMİYOR.** Bölümün kendi `py`sini sıfırlamak,
bileşenin iç ritmini bilmeyi gerektirirdi. "Dar" sıfır ek, "geniş" bir
kademe ek — sonuç öngörülebilir ve hiçbir bölümde iki kat dolgu oluşmuyor.

⚠️ **Hizalama yalnızca BAŞLIK bloğunu etkiliyor** ve panelde de öyle
yazıyor. Kart ızgarasını ya da haritayı ortalamak sütun hizasını bozar ve
"ortalanmış" değil "kaymış" görünür. Yarım çalışan bir ayar vermektense
sınırını söylüyoruz.

⚠️ **Ayar değişmemişse fazladan düğüm basılmıyor.** On dört bölümün on
dördünü sarmak, DOM'a on dört boş katman eklemek demekti; `:has()` ve
kardeş seçicileri olan bir tasarımda o katmanlar sessizce kural bozar.
Doğrulandı: varsayılan düzende sarmalayıcı sayısı **0**.

## C4 — Yeni varsayılan sıra

İstenen akış uygulandı. Verilen liste **on** başlık saydı; sayfada **on
dört** sıralanabilir bölüm var. Adı geçmeyen dördü sessizce sona atılmadı,
en yakın akrabalarının yanına yerleştirildi:

| Sıra | Bölüm | Kaynak |
|---|---|---|
| 1 | Güven şeridi | verilen liste |
| 2 | Güven kartları | ⚠️ adı geçmedi — güven şeridinin ardına |
| 3 | Arama kutusu | ⚠️ adı geçmedi — vitrinin altındaki birincil eylem |
| 4 | Öne çıkan portföy | verilen liste |
| 5 | Mahalle kartları | verilen liste |
| 6 | Hero slaytları | verilen liste |
| 7 | Kim danışmanlık veriyor | verilen liste |
| 8 | Çorlu deneyimi | verilen liste |
| 9 | Uzmanlık — çalışma biçimi | verilen liste ("Uzmanlık") |
| 10 | Endeks şeridi | ⚠️ adı geçmedi |
| 11 | Gizli portföy | ⚠️ adı geçmedi |
| 12 | Yatırımcı araçları | verilen liste |
| 13 | Üç yol ayrımı | ⚠️ adı geçmedi |
| 14 | Kapanış çağrı bandı | verilen liste |

⚠️ **"Uzmanlık" başlığının karşılığı `anlati` sayıldı** — sayfada uzmanlığı
anlatan bölüm dört adımlık çalışma biçimi anlatısı. Kastedilen başka bir
şeyse sıra panelden değiştirilebilir; kodda bir daha dokunmaya gerek yok.

Verilen on başlığın **göreli sırası birebir korundu**.

## Kalıcı denetimler

- `logo.test.ts` → altbilgi logosunun sabit yükseklikli kutusu, sol hizası,
  metin arası boşluk ve anahtarın varsayılanı (6 yeni iddia).
- `duzen.test.ts` → değer kümelerinin kapalı ve küçük olduğu, panel
  seçeneklerinin koddan türetildiği, tanınmayan değerin varsayılana
  düştüğü, ayar değişmediğinde sarmalayıcının basılmadığı (6 yeni iddia).

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (106 dosya, 2176 test) ·
`pnpm build` temiz. Gezinme dumanı iki kipte de 33/33.
