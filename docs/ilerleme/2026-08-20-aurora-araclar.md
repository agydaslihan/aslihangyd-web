# Aurora Adım 6 · PR 3 — değerleme ve yatırımcı araçları

**20 Ağustos 2026** · dal: `feature/aurora-araclar`

Yedi hesaplayıcı, araç sayfası ve değerleme sihirbazı. Tek bir kabuk
değiştiği için yedi sayfa birden döndü.

---

## Değerleme sonucu altın çerçeve aldı

Şartname altına üç yer ayırıyor: bölüm ayraçları, yatırım kartının
çerçevesi ve kira çarpanı satırının üst çizgisi. Değerleme sonucu
ikincisiyle aynı rolde — sayfanın taşıdığı **tek rakam**.

⚠️ Çerçeve dekoratif: sonuç metinle de anlatılıyor, renk tek başına bilgi
taşımıyor (WCAG 1.4.1).

⚠️ **Duvarsızlık kuralına dokunulmadı** (kural 6b): sonuç hâlâ iletişim
bilgisi istemeden görünüyor.

## Yöntem ve feragat bloğu cam yüzeye geçti

Bu blok üç zorunluluğu birden taşıyor: hesabın nasıl yapıldığı, oran tarihi
("veriler [tarih] itibarıyladır") ve yatırım tavsiyesi feragati. İnce bir
çizgiyle ayrılıyordu ve okunmadan geçiliyordu; kendi yüzeyi olduğunda
"burada okunacak bir şey var" diyor.

⚠️ **Metin ölçüsü değişmedi.** Feragat küçültülmedi de büyütülmedi de:
yasal bir ibarenin görsel ağırlığıyla oynamak, onu ya gizlemek ya da
bağırtmak olurdu.

## Araç kartları

Altın kenarlık hover'da beliriyor — ilan ve mahalle kartlarıyla aynı kural.
Sitedeki bütün kartlar artık aynı dili konuşuyor.

## Ölçüm

| Rota | gzip |
| --- | ---: |
| `/araclar` | 204,7 kB |
| `/araclar/kredi` | 209,2 kB |
| `/degerleme` | 210,6 kB |

Değişim yok; eklenen her şey CSS sınıfı.

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 95 dosya, **1967 test** yeşil
- Beş sayfa 200; feragat üretilen HTML'de doğrulandı
