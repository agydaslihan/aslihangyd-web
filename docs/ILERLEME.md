# İlerleme Kaydı

Bu dosya oturumlar arası hafızadır. **Yeni bir oturuma başlarken önce bunu oku.**
Her faz sonunda güncellenir: ne yapıldı, hangi karar neden verildi, ne eksik kaldı.

---

## Durum özeti

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 1.1–1.2 | Proje iskeleti, Docker geliştirme ortamı | ✅ Tamam (PR #1) |
| 1.3 | Veri modeli — Payload koleksiyonları | 🔄 Devam ediyor |
| 1.4 | EİDS iş kuralı + testler | ⏳ |
| 1.5 | KVKK / çerez altyapısı | ⏳ |
| 1.6 | Tasarım sistemi + temel sayfalar | ⏳ |
| 1.7 | İlan listesi / detayı | ⏳ |
| 1.8 | Mahalle sayfaları | ⏳ |
| 1.9 | Lead formu + WhatsApp | ⏳ |
| 1.10 | SEO, CI/CD, yedekleme, dokümantasyon | ⏳ |
| 2 | Harita, hesaplayıcılar, ticari dikey | ⏳ |
| 2B | Bal küpü modülleri, CRM, portföy yönetimi | ⏳ |
| 2C | Gözlem girişi ve endeks altyapısı | ⏳ |
| 3 | Drone / 360° medya — **ATLANDI**, yerine altyapı hazırlığı | ⏳ |
| 4 | Yatırım skoru, AI arama, raporlar | ⏳ |
| 5 | Çorlu Live — **ATLANDI** | — |

---

## Faz 1.1 + 1.2 — Proje iskeleti ve Docker geliştirme ortamı

**Tarih:** 3 Ağustos 2026 · **PR:** #1 · **Durum:** merge edildi

### Ne yapıldı

- Next.js 16.2 (App Router) + TypeScript strict + Payload CMS 3.87 tek uygulama içinde
- `src/app/(site)` ve `src/app/(payload)` route grupları ayrıldı
- PostgreSQL 17 + PostGIS 3.5 ve Redis 7 için geliştirme `compose.dev.yml`
- İlk migration: PostGIS eklentisi + `kullanicilar` şeması
- ESLint 9 flat config, Prettier, husky + lint-staged
- Vitest yapılandırması

### Kararlar ve gerekçeleri

- **Uygulama container'da değil host'ta çalışır (geliştirmede).** Sunucu 3.2 GB
  RAM; Next.js dev server'ı container'a koymak hem RAM hem yeniden derleme
  süresi maliyeti getiriyordu. Compose yalnızca Postgres + Redis kaldırıyor.
- **Docker portları `127.0.0.1`'e bağlandı.** Docker port yayınında iptables'ı
  doğrudan yazar ve UFW kurallarını atlar; `5432:5432` yazmak veritabanını
  internete açardı.
- **Payload admin dili Türkçe'ye sabitlendi** (`i18n.supportedLanguages: { tr }`).
  CLAUDE.md: kullanıcıya görünen her şey Türkçe — CMS etiketleri dahil.

### Bilinen eksikler / teknik borç

- `vitest.config.ts` içindeki `passWithNoTests: true` → Faz 1.4'te kaldırılacak
- PostGIS imajının `tiger` / `topology` şemaları duruyor — düşük öncelikli temizlik

---

## Sonraki adım

Faz 1.3 — veri modeli. EİDS zorunlu alanları gün 1'den itibaren şemada olmalı;
sonradan eklenemez (PROJE-PLANI.md §2.2).
