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

## 6. Bakım görevleri (cron) ⚠️ ZORUNLU

Üç görev var. **İkisi yasal yükümlülük**, biri ticari. Çalışmazlarsa
kimse fark etmez — sessiz aksama bu işin en tehlikeli hali.

### 6.1 Görevler

| Anahtar | Ne yapar | Sıklık | Yasal? |
| --- | --- | --- | --- |
| `eids-kaldir` | Yetki belgesi süresi dolmuş yayındaki ilanları `yetki_bitti` durumuna çeker | **Her gün 03:10** | ✅ evet |
| `kvkk-sil` | Saklama süresi dolmuş talep ve danışman başvurularını siler | **Her gün 03:40** | ✅ evet |
| `eids-uyar` | 15 gün içinde yetkisi bitecek ilanları raporlar | Her gün 08:10 | ✗ hayır |

Kaydın kaynağı `src/lib/bakim/gorevler.ts` içindeki `GOREV_KAYDI`. Sıklık
ve "çalışmazsa ne olur" metinleri orada duruyor; buradaki tablo onun
özeti. Bir test her görevin bu alanlarının dolu olduğunu ve yasal
görevlerin günlük işaretlendiğini denetliyor.

### 6.2 ⚠️ Görev başına başarısızlık sonucu

**`eids-kaldir` çalışmazsa — YASAL RİSK, ERTELENEMEZ**

Yetki belgesi süresi dolmuş ilan yayında kalır. Bu, Taşınmaz Ticareti
Hakkında Yönetmelik kapsamında yetkisiz ilan yayını sayılır; idari
yaptırım ve ilan kaldırma riski doğar.

Kritik olan şu: EİDS yayın engeli kancası yalnızca **kaydetme anında**
çalışır. Hiç kimse ilana dokunmazsa yetki sessizce dolar ve ilan yayında
kalmaya devam eder. **Bu görev o boşluğu kapatan tek mekanizmadır.**

Görev bir gün atlarsa ertesi gün telafi eder — geriye dönük çalışır,
biriken tüm süresi dolmuş ilanları kaldırır. Ama arada geçen her gün
ihlal süresidir. Aksadığını gördüğünüzde **aynı gün** elle çalıştırın:

```bash
/srv/aslihangyd/app/scripts/bakim.sh eids-kaldir
```

**`kvkk-sil` çalışmazsa — YASAL RİSK**

Saklama süresi dolmuş kişisel veri silinmeden kalır. KVKK md. 7 ve md. 12
kapsamında ihlal; veri sahibinin başvurusu ya da denetim halinde yaptırım
riski. Gecikme her gün büyür, kendiliğinden düzelmez. Bu görev de geriye
dönük telafi eder.

**`eids-uyar` çalışmazsa — ticari kayıp, yasal ihlal yok**

Yaklaşan yetki bitişleri fark edilmez. Yasal ihlal doğmaz, çünkü
`eids-kaldir` ilanı zaten yayından alır — ama portföy sessizce görünmez
olur ve yetki yenileme fırsatı kaçar. Birkaç gün ertelenebilir.

⚠️ Bu görev bugün **e-posta göndermiyor**: SMTP yapılandırması yok.
Çıktısı yalnızca `/srv/aslihangyd/logs/bakim.log` dosyasına yazılıyor.
SMTP bilgileri gelene kadar bu günlüğü haftada bir gözle taramak gerekiyor
(`docs/SENDEN-BEKLENENLER.md`).

### 6.3 ⚠️ Neden üç ayrı cron satırı

Üçü tek çağrıda koşabilirdi. Koşmuyorlar, çünkü **arıza yalıtımı** gerekli:

KVKK silme görevi bozulsaydı (bir veritabanı kısıtı, bir şema
değişikliği), uç her gece hata döner ve cron her gece uyarı üretirdi. Bu
durumda işletmecinin en olası tepkisi cron satırını susturmaktır — ve
yasal riski olan **EİDS kontrolü de onunla birlikte susardı.**

Ayrı satırlar bunu imkânsız kılıyor: bir görevin arızası diğerini
durduramaz.

### 6.4 Kurulum

Anahtar `.env` içinde olmalı. Yoksa üretin:

```bash
cd /srv/aslihangyd/app
echo "BAKIM_ANAHTARI=$(openssl rand -hex 32)" >> .env
docker compose -f docker/compose.prod.yml up -d --force-recreate uygulama
```

⚠️ `.env` değişince **kabı yeniden başlatmak zorunlu** — Docker ortam
değişkenlerini yalnızca başlangıçta okur. Yeniden başlatmazsanız uç 404
dönmeye devam eder ve hiçbir görev çalışmaz.

Betiği ve günlük dizinini hazırlayın:

```bash
chmod 750 /srv/aslihangyd/app/scripts/bakim.sh
mkdir -p /srv/aslihangyd/logs
chown deploy:deploy /srv/aslihangyd/logs
```

### 6.5 ⚠️ Cron dosyası

`/etc/cron.d/aslihangyd-bakim` — kök kullanıcı oluşturur, izni `644`:

```cron
# aslihangyd.com bakım görevleri
#
# ⚠️ CRON_TZ zorunlu. Sunucu UTC ise "03:10" saat 06:10 İstanbul demektir
#    ve EİDS kontrolü günün yanlış yerinde çalışır. Uygulamanın kendi tarih
#    mantığı zaten Europe/Istanbul'a sabitli; kayan tek şey cron'un saati.
CRON_TZ=Europe/Istanbul
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""

# EİDS — yetkisi dolan ilanları yayından kaldır. YASAL, günlük.
# Yedekleme 03:00'te başlıyor; çakışmasın diye 10 dakika sonra.
10 3 * * *  deploy  /srv/aslihangyd/app/scripts/bakim.sh eids-kaldir >> /srv/aslihangyd/logs/bakim.log 2>&1

# KVKK — saklama süresi dolan kişisel verileri sil. YASAL, günlük.
40 3 * * *  deploy  /srv/aslihangyd/app/scripts/bakim.sh kvkk-sil >> /srv/aslihangyd/logs/bakim.log 2>&1

# EİDS — yaklaşan yetki bitişlerini raporla. Mesai saatinde, okunsun diye.
10 8 * * *  deploy  /srv/aslihangyd/app/scripts/bakim.sh eids-uyar >> /srv/aslihangyd/logs/bakim.log 2>&1

# Nöbetçi — EİDS görevi bugün çalıştı mı? Çalışmadıysa haber ver.
0 9 * * *  deploy  grep -q "^\[$(date +\%Y-\%m-\%d).*TAMAM (eids-kaldir)" /srv/aslihangyd/logs/bakim.log || echo "UYARI: EİDS bakım görevi bugün çalışmadı — yasal risk" | tee -a /srv/aslihangyd/logs/bakim.log
```

Yükleyin ve doğrulayın:

```bash
sudo install -m 644 -o root -g root aslihangyd-bakim /etc/cron.d/aslihangyd-bakim
sudo systemctl restart cron          # Debian/Ubuntu
grep CRON /var/log/syslog | tail     # satırlar okundu mu
```

⚠️ `/etc/cron.d` dosyalarında **satır sonunda newline olmalı** ve dosya
adında nokta bulunamaz (`aslihangyd-bakim` olur, `aslihangyd.bakim`
olmaz) — cron böyle dosyaları sessizce yok sayar.

### 6.6 ⚠️ Neden doğrudan `curl` değil de betik

İlk taslakta cron satırı şuydu:

```cron
0 4 * * * deploy curl -H "Authorization: Bearer ${BAKIM_ANAHTARI}" https://…
```

**Bu satır çalışmaz.** `/etc/cron.d` dosyaları uygulamanın `.env`'ini
okumaz; `${BAKIM_ANAHTARI}` boş genişler ve uç her gece 401 döner.
Anahtarı cron dosyasının içine yazmak ise onu `/etc/cron.d` altında
herkesin okuyabileceği bir yere koymak demek.

`scripts/bakim.sh` anahtarı `.env`'den okur (dosya izni `750`, sahibi
`deploy`), vekil sunucuyu dolaşmadan doğrudan uygulama kabına gider ve
anlamlı çıkış kodu döner:

| Kod | Anlamı | Ne yapmalı |
| --- | --- | --- |
| 0 | Görev başarılı | — |
| 1 | Yapılandırma hatası (anahtar yok/yanlış, uç kapalı) | `.env` ve kap yeniden başlatma |
| 2 | Görev çalıştı ama hata verdi | Günlükteki JSON'a bakın |
| 3 | Uca ulaşılamadı | Uygulama ayakta mı: `/api/saglik` |

Betik `curl -f` **kullanmaz**: `-f` yanıt gövdesini atar ve hangi görevin
neden başarısız olduğunu söyleyen JSON kaybolur.

### 6.7 Doğrulama

Kurulumdan sonra elle çalıştırıp görün:

```bash
sudo -u deploy /srv/aslihangyd/app/scripts/bakim.sh eids-kaldir
echo "çıkış kodu: $?"          # 0 bekleniyor
```

Ertesi sabah günlüğe bakın:

```bash
tail -20 /srv/aslihangyd/logs/bakim.log
```

Üç `TAMAM` satırı görmelisiniz. Görmüyorsanız §9'daki "Bakım görevi
çalışmıyor" başlığına bakın.

Günlük dosyası büyür; aylık döndürün (`/etc/logrotate.d/aslihangyd`):

```
/srv/aslihangyd/logs/*.log {
    monthly
    rotate 12
    compress
    missingok
    notifempty
    create 0640 deploy deploy
}
```

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
| Bakım günlüğü | `/srv/aslihangyd/logs/bakim.log` — günde üç `TAMAM` satırı olmalı |
| Bakım nöbetçisi | Her sabah 09:00, EİDS görevi çalışmadıysa günlüğe `UYARI` yazar |
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

### "Bakım görevi çalışmıyor" ⚠️

Belirti: `/srv/aslihangyd/logs/bakim.log` içinde bugüne ait `TAMAM` satırı
yok ya da nöbetçi `UYARI` yazmış.

Sırayla bakın — en sık görülenden başlayarak:

```bash
# 1. Betik elle çalışıyor mu, ne diyor?
sudo -u deploy /srv/aslihangyd/app/scripts/bakim.sh eids-kaldir
echo "çıkış: $?"
```

| Çıkış | Sebep | Çözüm |
| --- | --- | --- |
| 1 + "uç kapalı (404)" | `.env`'e anahtar eklendi ama kap yeniden başlatılmadı | `docker compose -f docker/compose.prod.yml up -d --force-recreate uygulama` |
| 1 + "yetkisiz (401)" | `.env`'deki anahtar ile kabın gördüğü farklı | Aynı komut; anahtarı değiştirdiyseniz kap yeniden başlamalı |
| 1 + ".env okunamıyor" | Betik yanlış dizinden çalışıyor ya da izin yok | `UYGULAMA_DIZINI` doğru mu, dosya sahibi `deploy` mi |
| 3 | Uygulama ayakta değil | `docker compose ps`, `curl localhost:3000/api/saglik` |
| 2 | Görev çalıştı, hata verdi | Günlükteki JSON'daki `hata` alanını okuyun |

Betik elle çalışıyor ama cron çalışmıyorsa:

```bash
grep CRON /var/log/syslog | tail -20      # cron satırı okundu mu
ls -l /etc/cron.d/aslihangyd-bakim        # izin 644, sahip root
tail -c 1 /etc/cron.d/aslihangyd-bakim | xxd   # dosya newline ile bitmeli
```

⚠️ Dosya adında nokta varsa cron dosyayı **sessizce yok sayar**.

⚠️ **`eids-kaldir` aksadıysa aynı gün elle çalıştırın.** Görev geriye
dönük telafi eder ama arada geçen her gün, yetkisiz ilan yayında kaldığı
gündür.

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
| `scripts/bakim.sh` | Bakım görevi çağırıcı (cron buradan çalışır) |
| `scripts/yedekle.sh` · `geri-yukle.sh` | Yedekleme ve geri yükleme |
| `src/lib/bakim/gorevler.ts` | Görev kaydı: sıklık ve başarısızlık sonuçları |
