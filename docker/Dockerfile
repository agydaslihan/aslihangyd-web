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
