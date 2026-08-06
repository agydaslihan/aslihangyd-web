#!/usr/bin/env bash
#
# aslihangyd.com — bakım görevi çağırıcı
#
# Cron ile /api/bakim ucunu çağırır. Tek görev ya da tümü çalıştırılabilir.
#
# ⚠️ NEDEN BU BETİK VAR — cron doğrudan curl çağıramaz:
#
#    /etc/cron.d dosyaları uygulamanın .env'ini OKUMAZ. Oraya
#    `Bearer ${BAKIM_ANAHTARI}` yazmak, boş bir anahtar göndermek ve her
#    gece 401 almak demektir. Anahtarı cron dosyasının içine yazmak ise
#    onu /etc/cron.d altında herkesin okuyabileceği bir yere koymaktır.
#
#    Bu betik anahtarı .env'den okur, dosya izni 750 ve sahibi deploy.
#
# Kurulum:
#   chmod 750 /srv/aslihangyd/app/scripts/bakim.sh
#
# Kullanım:
#   ./scripts/bakim.sh eids-kaldir
#   ./scripts/bakim.sh              # tüm görevler
#
# Çıkış kodları:
#   0  görev(ler) başarılı
#   1  yapılandırma hatası (anahtar yok, .env okunamıyor)
#   2  uç hata döndü (görev çalıştı ama başarısız oldu)
#   3  uca hiç ulaşılamadı (uygulama ayakta değil, ağ sorunu)

set -Eeuo pipefail

UYGULAMA_DIZINI="${UYGULAMA_DIZINI:-/srv/aslihangyd/app}"
# Vekil sunucuyu ve dış ağı dolaşmadan doğrudan uygulama kabına gidilir.
BAKIM_ADRESI="${BAKIM_ADRESI:-http://127.0.0.1:3000/api/bakim}"
# EİDS görevi 500 ilanı gezebilir; cimri bir zaman aşımı görevi yarıda keser.
ZAMAN_ASIMI="${ZAMAN_ASIMI:-120}"

GOREV="${1:-}"

zaman() { date -Is; }
bildir() { echo "[$(zaman)] $*"; }

trap 'bildir "HATA: satır $LINENO, çıkış kodu $?"' ERR

cd "$UYGULAMA_DIZINI"

# ── Anahtar ────────────────────────────────────────────────────────────────
# .env tümden `source` edilmiyor: dosyada tırnaksız boşluk içeren ya da
# komut ikamesi barındıran bir satır varsa onu çalıştırmış oluruz.
# Yalnızca aranan satır ayıklanıyor.
if [ ! -r .env ]; then
  bildir "HATA: $UYGULAMA_DIZINI/.env okunamıyor"
  exit 1
fi

ANAHTAR="$(sed -n 's/^[[:space:]]*BAKIM_ANAHTARI[[:space:]]*=[[:space:]]*//p' .env | head -n 1)"
# Kabuk tırnaklarını at.
ANAHTAR="${ANAHTAR%\"}"; ANAHTAR="${ANAHTAR#\"}"
ANAHTAR="${ANAHTAR%\'}"; ANAHTAR="${ANAHTAR#\'}"

if [ -z "$ANAHTAR" ]; then
  bildir "HATA: .env içinde BAKIM_ANAHTARI boş ya da tanımsız"
  bildir "      Uç bu durumda 404 döner ve HİÇBİR bakım görevi çalışmaz."
  exit 1
fi

# ── Çağrı ──────────────────────────────────────────────────────────────────
ADRES="$BAKIM_ADRESI"
if [ -n "$GOREV" ]; then
  ADRES="$BAKIM_ADRESI?gorev=$GOREV"
fi

GECICI="$(mktemp)"
trap 'rm -f "$GECICI"' EXIT

# ⚠️ `-f` KULLANILMIYOR. `-f` gövdeyi atar; hangi görevin neden başarısız
# olduğunu söyleyen JSON'u kaybederiz. Durum kodu ayrıca okunuyor.
KOD="$(
  curl -sS --max-time "$ZAMAN_ASIMI" \
    -o "$GECICI" -w '%{http_code}' \
    -H "Authorization: Bearer $ANAHTAR" \
    "$ADRES"
)" || {
  bildir "HATA: uca ulaşılamadı ($ADRES) — uygulama ayakta mı?"
  exit 3
}

GOSTERILEN="${GOREV:-tüm görevler}"

case "$KOD" in
  200)
    bildir "TAMAM ($GOSTERILEN): $(tr -d '\n' < "$GECICI")"
    exit 0
    ;;
  207)
    bildir "KISMİ BAŞARI ($GOSTERILEN) — bazı görevler hata verdi:"
    bildir "$(tr -d '\n' < "$GECICI")"
    exit 2
    ;;
  404)
    bildir "HATA: uç kapalı (404). Sunucudaki BAKIM_ANAHTARI tanımsız."
    bildir "      Uygulama kabı .env'i okuyacak şekilde yeniden başlatıldı mı?"
    exit 1
    ;;
  401)
    bildir "HATA: yetkisiz (401). .env'deki anahtar ile uygulamanınki farklı."
    bildir "      Anahtarı değiştirdiyseniz kabı yeniden başlatın."
    exit 1
    ;;
  *)
    bildir "HATA ($GOSTERILEN) — HTTP $KOD: $(tr -d '\n' < "$GECICI")"
    exit 2
    ;;
esac
