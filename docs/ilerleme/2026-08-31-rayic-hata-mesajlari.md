# 31 Ağustos 2026 — Rayiç içe aktarma: hata mesajları ve örnek dosya

"Belediyeden alınan rayiç verisi işlenmiyor."

## Önce teşhis: ayrıştırıcı zaten doğruydu

İlk şüphe Türkçe sayı biçimiydi. Ölçüldü — `lib/csv/ayristir.ts` **iki
biçimi de** tanıyor:

```
'12.500,50'   → 12500.5   ✓
'12,500.50'   → 12500.5   ✓
' ₺ 12.500,50 ' → 12500.5 ✓
'12.500 TL/m²' → null
```

Yani sorun ondalık ayracı değil. Okunamayan bir hücre neredeyse hep
**başka bir şey** içeriyor: birim ("12.500 TL/m²"), açıklama ya da
birleştirilmiş hücre artığı. Asıl sorun, mesajın bunu söylememesiydi.

⚠️ Bir belirsizlik kaydedilmeye değer: `1,234` iki şey olabilir — bin iki
yüz otuz dört (İngilizce binlik) ya da bir tam iki yüz otuz dört (Türkçe
ondalık). Ayrıştırıcı **tek virgülü ondalık sayıyor**. Doğru tercih bu:
veri Türkçe kaynaklardan geliyor ve rayiç bedelde kuruş yazmak yaygın.
Yanlış tercih bin kat sapma üretirdi; bu tercih en fazla küsurat farkı.
Davranış artık testle belgeli.

## Mesajlar üç şeyi birden söylüyor

Eskiden: `Bina rayiç bedeli okunamadı: "12.500 TL/m²".`
Altı sütunlu bir dosyada hangi sütuna bakılacağını da, neyin beklendiğini
de söylemiyor.

Şimdi:

> **4. sütun "Bina m² Rayiç" (Bina m² rayiç bedeli):** "12.500 TL/m²"
> okunamadı. Beklenen: yalnızca sayı. `12.500,50` ve `12,500.50` biçimleri
> de okunur; ama hücrede birim ("TL", "₺/m²") ya da açıklama varsa
> okunamaz.

Satır numarası zaten vardı (başlık 1, veri 2'den başlıyor). Eklenen:
**sütunun sırası, dosyadaki başlığı ve alan adı** — üçü birden, çünkü
belediye tablolarında aynı başlıktan iki tane olabiliyor ve yalnızca ad
hangisini kastettiğimizi söylemiyor.

Aynı düzeltme diğer mesajlarda da:

| Durum | Ne eklendi |
| --- | --- |
| Mahalle eşleşmedi | Beklenen kaynak + "yazım farklıysa düzeltin, gerçekten yoksa önce ekleyin" |
| Yıl okunamadı | Beklenen aralık: 1990–2100, dört hane |
| Satırda rakam yok | Hangi **iki** sütunun birlikte boş olduğu |
| Sıfır/negatif | Görülen değer + beklenen |
| Kaynak tanınmadı | Tanınan değerlerin listesi |
| Dosya boş | ".xlsx doğrudan okunamaz, CSV UTF-8 olarak kaydedin" |
| Başlık okunamadı | "Tablonun üstünde başlık/logo/boş satır varsa silin" |

## Örnek CSV indirilebilir

⚠️ Örnek dosya bir süs değil, hata mesajının tamamlayıcısı. "Sütun adları
tanınmadı" hatasının en ucuz çözümü, doğru sütun adlarını içeren bir
dosyayı kullanıcının eline vermek — belediye tabloları PDF/Excel geliyor
ve sütun adları her belediyede farklı.

⚠️ **İki sayı biçimi de örnekte var** (`12.500,50` ve `9,750.25`).
"Ondalık ayracını değiştireyim mi?" sorusunu dosyanın kendisi kapatıyor.

⚠️ **BOM şart.** Excel, BOM'suz UTF-8 dosyayı Latin-1 sanıp Türkçe
karakterleri bozuyor; indirdiği örneği açan kişi "Muhittin" yerine
"MuhÄ±ttÄ±n" görürdü.

Bir test, örnek dosyanın başlıklarının ayrıştırıcının tanıdığı adlarla
eşleştiğini **ve satırlarının hatasız çözümlendiğini** denetliyor —
ayrıştıkları gün hatayı örnek dosya üretmiş olurdu.

## Aslıhan'dan beklenen

Gerçek dosya hâlâ gerekiyor. Ama artık dosya gelmeden önce hata mesajı
net: hangi satır, hangi sütun, ne bekleniyordu. Dosya geldiğinde
okunmuyorsa sebebi ekranda yazacak.

15 iddia: `src/lib/rayic/hataMesajlari.test.ts`.
