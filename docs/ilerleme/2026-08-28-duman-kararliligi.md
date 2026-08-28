# Gezinme duman testi kararsızdı — üretimde ölçülüp düzeltildi

**Tarih:** 28 Ağustos 2026
**Dal:** `fix/duman-kararliligi`

## Belirti

Duman testi CI'da (yerel, demo veri, 36 rota) tutarlı geçiyordu. **Üretime
karşı** koşturulunca (50 rota, 26 gerçek mahalle kartı, ağ üzerinden)
"hareket AÇIK" kipinde her koşumda **farklı** bir bağlantıda düştü:

```
geçiş /mahalleler → /mahalleler/sarilar: adres sapmış: .../mahalleler/muhittin
geçiş /mahalleler → /mahalleler/turkgucu: adres sapmış: .../mahalleler/seyhsinan
```

Her seferinde başka bir kart — arızanın değil kararsızlığın imzası.

## Bunlar gerçek bulgu değildi

Aynı bağlantılar elle denendi ve **sorunsuz açıldı**. "Az hareket" kipi
47/47 geçiyordu. Sebep site değil, testin zamanlaması: masaüstünde Lenis
kaydırmayı kendi eğrisiyle sürüyor ve koordinat okunduktan sonra sayfayı
oynatmaya devam ediyor. Üç CDP turu sonra tıklama **komşu karta** gidiyordu.

⚠️ **Bu, düzeltilmesi zorunlu bir sınıf.** Sahte hata üreten ENGELLEYİCİ
bir denetim birkaç koşum sonra kapatılır — ve kapatılan denetim yoktur.

## Üç düzeltme, üçü de ölçümle doğrulandı

| Düzeltme | Sonuç |
|---|---|
| `scrollIntoView` yerine **kesin hedef konuma** `scrollTo` ve oraya varıldığının doğrulanması | 3 → 2 sorun |
| Tıklamadan **hemen önce** koordinatın son kez doğrulanması | 2 → 1 sorun |
| Adres **hiç değişmediyse** tıklamaya bir tekrar hakkı | 1 → 0 sorun |

⚠️ **Hedef zayıflatılmadı.** Üstteki katman denetimi (`elementFromPoint`)
duruyor ve gerçek bir örtü hâlâ yakalanıyor. Tekrar hakkı yalnızca adres
**hiç değişmediğinde** kullanılıyor: yanlış bir sayfaya gidilmişse bu bir
bulgudur ve tekrarlanmaz. Fiziksel bir eylemi tekrarlamak iddiayı
zayıflatmıyor; iddia hâlâ "bağlantıya tıklanınca sayfa açılmalı".

## Sonuç

```
Genel rota: 50 · Panel rotası: 0
✓ hareket AÇIK   — sorun yok · 47 bağlantı tıklandı
✓ az hareket     — sorun yok · 47 bağlantı tıklandı
```

`pnpm test` (105 dosya, 2155 test) ve `pnpm lint` temiz.
