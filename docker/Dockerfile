# =============================================================================
# aslihangyd.com — üretim imajı
#
# Çok aşamalı derleme. Amaç: son imajda ne kaynak kodu ne de derleme
# bağımlılıkları kalsın. Sunucu 3.2 GB RAM ile çalışıyor; imaj boyutu ve
# çalışma anındaki bellek ayak izi doğrudan önemli.
# =============================================================================

ARG NODE_SURUMU=22-bookworm-slim

# ── 1. Bağımlılıklar ─────────────────────────────────────────────────────────
FROM node:${NODE_SURUMU} AS bagimliliklar
WORKDIR /uygulama

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ── 2. Derleme ───────────────────────────────────────────────────────────────
FROM node:${NODE_SURUMU} AS derleyici
WORKDIR /uygulama

RUN corepack enable

COPY --from=bagimliliklar /uygulama/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Derleme sırasında veritabanına bağlanılmaz; Payload yapılandırması yalnızca
# çözümlenir. Yine de değişkenlerin TANIMLI olması gerekiyor.
ENV DATABASE_URI=postgres://derleme:derleme@localhost:5432/derleme
ENV PAYLOAD_SECRET=derleme_aninda_kullanilan_gecici_deger

RUN pnpm build

# ── 3. Göçmen ────────────────────────────────────────────────────────────────
#
# ⚠️ AYRI BİR İMAJ GEREKİYOR, ÇÜNKÜ ÜRETİM İMAJINDA GÖÇ ÇALIŞTIRILAMAZ.
#
# Çalıştırma imajı Next'in `standalone` çıktısı: içinde ne kaynak kodu,
# ne `payload` CLI'ı, ne de `src/migrations` var. `payload.config.ts`
# içindeki `migrationDir` derlenmiş paketin içine çözülüyor ve orada göç
# dosyası bulunmuyor.
#
# 7 Ağustos 2026'ya kadar bu fark edilmemişti: işletme rehberi üretimde
# göçün nasıl koşacağını hiç yazmıyordu, `compose.prod.yml` de böyle bir
# yol sunmuyordu. Yani şema değişikliği içeren ilk dağıtım, uygulamayı
# eski şemaya karşı başlatacaktı.
#
# Bu aşama `.next` taşımıyor — yalnızca bağımlılıklar ve kaynak. Göç
# dışında hiçbir işi yok ve `up -d` ile başlamaz (compose'da `gocmen`
# profili altında).
FROM node:${NODE_SURUMU} AS gocmen
WORKDIR /uygulama

RUN corepack enable

COPY --from=bagimliliklar /uygulama/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY src ./src

# ⚠️ `scripts` de gerekiyor: yayın öncesi kontrol listesi (§6b) demo veri
# denetimini `payload run scripts/demo-denetimi.ts` ile koşuyor ve sunucuda
# pnpm bulunan tek yer burası. Dizin unutulunca komut
# `ERR_MODULE_NOT_FOUND` veriyor — belgede yazılı bir kontrolün sessizce
# çalışmaması, kontrolün hiç olmamasından kötü.
COPY scripts ./scripts

# Varsayılan komut göçü UYGULAR. Yalnızca durum görmek için:
#   docker compose ... run --rm gocmen pnpm payload migrate:status
CMD ["pnpm", "payload", "migrate"]

# ── 3. Çalıştırma ────────────────────────────────────────────────────────────
FROM node:${NODE_SURUMU} AS calistirici
WORKDIR /uygulama

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Root olarak çalıştırmayın: konteyner kaçışında saldırganın elindeki
# yetkiyi sınırlar.
RUN groupadd --system --gid 1001 uygulama \
  && useradd --system --uid 1001 --gid uygulama uygulama

# Next.js standalone çıktısı yalnızca gerçekten kullanılan modülleri taşır.
COPY --from=derleyici --chown=uygulama:uygulama /uygulama/.next/standalone ./
COPY --from=derleyici --chown=uygulama:uygulama /uygulama/.next/static ./.next/static
COPY --from=derleyici --chown=uygulama:uygulama /uygulama/public ./public

# Yüklenen görsellerin yaşadığı yer — compose'da kalıcı birim bağlanır.
RUN mkdir -p /uygulama/medya && chown uygulama:uygulama /uygulama/medya
ENV MEDYA_DIZINI=/uygulama/medya

USER uygulama
EXPOSE 3000

# Sağlık kontrolü veritabanına gerçek sorgu atar (bkz. /api/saglik).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/saglik').then(y=>process.exit(y.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
