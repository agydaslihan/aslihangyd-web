#!/usr/bin/env bash
#
# aslihangyd.com — günlük yedekleme
#
# Veritabanı dökümü + yüklenen görseller → restic ile şifreli, artımlı
# olarak uzak depoya.
#
# ⚠️ Test edilmemiş yedek, yedek değildir. Ayda bir `geri-yukle.sh` ile
#    gerçek bir geri yükleme denemesi yapın.
#
# Kurulum (sunucuda, deploy kullanıcısı olarak):
#   restic -r "$RESTIC_REPOSITORY" init
#
# Cron:
#   0 3 * * * /srv/aslihangyd/app/scripts/yedekle.sh >> /srv/aslihangyd/logs/yedek.log 2>&1

set -Eeuo pipefail

# Hata olursa hangi satırda olduğunu günlüğe yaz — sessiz başarısızlık,
# yedeklemede en tehlikeli davranıştır.
# ⚠️ `$?` ÖNCE okunuyor.
#
# İlk hali `echo "[$(date -Is)] … çıkış kodu $?"` idi ve HER ZAMAN 0 yazıyordu:
# `$(date -Is)` komut ikamesi `$?` genişletilmeden önce koşuyor ve çıkış
# kodunu sıfırlıyor. Yani hata mesajı "başarılı" diyordu. Gerçek bir geri
# yükleme gecesinde en yanıltıcı çıktı bu olurdu.
trap 'KOD=$?; echo "[$(date -Is)] HATA: satır $LINENO, çıkış kodu $KOD" >&2' ERR

UYGULAMA_DIZINI="${UYGULAMA_DIZINI:-/srv/aslihangyd/app}"

# ⚠️ Kap adları değişken: sabit yazıldığında betik YALNIZCA üretimde
# çalışabiliyordu — yani hiç denenemiyordu. "Test edilmemiş yedek, yedek
# değildir" uyarısını dosyanın başına yazıp betiği test edilemez bırakmak
# tutarsızdı. Varsayılanlar üretim adları; geliştirmede üzerine yazılır.
POSTGRES_KABI="${POSTGRES_KABI:-aslihangyd-postgres}"
UYGULAMA_KABI="${UYGULAMA_KABI:-aslihangyd-uygulama}"

GECICI_DIZIN="$(mktemp -d)"
trap 'rm -rf "$GECICI_DIZIN"' EXIT

cd "$UYGULAMA_DIZINI"

# .env'den yalnızca ihtiyaç duyulan değişkenler alınır.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER tanımlı olmalı}"
: "${POSTGRES_DB:?POSTGRES_DB tanımlı olmalı}"
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY tanımlı olmalı}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD tanımlı olmalı}"

DAMGA="$(date -u +%Y%m%d-%H%M%S)"
DOKUM="$GECICI_DIZIN/veritabani-$DAMGA.sql.gz"

echo "[$(date -Is)] Veritabanı dökümü alınıyor…"

# --clean --if-exists: geri yüklemede mevcut nesneler çakışma çıkarmasın.
docker exec "$POSTGRES_KABI" \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$DOKUM"

BOYUT=$(stat -c %s "$DOKUM")
if [ "$BOYUT" -lt 1024 ]; then
  echo "[$(date -Is)] HATA: Döküm şüpheli derecede küçük ($BOYUT bayt). Yedek İPTAL." >&2
  exit 1
fi

echo "[$(date -Is)] Döküm hazır ($((BOYUT / 1024)) KB). Medya dosyaları çıkarılıyor…"

MEDYA_DIZINI="$GECICI_DIZIN/medya"
mkdir -p "$MEDYA_DIZINI"
docker cp "$UYGULAMA_KABI":/uygulama/medya/. "$MEDYA_DIZINI/" 2>/dev/null || \
  echo "[$(date -Is)] Not: medya dizini boş veya erişilemedi, atlanıyor."

echo "[$(date -Is)] restic deposuna gönderiliyor…"

restic backup "$GECICI_DIZIN" \
  --tag aslihangyd \
  --tag "otomatik" \
  --host aslihangyd

# Saklama politikası: son 7 gün, 4 hafta, 12 ay, 3 yıl.
# `--prune` gerçekten yer boşaltır; haftada bir çalıştırmak yeterli olurdu
# ama günlük çalıştırmak da güvenli ve öngörülebilir.
echo "[$(date -Is)] Eski anlık görüntüler temizleniyor…"
restic forget \
  --tag aslihangyd \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --keep-yearly 3 \
  --prune

echo "[$(date -Is)] Depo bütünlüğü kontrol ediliyor…"
restic check --read-data-subset=1%

echo "[$(date -Is)] ✓ Yedekleme tamamlandı."
