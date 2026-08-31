# 31 Ağustos 2026 — İlk ekran tıklanabilirliği, mahalle haritası, WhatsApp rengi

Üç kırık iş: ana sayfanın çağrı butonları, mahalle sayfasının haritası ve
canlıda görünmeyen WhatsApp rengi. Üçü de "kod doğru ama sonuç yanlış"
sınıfından; üçü de ölçümle bulundu.

## A — Vitrin butonlarına tıklanmıyordu

### Ne oluyordu

Ana sayfada "Portföyü incele" ve "Ücretsiz değerleme" butonlarına tıklamak
hiçbir şey yapmıyordu. `elementFromPoint` ile ölçüldü:

| Öğe | Dikey aralık | Genişlik |
| --- | --- | --- |
| Çerez bandı sarmalayıcısı | 649 → 885 px | **1425 px** (tam genişlik) |
| Vitrin çağrı butonları | 666 → 718 px | 197 / 205 px |

Butonun merkezine yapılan tıklama bandın `<h2>`'sine gidiyordu; adres `/`
olarak kalıyordu.

⚠️ **Asıl kötü kısım görünmeyen kısımdı.** Sarmalayıcı `inset-x-0` ile tam
genişlikteydi ama GÖRÜNEN kart ortada ve en fazla 768 px. Kartın solundaki
ve sağındaki ~330'ar piksellik alan hiçbir şey çizmiyor, her tıklamayı
yutuyordu. Kullanıcının "boşluklara tıklanıyor" dediği şey buydu.

### Düzeltme

1. Sarmalayıcı `pointer-events-none`, görünen kart `pointer-events-auto`.
   Şeffaf alan artık tıklamayı geçiriyor.
2. Bant açıkken vitrin kısalıyor: yüksekliği `ResizeObserver` ile ÖLÇÜLÜP
   `--cerez-bandi-yuksekligi` olarak yayınlanıyor, vitrin `min-height`i
   bunu düşüyor.
3. `min-height` tek başına yetmedi — ölçüldü. Vitrinin kendi 192 px'lik
   dikey boşluğu kalan alanı tek başına aşıyor. Bant açıkken
   `data-cerez-bandi="acik"` bayrağı boşluğu daraltıyor ve kaydırma
   göstergesini gizliyor. Bant kapanınca her şey aynen geri geliyor.
4. Bant kompaktlaştı: düğmeler mobilde de yan yana (alt alta dizildiklerinde
   390×844'te bant 397 px, yani ekranın %47'siydi).

### Kalan sınır — karar gerekiyor

⚠️ **Yüksekliği 720 px'in altındaki ekranlarda vitrin butonları bandın
altında kalmaya devam ediyor** ve bu bir hata değil, bir sığmama:

- 1280×720'de bant çıktıktan sonra kalan alan 484 px
- vitrinin içeriği (üst başlık + H1 + paragraf + butonlar + EİDS satırı)
  sıkıştırılmış hâlde bile 545 px

Sığdırmanın tek yolu onay metnini kısaltmak. **Onu yazmadım** — CLAUDE.md
kural 3: hukuki metinleri avukat verir. Ziyaretçi kaydırarak butonlara
ulaşabiliyor (her ekran boyunda ölçüldü), yani sayfa kullanılabilir; ama
ilk ekranda görünür olması isteniyorsa metnin kısaltılması gerekiyor.

### Sıralama — kırık DEĞİL

"Panelden yapılan sıralama uygulanmıyor" iddiası üç seviyede sınandı ve
üçünde de sıra uygulanıyor:

1. **Yazma** — Local API ile sıra değiştirildi, veritabanına yazıldı ve geri
   okundu.
2. **Çizim (dev)** — değiştirilen sıra sayfada birebir çizildi.
3. **Üretim** — canlı sayfanın bölüm sırası, veritabanındaki KAYITLI sırayla
   eşleşiyor ve koddaki varsayılan sıradan FARKLI. Sayfa prerender
   edilmiyor (`prerender-manifest` yalnızca `_not-found` ve `_global-error`
   içeriyor), yani her istekte yeniden okunuyor.

⚠️ Yanıltıcı bir ipucu vardı: `anasayfa_duzeni.updated_at`, `created_at` ile
aynı kalıyor. Bu global için `updatedAt` hiç güncellenmiyor — "hiç
kaydedilmemiş" gibi görünüyor ama kaydediliyor. Bunu kanıt sanmak yanlış
sonuca götürüyordu.

Üretimde `aslihan` ve `slayt` bölümleri `acik = false`. Sıra çalışıyor;
kapalı olan bölümler panelden açılabilir.

## B — Mahalle haritası: arıza değil, eksiklik

Mahalle sayfasında "Etkileşimli harita hazırlanıyor" yazan **sabit bir
kutu** duruyordu. Mahalle sınırları veritabanındaydı, MapTiler anahtarı
çalışıyordu — sayfaya hiçbir harita bileşeni bağlanmamıştı.

`MiniHarita` eklendi:

- Çizen şey `/harita` ve ana sayfayla **birebir aynı** `Harita3B`. İkinci
  bir harita yazılmadı; stil çözümü, ODbL atfı, WebGL yedeği ve altlık hata
  durumları tek yerde kaldı.
- MapLibre tembel iniyor (443 kB gzip): bölüm görüntü alanına girene kadar
  indirilmiyor.
- POI'ler mahalle merkezinin 3 km çevresiyle sınırlı; Çorlu'nun tamamını tek
  mahallenin haritasına basmak çerçeve dışını boşuna çizmek olurdu.
- Sütun yok: sütunların işi mahalleleri KIYASLAMAK, tek mahallelik haritada
  kıyaslanacak bir şey yok.
- POI tipi → katman eşlemesi `/harita` sayfasının içinden çıkarılıp
  `lib/harita/noktaKatmanlari.ts`'e taşındı. Kopyalansaydı, yeni bir POI
  tipi eklendiğinde bir tarafta sessizce düşerdi.
- Sınır ve merkez yoksa harita kurulmuyor; yerinde neyin eksik olduğunu
  söyleyen boş durum var.

Doğrulandı: gerçek sınır verisiyle tuval 798×448 olarak çiziliyor, atıf
"Mahalle sınırları: © OpenStreetMap katkıcıları" basılıyor.

## C — WhatsApp rengi canlıda yoktu, çünkü hiçbir yere bağlanmamıştı

PR #92 deploy edilmişti: jetonlar canlı CSS'te (`#25d366`, üç jeton da).
Ama `Buton`un `whatsapp` görünümü yalnızca **stil rehberinde ve eşleştirme
testinde** kullanılıyordu. Sitedeki gerçek WhatsApp dokunuş noktalarının
hiçbiri onu kullanmıyordu:

- yüzen düğme → `cam text-metin` (nötr cam yüzey)
- ilan, mahalle, iletişim, ticari sayfalarındaki çağrılar → varsayılan altın

⚠️ Üstelik bunu **kendi testim engelliyordu**: `whatsapp.test.ts` "yeşil
yalnızca `Buton` bileşeninde geçebilir" diyordu ve yüzen düğme bir `Buton`
değil. Kural, jetonu tam da en görünür yerden men etmişti.

Test yeniden yazıldı. Doğru değişmez "nerede" değil, "birlikte": yeşil
zemini kullanan her yer, ön planı (`whatsapp-uzeri`) ve kenarlığı
(`whatsapp-kenar`) da aynı üçlüden almak zorunda. Ayrıca iki yeni iddia:
yüzen düğme yeşili KULLANIYOR ve `href={whatsapp}` olan her sayfa
`gorunum="whatsapp"` bağlamış.

## Kalıcı denetimler

- `scripts/gezinme-dumani.mjs` → `vitrinKontrolu`: ana sayfa açılır,
  **çerez çerezi temizlenir** (bant açık, en kötü durum) ve vitrinin çağrı
  butonlarına **kaydırmadan** tıklanır. Kaydırmamak bilinçli: mevcut
  `baglantiyaTikla` bağlantıyı önce görünür alana kaydırıyor ve bu, tam
  olarak bu arızayı gizliyordu.
- `src/lib/anasayfa/ilkEkran.test.ts` (14 iddia): bandın `pointer-events`
  kuralı, yüksekliğin ölçülerek yayınlanması, kapanışta izin temizlenmesi,
  vitrinin bandı hesaba katması, panel sırasının döngüyle çizilmesi,
  mahalle haritasının gerçek olması ve katman eşlemesinin paylaşılması.
- `src/lib/tasarim/whatsapp.test.ts`: yukarıdaki üç yeni iddia.

## Ölçüm notu

Bu işte ölçüm iki kez kendini kandırdı; ikisi de kaydedilmeye değer:

1. **Çerez kirlenmesi.** Aynı tarayıcı örneğinde önceki koşumun onay çerezi
   kalıyordu; bant hiç çizilmiyor ve arıza "düzelmiş" görünüyordu. Her
   koşumda `Network.clearBrowserCookies` şart.
2. **Kaydırma, arızayı gizliyor.** Ölçüm harness'ine "öğeyi görünür alana
   kaydır, sonra tıkla" eklendiğinde DÜZELTİLMEMİŞ canlı site de geçti.
   Doğru değişmez "kaydırınca tıklanabiliyor" değil, "sayfa açıldığında
   tıklanabiliyor".
