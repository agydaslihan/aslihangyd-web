# Yeniden tasarımın son adımı — 28 sayfa aynı dile geçti

**20 Ağustos 2026** · dal: `feature/sayfa-acilislari`

`FRONTEND-YENIDEN-TASARIM.md` §10'un altıncı ve son maddesi "kalan
sayfaların uyarlanması"ydı ve tam olarak orada yarım kalmıştı: ana sayfa,
portföy ve mahalleler yeni bandı aldı, geri kalan 28 sayfa eski küçük
ortalanmış başlıkla açılmaya devam etti.

---

## Belirti — hiçbir yerde hata vermeyen bir tutarsızlık

Site 33 sayfa. Beşi (ana sayfa, portföy, mahalleler ve iki detay) yeniden
tasarımdan geçmişti; kalanı `<div className="kapsayici py-10 sm:py-14">` ile
başlayıp doğrudan içeriğe giriyordu.

Aradaki fark ölçülebilir bir arıza üretmiyor: bütün sayfalar 200 dönüyor,
testler yeşil, Lighthouse memnun. Yalnızca `/portfoy`'dan `/araclar`'a geçen
ziyaretçi **iki farklı site geziyordu** — biri kurumsal bir bantla açılan,
diğeri metnin ortasına düşüren.

Bu, projedeki sessiz arıza kalıbının tasarım hâli: kural yazılıydı, kod
doğruydu, ikisinin arasındaki bağ ekranda iz bırakmadan kopmuştu.

## Yapılan

Ortak açılış bandı (`SayfaVitrini`, 20 Ağustos'ta `/portfoy` ve
`/mahalleler` için yazılmıştı) kalan sayfalara taşındı:

| Sayfa | Not |
| --- | --- |
| 7 hesaplayıcı | Bant **kabukta** (`HesaplayiciKabugu`), sayfalarda değil |
| `/araclar` | Bandın sağında araç sayısı + oran tarihi |
| `/degerleme`, `/iletisim`, `/hakkimizda` | CMS başlığı (`SayfaBasligi`) bandın içinde |
| `/mahalle-testi` | Başlık ortadan sola alındı |
| `/veri-kaynaklari` + 3 metodoloji sayfası | Uzun metin sayfaları |
| `/bolge-radari`, `/endeks` | — |
| `/mahalleler/karsilastir`, `/[slug]` | Sayfa yolu (breadcrumb) bandın içinde |
| `/ticari`, `/gizli-portfoy` | Kendi bantları vardı; ortak banda geçtiler |

## ⚠️ Kararlar

**Bant yedi hesaplayıcı sayfasına tek tek konmadı**, hepsinin kullandığı
kabuğa kondu. `BolumBasligi` içindeki sahne geçişiyle aynı gerekçe: yedi
yerde tekrar etmek, ilk unutulan yerde ritmi bozmak demek.

**Sayfa yolu, eyebrow'un yerine geçti.** İkisi de "buradasın" diyor; yan
yana kullanmak aynı bilgiyi iki biçimde tekrar etmek olurdu. Alt sayfada
kırıntı daha çok şey söylüyor, çünkü üst sayfaya dönüş yolunu da taşıyor.

**Endeks sayfasındaki "istenen fiyat" uyarısı bandın İÇİNE alınmadı.** Bant
dekoratif ve sakin; içine konan bir uyarı kutusu hem bandın ritmini bozar
hem de uyarıyı süs gibi gösterirdi. Uyarı, endeks değerinin hemen üstünde
ilk içerik olarak duruyor — okunması gereken sıra bu (kural 6c).

**Hukuki metinler (`/[slug]`) de aynı bandı aldı.** "Bunlar sıkıcı sayfalar"
diye ayrı tutmak tam da okunmamalarına yol açardı. Bandın taşıdığı tek
fazladan bilgi son güncelleme tarihi ve o, hukuki bir metinde başlığın
yanında durması gereken şey.

**Beş sayfa bilinçli olarak dışarıda** ve gerekçeleri testte yazılı: ana
sayfa (kendi vitrini var), `/harita` (uygulama yüzeyi), `/danisman-ol`
(CMS'ten gelen hero görselini ortak bant taşıyamaz), iki detay sayfası
(açılışları galeri) ve üç rapor sayfası — sonuncularda gerekçe yazdırma:
dekoratif bant kâğıdın üst şeridini yer, giriş hareketi kâğıtta hiçbir şey
ifade etmez.

## ⚠️ LCP tuzağına tekrar düşülmedi

Bant `Sahne` kullanıyor, yani bir giriş animasyonu var. 20 Ağustos'ta bu tam
olarak bir LCP gerilemesi üretmişti: `bekliyor` durumu `opacity: 0` demek ve
onu JavaScript veriyor — ilk ekrandaki bir öğe, sırf animasyon yüzünden
saniyelerce "boyanmamış" sayılıyordu.

O PR'da `Sahne`'ye eklenen koruma burada işini yaptı: öğe zaten görüş
alanındaysa hiç sahneye alınmıyor. Bant sayfanın en üstünde, yani **daima**
görüş alanında — tanımı gereği gizlenmiyor.

## Yol boyunca: eyebrow beş yerde elle yazılmıştı

`Eyebrow` bileşeni Aşama 2'de yazılmıştı ama beş yerde aynı sınıf dizisi
elle tekrar ediliyordu (`text-aksan-metin text-eyebrow font-medium
uppercase`) — ana sayfa, portföy, `VitrinHero`, filtre paneli, mahalleler.
Biri de `tracking-[0.1em]` gibi jetona bağlı olmayan kendi değerini
kullanıyordu (`/ticari`).

Hepsi bileşene bağlandı. Bu kopyalar bugün aynı görünüyordu; jeton
değiştiğinde biri değişmeyecekti.

## Kalıcı denetim

`src/lib/tasarim/sayfaAcilisi.test.ts` — her site sayfası ya ortak bandı
kullanıyor, ya da muafiyet listesinde **gerekçesiyle** yazılı olmak zorunda.
Gerekçe alanı boş bırakılamıyor ve muafiyet listesi de denetleniyor: silinen
bir sayfanın muafiyeti listede kalırsa aynı adla açılan yeni sayfa denetimden
sessizce kaçardı.

⚠️ Testi susturmanın doğru yolu muafiyet eklemek değil, sayfaya bandı
eklemek.

Test önce bozularak doğrulandı: `/iletisim`'den bant kaldırılınca kırmızıya
döndü, geri konunca yeşile.

## Doğrulama

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — temiz
- `pnpm test` — 91 dosya, **1905 test** yeşil
- Üretim derlemesiyle **21 sayfa duman testi**: hepsi 200, her sayfada tek
  `<h1>`, hiçbirinde başlık seviyesi atlaması yok, bant her sayfada basılı
  (`/endeks` 404 — veri eşiği sağlanmadı, tasarım gereği)
- İstemci JS bütçesi (eşik 220 kB gzip): `/` 206,2 · `/portfoy` 209,0 ·
  `/araclar` 203,0 · `/iletisim` 205,9 · `/veri-kaynaklari` 203,0 · `/kvkk` 203,0

## Bu sayfalarda hâlâ eksik olan

Bant, sayfaların **açılışını** verdi; içeriklerini değiştirmedi. Şartnamenin
kapanmamış maddeleri duruyor ve ikisi de veri bekliyor: Çorlu'nun havadan
çekilmiş hero görseli ve Aslıhan'ın portresi (bkz. SENDEN-BEKLENENLER.md).
