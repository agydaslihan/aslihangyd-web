# 31 Ağustos 2026 — Hero açılışı panelden seçiliyor

`Ana Sayfa Düzeni` panelinde yeni ayar: **Hero açılışı**.

| Kip | İlk ekran | Slayt bandı |
| --- | --- | --- |
| **Metin önce** (varsayılan) | Sinematik vitrin, tam ekran, `<h1>` | Kalan slaytlar altta |
| **Slayt önce** | Slider, `<h1>` | Yok — slider zaten hepsini gösteriyor |
| **Yalnızca metin** | Sinematik vitrin, `<h1>` | Yok — slider kapalı |

## ⚠️ Hiçbiri açılır katman değil

"Metin önce" bir karşılama katmanı (interstitial) olarak kurulabilirdi ve
yanlış olurdu:

- Google mobilde araya giren katmanları cezalandırıyor,
- katmanın kendisi LCP öğesi olur ve gerçek içerik geç ölçülür,
- odak tuzağı ve kapatma düğmesi gerekir — hiçbiri gerekmeyen bir sorun
  için.

Üç kip de sayfanın normal akışında duruyor; fark yalnızca ilk ekranda ne
olduğu. Bir test `role="dialog"` ve `position: fixed` izlerinin olmadığını
denetliyor.

## ⚠️ Tek H1 — ve bayrak tek

`SinematikHero` artık `HeroBolumu` gibi tek bir `sayfaHerosu` bayrağı
alıyor ve o bayrak **iki şeyi birden** taşıyor:

- `<h1>` mi `<h2>` mi — sayfada tek bir H1 olabilir
- arka plan `priority` mi değil mi — LCP adayı tektir

Ayrı iki prop olsaydı biri unutulduğunda ekranda **hiçbir iz bırakmayan**
bir gerileme çıkardı: iki H1 (ekran okuyucuda iki konu) ya da iki
`priority` görsel (birbirinin bant genişliğini yiyen iki LCP adayı).

Tarayıcıda ölçüldü:

```
metin_once       h1=1  slayt-bandı=1
slayt_once       h1=1  slayt-bandı=0
yalnizca_metin   h1=1  slayt-bandı=0
```

## Kaydırma göstergesi bağlantıya dönüştü

"Metin önce" kipinde ve birden fazla slayt varsa, vitrinin altındaki ince
çizgi artık **sayfa içi bağlantı**: "Slaytlara geç". Klavyeyle çalışıyor
ve ekran okuyucuya adıyla görünüyor — süs çizgi `aria-hidden` idi ve
doğruydu, bağlantıya dönüşünce gizli kalamazdı.

## Slaytlar tekrarlanmıyor

⚠️ Slayt bandının varlık sebebi, vitrinin yalnızca **ilk** slaydı zemin
olarak kullanması: kalan kareler bantta dönüyor. "Slayt önce" kipinde
slider zaten sayfanın hero'su ve **tüm** slaytları gösteriyor; bandı da
çizmek aynı fotoğrafları ikinci kez basmak olurdu. Koşul buna göre
daraltıldı ve testle kilitlendi.

## Otomatik geçiş

Zaten doğruydu ve şimdi testle kilitli: varsayılan **kapalı**, "hareketi
azalt" tercihi olan ziyaretçide **hiç çalışmıyor**.

14 iddia: `src/lib/anasayfa/heroAcilisi.test.ts`.
