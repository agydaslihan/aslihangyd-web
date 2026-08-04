# İşletme Rehberi

Sunucu, deploy, yedekleme ve bakım işlerinin nasıl yapıldığı.
Günlük içerik girişi için değil, teknik işletim için yazıldı.

---

## 1. Ortamlar

| Ortam | Nerede | Ne için |
| --- | --- | --- |
| Geliştirme | Kendi makinede, `pnpm dev` | Kod yazma |
| Üretim | Sunucu, Docker Compose | Canlı site |

Geliştirmede yalnızca PostgreSQL ve Redis container'da çalışır; uygulama
host üzerinde koşar. Sebebi: 3.2 GB RAM'de Next.js dev sunucusunu
container'a koymak hem belleği hem yeniden derleme süresini yiyor.

---

## 2. Geliştirme ortamını çalıştırma

```bash
pnpm install
pnpm db:up              # Postgres + Redis
pnpm payload migrate    # veritabanı şeması
pnpm seed               # DEMO veri (isteğe bağlı)
pnpm dev                # http://localhost:3000
```

Yönetim paneli: <http://localhost:3000/admin>
İlk açılışta yönetici hesabı oluşturmanız istenir.

Demo veriyi silmek için:

```bash
TEMIZLE=1 pnpm seed
```

> `payload run` betiklere komut satırı argümanı geçirmiyor; bu yüzden
> seçenekler ortam değişkeniyle veriliyor.

---

## 3. Kalite kapısı

Her faz sonunda dördü de temiz geçmelidir:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Aynı komutlar her PR'da GitHub Actions üzerinde de koşar
(`.github/workflows/ci.yml`). CI'da gerçek bir PostGIS veritabanı ayağa
kalkar — EİDS ve KVKK entegrasyon testleri gerçek veritabanı ister ve
onları CI'da atlamak kapıyı anlamsız kılardı.

### Test katmanları

- `*.test.ts` — birim testi, bağımlılıksız, milisaniyeler
- `*.entegrasyon.test.ts` — gerçek PostgreSQL'e karşı Payload Local API

Ayrım önemli: birim testi kuralın **doğru hesaplandığını**, entegrasyon
testi kuralın **atlanamadığını** kanıtlar. EİDS için ikisi de gerekli.

---

## 4. Veritabanı değişiklikleri

Payload koleksiyonlarında alan eklediğinizde:

```bash
pnpm payload generate:types     # TypeScript tipleri
pnpm payload migrate:create <ad>
pnpm payload migrate
```

⚠️ Üretilen migration'ı **önce staging'de** çalıştırın. Migration dosyaları
depoya girer ve deploy sırasında otomatik uygulanır.

---

## 5. Üretim deploy

### 5.1 İlk kurulum (sunucuda, bir kez)

```bash
sudo mkdir -p /srv/aslihangyd/{app,logs}
sudo chown -R deploy:deploy /srv/aslihangyd
cd /srv/aslihangyd/app
git clone <depo> .
cp .env.example .env
# .env dosyasını doldurun — özellikle PAYLOAD_SECRET ve POSTGRES_PASSWORD
```

`PAYLOAD_SECRET` üretmek için:

```bash
openssl rand -base64 48
```

### 5.2 Çalıştırma

```bash
docker compose --env-file .env -f docker/compose.prod.yml up -d
docker compose --env-file .env -f docker/compose.prod.yml run --rm uygulama \
  node -e "require('payload').getPayload" # şema kontrolü
```

### 5.3 Güncelleme

```bash
cd /srv/aslihangyd/app
git pull
docker compose --env-file .env -f docker/compose.prod.yml pull
docker compose --env-file .env -f docker/compose.prod.yml up -d --no-deps uygulama
docker image prune -f
curl -f https://aslihangyd.com/api/saglik
```

### 5.4 Ağ güvenliği ⚠️

`compose.prod.yml` içinde **yalnızca Caddy** dışarıya port açar.
PostgreSQL ve Redis'te `ports` tanımı yoktur ve **eklenmemelidir.**

Sebep: Docker port yayınlarken iptables kurallarını doğrudan yazar ve UFW
kurallarını atlar. `ports: - "5432:5432"` eklemek, UFW'de 5432 kapalı
görünmesine rağmen veritabanını tüm internete açar.

Uzaktan veritabanına erişmeniz gerekirse SSH tüneli kullanın:

```bash
ssh -L 5432:localhost:5432 deploy@sunucu
docker exec -it aslihangyd-postgres psql -U <kullanici> -d <veritabani>
```

---

## 6. Günlük bakım görevi ⚠️ ZORUNLU

Yetkisi dolan ilanları yayından kaldırır ve saklama süresi dolan kişisel
verileri siler. **Bu görev çalışmazsa yasal uyum bozulur.**

`.env` dosyasına rastgele bir anahtar koyun:

```bash
BAKIM_ANAHTARI=$(openssl rand -hex 32)
```

Cron'a ekleyin (`/etc/cron.d/aslihangyd-bakim`):

```cron
0 4 * * * deploy curl -fsS -H "Authorization: Bearer ${BAKIM_ANAHTARI}" https://aslihangyd.com/api/bakim >> /srv/aslihangyd/logs/bakim.log 2>&1
```

`BAKIM_ANAHTARI` tanımlı değilse uç **404 döner** — açıkta duran, herkesin
çağırabildiği bir veri silme ucu bırakmaktansa hiç çalışmasın.

Görevler:

1. **EİDS** — yetkisi dolmuş yayındaki ilanları `yetki_bitti` durumuna çeker
2. **EİDS** — 15 gün içinde yetkisi bitecekleri raporlar
3. **KVKK** — saklama süresi dolan talep kayıtlarını siler

---

## 7. Yedekleme

```bash
# İlk kurulum
restic -r "$RESTIC_REPOSITORY" init

# Cron: /etc/cron.d/aslihangyd-yedek
0 3 * * * deploy /srv/aslihangyd/app/scripts/yedekle.sh >> /srv/aslihangyd/logs/yedek.log 2>&1
```

Yedeklenenler: PostgreSQL dökümü + yüklenen görseller.
Saklama: 7 gün, 4 hafta, 12 ay, 3 yıl.

### ⚠️ Ayda bir geri yükleme testi

Test edilmemiş yedek, yedek değildir.

```bash
# Ayrı bir test veritabanına geri yükle — üretime dokunmaz
docker exec aslihangyd-postgres createdb -U <kullanici> geri_yukleme_testi
HEDEF_VERITABANI=geri_yukleme_testi ./scripts/geri-yukle.sh latest
```

Üretim veritabanının üzerine yazmak için betik açık onay ister
(`EVET, USTUNE YAZ` yazmanız gerekir).

---

## 8. İzleme

| Ne | Nerede |
| --- | --- |
| Sağlık kontrolü | `GET /api/saglik` — veritabanına gerçek sorgu atar |
| Uygulama günlükleri | `docker compose -f docker/compose.prod.yml logs -f uygulama` |
| Bakım günlüğü | `/srv/aslihangyd/logs/bakim.log` |
| Yedek günlüğü | `/srv/aslihangyd/logs/yedek.log` |
| Performans | Her PR'da Lighthouse (`.github/workflows/lighthouse.yml`) |

`/api/saglik` bilinçli olarak sürüm veya yapılandırma bilgisi döndürmez —
herkese açık bir uçtur.

---

## 9. Sık karşılaşılan durumlar

### "İlan yayına alınamıyor"

Beklenen davranıştır. EİDS sekmesindeki koşullar sağlanmadan ilan yayına
alınamaz. Hata mesajı tam olarak neyin eksik olduğunu yazar.

Bu kural **kod seviyesinde zorlanır** ve devre dışı bırakılamaz. Geliştirme
ortamında bile atlanamaz — test verisi gerekiyorsa geçerli EİDS alanlarına
sahip test verisi üretilir (`scripts/seed.ts` böyle yapar).

### "Analitik çalışmıyor"

Çerez onayı verilmemiş olabilir. Analitik betiği, onay olmadan HTML'e
**hiç eklenmez** — bu bir hata değil, KVKK gereğidir.

### "Mahalle sayfası boş görünüyor"

İçerik girilmemiş demektir. Sayfa kırılmaz, boş durum gösterir.
`docs/SENDEN-BEKLENENLER.md` dosyasındaki içerik listesine bakın.

### Bellek sorunu

Sunucu 3.2 GB RAM ile çalışıyor. `compose.prod.yml` içinde her servise
`mem_limit` tanımlı. Derleme sırasında bellek yetmezse derlemeyi CI'da
yapıp yalnızca imajı çekin (varsayılan akış zaten budur).

---

## 10. İlgili dosyalar

| Dosya | İçerik |
| --- | --- |
| `CLAUDE.md` | İhlal edilemez kurallar, kod standartları |
| `docs/PROJE-PLANI.md` | Genel plan, hukuk, mimari |
| `docs/ILERLEME.md` | Ne yapıldı, hangi karar neden verildi |
| `docs/SENDEN-BEKLENENLER.md` | Aslıhan'dan beklenenler |
| `docs/ENDEKS-VERI-YONETIMI.md` | Endeks metodolojisi (Faz 2C) |
| `docs/BAL-KUPU-VE-PORTFOY-YONETIMI.md` | Faz 2B şartnamesi |
