#!/usr/bin/env bash
#
# aslihangyd.com — yedekten geri yükleme
#
# ⚠️ BU BETİK VERİTABANINI ÜZERİNE YAZAR. Geri alınamaz.
#
# Ayda bir çalıştırıp yedeğin gerçekten işe yaradığını doğrulayın —
# tercihen ayrı bir test veritabanına (HEDEF_VERITABANI ile).
#
# Kullanım:
#   ./geri-yukle.sh latest                    # en son yedek
#   ./geri-yukle.sh a1b2c3d4                  # belirli anlık görüntü
#   HEDEF_VERITABANI=deneme ./geri-yukle.sh latest   # test veritabanına

set -Eeuo pipefail
trap 'echo "[$(date -Is)] HATA: satır $LINENO, çıkış kodu $?" >&2' ERR

ANLIK_GORUNTU="${1:-}"
if [ -z "$ANLIK_GORUNTU" ]; then
  echo "Kullanım: $0 <anlık-görüntü-kimliği|latest>" >&2
  echo "" >&2
  echo "Mevcut yedekler:" >&2
  restic snapshots --tag aslihangyd >&2 || true
  exit 1
fi

UYGULAMA_DIZINI="${UYGULAMA_DIZINI:-/srv/aslihangyd/app}"
cd "$UYGULAMA_DIZINI"

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

HEDEF="${HEDEF_VERITABANI:-$POSTGRES_DB}"

# Üretim veritabanının üzerine yazılacaksa açık onay iste.
if [ "$HEDEF" = "$POSTGRES_DB" ]; then
  echo ""
  echo "⚠️  UYARI: ÜRETİM veritabanının ('$HEDEF') üzerine yazılacak."
  echo "   Mevcut tüm veriler kaybolacak. Bu işlem GERİ ALINAMAZ."
  echo ""
  read -r -p "Devam etmek için 'EVET, USTUNE YAZ' yazın: " onay
  if [ "$onay" != "EVET, USTUNE YAZ" ]; then
    echo "İptal edildi."
    exit 1
  fi
fi

GECICI_DIZIN="$(mktemp -d)"
trap 'rm -rf "$GECICI_DIZIN"' EXIT

echo "[$(date -Is)] Yedek indiriliyor: $ANLIK_GORUNTU"
restic restore "$ANLIK_GORUNTU" --target "$GECICI_DIZIN"

DOKUM="$(find "$GECICI_DIZIN" -name 'veritabani-*.sql.gz' | sort | tail -1)"
if [ -z "$DOKUM" ]; then
  echo "HATA: Yedekte veritabanı dökümü bulunamadı." >&2
  exit 1
fi

echo "[$(date -Is)] Bulunan döküm: $(basename "$DOKUM")"
echo "[$(date -Is)] '$HEDEF' veritabanına geri yükleniyor…"

gunzip -c "$DOKUM" | docker exec -i aslihangyd-postgres \
  psql -U "$POSTGRES_USER" -d "$HEDEF" -v ON_ERROR_STOP=1

echo "[$(date -Is)] Medya dosyaları geri yükleniyor…"
MEDYA_KAYNAK="$(find "$GECICI_DIZIN" -type d -name medya | head -1)"
if [ -n "$MEDYA_KAYNAK" ] && [ "$HEDEF" = "$POSTGRES_DB" ]; then
  docker cp "$MEDYA_KAYNAK/." aslihangyd-uygulama:/uygulama/medya/
else
  echo "[$(date -Is)] Medya atlandı (test geri yüklemesi veya dosya yok)."
fi

echo "[$(date -Is)] ✓ Geri yükleme tamamlandı."
echo ""
echo "Sonraki adım: uygulamayı yeniden başlatın ve /api/saglik ucunu kontrol edin."
echo "  docker compose -f docker/compose.prod.yml restart uygulama"
