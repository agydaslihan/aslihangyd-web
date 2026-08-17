# İlerleme kaydı bölündü, göç indeksi depodan çıktı

**17 Ağustos 2026** · süreç · birleştirme çakışmaları

Dört açık PR'ın dördü birden `docs/ILERLEME.md` yüzünden çakıştı. Bu, üst
üste üçüncü turdu; her turda elle çözülüyor ve maliyeti birikiyordu.

## Teşhis: çakışan içerik değil, ŞEKİL

Her dal aynı yere yazıyordu — dosyanın sonuna. **Aynı satır aralığına iki
farklı ekleme yapan iki dal, git'in üç yollu birleştirmesinde daima
çakışır.** İçerik ilgisiz olsa bile: git iki tarafın da "burayı ben
değiştirdim" demesine bakar, ne yazdıklarına değil.

Aynı hastalık ikinci bir dosyada da vardı: `src/migrations/index.ts`.
Payload her `migrate:create` çağrısında oraya bir satır ekliyor; göç içeren
her ikinci PR çakışıyordu.

## ⚠️ Elenen çözüm: kaydı dosyanın BAŞINA eklemek

Öneri makul görünüyor ama **çalışmaz**. Git satır aralığına bakar, dosyadaki
konuma değil: 1. satıra ekleyen iki dal da tıpkı sona ekleyen ikisi gibi
çakışır. Bu, çakışmayı ortadan kaldırmaz, yerini değiştirir — ve sona
ekleyenlere göre tek avantajı, çözerken bağlamın daha kısa olması.

Bir turda dört PR varken "çözmesi biraz daha kolay çakışma" yeterli bir
kazanç değil. Aranan şey çakışmanın olmaması.

## ⚠️ Elenen çözüm: üretilen dizin (indeks) dosyası

Kayıtları ayrı dosyalara bölüp bir de `ILERLEME.md` içinde dizin tutmak ilk
akla gelen. Ama dizin de her PR'da bir satır alır — yani çakışma dosyayı
değiştirip aynen geri gelir. Üretilmiş olması bir şey değiştirmez: git
üretilmiş satırı da satır sayar.

Dizin tutulmuyor. Sıralamayı **dosya adı** taşıyor (`YYYY-AA-GG-` önekli),
listeleme zaten kronolojik.

## Uygulanan çözüm

Çakışmayı gerçekten ortadan kaldıran tek şey **iki dalın aynı dosyaya
dokunmaması**.

- Yeni kayıtlar `docs/ilerleme/YYYY-AA-GG-kisa-ad.md` altında, PR başına bir
  dosya.
- `docs/ILERLEME.md` arşiv oldu: 17 Ağustos 2026 öncesinin tarihçesi olduğu
  gibi duruyor, yazılmıyor.
- `src/migrations/index.ts` depodan çıktı (`.gitignore`).

## ⚠️ Göç indeksi neden kaldırılabildi — varsayılmadı, ölçüldü

Payload bu dosyaya **ihtiyaç duymuyor**: göçleri `migrationDir` altındaki
dizini okuyarak buluyor ve kaynak kodda hiçbir yer indeksi içe aktarmıyor.

Ölçüm, üretimde göçü çalıştıran gerçek yolda yapıldı — göçmen imajının
kendisinde:

```
$ docker build --target gocmen …
$ docker run … sh -c "rm -f src/migrations/index.ts && pnpm payload migrate:status"
→ yirmi göçün tamamı eksiksiz listelendi
```

`migrate:create` dosyayı yeniden üretmeye devam ediyor; sorun değil, git'e
girmiyor.

## Kuralı ayakta tutan denetimler

Kural yazılı bir gelenek olarak bırakılsaydı ilk yoğun turda unutulurdu —
nitekim "ILERLEME.md'yi güncelle" alışkanlığı tam da böyle yerleşmişti.

- `src/lib/dokuman/ilerleme.test.ts` — arşivin **son satırı** bir nöbetçi
  yorum; sona ekleme yapan PR kendi turunda kırmızı alır, bir sonraki PR
  çakışmadan önce. Ayrıca kayıt dosyalarının ad kalıbını ve başlığını
  denetliyor (dizin olmadığı için sıralama ada bağlı).
- `src/lib/gocIndeksi.test.ts` — indeks izlenmiyor, yok sayma kuralı
  yerinde, kaynak kodda ona başvuran yok.

⚠️ Üçüncü denetim ilk yazıldığında hep kırmızıydı: `git grep` eşleşme
bulamayınca 1 ile çıkıyor ve `execFileSync` bunu hata sayıyor. Aranan sonuç
tam olarak "eşleşme yok" olduğu için o çıkış kodu yakalanıyor.

## ⚠️ İndeksi izlemeden çıkarmanın iki yan etkisi çıktı — ikisi de kapatıldı

**1. `src/lib/depo.test.ts` haklı olarak kırmızı verdi.** O test "src içinde
git tarafından yok sayılan dosya yok" diyor ve sebebi gerçek: 7 Ağustos'ta
`src/components/medya/` sessizce depoya girmemiş, dört kapı da temiz
geçmişti.

Kural **gevşetilmedi**. Gerekçeli muafiyet mekanizmasına yazıldı, çünkü
kuralın gerekçesi "çalışma anında gereken dosya sessizce eksik kalmasın" —
ve bu dosya çalışma anında gerekmiyor.

**2. Diskte kalan eski bir kopya tip kontrolünü düşürdü.** Dal değiştirince
izlenmeyen dosya yerinde kalıyor ve artık var olmayan bir göçü içe
aktarıyordu:

```
src/migrations/index.ts(22,64): error TS2307:
  Cannot find module './20260816_203141_marka_baslik_eylemi'
```

Dosya `tsconfig.json` içinde tip kontrolü dışına alındı. İzlenmeyen bir
ÜRETİLMİŞ dosyanın kapıyı kapatması, kapıyı anlamsızlaştırır.

⚠️ Üçüncü küçük tuzak: `gocIndeksi.test.ts` içindeki `git grep` aradığı
dizgeyi kendi kaynağında buluyordu ve denetim hiçbir zaman yeşil
olamıyordu. Test dosyaları aramadan dışlandı.
