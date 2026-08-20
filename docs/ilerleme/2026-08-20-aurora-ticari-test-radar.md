# Aurora Adım 6 · PR 5 — ticari, mahalle testi, bölge radarı

**20 Ağustos 2026** · dal: `feature/aurora-ticari`

Adım 6'nın son PR'ı. Üç sayfa, tek bir yeni kural.

---

## ⚠️ Altın hover kenarlığı bölge radarına KONMADI

Sitedeki bütün kartlar hover'da altın kenarlık alıyor — ilan, mahalle,
araç, öneri kartları. Bölge radarının sinyal kartları almıyor.

Sebep: o kartların kenarlık rengi **sinyal türünden** geliyor (güçlü,
zayıf, nötr). Altın hover eklemek iki rengi aynı kenarlıkta yarıştırırdı ve
sinyalin kendi rengi — yani kartın taşıdığı **bilgi** — okunmaz hâle
gelirdi.

Tutarlılık, bilgiyi bastırma pahasına aranmaz. Kural şu: dekoratif kenarlık,
anlam taşıyan kenarlığın üstüne yazılmaz.

## Diğer değişiklikler

- **Mahalle testi:** soru kartı Aurora köşe ölçeğine (24 → 32 px); öneri
  kartlarında altın hover kenarlığı. Soru kartı OPAK kaldı — testin tek işi
  soruyu okutmak.
- **Bölge radarı:** bölüm ve kart başlıkları gövde fontundan başlık fontuna.
- **Ticari:** madde başlıkları başlık fontuna.

## Ölçüm

| Rota | gzip |
| --- | ---: |
| `/ticari` | 204,7 kB |
| `/mahalle-testi` | 211,9 kB |
| `/bolge-radari` | 204,7 kB |

Değişim yok.

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 95 dosya, **1967 test** yeşil
- Üç sayfa 200

---

## Adım 6 tamamlandı

| PR | Sayfalar |
| --- | --- |
| 1 | `/portfoy` · `/portfoy/[slug]` |
| 2 | `/mahalleler` · `/mahalleler/[slug]` |
| 3 | `/degerleme` · `/araclar` + 7 hesaplayıcı |
| 4 | `/iletisim` · `/hakkimizda` · `/danisman-ol` |
| 5 | `/ticari` · `/mahalle-testi` · `/bolge-radari` |

Dışarıda bırakılan ikisi ve gerekçeleri: `/harita` (uygulama yüzeyi, kendi
tasarımı ve bilinçli 451 kB bütçesi var) ve `/rapor/*` (yazdırma çıktısı;
cam, hareket ve gölge kâğıtta anlamsız). İkisi de palet ve tipografiyi
jetonlardan otomatik aldı.

⚠️ **Adım 6'da hiçbir kütüphane eklenmedi.** Beş PR boyunca tek aday
lightbox'tı; native `<dialog>` onu karşıladı.
