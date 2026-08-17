# D paketi — metin düzenlemeleri ve mahalle silüetleri

**16 Ağustos 2026** · arayüz · metin, ikon, silüet

### D1 · Başlık eylemi CMS'e taşındı

"Evimi değerlendir" → **"Değerleme isteyin"**, ve metin artık kodda değil
"Marka ve Görünüm" globalinde (`baslikEylemMetni` + `baslikEylemAdresi`).

⚠️ `lib/gezinme.ts`teki sabit **silinmedi, YEDEĞE dönüştü.** Marka sesi
içeriktir ama butonun varlığı işlevdir: veritabanı okunamasa da başlıktaki
eylem görünmeli. Metin boşsa eylem tümden yedeğe düşüyor — yarım değil.

### D2 · Araçlar sayfası

Başlık altındaki üç satırlık paragraf kaldırıldı: kartların her biri zaten
ne yaptığını yazıyordu, üstteki metin aynı şeyi üçüncü kez söylüyor ve
kullanıcıyı araçlara ulaşmadan önce bir metin duvarıyla karşılıyordu.
⚠️ `h1` kaldı.

Yedi araca ikon eklendi (Tabler yolları, elle taşındı — dosyanın başındaki
"paket yerine elle SVG" gerekçesinin aynısı). Marka renginde, yumuşak
zeminli daire içinde.

⚠️ İkonlar **dekoratif** (`aria-hidden`): anlam kart başlığında. İkon tek
başına hiçbir bilgi taşımıyor.

⚠️ `lib/araclar.ts` bileşen DEĞİL **anahtar** tutuyor; eşleme çizim yerinde.
O dosya gezinme menüsünde de okunuyor, JSX taşısaydı istemci paketine
bileşen sürükler ve `lib/` katmanının sunucu-istemci sınırını
bulanıklaştırırdı.

### D3 / D4 · Başlıklar küçüldü ve ortalandı

`/mahalleler` ve `/portfoy` başlıkları `baslik-1` → `baslik-2`, blok
ortalandı, açıklama küçültüldü.

⚠️ **`h1` etiketi durdu.** "Küçük görünsün" ile "başlık olmasın" ayrı
şeyler; ikincisi sessiz bir SEO kaybı olurdu.

### D5 · Mahalle kartlarında gerçek sınır silüeti

26 kartın 26'sında aynı konum ikonu duruyordu. Artık her kart o mahallenin
**gerçek poligonundan** üretilmiş bir SVG taşıyor — dolgu pudra gülü,
kenar terracotta.

Gerçek Çorlu verisiyle ölçüm:

```
26 mahalle · ham 4.504 → sade 990 nokta (%78 azalma)
kart başına ortalama 377 bayt · üretilemeyen: 0
en büyük: Yenice 590 → 89 nokta, 871 bayt
en küçük: Alipaşa  23 → 12 nokta, 121 bayt
```

⚠️ **Douglas-Peucker, nokta atlama DEĞİL.** "Her n'inciyi al" keskin
köşeleri rastgele siler ve şekli tanınmaz hâle getirir; Douglas-Peucker en
çok sapan noktayı korur, yani şeklin karakterini taşıyan köşeler kalır.

⚠️ **Enlem ters çevriliyor.** Coğrafyada enlem yukarı, SVG'de y aşağı
artar. Çevrilmezse her mahalle dikey aynada çizilir — tanınır ama YANLIŞ,
ve yanlışlığı ancak haritayla yan yana koyunca fark edilir. Bir test bunu
kilitliyor.

⚠️ **Oran korunuyor.** Kutuya germek her mahalleyi kareye yayardı ve
şekiller birbirine benzerdi — silüetin bütün amacı ayırt edilebilirlik.

⚠️ Sınırı olmayan mahallede eski konum ikonu **yedek olarak kalıyor**; OSM
kapsaması eksiksiz değil, kart boş kalamaz.

⚠️ Silüet sunucuda üretiliyor: poligonlar yüzlerce noktalı, ham koordinat
göndermek kart başına kilobaytlar demekti.

### ⚠️⚠️ Bu iş sırasında ÜRETİM DAĞITIMINI KIRACAK bir göç hatası bulundu

Yeni göç üretilince `pnpm payload migrate` kırmızı verdi:

```
column "mahalle_yaklasik" of relation "ilgi_noktalari" already exists
```

`migrate:create` yeni göçe #58'in sütununu da eklemişti. Sebep: **iki göç
paralel dallarda üretildi.** `migrate:create` yeni göçü bir öncekinin
`.json` şema fotoğrafına göre çıkarıyor; `hero_slider` fotoğrafı #58
birleşmeden önce alınmıştı ve `mahalle_yaklasik`i bilmiyordu. Diff onu
"eksik" sanıp yeniden ekledi.

Üretimde ne olurdu: göçler sırayla koşarken poi sütunu ekler, sonra bu göç
aynısını eklemeye çalışır ve **§5.3'ün 3. adımı yarıda durur** — site yeni
şemayla eşleşmeyen bir kodla açılırdı.

Düzeltme: üretilen SQL elle budandı. ⚠️ Bu göçün `.json` fotoğrafı DOĞRU
(gerçek güncel şemanın tamamı), yani zincir buradan itibaren onarıldı.

**Sıfırdan doğrulama:** boş bir veritabanı kurulup 22 göçün tamamı
sırayla koşturuldu — hepsi geçti. Üretim dağıtımının yapacağı şey birebir
bu.
