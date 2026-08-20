# Aurora Adım 6 · PR 4 — iletişim, hakkımızda, danışman ol

**20 Ağustos 2026** · dal: `feature/aurora-kurumsal`

Üç kurumsal sayfa. Bu PR'ın asıl kararı **nerede cam KULLANILMADIĞI**.

---

## ⚠️ Cam her yüzeye uygulanmadı — ve bu bir kural oldu

Cam yüzey "bu, sayfanın üstünde duruyor" der. Yapışkan panellerde ve
fotoğraf üstü rozetlerde doğru; her yerde değil.

| Yüzey | Karar | Gerekçe |
| --- | --- | --- |
| İletişim formu | **opak** | İçine yazı yazılan bir yüzeyin arkası görünürse okunurluk zemindeki içeriğe bağlanır |
| İletişim yan kartları | cam | Formun yanında duran yardımcı yüzeyler; içlerine yazı yazılmıyor |
| Yasal bilgiler tablosu | **opak** | Yetki belgesi, MERSİS, vergi bilgisi — her koşulda net okunmalı (kural 1) |
| Mahalle/portföy yan panelleri | cam | Sayfa boyunca ekranda kalıyor, altından içerik geçiyor |

Bu ayrım olmadan cam bir "tema" olurdu; şartname onu bir **malzeme** olarak
istiyor.

## Diğer değişiklikler

- Yan kart başlıkları gövde fontundan başlık fontuna geçti
- Görsellerin köşe yarıçapı Aurora ölçeğine (24 → 32 px) büyüdü
- Danışman-ol madde kartlarında altın hover kenarlığı — sitedeki kart
  dilinin aynısı

## Ölçüm

| Rota | gzip |
| --- | ---: |
| `/iletisim` | 207,6 kB |
| `/hakkimizda` | 204,7 kB |

Değişim yok.

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 95 dosya, **1967 test** yeşil
- `/iletisim` ve `/hakkimizda` 200; yetki belgesi bloğu HTML'de doğrulandı
- `/danisman-ol` 404 — bölüm varsayılan kapalı, beklenen davranış
