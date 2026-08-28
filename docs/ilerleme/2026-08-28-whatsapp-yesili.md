# WhatsApp marka yeşili + Cloudflare konum başlığı sınırı

**Tarih:** 28 Ağustos 2026
**Dal:** `feat/whatsapp-marka-rengi`

## WhatsApp butonu artık marka yeşili

Önceki karar tersiydi ve gerekçesi kayıtlıydı: *"kurumsal yeşil sayfadaki
tek parlak renk olurdu ve sakin paleti bozardı; tanınırlık ikondan gelir."*
Aslıhan tanınırlığı öne aldı ve kararı değiştirdi. Gerekçe silinmedi;
hangisinin neden geçersiz kaldığı `Buton.tsx` içinde yazılı.

### Ölçüm, "beyaz metin" refleksini çürüttü

| Zemin | Beyaz metin | Mürekkep metin | Açık zemine karşı sınır |
|---|---|---|---|
| **#25D366** (marka) | **1,98** ✗ | **7,56** ✓ | 1,86 ✗ |
| #128C7E | 4,14 ✓ | 3,63 ✗ | 3,87 ✓ |
| #075E54 | 7,67 ✓ | 1,95 ✗ | 7,18 ✓ |

Talimat "beyaz ikon geçmiyorsa #128C7E kullan" diyordu. Ölçüm üçüncü bir
yol gösterdi: **markanın kendi yeşili, mürekkep metinle 7,56:1 veriyor.**
Yani rengi koyulaştırmaya gerek yoktu — değiştirilmesi gereken zemin değil
ÖN PLANDI. Altın butonda verilen kararın aynısı.

⚠️ Zemin sınırı ayrı bir sorun: #25D366 açık sayfa zemininden yalnızca
1,86:1 ayrışıyor, WCAG 1.4.11 bileşen sınırı için 3:1 istiyor. Kenarlık
**#128C7E** bunu 3,87:1'e çıkarıyor — talimattaki alternatif renk, zemin
değil **kenarlık** olarak işe yaradı.

Sonuç: `#25D366` zemin · mürekkep metin · `#128C7E` kenarlık. Üçü de
geçiyor, marka rengi aynen duruyor.

### Palet skalasına karışmıyor

Üç jeton `globals.css` içinde ama **marka panelinin yuvalarında değil**:

- `--color-whatsapp-yesil`
- `--color-whatsapp-kenar`
- `--color-whatsapp-uzeri`

⚠️ Ayrılık estetik değil **sahiplik**: Aurora'nın nötr+altın skalası
markanın kendi sesi, WhatsApp yeşili başka bir markanın tanınma rengi.
Aynı skalada olsalardı paleti değiştiren kişi farkında olmadan WhatsApp'ın
rengini de bozardı.

⚠️ **Palet dışı olmak kontrast kapısından muaf olmak değil.** Marka paneli
kaydedilen paletleri AA'ya karşı ölçüyor; bu jetonlar panele hiç girmediği
için o kapıdan geçmiyorlar. Boşluk `lib/tasarim/whatsapp.test.ts` ile
kapatıldı: aynı eşikler, aynı hesap, bu sefer testle. Yedi iddia —
bunlardan biri **beyaz metnin geçmediğini** doğruluyor, yani bir
davranışı değil bir gerekçeyi koruyor.

## Cloudflare konum başlıkları — sınır koda bağlandı

"Add visitor location headers" açıldığında Cloudflare yalnızca şehri değil
`CF-Region`, `CF-Region-Code`, `CF-Postal-Code`, `CF-IPLatitude`,
`CF-IPLongitude`, `CF-Timezone` ve `CF-Metro-Code` başlıklarını da
gönderiyor.

⚠️ **Posta kodu Çorlu ölçeğinde tek mahalleyi işaret eder.** Gün ve
sayfayla birleştiğinde "o mahalledeki o kişi" demektir; k-anonimlik eşiği
bile kurtarmaz çünkü sorun toplulaştırmada değil, alanın çözünürlüğünde.
Enlem/boylam daha da kötü.

İki kapı birlikte kapatıldı (`istatistik.test.ts`):

1. **Okumamak** — proxy'nin bu sekiz başlığın hiçbirine dokunmadığı
   denetleniyor.
2. **Saklayacak yer bırakmamak** — şemada `postaKodu`, `bolge`, `enlem`,
   `boylam`, `koordinat` alanı olmadığı denetleniyor.

Biri açılırsa diğeri anlamsızlaşırdı; kullanıcı yetkilerindeki "üç kapı"
kuralının aynısı.

⚠️ **Ayar açıldığında doğrulama kendiliğinden gelecek:** bugün
`gozlem_gunluk_sehirler` tablosunun tamamı `bilinmiyor` (4332 kayıt).
Şehir adları dolmaya başladığı an başlık geliyor demektir.

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (106 dosya, 2164 test) ·
`pnpm build` temiz. Buton canlı jetonlarla çizilip ölçüldü:
zemin `rgb(37,211,102)`, metin `rgb(28,28,28)`, kenarlık `rgb(18,140,126)`.
