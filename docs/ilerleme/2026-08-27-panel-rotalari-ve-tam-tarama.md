# Panel ekranı boş açılıyordu + gezinme taraması tüm rotalara açıldı

**Tarih:** 27 Ağustos 2026
**Dal:** `fix/panel-rotalari`

## A. `/admin/anasayfa-bolumleri` açılmıyordu — iki ayrı hata üst üste

### A1. Oturum, Payload'ın GEÇMEDİĞİ bir prop'tan okunuyordu

Ekran 200 dönüyor, gövde bomboş geliyordu. Sebep:

```tsx
export default async function AnaSayfaGorunumu({ user }: AdminViewServerProps) {
  if (!user) return null      // ← user daima undefined
```

`AdminViewServerProps` içinde `user` **alanı var** ama isteğe bağlı
(`user?: TypedUser`) ve Payload özel görünümlere onu **geçmiyor**. Yani:

- TypeScript memnun — alan tipte var.
- Çalışma zamanında `undefined` — kapı herkesi çeviriyor.
- `return null` — sayfa boş, konsol sessiz, sunucu günlüğü temiz, HTTP 200.

Oturumun geçtiği tek yer `initPageResult.req`. Projedeki **on** özel
görünümün sekizi baştan böyle yazılmıştı; sapan ikisi
`anasayfa-bolumleri` ve `gozlemlenebilirlik` idi.

⚠️ Rota da global de importMap de yerindeydi. Şüphe listesindeki
importmap arızası değildi bu — ama sonucu aynı: sessizce boş ekran.

### A2. Boş sayfanın ardında ikinci bir hata saklanıyordu

`gozlemlenebilirlik` düzeltilince 500 verdi:

```
The following path cannot be queried: createdAt.greater_than_or_equal
```

Payload'ın operatörü `greater_than_equal` — arada "or" yok. Dört sorgu da
yanlış yazılmıştı ve **`as Where` kalkanı tam da bunu gizliyordu**:

```ts
where: { createdAt: { greater_than_or_equal: … } } as Where,
```

`as Where` demek, derleyiciye "bu nesne zaten `Where`, bakma" demek.
Operatör adı yazım hatası çalışma zamanına erteleniyordu. Kalkan
kaldırıldı; kod tabanındaki dört `as Where`in dördü de gitti. Aynı hata
bir daha yazılırsa `pnpm typecheck` kırılır — denendi, kırılıyor.

## B. Gezinme taraması: 3 rota → 76 rota

`scripts/gezinme-dumani.mjs` yeniden yazıldı.

**Kapsam elle tutulmuyor.** Elle tutulan bir liste, eklenen sayfayı test
etmez ve bunu kimseye söylemez.

- **Genel rotalar** `sitemap.xml`den: 36 rota.
- **Panel rotaları** kaynaktan: `src/components/*/yol.ts` içindeki yol
  sabitleri + `src/globals` ve `src/collections` slug'ları: 40 rota.
  Menüyü kazımak yetmezdi — bağlantısı olmayan bir görünüm de bir rotadır
  ve bozuk olan tam da öyleydi.

**Her rota için iki yol:** doğrudan açılış **ve** menüden gerçek fare
olaylarıyla tıklama. `a.click()` kullanılmıyor: üstteki katmanlar
tıklamayı yutuyorsa yalnızca gerçek olayla görünür.

**İki kip:** hareket açık ve az hareket. Panel tek kipte — hareket kodu
(`HareketAltyapisi`, GSAP, Lenis) yalnızca `(site)` düzeninde var; panel
`(payload)` düzeninde ve o kodun hiçbirini yüklemiyor.

**Panel oturumlu.** Oturumsuz panel rotaları 200 döner ama gövde boş gelir
— "geçti" demek A1'i kaçırmak olurdu. CI tek kullanımlık bir yönetici
açıyor (`scripts/duman-kullanicisi.ts`, `NODE_ENV=development` beyaz
listesiyle korunuyor).

**"200 döndü" yetmez.** Her rota için: ana çerçevenin HTTP durumu, adres,
sayfa başlığı, gövde uzunluğu ve yakalanmamış istisna denetleniyor.
Gövde eşiği bilinçli olarak düşük (40 karakter) — soru "içerik yeterli mi"
değil, "gövde BOŞ mu".

### Testin kendi tuzakları — ikisi de düzeltildi

⚠️ **`(pointer: fine)` yaması korundu.** Headless Chrome bu sorguya
varsayılan olarak `false` diyor; `masaustuMu()` false dönüyor ve hareket
kodunun tamamı atlanıyor. Yama olmadan test, kırılan yolu hiç denemeden
"geçti" der.

⚠️ **Kaydırma animasyonu yanlış bağlantıya tıklatıyordu.** İlk sürüm
`scrollIntoView` çağırıp koordinatı aynı anda okuyordu. `globals.css`
`scroll-behavior: smooth` veriyor ve masaüstünde Lenis kaydırmayı kendi
eğrisiyle sürüyor; koordinat okunduğunda sayfa hâlâ hareket hâlindeydi.
Sonuç: `/araclar/alim-maliyeti` isterken `/araclar/deger-artis-vergisi`
açılıyordu — **testin zamanlaması, kodun arızası gibi görünüyordu.**
Sahte hata üreten denetim birkaç koşum sonra kapatılır; kapatılan denetim
yoktur. Artık `behavior: 'instant'`, ardından kaydırmanın durduğu
doğrulanıyor, koordinat en son okunuyor ve tıklamadan önce
`elementFromPoint` ile hedefin gerçekten o bağlantı olduğu kontrol
ediliyor (üstte katman varsa bu da bir bulgudur).

⚠️ **Üçüncü taraf istisnaları hata sayılmıyor ama gizlenmiyor.**
Turnstile'ın anahtarı yerelde ve CI'da tanımsız; betiği `400020`
fırlatıyor. Kendi kaynağımızdan gelmeyen istisnalar ayrı sayılıp koşum
sonunda listeleniyor.

⚠️ **Sessiz kapsam boşluğu yok.** Kaynak sayfasında görünür bağlantısı
olmayan rota (bugün ikisi: `/mahalle-eslestirme-metodolojisi`,
`/yatirim-skoru-metodolojisi`) yalnızca doğrudan açılışla deneniyor ve bu
her koşumda açıkça yazılıyor.

### Sonuç

```
Genel rota: 36 · Panel rotası: 40
✓ hareket AÇIK    — sorun yok · 33 bağlantı tıklandı
✓ az hareket      — sorun yok · 33 bağlantı tıklandı
✓ panel (oturumlu)— sorun yok
```

~6 dakika. CI'da **engelleyici**; `timeout-minutes` 25 → 40.

## Kalıcı denetim: `src/lib/panel/gorunumKapisi.test.ts`

63 iddia, kaynak düzeyinde:

- Yapılandırmadaki her panel bileşeninin dosyası var mı.
- Her biri `importMap.js` içinde mi — *importmap arızasının üçüncü
  tekrarı buydu.*
- Her özel görünüm `initPageResult` alıyor mu ve üst düzey `user`
  prop'unu okumuyor mu.
- Her görünümün gövdesinde `if (!req.user) return null` kapısı var mı.

Kasıtlı kırılarak doğrulandı: `{ user }`a döndürülünce test düşüyor.

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (103 dosya, 2106 test) ·
`pnpm build` temiz. Duman testi 76 rotanın tamamında geçiyor.
