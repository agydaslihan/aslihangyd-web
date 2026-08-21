# Kart tıklaması ve sessiz 404 — iki sessiz arıza

**Tarih:** 21 Ağustos 2026
**Dal:** `fix/kart-tiklama-404`

İkisi de aynı sınıftan: sayfa doğru görünüyor, tarayıcı hata vermiyor,
ziyaretçi yanlış sonuç alıyor.

## 1. İlan kartına tıklayınca detay açılmıyordu

**Şüphe doğruydu ama sebep hover katmanı değildi.** Aurora'da eklenen
altın kenarlık, cam örtü ve zoom sarmalayıcı `pointer-events` yutmuyordu.
Kartı kaplayan bağlantının kendisi çizilmiyordu.

Kartın tamamını tıklanabilir yapan desen `after:absolute after:inset-0`.
Bu, sözde öğe olduğu için **iki şey olmadan hiç var olmaz:**

- `content: ''` — CSS'te `content`i olmayan `::after` render edilmez.
  Tailwind bunu otomatik eklemez; `after:content-['']` yazılmalı.
- `z-index` — kart içindeki `zoom-kabi` ve rozet kendi yığma bağlamlarını
  kuruyor; örtü onların altında kalıyordu.

Görsel olarak fark yok: kart aynı, imleç bile başlığın üstünde el
oluyordu. Yalnızca **kartın gövdesine** tıklayan kişi hiçbir şey olmadığını
görüyordu.

İkinci hata: `line-clamp-2` bağlantının üstündeydi. `-webkit-box` +
`overflow: hidden`, kaplayan sözde öğeyi kırpıyor. Kırpma başlığa taşındı,
bağlantı kırpılmayan bir kutu oldu.

Aynı desen üç yerde kullanılıyordu, üçü de düzeltildi:
`IlanKarti`, `MahalleKarti`, `/araclar` kartları.

Klavye ve odak zaten doğruydu ve öyle kaldı: örtü gerçek bir `<Link>`,
Tab ile odaklanıyor, Enter ile açılıyor, odak halkası `globals.css`
içindeki genel `:focus-visible` kuralından geliyor.

### Kalıcı denetim — `lib/ilan/kartBaglantisi.test.ts`

16 iddia. Kart kaynaklarını okuyup şunları arıyor: gerçek `<Link>` var mı,
adres doğru mu, örtüde `content` ve `z-index` var mı, kaplayan bağlantının
üstünde `line-clamp` var mı, örtünün konumlandırılmış bir atası var mı.
Testler kasıtlı kırılarak doğrulandı.

## 2. Var olmayan ilan 200 dönüyordu

`notFound()` çağrılıyordu ve 404 sayfası **görünüyordu.** Dönen HTTP kodu
yine de 200'dü.

Sebep `loading.tsx`. Bir segmentte `loading.tsx` varsa Next o dalı
**akıtarak** basar: yanıt başlıkları ilk baytla birlikte gönderilir. Durum
kodu o anda kesinleşir. Sonradan çağrılan `notFound()` yalnızca arayüzü
değiştirebilir — kodu değiştiremez.

`portfoy/loading.tsx` liste sayfası için yazılmıştı ama Next'te
`loading.tsx` **alt segmentlere de miras kalıyor**; `portfoy/[slug]` onu
devralıyordu.

Çözüm: liste sayfaları rota grubuna alındı.

```
portfoy/(liste)/page.tsx      ← iskelet buraya bağlı
portfoy/(liste)/loading.tsx
portfoy/[slug]/page.tsx       ← artık miras almıyor
```

Rota grupları adrese girmiyor; `/portfoy` aynı adres. Aynısı
`/mahalleler` için yapıldı. `[slug]`, `bolge-radari` ve `gizli-portfoy`
altındaki üç `loading.tsx` tamamen silindi — üçü de `notFound()` veya
`bolumKapisi()` çağıran sayfalardı.

Ölçülen sonuç:

| Adres | Önce | Sonra |
|---|---|---|
| `/portfoy/olmayan-12345` | 200 | **404** |
| `/mahalleler/olmayan-999` | 200 | **404** |
| `/portfoy` · `/mahalleler` | 200 | 200 |
| `/mahalleler/demo-muhittin` | 200 | 200 |
| `/bolge-radari` · `/gizli-portfoy` | 200 | 200 |

### Kalıcı denetim — `lib/dokuman/soft404.test.ts`

17 iddia. `notFound()` ya da `bolumKapisi()` çağıran her sayfa için,
kendi segmentinde ve **üstündeki her segmentte** `loading.tsx` olmadığını
doğruluyor. Yeni bir iskelet dosyası yanlış yere konursa CI kırılır.

## Yayında olmayan ilanlar — durum ve öneri

Ziyaretçi sorgusu `HERKESE_ACIK_DURUMLAR` (`yayinda`, `rezerve`) ile
sınırlı; diğer dört durum kayıt yokmuş gibi davranıyor ve artık gerçekten
404 dönüyor.

**Öneri: 410 Gone eklenmesin.** Gerekçe:

- `taslak` ve `onay_bekliyor` hiç yayınlanmadı — 410 "vardı, kalktı" der,
  yanlış beyan olur.
- `yetki_bitti` **geçici**: EİDS yetkisi yenilenince aynı slug geri
  dönebilir. 410 "kalıcı" demek; arama motoruna yanlış söz verir.
- `satildi` için 410 semantik olarak doğru olurdu ama pratik kazancı yok:
  Google 404'ü de 410'u da dizinden düşürür, fark yalnızca birkaç tarama
  turu. Karşılığında `notFound()` dışına çıkan özel bir kod yolu gerekir.

`satildi` için asıl seçenek 410 değil **ürün kararı:** ilanı 200 ile
"Satıldı" durumunda tutmak (fiyat gizli, `noindex`, benzer ilanlara
yönlendirme). Bu satış referansı üretir ve gelen bağlantıyı harcamaz —
ama satılan taşınmazın sayfasının açık kalması Aslıhan'ın kararı, kod
kararı değil. Şimdilik 404.

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (101 dosya, 2036 test) ·
`pnpm build` temiz. Durum kodları üretim derlemesinde tek tek ölçüldü.
