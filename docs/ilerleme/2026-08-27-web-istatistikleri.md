# Web istatistikleri — Gözlemlenebilirlik paneli genişletildi

**Tarih:** 27 Ağustos 2026
**Dal:** `feat/web-istatistikleri`

Mevcut panel genişletildi; sıfırdan yazılmadı. Ölçüm boru hattı aynen
duruyor: Katman A (onaysız, sunucu sayacı) + Katman B (yalnızca analitik
onayı) → bellek tamponu → dakikada bir gün satırına yazma.

## Eklenen raporlar

| Rapor | Katman | Nasıl |
|---|---|---|
| Giriş sayfaları | A | Yönlendireni bizden olmayan istek = giriş |
| Çıkış sayfaları | B | Sekme kapanırken bir kez |
| Sayfa yolu (dizi) | B | En fazla üç **kaba adım**, k≥2 |
| Ülke ve şehir | A | Cloudflare başlığı, şehirde k=5 |
| Tarayıcı ailesi | A | Sürümsüz altı kova |
| Ekran genişliği | B | Beş bant |
| Saat ve gün yoğunluğu | A | 0–23 kovası + gün satırının tarihi |
| Hemen çıkma / oturum derinliği | B | Dört bant |
| WhatsApp tıklamalarının kaynağı | B | Rota, otomatik ayrıntı |
| Sonuçsuz aramaların ölçütleri | B | Yalnızca **ölçüt adları** |
| Arama kelimeleri | — | Google Search Console |

Zaten var olan ve genişletilmeyen: yüksek niyet hunisi, lead başına
görüntüleme sıralaması, değerleme akışı, fiyat bantları, mahalleler,
kaynaklar, teknik sağlık, Core Web Vitals.

## KVKK sınırı — pazarlığa kapalı kısım aynen duruyor

- IP okunmuyor, oturum kimliği üretilmiyor, tek ziyaretçi profili yok.
- Şemada ziyaretçiye ait satır yok; testler böyle bir alanın eklenmesini
  engelliyor.
- Katman B onay olmadan çalışmıyor.
- Ham kayıt 90 gün.

### Yeni boyutların her biri bir korumaya bağlandı

⚠️ **Tehlike tek tek alanlarda değil, BİRLEŞİMDE.** Çözünürlük + tarayıcı +
saat + gezinme sırası, tarayıcı parmak izinin ta kendisi. Bu yüzden:

- **Tarayıcı:** sürüm alınmıyor, altı kaba kova. Ham `User-Agent` hiçbir
  yere yazılmıyor.
- **Ekran:** tam çözünürlük değil, beş bant.
- **Oturum derinliği:** ham sayfa sayısı değil, dört bant. "Oturum" bir
  sekme demek; sayı ziyaretçinin kendi tarayıcısında sayılıyor.
- **Sayfa yolu:** dizi ziyaretçinin sekmesinde kalıyor; sunucuya en fazla
  üç **kaba adım** (slug atılmış: `/portfoy.detay`) gidiyor. Raporda tek
  kez görülen diziler listelenmiyor (k≥2).
- **Şehir:** üç koruma — kaydetmede harf/boşluk süzgeci ve 40 karakter,
  gösterimde k=5, saklamada 90 gün. Ülke silinmiyor, şehir siliniyor.
- **Sonuçsuz arama:** yalnızca ölçüt ADLARI (`fiyat+mahalle`), değerler
  değil. İkisi birleşince tek bir arama yeniden kurulabilirdi.

### Ziyaretçi bazlı takip ayrımı yazıldı

`docs/KVKK-ANALITIK.md` içine yeni **5b** bölümü eklendi: bu tarafta olan
ve öteki tarafta olan ayrımı bir tabloyla, ardından **avukata sorulacak
yedi madde**. Kapanış cümlesi: bugünkü şema ziyaretçi bazlı takibi yapısal
olarak imkânsız kılıyor; o çizgiyi geçmek bir ayar değil şema değişikliği.

## Arama kelimeleri — Google Search Console

⚠️ **Bu bölüm bizim ölçümümüz değil.** Ziyaretçinin Google'a ne yazdığını
göremiyoruz; yönlendiren başlığı yıllardır arama terimini taşımıyor.
Buradaki veri Google'ın kendi arayüzünden, zaten toplulaştırılmış hâlde
geliyor. Sitede hiçbir kod çalışmıyor, hiçbir çerez yazılmıyor.

⚠️ **Kütüphane eklenmedi.** `googleapis` bu tek çağrı için onlarca megabayt;
gereken şey imzalı bir JWT ve bir `fetch`. Node'un yerleşik `crypto`'su
ikisini de karşılıyor. Kapsam salt okunur (`webmasters.readonly`).

⚠️ **Anahtar yoksa sayı uydurulmuyor:** bölüm "yapılandırılmadı" yazıyor ve
neyin eksik olduğunu söylüyor. Sıfırlarla dolu bir tablo "arama trafiği
yok" gibi okunurdu; doğru cevap "bakamıyoruz". Üç ayrı durum var
(yapılandırılmadı / erişilemedi / veri geldi) ve üçü farklı şey söylüyor.

## Ölçüm sırasında bulunan iki gerçek hata

### 1. Site içi gezinme "giriş sayfası" sayılıyordu

`nextUrl.host` yapılandırılmış ana bilgisayar adını veriyor
(`localhost:3210`), isteğin gerçekte hangi adrese yapıldığını değil.
Ziyaretçi `127.0.0.1` üzerinden bağlandığında yönlendiren `127.0.0.1`,
karşılaştırılan değer `localhost` oluyordu ve **site içi her geçiş dış
yönlendiren sanılıyordu.**

Üretimde ikisi aynı olduğu için görünmüyordu — yani hata tam da sayıları
doğrulamaya çalıştığımız ortamda çıkıyordu. Artık `Host` başlığı okunuyor
(tarayıcının gerçekten kullandığı adres) ve port karşılaştırma öncesi
atılıyor.

Ölçümle yakalandı: yerelde site içi dört geçişin dördü de giriş sayıldı;
düzeltmeden sonra sıfır.

### 2. Bant etiketleri olay ucunun süzgecinden geçmiyordu

Olay ucu ayrıntıyı harf/rakam/tire/nokta/eğik çizgiyle ve 40 karakterle
sınırlıyor — arama kutusuna yazılan bir cümle oraya sızmasın diye.
İlk yazdığım etiketler bu süzgeçten **geçemiyordu**:

- `<640`, `1920+`, `7+` → `<` ve `+` yasak
- `" > "` ayırıcısı → boşluk yasak
- Slug taşıyan üç adımlık dizi → 40 karakteri kat kat aşıyor

Hepsi **sessizce düşerdi**: panelde "veri yok" görünür, sebebi hiçbir yerde
yazmazdı. Kaydetmeden önce yakalandı.

Çözüm: etiketler süzgece uygun (`0-639`, `1920-ustu`, `7-ustu`), ayırıcı
boşluksuz `>`, adımlar slug'sız (`/portfoy.detay`) ve sınır 64. **Boşluk
yasağı duruyor** — cümleyi cümle yapan şey o. Kablo değeri ile ekran metni
ayrıldı: panelde "7 ve üzeri" yazıyor.

⚠️ Slug atmak yalnızca uzunluk çözümü değil, mahremiyet kazancı: slug
taşıyan diziler tek ziyarete ait olacak kadar seyrekleşirdi.

## Performans

Rapor sorguları **önceden hesaplanmış gün satırlarından** okuyor; ham kayıt
sorgusu yok. İstek başına DB yazma kuralı aynen duruyor: yeni boyutlar da
bellek tamponunda toplanıp dakikada bir tek `update` ile yazılıyor.

Grafik kütüphanesi eklenmedi: saat yoğunluğu 24 çubukla, yükseklik
yüzdesiyle çiziliyor ve `role="img"` + `aria-label` ile ekran okuyucuya da
sayılarla anlatılıyor.

## Kalıcı denetim: `src/lib/olcum/istatistik.test.ts`

35 iddia. Öne çıkanlar:

- Tarayıcı kovası hiçbir zaman rakam içermiyor (sürüm sızmıyor).
- Şehir adı serbest metin olamıyor; sahte `CF-IPCity` ile enjeksiyon yok.
- Üretilen yol dizisi ve bütün bant etiketleri **olay ucunun süzgecinden
  geçiyor** — sessiz düşme sınıfı teste bağlandı.
- k-anonimlik satır atmıyor, "Diğer"e topluyor: toplam korunuyor.
- k eşikleri (şehir 5, yol 2) aşağı çekilemiyor.
- 90 gün temizliği şehir kırılımını da kapsıyor.
- Proxy hâlâ IP başlığı okumuyor (yorumlar ayıklanarak denetleniyor).

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (105 dosya, 2155 test) ·
`pnpm build` temiz.

Uçtan uca denendi: yeni beş olay 204 alıp veritabanına yazıldı, giriş
sayfası sayacı site içi geçişleri artık saymıyor, panelde on altı bölümün
tamamı çiziliyor ve tek görülen yol dizisi "Seyrek diziler" kovasına
düşüyor (k-anonimlik çalışıyor).
