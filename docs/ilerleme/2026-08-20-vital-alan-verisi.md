# Sayfa hızı alan verisi — laboratuvar sayısı gerçeği söylemiyordu

**20 Ağustos 2026** · dal: `feature/alan-verisi`

Performans hedefi (LCP < 2,5 sn) baştan beri yazılıydı ama **hangi sayıyla
ölçüleceği** belirsizdi. Bu kayıt, o boşluğun neden bir ölçüm altyapısıyla
kapatıldığını anlatıyor.

---

## Neden gerekti

CI'daki Lighthouse mobil LCP'yi 3,4 sn gösteriyordu ve üst üste üç
müdahale (`2026-08-20-vitrin-ve-hareket.md`, `2026-08-20-font-onyukleme.md`)
onu kıpırdatmadı. Raporun ham metriklerine bakılınca sebep çıktı:

```
observedLargestContentfulPaint : 194 ms
largestContentfulPaint (rapor) : 3.441 ms
```

Aradaki fark bir ölçüm değil bir **model**: `throttlingMethod: "simulate"`,
istek başına 562 ms varsayılan gecikme, 4× CPU yavaşlatma. Sayfa gerçekte
194 ms'de boyanıyor; 3,4 sn onun yavaş bir 4G telefona **yansıtılmış** hâli.

Bu, laboratuvar ölçümünün yanlış olduğu anlamına gelmiyor — regresyon
yakalamakta hâlâ iyi. Ama "sitemiz gerçekte hızlı mı" sorusunu
cevaplamıyor. Onu ancak gerçek ziyaretçilerin gerçek cihazları cevaplar.

## Ölçüm Katman B'ye kondu — teknik bir sayı olması muaf tutmuyor

Core Web Vitals toplamak bir tarayıcı betiği gerektiriyor ve kural 8
ihlal edilemezler listesinde: *onay alınmadan analitik betiği yüklenmez.*

Ölçülen şeyin ziyaretçi hakkında değil **site hakkında** bir şey söylemesi
kuralı gevşetmedi: kural betiğin **niteliğine değil varlığına** bakıyor.
Onay yoksa `web-vitals` modülü hiç içe aktarılmıyor — dinleyici takılmıyor,
tek bir istek atılmıyor.

⚠️ **Bunun bedeli var ve panelde yazıyor:** örneklem yalnızca onay veren
ziyaretçilerden oluşuyor. Onay vermeyenlerin cihazları sistematik olarak
farklı olabilir. Sapmayı gizlemek, ölçümün kendisinden zararlı olurdu.

İki bağımsız kapı var, olay ucundaki gibi: betiğin onaysız yüklenmemesi
birinci kapı, uca doğrudan istek atılması ihtimalini kapatan sunucu
kontrolü ikinci kapı. `vitalAkis.test.ts` ikisini de koda bağlıyor.

## Ham değer saklanmıyor — histogram saklanıyor

En önemli tasarım kararı bu. "LCP = 2.431 ms" tek bir **ziyarete ait bir
kayıttır**; rota + cihaz + zamanla birleştiğinde az ziyaretçili bir sayfada
tek bir kişiyi işaret edebilir ve şartnamenin "tek ziyaretçiye ait kayıt
tutulmaz" kuralını zorlar.

Bunun yerine gelen değer **uçta** bir kovaya düşürülüp atılıyor; tampona ve
veritabanına yalnızca kova sayacı gidiyor. Saklanan cümle şu:
*"bugün mobilde LCP'si 2–2,5 sn arasında olan 14 görüntüleme oldu"* —
kimseye ait olmayan bir sayı.

⚠️ **Rota da gönderilmiyor.** "Hangi sayfa yavaş" sorusunu kaybettiriyor;
o soruyu laboratuvar ölçümü zaten cevaplıyor. Alan verisinden beklenen
"gerçek cihazlarda gerçekten ne oluyor" ve o site geneli bir sorudur.

⚠️ Kova sınırları Google'ın eşiklerini (2500/4000, 0,1/0,25, 200/500)
**kenar olarak içeriyor**. Eşik bir kova ortasına düşseydi "iyi ziyaret
oranı" interpolasyonla tahmin edilirdi; kenara oturtmak onu kesin yapıyor.

⚠️ p75 histogramdan interpolasyonla çıkıyor ve panelde **"yaklaşık"**
yazıyor. CrUX'un yaptığı da bu. Yaklaşık bir sayıyı kesinmiş gibi
göstermek, kural 2'nin (uydurma veri yasağı) istatistik hâli olurdu.

## Asgari örneklem 30 — panelin diğer eşiklerinden düşük, bilerek

Endeks 8 gözlem, huni 100 ziyaretçi istiyor. Buradaki eşik 30 ve gerekçesi
**kime göründüğü**: endeks ziyaretçiye yayınlanıyor ve yatırım kararı
aldırıyor, bu sayı yalnızca kendi panelimizde duruyor ve "sitem yavaş mı"
sorusunu cevaplıyor. 30 ölçümlük bir p75 kaba ama kullanılabilir bir sinyal.

Eşik yine de var: üç ölçümden p75 hesaplamak matematiksel olarak mümkün
ama anlamsız. Az örneklemli satır **gizlenmiyor** — gizlemek "veri yok"
sanılmasına yol açardı — sayı yerine ölçüm adedi gösteriliyor.

## Kütüphane elle yazılmadı

LCP birkaç satır. Ama CLS'in "oturum penceresi" ve INP'nin etkileşim
gruplama mantığı öyle değil; elle yazılan bir sürüm sessizce **yanlış sayı**
üretirdi. Bu projede yanlış sayı, sayı olmamasından kötü.

`web-vitals` ~3 kB gzip, tek işi bu ve **dinamik olarak** içe aktarılıyor:
statik `import` olsaydı kütüphane onay veren ziyaretçinin ilk paketine
girer ve LCP'yi geciktirirdi — performansı ölçmek için performansı
bozardık.

⚠️ Gönderim ölçüm başına değil sayfa kapanırken, `sendBeacon` ile. Üç metrik
üç farklı anda bildiriliyor (LCP yerleşince, INP etkileşimden sonra, CLS
kapanışta); ayrı ayrı göndermek mobil bağlantıda üç tur demekti.
`pagehide` kullanıldı, `beforeunload` değil: ikincisi mobilde çoğu zaman
hiç tetiklenmiyor ve bfcache'i bozuyor.

## Sırada ne var

- **Veri birikmesi.** Panel bugün boş; onay veren ziyaretçiler geldikçe
  dolacak. 30 ölçüme kadar sayı görünmeyecek, bu beklenen davranış.
- **Avukat kararı.** `docs/KVKK-ANALITIK.md` içine not düşüldü: aydınlatma
  metninde "sayfa performansının ölçülmesi" ayrı bir madde mi olmalı, yoksa
  analitik başlığı altında mı kalmalı?
- **Hedefin yeniden yorumlanması.** Alan verisi geldiğinde LCP hedefi
  laboratuvar sayısına göre değil bu p75'e göre okunacak.
