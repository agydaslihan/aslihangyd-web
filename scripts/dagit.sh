#!/usr/bin/env bash
#
# Üretim dağıtımı — ISLETME-REHBERI §5.3'ün tek komutu.
#
# ─────────────────────────────────────────────────────────────────────────
# ⚠️ NEDEN BETİK: GÖÇ ADIMI İKİ KEZ ATLANDI.
#
# 13 Ağustos 2026 — yalnızca imaj çekilip uygulama başlatıldı, göç
# atlandı. Ana sayfa 500 döndü: `relation "ilanlar_cephe_yonu" does not
# exist`. Gürültülü arıza, aynı gün fark edildi.
#
# 18–20 Ağustos 2026 — yine atlandı. Bu sefer site HİÇ BOZULMADI: içerik
# okuyucularındaki `try/catch` blokları eksik tabloyu yakalayıp varsayılana
# düştü. Sayfalar 200, sağlık ucu "saglikli", 24 saatte tek hata yok —
# ama yeni özellikler ölüydü ve iki gün fark edilmedi.
#
# İkisinin ortak sebebi aynı: dört komutu elle yazan kişi birini atlayabilir.
# Adımları belgede sıralamak yetmiyor; tek çağrı hâline getirmek gerekiyor.
# ─────────────────────────────────────────────────────────────────────────
#
# ⚠️ `set -euo pipefail`: bir adım başarısızsa SONRAKİLER ÇALIŞMAZ. Göç
# başarısızken uygulamayı yenilemek, tam olarak kaçındığımız duruma —
# şemayla uyumsuz kod — götürürdü.
#
# Kullanım (deploy kullanıcısı olarak; `.env` yalnızca ona okunabilir):
#
#   sudo -u deploy bash /srv/aslihangyd/app/scripts/dagit.sh
#
set -euo pipefail

UYGULAMA_DIZINI="${UYGULAMA_DIZINI:-/srv/aslihangyd/app}"
SAGLIK_ADRESI="${SAGLIK_ADRESI:-https://aslihangyd.com/api/saglik}"

cd "$UYGULAMA_DIZINI"

if [[ ! -r .env ]]; then
  echo "HATA: $UYGULAMA_DIZINI/.env okunamıyor." >&2
  echo "      Bu betik deploy kullanıcısı olarak çalıştırılmalı:" >&2
  echo "      sudo -u deploy bash $UYGULAMA_DIZINI/scripts/dagit.sh" >&2
  exit 1
fi

C=(docker compose --env-file .env -f docker/compose.prod.yml)

echo "── 1/6 İmajlar çekiliyor"
"${C[@]}" pull
# Göçmen ayrı bir profilde; `pull` onu kendiliğinden almıyor.
"${C[@]}" --profile gocmen pull gocmen

echo
echo "── 2/6 Bekleyen göçler"
# ⚠️ Bu adım yalnızca OKUR. Ne uygulanacağını görmek, uygulamadan önce
#    bir saniyelik iş; atlandığında ise iki gün süren sessiz arıza.
"${C[@]}" --profile gocmen run --rm gocmen pnpm payload migrate:status

echo
echo "── 3/6 Göç uygulanıyor (ZORUNLU — atlanamaz)"
# ⚠️ KOŞULSUZ. Bekleyen göç yoksa saniyeler sürer ve hiçbir şey yapmaz.
#    "Bu sürümde şema değişti mi?" sorusunun cevabını dağıtımı yapan
#    kişinin bilmesini beklemek, iki kez arızaya yol açtı.
"${C[@]}" --profile gocmen run --rm gocmen

echo
echo "── 4/6 Uygulama yenileniyor"
"${C[@]}" up -d --no-deps uygulama

echo
echo "── 5/6 Doğrulama"
# Kap ayağa kalkarken ilk istek erken gidebilir; birkaç kez deneniyor.
for deneme in $(seq 1 12); do
  if curl -fsS --max-time 10 "$SAGLIK_ADRESI" > /dev/null 2>&1; then
    echo "Sağlık kontrolü temiz: $SAGLIK_ADRESI"
    break
  fi
  if [[ "$deneme" -eq 12 ]]; then
    echo "HATA: sağlık kontrolü yanıt vermedi — $SAGLIK_ADRESI" >&2
    echo "      Günlük: docker compose -f docker/compose.prod.yml logs --tail 50 uygulama" >&2
    exit 1
  fi
  sleep 5
done

echo
echo "── 6/6 Eski imajlar temizleniyor"
# 3,2 GB'lık sunucuda disk gerçek bir kısıt.
docker image prune -f

echo
echo "Dağıtım tamam."
echo
echo "⚠️ Panelin ana ekranındaki bildirim şeridine bakın: şema denetimi"
echo "   açılıştan ~15 sn sonra koşuyor ve eksik tablo varsa 'Bütünlük'"
echo "   etiketiyle kırmızı uyarı çıkarıyor."
