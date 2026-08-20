# Ölçüm eşikleri tek kaynağa alındı

**20 Ağustos 2026** · dal: `feature/olcum-esikleri`

Aurora Adım 5'te bulunan sorun kalıcı olarak kapatıldı: Lighthouse eşikleri
artık tek yerde ve `CLAUDE.md` ile testle eşleniyor.

---

## Sorun neydi

Özet betiği hâlâ eski şartnamenin sayılarını kullanıyordu — her cihazda
performans ≥90 — ve `/portfoy` mobilini 89 ile ⚠️ işaretliyordu. Oysa
geçerli taban 75'ti ve sayfa kapıyı 14 puan payla geçiyordu.

⚠️ **Yanlış eşik, doğru ölçümden zararlıdır.** Her koşumda kırmızı gören
bir kapı kısa sürede görmezden gelinir; o noktada gerçek bir gerileme de
fark edilmez. Kapının işi geçirmek değil, geçmediğinde İNANILIR olmak.

## Kurulan yapı

| Yer | Rolü |
| --- | --- |
| `CLAUDE.md` → Performans hedefleri | İnsanın okuduğu tablo |
| `scripts/lighthouse-esikleri.mjs` | Makinenin okuduğu tek kaynak |
| `src/lib/olcum/lighthouseEsikleri.test.ts` | İkisinin ayrışmasını engelliyor |

Sayı iki yerde yaşıyor ve yaşamak zorunda: biri belge, diğeri kod. Test
ikisini eşliyor — biri değişip diğeri kalırsa kırılıyor.

⚠️ **Testi susturmanın doğru yolu birini silmek değil:** hangisi doğruysa
diğerini ona çekmek.

## Eşiklerin kendisi

| Cihaz | Performans | Erişilebilirlik | En iyi uygulamalar | SEO |
| --- | --- | --- | --- | --- |
| Masaüstü | ≥90 | ≥95 | 100 | 100 |
| Mobil | ≥75 | ≥95 | 100 | 100 |

⚠️ **Mobil eşiği bir indirim değil, model farkının kabulü.** Mobil skor
simüle edilmiş 4G (istek başına ~562 ms) ve 4× CPU yavaşlatmayla
hesaplanıyor; aynı sayfa masaüstünde 100 alırken mobilde 90 alıyorsa arada
arıza değil model farkı var.

⚠️ **Erişilebilirlik cihaza göre değişmiyor** ve test bunu ayrıca
denetliyor: ekran okuyucu kullanan biri telefondaysa daha az erişilebilir
bir sayfayı hak etmiyor.

⚠️ Bilinmeyen cihaz anahtarı DAHA SIKI eşiğe düşüyor. Gevşek varsayılan,
kapıyı sessizce açık bırakırdı.

## Doğrulama

Test önce bozularak doğrulandı: `CLAUDE.md`de mobil eşiği 75 → 80 yapıldı,
test kırmızıya döndü ve hangi iki dosyanın ayrıştığını yazdı; geri alınınca
yeşile döndü.

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 96 dosya, **1973 test** yeşil
