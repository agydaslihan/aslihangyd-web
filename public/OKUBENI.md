# `public/` — statik dosyalar

Bu dizindeki her şey site köküne doğrudan servis edilir:
`public/logo.svg` → `https://aslihangyd.com:8443/logo.svg`

## ⚠️ Dizin şu an boş ama SİLİNEMEZ

`docker/Dockerfile` bu dizini üretim imajına kopyalıyor:

```
COPY --from=derleyici /uygulama/public ./public
```

Dizin yokken bu satır `"/uygulama/public": not found` hatası veriyor ve
**üretim imajı hiç derlenemiyordu** (7 Ağustos 2026'da tespit edildi —
`compose.prod.yml` var olmayan bir imajı çekmeye çalışıyordu).

Satırı silmek yerine dizin oluşturuldu: ileride buraya bir favicon ya da
`site.webmanifest` konduğunda hiçbir şey değişmeden çalışsın.

## Buraya ne konur, ne konmaz

**Konur:** favicon, `site.webmanifest`, `apple-touch-icon`, doğrulama
dosyaları (Google Search Console, Cloudflare), `humans.txt`.

**Konmaz:**

- **İlan ve mahalle görselleri** — onlar Payload Medya koleksiyonuna
  yüklenir; CMS'ten yönetilir, `next/image` ile AVIF/WebP'e dönüştürülür.
- **Video** — CLAUDE.md kod standardı: video ASLA self-host edilmez,
  Bunny Stream üzerinden HLS.
- **Sırlar** — bu dizin herkese açıktır, kimlik doğrulaması yoktur.

`robots.txt` ve `sitemap.xml` buraya konmaz: ikisi de kod tarafından
dinamik üretiliyor (`src/app/(site)/robots.ts`, `sitemap.ts`). Buraya
statik bir kopya konursa o dosya kazanır ve site haritası donar.
