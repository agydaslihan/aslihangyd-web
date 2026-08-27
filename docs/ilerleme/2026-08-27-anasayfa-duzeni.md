# Ana sayfa düzeni panelden yönetiliyor + arama kutusu ve kurucu bölümü

**Tarih:** 27 Ağustos 2026
**Dal:** `feat/anasayfa-duzeni`

## C1/C2. Bölüm sırası ve görünürlüğü panelden

Yeni global: **Ana Sayfa Düzeni** (`/admin/globals/anasayfa-duzeni`).
On dört bölüm, tutamacından sürükleyerek sıralanıyor; her satırda "Ana
sayfada göster" anahtarı var.

⚠️ **Sıra numarası alanı EKLENMEDİ, sürükle-bırak kullanılıyor.** Sayı
alanı olsaydı iki satıra aynı numarayı yazmak mümkün olurdu ve çakışmayı
çözmek için görünmez bir kural gerekirdi. Payload'ın dizi alanı zaten
tutamaçla yeniden diziyor.

⚠️ **Vitrin (sinematik hero) listede yok.** Sayfanın LCP öğesi; aşağı
alınırsa ön yüklenen hero görseli boşa iner ve mobil performans hedefi
ölçülebilir biçimde düşer. "İlk ekran" bir sıralama tercihi değil, bir
performans sözleşmesi.

⚠️ **Kapatmak silmek değil.** Buradaki anahtar yalnızca ana sayfayı
etkiler; bölümün kendi sayfası varsa açık kalır. Siteden tamamen kaldırmak
için Site Bölümleri kullanılıyor — orası menüyü, altbilgiyi ve site
haritasını da birlikte kapatır. Menü Düzeni'nde verilen ayrımın aynısı:
içerik kodda, görünme Site Bölümleri'nde, sıra burada.

### Sayfa artık sırayı okuyor

`page.tsx` içindeki JSX, anahtar → bölüm haritasına dönüştü; çizim
`duzen.map(...)` ile yapılıyor. Sıra editoryal bir tercih ve her
değiştiğinde bir geliştiricinin JSX taşımasını beklemek onu pratikte
dondurmak demekti.

**Veri kaybına karşı üç kural** (`anaSayfaSirasi`):

1. Tanınmayan anahtar atlanır — bölüm koddan kalkarsa panel kaydı sayfayı
   kırmasın.
2. Tekrar eden anahtar bir kez çizilir; panelde kaydetmeye de izin
   verilmiyor, sebebiyle birlikte hata veriliyor.
3. Kayıtta hiç geçmeyen bölüm **kaybolmaz**, varsayılan komşuluğuna
   yerleşir. Sona atmak kolay olurdu ama yeni bir bölüm kapanış çağrı
   bandının bile altında belirirdi.

Okuma başarısız olursa varsayılan kod sırasına düşülüyor: ana sayfa düzen
kaydına bağımlı değil.

### Slaytların kendi içindeki sıralaması

Zaten vardı ve duruyor: **Ana Sayfa Hero** globalindeki `Slaytlar` bir
dizi alanı, satırlar tutamaçtan sürüklenerek sıralanıyor. İlk slayt
vitrinin tam ekran zemini olduğu için "hangi slayt önce" sorusunun cevabı
o listenin ilk satırı. Slayt **bölümünün** sayfadaki yeri artık Ana Sayfa
Düzeni'nden değiştirilebiliyor — şikâyet edilen "altta kalmış" durumu
buradan düzeltiliyor.

### Panel ekranları birbirine bağlandı

"Ana sayfa bölümleri" ekranı *verisi hazır mı* sorusunu cevaplıyor, *nerede
duruyor* sorusunu değil. İkisinin ayrı olduğunu söylemezsek kullanıcı
sırayı orada arar; ekrana Ana Sayfa Düzeni'ne bağlantı eklendi.

## C3. Arama kutusu simetrisi

Üç eşit açılır menü ve altlarında **tam genişlik** bir buton vardı. Buton
üç alanın toplamı kadar yer kaplayınca formun ağırlık merkezi aşağı
kayıyor, "Ara" bir eylem değil bir bant gibi görünüyordu.

Masaüstünde buton artık dördüncü kolon: alanlarla aynı hizada, genişliği
içeriği kadar. Mobilde tek kolona düşüyor ve dikey yığılma korunuyor —
dar ekranda tam genişlik buton doğru cevap.

### Renk: "koyu lacivert" aslında paletin içindeydi

⚠️ Buton `--color-koyu-bant` kullanıyordu; o da `notr-900` = `#1c1c1c`.
Yani lacivert değil, neredeyse siyah — ve Aurora paletinin **içinde**.
Sorun rengin palet dışı olması değil, **rolünün** yanlış olmasıydı.

Artık `Buton`un altın görünümü kullanılıyor (kenarlık ve mürekkep metin
oradan geliyor: altın zemin sayfadan 2,28:1 ayrışıyor, WCAG 1.4.11 için
3:1 gerekiyor; üzerinde beyaz 2,36:1 kalırdı).

⚠️ **Bu bilinçli bir istisna.** `Buton`un `koyu` görünümü "form gönderimi
altın harcamasın" diye seçilmişti ve gerekçe hâlâ geçerli: dolu altın
nadir kaldıkça değerli. Aslıhan'ın açık talebiyle dolu altın üçüncü
yüzeye açıldı (başlıktaki değerleme çağrısı, gizli portföy erişimi,
buradaki arama). `disiplin.test.ts` izin listesi ve üst sınırı bu
gerekçeyle güncellendi — kural gevşetilmedi, istisna eklendi. Dördüncüsü
isteniyorsa önce bu üçünden biri düşmeli.

### Kaçak renk taraması

Tüm kaynak tarandı:

- Tailwind'in varsayılan renk aileleri (`slate`, `blue`, `emerald`, …):
  **sıfır kullanım.**
- Ham hex: yalnızca gerekçesi yazılı ve testle bağlı dört dosyada
  (tema anahtarı, marka renk alanı, sosyal görsel, kök hata ekranı).
- `text-white` / `bg-black`: yalnızca fotoğraf üzeri katmanlarda ve
  bunların kendi izin listesi testi var.

**Kaçak renk yok.** Palet tutarlı.

## C4. "Fotoğraf hazırlanıyor" kutusu

İki ayrı hata birden vardı:

1. **Panelde portre YÜKLÜYKEN bile** boş kutu görünüyordu — bölüm
   `Hakkımızda` globalindeki `portre` alanını hiç okumuyordu. Panelin
   "Ana sayfa bölümleri" ekranı ise "Portre yüklü; bölünmüş düzen
   fotoğrafla çiziliyor" diyordu. Ekran doğruyu söylemiyordu.
2. Portre gerçekten yokken de şartnameye aykırıydı: "portre yoksa
   tipografik blok, boş çerçeve gösterme".

Artık portre varsa fotoğraf, yoksa tipografik blok çiziliyor: aynı 4/3
kutuyu dolduruyor (CLS 0), ad ve unvan büyük puntoyla duruyor, altın bir
saç çizgisi ayırıyor. Uydurma içerik yok — sayfanın zaten söylediği
şeyler, büyük yazılmış hâli.

⚠️ Stok fotoğraf hâlâ yasak: olmayan bir yüzü olmuş gibi göstermek,
"kurumsal güven" anlatısının tersi.

## Kalıcı denetim: `src/lib/anasayfa/duzen.test.ts`

11 iddia. En önemlisi: **katalog ile sayfadaki çizim haritası birebir aynı
olmalı.** Ayrışırsa iki sessiz arıza doğar — panelde seçilebilen ama
hiçbir şey çizmeyen bir satır, ya da çizilen ama sıralanamayan bir bölüm.
Ayrıca vitrinin sıralanabilir listede olmadığı da denetleniyor.

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (104 dosya, 2117 test) ·
`pnpm build` temiz. Gezinme dumanı 36 genel rotanın tamamında, iki kipte
geçiyor. Sıralama ve aç/kapa uçtan uca denendi: panelden `anlati` kapatıldı
ve sayfadan kalktı, sıra değiştirildi ve HTML'e yansıdı.
