# Gözlemlenebilirlik boş geliyordu — arıza değil, ekran ayırt edemiyordu

**18 Ağustos 2026** · ölçüm · boş durum, tanı

Panel boş açıldı ve akla gelen ilk soru "bozuk mu?" oldu.

## Önce ölçüm: sayaçlar yazılıyor mu?

İki ihtimal ayırt edildi.

**Yerelde:** gün satırı dolu — 37 istek, sayfa/kaynak/cihaz kırılımlarıyla.

**Üretim imajında (asıl soru buydu):** `--target calistirici` imajı gerçek
veritabanına karşı çalıştırıldı, 12 + 1 istek gönderildi, yazma aralığı
beklendi:

```
toplam istek : 14
  /portfoy      12
  /mahalleler    1
  /              1
```

Yani `instrumentation.ts`, proxy ve dakikalık yazma **standalone çıktıda da**
çalışıyor. Bu doğrulama önemliydi: harita worker arızası tam olarak
"yerelde çalışıyor, imajda çalışmıyor" sınıfındandı.

**Sonuç: arıza yok.** Panel boştu çünkü o gün sayılacak ziyaret yoktu —
ama ekran bunu söyleyemiyordu.

## ⚠️ Boş sayfa bir cevap değil, bir soru doğurur

Soruyu yanıtlamak için sunucuya bağlanıp tabloya bakmak gerekti; yani
panelin var olma sebebiyle çelişen bir iş. Ekran artık kendisi ayırt ediyor:

| Görülen | Anlamı |
| --- | --- |
| Bellekte bekleyen sayaç > 0 | Ölçüm **çalışıyor**, henüz yazılmadı |
| Son yazma zamanı var | Yazma da çalışıyor, o gün trafik yok |
| Üçü de sıfır | Gerçekten hiç ziyaret sayılmamış |

Gösterilenler: bekleyen sayfa görüntüleme ve olay sayısı, son yazma zamanı
(Europe/Istanbul), kayıtlı gün sayısı, yazma aralığı.

⚠️ **Asıl ayırt edici bellekteki tampon.** Veritabanı boşken bile "ölçüm
çalışıyor" diyebilmenin tek doğrudan yolu bu. Yalnızca son yazma zamanına
bakılsaydı, hiç yazılmamış bir sistemle bozuk bir sistem aynı görünürdü.

⚠️ Bu okuma yalnızca aynı süreçte anlamlı: panel de sayaçlar da aynı Node
sürecinde. Uygulama yatay ölçeklenirse sayı yalnızca paneli çizen kopyayı
gösterir — `tampon.ts` içindeki notla aynı sınır.

## Veri yokken rakam yığını çizilmiyor

Asıl şikâyet "panel boş" idi; boş tablolarla dolu bir ekran da boş sayılır.
Veri yokken yalnızca tanı kutusu görünüyor, yedi bölüm hiç çizilmiyor.

⚠️ `bos` ölçütü de düzeltildi: eskiden yalnızca "hiç gün satırı yok"
demekti. Dünden kalma bir satır varken bugün trafik olmasa panel yine
boş tablolarla dolardı; artık dönemdeki ziyaret sayısına da bakıyor.
