# 1 Eylül 2026 — main kırmızıydı: kaybolan iki tablo

## Belirti

`#105` merge edildikten sonra main'deki CI, göç tazeliği kapısında
kırıldı:

> Kod, göçlerde karşılığı olmayan bir şema değişikliği içeriyor.

Kapının istediği göç `olcek_duzeltmeleri` tablolarını kuruyordu — **oysa o
göç zaten depoda vardı** (`20260831_160416_olcek_duzeltmeleri.ts`) ve
temiz bir veritabanına uygulandığında tablolar kuruluyordu.

## Kök neden — veritabanı değil, ANLIK GÖRÜNTÜ

⚠️ `payload migrate:create` ayrışmayı veritabanına bakarak bulmuyor. **En
son göçün `.json` şema anlık görüntüsüne** bakıyor ve her göç, üretildiği
dalın gördüğü şemanın TAMAMINI yazıyor.

İki dal paralel ilerlediğinde bu sessizce kırılıyor:

| Sıra | Dal | Anlık görüntü |
| --- | --- | --- |
| 1 | `feat/olcek-duzeltme` | 73 → **75** tablo (`olcek_duzeltmeleri` + satırlar) |
| 2 | `feat/corlu-anlatisi` | 72 → **73** tablo (A dalını hiç görmedi) |
| 3 | ikisi de main'e girdi | en son görüntü **73** — A'nın iki tablosu kayboldu |

Göç dosyası doğru, veritabanı doğru, kapı yine de her koşumda kırılıyor.

⚠️ **Çözüm göç yazmak DEĞİLDİ.** Yeni bir göç yazmak, üretimde zaten var
olan tabloları ikinci kez `CREATE TABLE` etmeye çalışırdı — dağıtım
sırasında hata. Yapılan: en son anlık görüntüyü (`20260831_164941_
corlu_anlatisi.json`) eksik iki tabloyla tamamlamak. Kimlik zinciri
(`id`/`prevId`) korundu; yalnızca şema içeriği tazelendi.

Temiz bir veritabanında doğrulandı: bütün göçler uygulandı, ardından
CI'ın kapısı birebir çalıştırıldı → **yeni göç üretilmedi**.

## Bu bir daha sessizce olmasın

`src/lib/dokuman/gocAnlikGoruntusu.test.ts`: en son anlık görüntü, daha
önceki herhangi bir görüntüde geçen her tabloyu taşımak zorunda — bir göç
o tabloyu açıkça `DROP TABLE` etmiyorsa.

⚠️ Test **ara adımları değil son durumu** kilitliyor. Aynı kayıp geçmişte
dört kez daha olmuş ve kendiliğinden düzelmiş: `portfoy_bolumleri`
(+ `_siralar`) 6 Ağustos, `hakkimizda` (+ `_ek_gorseller`) 16 Ağustos.
Geçmiş yeniden yazılamaz; bundan sonrası garanti edilebilir.

CI dosyasına da kapının bu yanlış pozitifi nasıl ürettiği yazıldı —
"eksik göç yaz" diye okunup üretimi kıracak bir göç eklenmesin diye.
