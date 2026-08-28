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

## Beş sağlamlaştırma denendi, hiçbiri yarışı KALDIRMADI

| Deneme | Sonuç |
|---|---|
| `scrollIntoView` yerine kesin hedef konuma `scrollTo` | üretimde 3 → 2 sorun, **CI'da bozdu** (geri alındı) |
| Tıklamadan hemen önce koordinatın son kez doğrulanması | 2 → 1 |
| Adres hiç değişmediyse tıklamaya tekrar hakkı | 1 → 0 (ama sonraki koşumda yine 2) |
| Iskalayınca yeniden hedefleyip tıklama | 2 → 2 |
| Beş ardışık örnekle durgunluk ölçütü | bir koşum temiz, sonraki 2 sorun |

Hepsi kararsızlığı **seyreltti**, hiçbiri ortadan kaldırmadı. Sebep açıktı:
yarışın kaynağı **koordinatın kendisi**. Ölçüm ile CDP'nin olayı göndermesi
arasında üç tur var ve Lenis o üç turda sayfayı oynatabiliyor.

## Çözüm: koordinatı denklemden çıkarmak

Bağlantılar artık **odak + Enter** ile açılıyor. Koordinat yok, yarış yok:
olay doğrudan öğeye gidiyor, sayfa oynasa bile hedef değişmiyor.

⚠️ **Üstteki katman denetimi kaybolmuyor.** `elementFromPoint` ölçümü
duruyor ve bulgu olarak raporlanıyor — yalnızca TIKLAMA yolu değişti. O
denetim gezinmeye bağlı olmadığı için tekrarlanabiliyor ve kararsız değil;
ilan kartlarındaki örtü arızası bugün de yakalanır.

⚠️ **Kapsam artıyor:** bağlantının klavyeyle odaklanabildiği ve Enter'la
açıldığı da doğrulanmış oluyor — talimatın ayrıca istediği şey. Odaklanamayan
bir bağlantı artık kendi başına bir bulgu.

## Sonuç — üç ardışık temiz koşum

```
YEREL (CI benzeri, 36 rota)   ✓ hareket AÇIK 33/33   ✓ az hareket 33/33
ÜRETİM (50 rota)  1. koşum    ✓ hareket AÇIK 47/47   ✓ az hareket 47/47
ÜRETİM (50 rota)  2. koşum    ✓ hareket AÇIK 47/47   ✓ az hareket 47/47
```

`pnpm test` (105 dosya, 2155 test) ve `pnpm lint` temiz.
