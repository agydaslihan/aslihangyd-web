# 14 Eylül 2026 — Panel kontrastı: soluk renk kaynağında düzeltildi, test paneli kapsıyor

## Neden

EİDS akışı PR'ında sihirbazda üç soluk metin tek tek bulundu (bekleyen
adım, adım yüzdesi, ipucu). Aynı ton üç yerde daha kaldı: birim etiketi,
yatırım göstergesi başlıkları, not satırı.

⚠️ Asıl bulgu başka: **kontrast testi paneli hiç görmüyordu.**
`tasarim/kontrast.test.ts` sitenin `globals.css` jetonlarını,
`marka/kontrastKapisi.test.ts` marka paletini ölçüyor. Panel bileşenleri
Payload'ın `--theme-*` değişkenlerini kullanıyor ve onlara bakan hiçbir
şey yoktu.

## Kaynak: rampanın ortası

Payload'ın yüklü stil dosyasından iki tema çözüldü:

| Jeton | Açık (en kötü zemin) | Koyu (en kötü zemin) |
| --- | --- | --- |
| `elevation-450` | 2,78 | 4,76 |
| `elevation-500` | 3,31 | 3,39 |
| `elevation-600` | 4,89 | 6,53 |
| `error-500` | 3,47 | 3,24 |
| `error-600` | 4,93 | 4,66 |
| `error-650` | 5,94 | 5,55 |

⚠️ `elevation-500` ve `error-500` rampanın TAM ORTASI: yalnızca `:root`'ta
tanımlı, koyu tema onları **ezmiyor** — iki temada da aynı renk. Tanımı
gereği hem açık hem koyu zeminde 4,5:1'i geçemezler. Sorun tek tek
kurallarda değil, orta tonu metin rengi olarak kullanmaktaydı.

## Yapılan

### 1. Renk bir kez seçiliyor — `src/app/(payload)/panelJetonlari.css`

```css
:root {
  --panel-metin-soluk: var(--theme-elevation-600);
  --panel-metin-hata: var(--theme-error-650);
}
```

Panel düzeninde Payload stillerinden SONRA yükleniyor. `error-600` iki
temada da sınırdaydı; hata metni kritik bilgi olduğu için bir basamak
koyusu seçildi.

⚠️ Payload'ın kendi `--theme-elevation-500`'ü EZİLMEDİ: Payload arayüzü
onu zemin ve kenarlıkta da kullanıyor, değiştirmek bizim olmayan
bileşenleri öngörülemez biçimde etkilerdi. Katman bizim bileşenlerimizin
üstünde.

### 2. 22 metin rengi jetona taşındı (10 dosya) + sihirbazdaki 3 kural

| Dosya | Soluk | Hata |
| --- | --- | --- |
| `gozlem/iceAktarma.css` | 2 | 1 |
| `marka/marka.css` | 1 | 2 |
| `osm/osm.css` | 1 | — |
| `panel/aktarim.css` | 1 | — |
| `panel/bildirimSeridi.css` | 1 | — |
| `panel/gorselButceRozeti.css` | 2 | — |
| `panel/konumAlani.css` | 1 | — |
| `panel/turkceSayiAlani.css` | 1 | 1 |
| `sihirbaz/sihirbaz.css` | 3 (+3 önceki PR'dan) | 3 |
| `yakinlik/skorOnerileri.css` | 2 | — |

İstenen üçü aralarında: `.sihirbaz-birim`, `.sihirbaz-gostergeler dt`,
`.sihirbaz-gostergeler-not`.

### 3. Test paneli kapsıyor — `src/lib/tasarim/panelKontrast.test.ts`

`src` altındaki **bütün** CSS taranıyor; `--theme-*` ya da `--panel-*`
jetonuna dayanan her `color` bildirimi Payload'ın YÜKLÜ sürümündeki iki
temaya çözülüp ölçülüyor. Elle tutulan liste yok: yeni panel bileşeni
kendiliğinden kapsama giriyor. Payload sürümü rampayı değiştirirse test
yeni değerlerle ölçüyor.

- Zemin: kural kendi zeminini tanımlıyorsa o (koyu düğmedeki beyaz yazı
  yanlış alarm vermiyor); yoksa elevation-0/50/100'ün en kötüsü
- Çözülemeyen jeton da hata (yazım yanlışı sessizce geçmesin)
- Duyarlılık kilidi: `elevation-500` ve `error-500` gerçekten kırılmalı;
  Payload rampayı değiştirirse test haber veriyor
- Sessiz boş tarama kilidi: >100 bildirim ve bilinen dosyalar bulunmalı

⚠️ **Test önce kırıldı:** düzeltmeden önce koşuldu ve 22 kuralın hepsini
(iki temada) listeledi. Ayrıca kendi ayrıştırıcısında bir hata yakaladı:
jeton dosyasının başındaki yorum `:root` seçicisine yapışıyor ve panel
jetonları okunmuyordu.

⚠️ Statik test renkli bir kutu içindeki metnin GERÇEK zeminini bilemez.
Çizilen hâli CI'da `scripts/gezinme-dumani.mjs` ölçüyor (rozet, adım
göstergesi, sayaç, ipucu, çubuk).

## Kapsam dışı

Payload'ın kendi arayüzündeki soluk metinler (alan açıklamaları vb.) —
bizim kodumuz değil, bu test onları taramıyor.
