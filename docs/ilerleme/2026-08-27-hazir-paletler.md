# Hazır paletler: Pudra ve Bohem

**Tarih:** 27 Ağustos 2026
**Dal:** `feat/hazir-paletler`

Marka ve Görünüm panelindeki hazır palet listesine iki set eklendi. Liste
artık: **Aurora Luxury (varsayılan)** · Klasik lacivert · **Pudra** ·
**Bohem** · Sıcak nötr · *Varsayılana dön*.

## Pudra

Pudra gülü ağırlıklı, sıcak. Nötrler pembeye çalıyor.

⚠️ **Vurgu gülkurusu, pembe değil — ve sebebi kontrast.** Açık pembe bir
vurgu (`#d98c99` gibi) krem zeminde 2:1 civarında kalıyor; kapıdan
geçmiyor. Aynı tonun koyulaştırılmışı (`#8a4250`) hem gülkurusu kimliğini
koruyor hem 4,5:1 eşiğini geçiyor. "Pudra" burada zeminlerin işi;
vurgunun değil.

## Bohem

Terracotta, adaçayı ve altın.

⚠️ **Üç renkli tek set — bilinçli bir risk.** Diğer paletlerde vurgu ile
buton aynı renk; burada ayrı: başlıklar terracotta, eylemler adaçayı.
Üç renk bir arada sakin durabilir ama dördüncüsü kalabalık eder — altın
yalnızca dekoratif çizgide.

⚠️ Adaçayı zemin üzerinde buton metni **krem**, beyaz değil: adaçayı
yeterince koyu olmadığı için beyaz metin eşiğin altında kalıyordu.

## Kontrast kapısı

⚠️ Talimattaki şart (**"her hazır palet kontrast kapısından geçmiş
olmalı"**) zaten kod seviyesinde bağlıydı ve öyle kaldı:
`kontrastKapisi.test.ts` içindeki *"her hazır palet iki temada da kapıdan
geçer"* testi, listedeki **her** paletin **her** temasını sekiz kontrast
çiftinde 4,5:1 eşiğine karşı ölçüyor.

Gerekçesi dosyada yazılı ve doğru: geçmeyen bir hazır palet, Aslıhan'a
"bu palete dön" dedirtip sonra kaydettirmeyen bir tuzak olurdu — üstelik
hatanın kendi seçiminden değil bizim hazır setimizden geldiğini anlaması
imkânsız.

İki yeni palet dört temanın dördünde de geçiyor; test yeşil.

## "Varsayılana dön"

Duruyor, dokunulmadı. Listenin sonunda, kesik çerçeveli ayrı düğme olarak.

## Doğrulama

`pnpm typecheck` · `pnpm lint` · `pnpm test` (104 dosya, 2117 test) ·
`pnpm build` temiz. Panel görsel olarak da doğrulandı: altı düğme, her
birinde renk şeritleri.
