# 14 Eylül 2026 — Mobil LCP: şimdilik dokunulmuyor, karar kaydı

## Durum

CLAUDE.md hedefi LCP < 2,5 sn. CI Lighthouse ölçümünde mobil LCP bu
hedefin üstünde; masaüstü rahatça altında.

| Mobil (3 koşum medyanı) | #113 tabanı (1 Eylül) | #114 / #115 (14 Eylül) |
| --- | --- | --- |
| anasayfa | 3,7 sn | 3,6 sn |
| mahalleler | 3,3 sn | 3,3 sn |
| portfoy | 3,6 sn | 3,1–3,8 sn |

Masaüstü: 0,7–0,9 sn. Aktarılan baytlar iki tarih arasında birebir aynı;
bu bir gerileme değil, bilinen bir durum.

## Karar (Aslıhan)

**Mobil LCP şimdilik değiştirilmiyor.** Gerekçeler:

1. **Simülasyon modeli.** Mobil ölçüm simüle edilmiş 4G ve 4× CPU
   yavaşlatmayla hesaplanıyor; sayı gerçek bir cihazdan değil modelden
   geliyor.
2. **CDN'siz ölçüm.** CI sunucuyu `localhost`ta kaldırıp ölçüyor; üretimde
   önde duran Cloudflare CDN ölçüme dahil değil.
3. **%93,8 çatı payı** — Aslıhan'ın notu, olduğu gibi aktarıldı.
4. **Gerçek kullanıcı verisi toplanıyor.** Karar laboratuvar sayısıyla
   değil saha verisiyle verilecek.

## Yeniden bakma koşulu

Gerçek kullanıcı ölçümünde (`/api/olcum/vital` → panel ölçüm raporu)
yeterli örneklem birikince **75. yüzdelik (p75) LCP**'ye bakılacak.
Panel p75'i en az 30 ölçümle gösteriyor (`ASGARI_VITAL_ORNEK`,
`src/lib/olcum/rapor.ts`).

⚠️ Saha verisi YALNIZCA analitik onayı veren ziyaretçilerden geliyor
(`app/api/olcum/vital/route.ts` onayı denetliyor). Onay vermeyen ilk
ziyaretçinin deneyimi bu örneklemde yok — p75 okunurken bu hesaba katılmalı.

## Kapı

Mobil LCP ve performans skoru **raporlayıcı** kalıyor (CLAUDE.md →
"Hangi kapı koşuyu DÜŞÜRÜR"). Engelleyiciye çevirmek bir karardır.
