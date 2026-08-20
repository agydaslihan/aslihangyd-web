# Aurora Adım 6 · PR 2 — mahalle listesi ve mahalle sayfası

**20 Ağustos 2026** · dal: `feature/aurora-mahalleler`

Portföyden sonra ikinci SEO motoru. Kütüphane eklenmedi, bundle değişmedi.

---

## Liste

**Karşılaştırma çağrısı vitrin bandına alındı.** Sayfanın en ayırt edici
aracı altbilgiye yakın bir bağlantı olarak duruyordu; ziyaretçi kartları
gezip çıkıyor, aracın varlığını hiç görmüyordu. Bant, sayfanın ne sunduğunu
söylediği yer.

**Kartta altın kenarlık hover'da beliriyor** — ilan kartıyla aynı kural,
aynı gerekçe: duran hâlde sınır nötr, altın yalnızca sıcaklık ekliyor ve
hiçbir bilgi taşımıyor.

**Skor rozeti `.cam` sınıfına geçti.** Elle yazılmış `backdrop-blur-[2px]`
mobil kapısını atlıyordu: `.cam` telefonda otomatik olarak düz renge
düşüyor, elle yazılan bulanıklık düşmüyordu.

⚠️ **Muafiyet listesi eksildi.** `MahalleKarti` küçük-cam muafiyetinden
çıkarıldı. Kaldırılabildiği hâlde duran bir muafiyet, kuralı olduğundan
gevşek gösterir.

## Mahalle sayfası

**Bölüm başlıkları görsel aileye geçti.** On zorunlu bölümün başlıkları
`font-sans` ile çiziliyordu — yani gövde fontuyla. Aurora'da hiyerarşi
ölçekten geliyor ama aile de hiyerarşinin parçası; başlıklar Plus Jakarta
Sans'a alındı.

**Yan panel cam.** Panel sayfa boyunca ekranda kalıyor ve altından içerik
geçiyor — portföy filtresinde verilen kararın aynısı.

⚠️ **On zorunlu bölümün hiçbiri kaldırılmadı**: drone hero, yatırım skoru +
radar, temel rakamlar, fiyat trendi, mini harita + POI, 360° tur, "neden bu
mahalle", portföy, karşılaştırma, çağrı. Gözlem sayısı (n), feragat ve OSM
atıfı yerinde.

## Ölçüm

| Rota | Önce | Sonra |
| --- | ---: | ---: |
| `/mahalleler` | 204,7 kB | **204,7 kB** |
| `/mahalleler/[slug]` | 210,4 kB | **210,4 kB** |

Değişim yok: eklenen her şey CSS sınıfı.

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 95 dosya, **1967 test** yeşil
- Üç sayfa 200

⚠️ Görsel doğrulama tarayıcıda yapılmalı.
