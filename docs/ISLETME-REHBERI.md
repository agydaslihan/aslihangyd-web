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
# ⚠️ ÜRETİM örneği — `.env.example` GELİŞTİRME içindir.
# Farkları tek tek işaretli: hangi değer değişmek zorunda, hangisi
# yalnızca üretimde var. `.env.example` kopyalanırsa BAKIM_ANAHTARI ve
# RESTIC_* eksik kalır — EİDS kontrolü ve yedekleme çalışmaz.
cp .env.production.example .env
# Ardından "AslihanTarafindanDoldurulacak" yazan her satırı doldurun.
```

`PAYLOAD_SECRET` üretmek için:

```bash
openssl rand -base64 48
```

⚠️ `.env` içinde genel adres **portsuz ve https** olmalı:

```
NEXT_PUBLIC_SERVER_URL=https://aslihangyd.com
```

Kanonik URL'ler, site haritası, robots.txt ve OG etiketleri bu değerden
üretilir. Yanlış yazılırsa arama motoruna ulaşılamayan adresler
bildirirsiniz.

⚠️ Eski kurulumdan geçiyorsanız buradaki `:8443` portunu **silin**. Kalırsa
site çalışmaya devam eder ama site haritası ve kanonik etiketler
ulaşılamayan adresler gösterir — sessiz bir SEO hasarı.

⚠️ **`NEXT_PUBLIC_*` değişkenleri çalışma zamanında okunmaz.** Next.js
onları derleme anında koda gömer — sunucu tarafında bile. Uygulamanın
gerçekten okuduğu, ön eksiz `SITE_ADRESI`. İkisini de aynı değerle yazın;
`.env.production.example` bunu zaten böyle gösteriyor.

### ⚠️ `up -d` yeni imajı ÇEKMEZ — `pull` şart

13 Ağustos 2026'da bir düzeltme "dağıtıldı" sanıldı ama uygulama eski
kodla çalışmaya devam etti. Sebep:

- `git pull` yapıldı → `compose.prod.yml` güncellendi
- `up -d` çalıştırıldı → compose değişiklikleri uygulandı, kap yeniden
  başladı
- **ama `:latest` etiketi yerel önbellekteki ESKİ digest'e işaret etmeye
  devam etti**

Sonuç kafa karıştırıcıydı: yeni ortam değişkenleri kapta görünüyordu
(compose'dan geliyorlar) ama kod onları okumuyordu (imaj eski).

**Doğru sıra:**

```bash
cd /srv/aslihangyd/app
git pull
docker compose --env-file .env -f docker/compose.prod.yml pull uygulama
docker compose --env-file .env -f docker/compose.prod.yml up -d
```

Hangi kodun çalıştığını doğrulamak için:

```bash
docker image inspect ghcr.io/agydaslihan/aslihangyd-web:latest \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}'
```

Çıkan commit SHA'sı `git log -1 --format=%H` ile aynı olmalı. Değilse imaj
çekilmemiş ya da CI henüz derlemeyi bitirmemiştir
(`gh run list --workflow=imaj.yml`).

### Hangi `.env` değişkeni ne zaman etkili olur

Bu tablo tek bir soruyu yanıtlıyor: **bir değeri değiştirdim, ne yapmam
gerekiyor?**

| Ne zaman okunur | Değiştirince ne gerekir | Hangileri |
| --- | --- | --- |
| **Çalışma zamanı** | `.env` düzenle → `up -d` (kabı yeniden başlat) | `SITE_ADRESI`, `MAPTILER_ANAHTARI`, `TURNSTILE_*`, `WHATSAPP_NUMARA`, `ILETISIM_*`, `UMAMI_*`, `BUNNY_STREAM_*`, `DATABASE_URI`, `PAYLOAD_SECRET`, `BAKIM_ANAHTARI`, `OVERPASS_ADRESI` |
| **Derleme anı** | İmajı yeniden derle + dağıt | `NEXT_PUBLIC_*` (yalnızca yedek olarak duruyorlar) |
| **Yalnızca compose** | `up -d` | `UYGULAMA_IMAJI`, `CADDY_EPOSTA`, `POSTGRES_*` |

⚠️ **Kap başladıktan sonra `.env`'i düzenlemek hiçbir şeyi değiştirmez.**
Docker ortam değişkenlerini kap AYAĞA KALKARKEN okur. Değişiklikten sonra
`docker compose --env-file .env -f docker/compose.prod.yml up -d` demek
şart; `restart` yetmez.

#### Tam liste — çalışma zamanı ayarları

Kod bu ayarları `src/lib/ayarlar.ts` üzerinden okuyor. Her biri önce yeni
adı, bulamazsa eski `NEXT_PUBLIC_` adını deniyor.

| Ayar | Eski ad (hâlâ çalışır) | Eksikse ne olur |
| --- | --- | --- |
| `SITE_ADRESI` | `NEXT_PUBLIC_SERVER_URL` | Kanonik adresler, site haritası ve OG etiketleri yanlış adres yayınlar — sessiz SEO hasarı |
| `MAPTILER_ANAHTARI` | `NEXT_PUBLIC_MAPTILER_API_KEY` | `/harita` boş durumda kalır; içe aktarılan ilgi noktaları görünmez |
| `TURNSTILE_SITE_ANAHTARI` | `NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI` | ⚠️ Formlar **bot korumasız** çalışır — gizli anahtar dolu olsa bile |
| `WHATSAPP_NUMARA` | `NEXT_PUBLIC_WHATSAPP_NUMARA` | WhatsApp düğmeleri hiç görünmez |
| `ILETISIM_TELEFON` | `NEXT_PUBLIC_ILETISIM_TELEFON` | Üst şerit ve altbilgide telefon yok; ilan sayfasında "Ara" düğmesi çıkmaz |
| `ILETISIM_EPOSTA` | `NEXT_PUBLIC_ILETISIM_EPOSTA` | Üst şerit ve altbilgide e-posta yok |
| `UMAMI_URL` | `NEXT_PUBLIC_UMAMI_URL` | Ziyaret ölçümü yapılmaz |
| `UMAMI_SITE_ID` | `NEXT_PUBLIC_UMAMI_SITE_ID` | Ziyaret ölçümü yapılmaz |
| `BUNNY_STREAM_LIBRARY_ID` | `NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID` | Videolar "oynatıcı yapılandırılmadı" der |
| `BUNNY_STREAM_CDN_HOSTNAME` | `NEXT_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME` | Videolar "oynatıcı yapılandırılmadı" der |

⚠️ `SITE_ADRESI` değerine **port yazmayın**. Caddy 80/443 yayınlıyor;
`:8443` eski kurgudan kalma ve kanonik adreslere sızarsa arama motoruna
ulaşılamayan sayfalar bildirir. Panel bunu bildirim olarak gösteriyor.

#### Yapılandırma doğru mu — tek komut

```bash
docker exec aslihangyd-uygulama sh -c \
  'env | grep -E "SITE_ADRESI|MAPTILER|TURNSTILE|UMAMI|BUNNY|WHATSAPP|ILETISIM"'
```

Boş görünen her satır çalışmayan bir özellik demek. **Panelin bildirim
şeridi de aynı listeyi gösteriyor** — orada görmek için sunucuya girmeye
gerek yok.

### ⚠️ Bu tuzak dokuz değişkeni birden vurmuştu (12 Ağustos 2026)

Yukarıdaki kural yalnızca adres için değil, **her** `NEXT_PUBLIC_*`
değişkeni için geçerli. Uzun süre fark edilmedi:

- `Dockerfile`ın derleme aşamasında bu değişkenler için `ARG` yoktu.
- `imaj.yml` derlerken `build-args` vermiyordu.
- `compose.prod.yml` üçünü çalışma zamanı `environment:` olarak veriyordu —
  çoktan derlenmiş bir pakete bunun hiçbir etkisi yok.

Sonuç: yayına giden imajda dokuz değişken de **boş dizeydi.** Görünen
belirtiler — hepsi sessiz, hiçbiri hata vermiyordu:

| Ne bozuktu | Nasıl görünüyordu |
| --- | --- |
| MapTiler anahtarı | `/harita` kalıcı "Etkileşimli harita hazırlanıyor" boş durumunda |
| Turnstile site anahtarı | Danışman başvuru formu bot korumasız |
| Umami | Analitik betiği hiç yüklenmiyor |
| Bunny kütüphane + CDN | Her drone videosu "oynatıcı yapılandırılmadı" |
| WhatsApp / telefon / e-posta | CMS boşsa yedek de boş |

Hepsi ön eksiz adlara taşındı ve `compose.prod.yml` artık hepsini
geçiriyor. **Bugün `.env` içindeki değeri değiştirip kabı yeniden
başlatmak yetiyor; imajı yeniden derlemek gerekmiyor.**

Kurulumda kontrol etmenin en hızlı yolu:

```bash
# Kabın içinde değişken gerçekten var mı?
docker exec aslihangyd-uygulama sh -c 'env | grep -E "MAPTILER|TURNSTILE|UMAMI|BUNNY"'

# Harita stili sayfaya ulaşıyor mu? (0 dönerse anahtar kaba ulaşmamış)
curl -s http://127.0.0.1:3000/harita | grep -c api.maptiler.com
```

⚠️ `pnpm test` içindeki ortam kapısı artık iki şeyi birden denetliyor:
kodda `NEXT_PUBLIC_` okuması kalmadığını ve kodun okuduğu her değişkenin
`compose.prod.yml` ile kaba ulaştığını. Yani bu hata bir daha sessizce
geri gelemez.

⚠️ **Sertifika dosyası yerleştirmeniz GEREKMİYOR.**

Önceki kurgu Cloudflare origin sertifikası kullanıyordu ve buraya
`origin.pem` / `origin.key` konuyordu. O kurgu kaldırıldı: Caddy artık
sertifikayı Let's Encrypt'ten kendisi alıyor ve yeniliyor (§5.5).
`docker/certs/` dizinine ihtiyaç yok.

Yapmanız gereken tek TLS ayarı `.env` içindeki bildirim adresi:

```
CADDY_EPOSTA=...
```

Boş bırakılırsa Caddy anonim bir ACME hesabı açar ve yenileme bozulduğunda
kimse haberdar olmaz. `compose.prod.yml` bu değişkeni zorunlu tutuyor —
eksikse Caddy kabı hiç başlamaz.

### 5.2 İlk çalıştırma

⚠️ Sıra önemli: **veritabanı → şema → uygulama.** Uygulamayı boş şemaya
karşı başlatmak, panelin hata vermesine ve ilk isteklerin 500 dönmesine
yol açar.

#### ⚠️ ADIM 0 — Cloudflare'i GRİ BULUTA al (yalnızca ilk sertifikada)

Caddy sertifikayı Let's Encrypt'ten **HTTP-01** doğrulamasıyla alır: Let's
Encrypt `http://aslihangyd.com/.well-known/acme-challenge/...` adresine
**doğrudan** bağlanır ve sunucunun yanıt vermesini bekler.

A kaydı turuncu bulutsa (Proxied) o istek Cloudflare'e gider. Cloudflare
80 portunu kendi karşılar ve isteği origin'e ACME'nin beklediği biçimde
iletmez; doğrulama başarısız olur.

**Cloudflare panelinde, deploy'dan ÖNCE:**

1. DNS → Records
2. `aslihangyd.com` A kaydı → bulut simgesine tıkla → **DNS only** (gri)
3. `www` A kaydı için de **aynısını yap**

   ⚠️ `www` unutulmasın: Caddyfile'da ayrı bir site bloğu ve kendi
   sertifikasını alıyor. Yalnızca kökü gri yapmak, www doğrulamasını
   başarısız bırakır ve Caddy açılışta o alan için hata döngüsüne girer.
4. DNS yayılması için **2–3 dakika bekle**

**Atlarsanız ne olur:** Caddy açılır, sertifika isteğinde bulunur,
doğrulama başarısız olur ve tekrar dener. Site HTTPS'te açılmaz;
`docker logs aslihangyd-caddy` içinde `could not get certificate` ya da
`challenge failed` satırları görürsünüz. Kalıcı bir hasar yok — gri buluta
alıp Caddy'yi yeniden başlatınca düzelir. ⚠️ Ama körlemesine tekrar
denemeye devam ederseniz Let's Encrypt'in **haftalık oran sınırına**
(aynı alan adı için 5 sertifika / 168 saat) takılabilirsiniz. Caddy o
noktada yedek CA'ya (ZeroSSL) geçmeyi dener — çoğu durumda kendiliğinden
toparlar. İkisi birden başarısız olursa beklemek gerekiyor; ayrıntı §8b.

#### Adım adım

⚠️ Bu komutlar gerçek sunucuda **ilk kez** çalıştırılacak. Her adımda
"başarılı görünümü" ve "hata alırsan" yazılı; bir adım beklendiği gibi
gitmediyse sonrakine geçmeyin.

**1. Veritabanı ve önbellek**

```bash
cd /srv/aslihangyd/app
docker compose --env-file .env -f docker/compose.prod.yml up -d postgres redis
```

*Başarılı görünüm:* iki kap `Started`. Kontrol:

```bash
docker compose --env-file .env -f docker/compose.prod.yml ps
```
`postgres` ve `redis` **healthy** olmalı (birkaç saniye sürebilir).

*Hata alırsan:* `unhealthy` kalıyorsa `docker logs aslihangyd-postgres`.
En sık sebep `.env` içindeki `POSTGRES_*` değerlerinin eksik olması.
`--env-file .env` yazmayı unutmak da aynı sonucu verir — compose dosyası
`docker/` içinde olduğu için değişkenleri kendiliğinden bulamaz.

**2. Şemayı kur**

```bash
docker compose --env-file .env -f docker/compose.prod.yml \
  --profile gocmen run --rm gocmen
```

*Başarılı görünüm:* her göç için `Migrating:` ve `Migrated:` satırları,
sonunda `Done.`. İlk kurulumda 11 göç uygulanır.

*Hata alırsan:* `relation already exists` görürseniz şema kısmen kurulmuş
demektir — devam etmeyin, önce `migrate:status` ile duruma bakın:

```bash
docker compose --env-file .env -f docker/compose.prod.yml \
  --profile gocmen run --rm gocmen pnpm payload migrate:status
```

**3. Uygulama ve Caddy**

```bash
docker compose --env-file .env -f docker/compose.prod.yml up -d
```

*Başarılı görünüm:* `uygulama` ve `caddy` kapları `Started`.

**4. ⚠️ Sertifikanın gerçekten alındığını doğrula**

Bu adımı atlamayın: Caddy kabı "çalışıyor" görünürken sertifika almamış
olabilir. Kap sağlıklı diye site açık sanmak, bu kurulumdaki en olası
yanılgı.

```bash
docker logs aslihangyd-caddy 2>&1 | grep -iE "certificate obtained|could not get certificate|challenge"
```

*Başarılı görünüm:* `certificate obtained successfully` satırı, hem
`aslihangyd.com` hem `www.aslihangyd.com` için.

*Hata alırsan:*
- `could not get certificate` / `challenge failed` → A kayıtları hâlâ
  turuncu bulutta. Adım 0'a dönün, gri buluta alın, sonra
  `docker restart aslihangyd-caddy`.
- `connection refused` / zaman aşımı → 80 portuna dışarıdan ulaşılamıyor.
  ⚠️ Önce **sağlayıcı seviyesindeki güvenlik duvarına** bakın (bulut
  panelindeki security group / firewall kuralları). UFW genelde suçlu
  DEĞİLDİR: Docker yayınlanan portlar için iptables kurallarını doğrudan
  yazar ve UFW'yi atlar (§5.4). Yani `ufw status` 80'i kapalı gösterse
  bile port açık olabilir; tersi de geçerli — sağlayıcı engelliyorsa UFW'de
  izin vermek işe yaramaz.

  Dışarıdan test:
  ```bash
  curl -sS -o /dev/null -w '%{http_code}\n' http://aslihangyd.com/.well-known/acme-challenge/test
  ```
  `404` = istek Caddy'ye ULAŞTI (o yolda dosya yok, beklenen). Bağlantı
  hatası = port gerçekten kapalı.
- `too many certificates already issued` → Let's Encrypt oran sınırı
  (5 sertifika / 168 saat). ⚠️ Hemen beklemeye geçmeyin: Caddy yedek CA'ya
  (ZeroSSL) geçmeyi dener ve kayıtlarda `acme.zerossl.com` görürsünüz —
  çoğu durumda kendiliğinden toparlar. İkisi de başarısız olursa beklemek
  gerekiyor; ayrıntı §8b.

**5. Siteyi doğrula**

```bash
curl -sS -o /dev/null -w 'HTTP %{http_code}  TLS %{ssl_verify_result}\n' \
  https://aslihangyd.com/api/saglik
```

*Başarılı görünüm:* `HTTP 200  TLS 0` (`ssl_verify_result 0` = sertifika
zinciri geçerli).

```bash
curl -sI https://www.aslihangyd.com | head -3
```
*Başarılı görünüm:* `HTTP/2 301` ve `location: https://aslihangyd.com/`.

*Hata alırsan:* `HTTP 502` → Caddy ayakta ama uygulamaya ulaşamıyor;
`docker logs aslihangyd-uygulama`. `HTTP 200` ama TLS hatası → sertifika
alınmamış, adım 4'e dönün.

**6. ⚠️ Cloudflare'i TURUNCU BULUTA geri al**

Sertifika alındıktan sonra proxy'yi geri açın: DNS → Records → her iki A
kaydı → **Proxied** (turuncu).

*Neden geri alınmalı:* gri bulutta origin IP'si dünyaya açık kalır —
Cloudflare'in WAF'ı, bot koruması ve DDoS kalkanı devre dışıdır. Ayrıca
§5.6'daki gerçek ziyaretçi IP kurgusu Cloudflare'den gelen
`CF-Connecting-IP` başlığına dayanıyor; proxy kapalıyken o başlık gelmez.

*Doğrulama:*
```bash
curl -sI https://aslihangyd.com | grep -i "server\|cf-ray"
```
`cf-ray` başlığı görünüyorsa proxy aktif.

⚠️ **Yenileme için tekrar gri buluta almanız gerekmez.** Caddy yenilemeyi
`.well-known` üzerinden yapar ve Cloudflare bu yolu origin'e iletir.
Yenileme yine de başarısız olursa §8b'ye bakın.

**7. Yönetici hesabını oluştur**

Site yayında ama panelde **hiç kullanıcı yok**. Payload ilk ziyarette
kurulum ekranı gösteriyor:

<https://aslihangyd.com/admin>

*Başarılı görünüm:* "Create first user" formu. E-posta ve **güçlü** bir
parola girin.

⚠️ **Bu adresi ilk açan kişi yönetici olur.** Site yayına girdiği andan
hesabın oluşturulduğu ana kadar bu kapı herkese açık. Deploy'u bitirir
bitirmez, başka hiçbir işe geçmeden bu hesabı oluşturun.

*Doğrulama:* çıkış yapıp `/admin` adresine tekrar gidin — artık kurulum
ekranı değil giriş ekranı görmelisiniz.

**8. Yayın öncesi kontrol listesini yürüt**

Site açıldı ama yayına hazır değil. §6b'deki listeyi (EİDS, KVKK metinleri,
bakım cron'u, yedekleme provası) tamamlamadan siteyi duyurmayın.

⚠️ Özellikle **bakım cron'u** (§6) ve **yedekleme** (§7) kurulmadan geçen
her gün, yasal yükümlülüğün karşılanmadığı bir gündür: EİDS yetkisi dolan
ilan otomatik yayından kalkmaz, KVKK saklama süresi dolan kayıt silinmez.

Site yayında: <https://aslihangyd.com>

#### ⚠️ Göç neden ayrı bir imajda koşuyor

Uygulama imajı Next'in `standalone` çıktısı: içinde **ne kaynak kodu, ne
`payload` CLI'ı, ne de `src/migrations` var.** `payload.config.ts`
içindeki `migrationDir` derlenmiş paketin içine çözülüyor ve orada göç
dosyası bulunmuyor.

Bu yüzden aynı depodan ikinci bir imaj derleniyor (`:gocmen`) ve compose'da
`gocmen` profili altında duruyor. Profil bilinçli: profil verilmeden
hiçbir compose komutu onu başlatmaz. Göçün **ne zaman** koşacağına insan
karar vermeli — kap her yeniden başladığında şema değiştiren bir kurulum,
geri alınamaz bir değişikliği gece yarısı bir yeniden başlatmayla
tetikleyebilirdi.

Neyin bekleyeceğini görmek için (hiçbir şeyi değiştirmez):

```bash
docker compose --env-file .env -f docker/compose.prod.yml \
  --profile gocmen run --rm gocmen pnpm payload migrate:status
```

### 5.3 Güncelleme

```bash
cd /srv/aslihangyd/app

# 1. Yeni imajları çek. Göçmen imajı `--profile` ile ayrıca çekilir.
docker compose --env-file .env -f docker/compose.prod.yml pull
docker compose --env-file .env -f docker/compose.prod.yml --profile gocmen pull gocmen

# 2. ZORUNLU ADIM — bekleyen göç var mı? Atlanabilir DEĞİL.
docker compose --env-file .env -f docker/compose.prod.yml \
  --profile gocmen run --rm gocmen pnpm payload migrate:status

# 3. ZORUNLU ADIM — göçü uygula.
#    Bekleyen göç yoksa bu komut hiçbir şey yapmaz ve saniyeler sürer;
#    "şema değişmiş mi" diye düşünmek zorunda kalmamak için koşulsuz.
docker compose --env-file .env -f docker/compose.prod.yml \
  --profile gocmen run --rm gocmen

# 4. Uygulamayı yenile.
docker compose --env-file .env -f docker/compose.prod.yml up -d --no-deps uygulama

# 5. Doğrula.
curl -f https://aslihangyd.com/api/saglik

# 6. Eski imajları temizle — 3.2 GB'lık sunucuda disk gerçek bir kısıt.
docker image prune -f
```

> ### ⚠️ 2. ve 3. ADIMLARI ATLAMAYIN — 13 Ağustos 2026'da site 500 verdi
>
> O gün yalnızca imaj çekilip uygulama başlatıldı; göç adımı atlandı.
> Yeni sürüm ilanlara `cepheYonu` alanı eklemişti ve Payload artık her
> ilan sorgusuna o tabloyu ekliyordu:
>
> ```
> error: relation "ilanlar_cephe_yonu" does not exist
> ```
>
> **Ana sayfa 500 döndü.** Belirti kafa karıştırıcıydı: `/portfoy` 200
> dönüyordu (boş listeyle), imaj commit'i doğruydu, ortam değişkenleri
> yerindeydi. Yalnızca ana sayfa öne çıkan ilanları çektiği için patlıyordu.
>
> Adım o gün "şema değişikliği varsa uygulayın" diye KOŞULLU yazılıydı ve
> "bu sürümde şema değişti mi?" sorusunun cevabını dağıtımı yapan kişinin
> bilmesi bekleniyordu. Artık koşulsuz: bekleyen göç yoksa komut zaten
> hiçbir şey yapmıyor.

⚠️ `git pull` **gerekmiyor**: uygulama artık depoyu değil, GHCR'daki imajı
kullanıyor. Depoyu yine de güncel tutmak isterseniz zararı yok, ama
çalışan sürümü belirleyen `UYGULAMA_IMAJI` değişkenidir.

#### Geri dönüş

`latest` hangi kodun çalıştığını söylemez. Her imaj commit SHA'sıyla da
etiketleniyor; `.env` içinde sabitleyip kabı yeniden başlatın:

```bash
# GitHub → Packages → aslihangyd-web → etiket listesi
echo 'UYGULAMA_IMAJI=ghcr.io/agydaslihan/aslihangyd-web:<sha>' >> .env
docker compose --env-file .env -f docker/compose.prod.yml up -d --no-deps uygulama
```

⚠️ **Şema geri alınmaz.** Göç ileri doğru tasarlandı; eski bir uygulama
sürümünü yeni bir şemaya karşı çalıştırmak genelde sorunsuzdur (yeni
sütunları görmez), tersi değildir. Şemayı geri almak gerekiyorsa yoldan
gidilmez, **yedekten dönülür** (§7).

### 5.4 Ağ güvenliği ⚠️

`compose.prod.yml` içinde **yalnızca Caddy** dışarıya port açar: **80 ve
443**. PostgreSQL ve Redis'te `ports` tanımı yoktur ve **eklenmemelidir.**

Sebep: Docker port yayınlarken iptables kurallarını doğrudan yazar ve UFW
kurallarını atlar. `ports: - "5432:5432"` eklemek, UFW'de 5432 kapalı
görünmesine rağmen veritabanını tüm internete açar.

Uzaktan veritabanına erişmeniz gerekirse SSH tüneli kullanın:

```bash
ssh -L 5432:localhost:5432 deploy@sunucu
docker exec -it aslihangyd-postgres psql -U <kullanici> -d <veritabani>
```

#### ⚠️ 443'ü Cloudflare ile sınırlayın

Aynı Docker/UFW sorunu 443 için de geçerli: port tüm internete açık ve
`ufw deny 443` işe yaramaz. Origin IP'sini bulan biri Cloudflare'i atlayıp
doğrudan bağlanabilir — WAF, bot koruması ve hız sınırı devre dışı kalır.

Doğru yer `DOCKER-USER` zinciri:

```bash
# Cloudflare aralıklarına izin ver, gerisini reddet
for ag in $(curl -s https://www.cloudflare.com/ips-v4); do
  sudo iptables -I DOCKER-USER -p tcp --dport 443 -s "$ag" -j RETURN
done
sudo iptables -A DOCKER-USER -p tcp --dport 443 -j DROP

# Kalıcı yap
sudo apt install iptables-persistent && sudo netfilter-persistent save
```

⚠️ IPv6 kullanıyorsanız `ip6tables` için de aynısını `ips-v6` listesiyle
yapın. Aksi halde IPv6 üzerinden origin'e doğrudan erişim açık kalır.

⚠️⚠️ **80 PORTUNU BU KURALA DAHİL ETMEYİN.**

Let's Encrypt doğrulaması ve yenilemesi 80 portuna **Cloudflare
aralıklarının dışından** gelir — doğrulama sunucuları Cloudflare'e ait
değildir. 80'i Cloudflare ile sınırlarsanız ilk sertifika alınamaz ve daha
kötüsü, mevcut sertifika **60 gün sonra sessizce yenilenemez**. Site o güne
kadar sorunsuz çalışır, sonra bir sabah tarayıcıda sertifika hatası verir.

80 portunda yalnızca ACME doğrulaması ve HTTPS'e yönlendirme var; açık
bırakmanın riski yok.

---

### 5.5 TLS ve Cloudflare ⚠️

#### Let's Encrypt — Caddy otomatik alır

Sunucuya bu makineye özel bir dış IP tahsis edildi; 80 ve 443 boş. Caddy
sertifikayı kendisi alır ve süresi dolmadan yeniler. Caddyfile'da `tls`
yönergesi **yoktur** — elle sertifika yolu vermek otomatik yenilemeyi
kapatırdı.

Gereken tek yapılandırma, bildirim adresi:

```
CADDY_EPOSTA=...
```

Boş bırakılırsa Caddy anonim bir ACME hesabı açar ve **yenileme
bozulduğunda kimse haberdar olmaz.** `compose.prod.yml` bu değişkeni
zorunlu tutuyor (`:?`), yani eksikse kap hiç başlamaz — sessiz kalmasındansa
gürültülü başarısızlık.

⚠️ **Sertifikalar `caddy_veri` biriminde.** Bu birimi silmek (`down -v`)
Caddy'yi sıfırdan sertifika istemeye zorlar ve Let's Encrypt'in haftalık
oran sınırına (aynı alan adı için 5 sertifika / 168 saat) yaklaştırır.
Yedeklemede bu birim yok — çünkü kaybı telafi edilebilir, ama gereksiz yere
silmeyin.

#### İlk sertifika: Cloudflare gri bulut

Doğrulama Let's Encrypt'ten origin'e **doğrudan** gelir; A kayıtları
turuncu bulutta olamaz. Yordam ve doğrulama adımları §5.2 → "ADIM 0" ve
"Adım 6".

#### Cloudflare SSL modu

**Full (strict)** olmalı. Caddy artık tarayıcıların da güvendiği bir
Let's Encrypt sertifikası sunuyor, dolayısıyla strict doğrulaması sorunsuz
geçer. "Flexible" seçilirse Cloudflare ile origin arasındaki bağlantı
şifresiz kalır.

#### Eski kurgudan kalanlar

Önceki sürümde 8443 portu ve **Cloudflare origin sertifikası** kullanılıyordu
(80/443 sunucuda başka bir uygulamadaydı). Bu kurgu tamamen kaldırıldı.

⚠️ Eski bir kurulumdan geçiyorsanız:

1. `docker/certs/origin.key` ve `origin.pem` dosyalarını **silin** — artık
   kullanılmıyorlar ve diskte duran bir özel anahtar gereksiz risktir
2. Cloudflare panelinde **SSL/TLS → Origin Server** altındaki origin
   sertifikasını **iptal edin (Revoke)**
3. `DOCKER-USER` zincirindeki 8443 kurallarını kaldırın
4. Cloudflare'de 8443'e yönlendiren bir kural varsa temizleyin

#### HSTS Caddy'de değil, Cloudflare'de

`Strict-Transport-Security` başlığı Caddyfile'dan **bilinçli olarak
çıkarıldı** ve Let's Encrypt'e geçişte de eklenmedi. Cloudflare
(SSL/TLS → Edge Certificates → HSTS) gönderiyor; iki kaynaktan gönderilen
başlık çakışır ve tarayıcının hangisini uygulayacağı belirsiz kalır. HSTS
geri alınamaz bir mekanizma — belirsizlik kabul edilemez.

---

### 5.6 ⚠️ Gerçek ziyaretçi IP'si — atlanırsa site kilitlenir

Cloudflare arkasındayız. Uygulamanın gördüğü uzak adres **her istekte** bir
Cloudflare IP'sidir. Düzeltilmezse hız sınırlayıcı bütün ziyaretçileri tek
kişi sanar ve beşinci form gönderiminden sonra **formu herkese kapatır.**

Zincir üç parçadan oluşuyor:

| Katman | Ne yapar |
| --- | --- |
| Caddy `trusted_proxies` | İsteğin gerçekten Cloudflare ağlarından geldiğini doğrular |
| Caddy `client_ip_headers CF-Connecting-IP` | Doğrulandıysa gerçek adresi bu başlıktan alır |
| Caddy `header_up CF-Connecting-IP {client_ip}` | Başlığı hesaplanan değerle **üzerine yazar** |
| Uygulama `istemciIpsi()` | `CF-Connecting-IP` → `X-Real-IP` sırasıyla okur |

⚠️ **`X-Forwarded-For` okunmuyor ve okunmamalı.** Caddy o başlığa gelen
değeri korur ve sonuna kendi gördüğünü ekler; ilk sırayı okumak,
saldırganın kendi hız sınırı anahtarını seçmesine izin vermek demektir.

⚠️ **IPv6 aralıkları da `trusted_proxies` içinde.** Cloudflare origin'e
IPv6 üzerinden bağlanır ve aralık listede yoksa başlığa güvenilmez —
yukarıdaki kilitlenme aynen yaşanır.

#### Doğrulama

Dağıtımdan sonra **mutlaka** kontrol edin:

```bash
# 1. Cloudflare üzerinden — kendi genel IP'nizi görmelisiniz
curl -s https://aslihangyd.com/api/saglik -o /dev/null -w '%{http_code}\n'
docker compose --env-file .env -f docker/compose.prod.yml logs --tail 20 caddy | grep client_ip
```

```bash
# 2. Uygulama günlüğünde bu satır OLMAMALI
docker compose --env-file .env -f docker/compose.prod.yml logs uygulama | grep "İstemci IP başlığı yok"
```

Bu satır çıkıyorsa Caddy yapılandırması bozuk demektir. Uygulama o durumda
hız sınırını **uygulamıyor** (bilinçli takas: form herkese kapanmasın diye)
— yani koruma sessizce düşmüş oluyor. Bal küpü ve Turnstile katmanları
devrede kalır ama açığı kapatmak gerekir.

#### Cloudflare IP aralıkları değişirse

Nadiren olur ama olur. Güncel listeler:

```bash
curl -s https://www.cloudflare.com/ips-v4
curl -s https://www.cloudflare.com/ips-v6
```

`docker/Caddyfile` içindeki `trusted_proxies` listesiyle karşılaştırın;
farklıysa güncelleyip Caddy'yi yeniden yükleyin:

```bash
docker compose --env-file .env -f docker/compose.prod.yml exec caddy caddy reload \
  --config /etc/caddy/Caddyfile
```

Aynı listeyi §5.4'teki `DOCKER-USER` kurallarında da güncellemeyi unutmayın.

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
| `alan-sagligi` | Alan adının kayıt kuruluşu durumunu, bitiş tarihini ve dışarıdan çözülüp çözülmediğini kontrol eder | Her gün 05:10 | ✗ hayır |
| `olcum-ayrinti-sil` | 90 günden eski ölçüm olay ayrıntılarını temizler | Her gün 04:10 | ✗ hayır |

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

**`alan-sagligi` çalışmazsa — SİTE SESSİZCE KAPANABİLİR**

Alan adı bir kayıt kuruluşu işlemi yüzünden DNS'ten düşerse (`clientHold`,
`serverHold`, süre dolması) site **herkese** erişilemez olur ve bunu
**hiçbir sunucu izlemesi göremez**: sunucu sağlıklıdır, Cloudflare
sağlıklıdır, istek hiç gelmez.

18 Ağustos 2026'da tam olarak bu yaşandı ve site saatlerce kapalı kaldı.
Bu görev, dışarıdan bakan tek kontroldür.

⚠️ Yasal ihlal doğurmaz — ama sitenin var olmaması, yasal uyarıyı
okuyacak panelin de olmaması demektir. Bu yüzden panel şeridinde
**yasal uyarıların da üstünde** görünür.

**`eids-uyar` çalışmazsa — ticari kayıp, yasal ihlal yok**

Yaklaşan yetki bitişleri fark edilmez. Yasal ihlal doğmaz, çünkü
`eids-kaldir` ilanı zaten yayından alır — ama portföy sessizce görünmez
olur ve yetki yenileme fırsatı kaçar. Birkaç gün ertelenebilir.

⚠️ Bu görev bugün **e-posta göndermiyor**: SMTP yapılandırması yok.
Çıktısı `/srv/aslihangyd/logs/bakim.log` dosyasına yazılıyor.

✅ **Artık günlüğü taramak zorunda değilsin.** Görevlerin son durumu
veritabanına da yazılıyor ve **yönetim panelinin ana ekranında** kalıcı bir
şeritte görünüyor: bir görev 26 saatten uzun süredir koşmadıysa, hiç
koşmadıysa ya da hata döndürdüyse panel bunu açıkça söylüyor.

Şerit ayrıca yaklaşan EİDS yetki bitişlerini, yetkisi dolmuş ama hâlâ
yayında görünen ilanları ve eksik yetki belgesi numarasını da gösteriyor.
Yasal olanlar her zaman en üstte.

⚠️ Şerit **kapatılamaz**. Bildirim, sebebi ortadan kalkınca kendiliğinden
kaybolur — tek susturma yolu sorunu çözmektir. Aynı sebeple *Bakım Durumu*
ekranı salt okunurdur: "son çalışma" tarihi elle ileri alınıp yasal bir
uyarı susturulamaz.

Günlük dosyası yine de duruyor: panel *ne olduğunu* söylüyor, günlük
*neden* olduğunu — hata mesajının tamamı orada.

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
docker compose --env-file .env -f docker/compose.prod.yml up -d --force-recreate uygulama
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

# Ölçüm — 90 günden eski olay ayrıntılarını temizle.
10 4 * * *  deploy  /srv/aslihangyd/app/scripts/bakim.sh olcum-ayrinti-sil >> /srv/aslihangyd/logs/bakim.log 2>&1

# Alan adı sağlığı — kayıt kuruluşu durumu, bitiş tarihi, dış DNS.
# ⚠️ Günde BİR kez: kayıt otoritesine gereksiz yük bindirmeyin.
10 5 * * *  deploy  /srv/aslihangyd/app/scripts/bakim.sh alan-sagligi >> /srv/aslihangyd/logs/bakim.log 2>&1

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

## 6b. ⚠️ Yayın öncesi kontrol listesi

Her üretim dağıtımından **önce**, üretim `.env`'iyle:

```bash
# 1. Demo / yük-testi verisi kalmamış mı?
#
# ⚠️ Sunucuda `pnpm` yok — uygulama imajı standalone çıktı. Betik göçmen
# imajında koşar; kaynak kodu orada duruyor.
docker compose --env-file .env -f docker/compose.prod.yml --profile gocmen \
  run --rm gocmen pnpm payload run scripts/demo-denetimi.ts   # çıkış 0 bekleniyor
```

Çıkış 1 ise veritabanında `[DEMO]` ya da `[YUK]` önekli kayıt var ve
**yayına çıkılmamalı** — bu kayıtlar ana sayfada ve portföyde görünür.

```bash
# 2. Genel adres portu içeriyor mu?
grep SITE_ADRESI .env                         # https://aslihangyd.com

# 2b. Çalışma zamanı yapılandırması gerçekten kaba ulaşıyor mu?
#     (Boş çıkarsa harita, bot koruması, analitik ve video sessizce ölüdür.)
docker exec aslihangyd-uygulama sh -c 'env | grep -E "MAPTILER|TURNSTILE_SITE|UMAMI|BUNNY"'
curl -s http://127.0.0.1:3000/harita | grep -c api.maptiler.com   # 0 ise EKSİK

# 3. Bakım anahtarı tanımlı mı?
grep -q '^BAKIM_ANAHTARI=.\+' .env && echo tamam || echo EKSİK

# 4. Yetki belgesi numarası girilmiş mi?
#    Girilmemişse altbilgide her sayfada uyarı görünür.
```

⚠️ Seed betiği artık yalnızca `NODE_ENV=development` ile çalışır. Üretim
veritabanına bağlı bir kabukta `pnpm seed` yazmak artık mümkün değil.

---

## 7. Yedekleme

⚠️ Önce `.env` içinde `RESTIC_REPOSITORY` ve `RESTIC_PASSWORD` tanımlı
olmalı — yoksa betik ilk satırda durur. Değerler
`.env.production.example` içinde açıklanıyor.

```bash
cd /srv/aslihangyd/app

# İlk kurulum — depoyu bir kez oluştur.
# `set -a` ile .env okunuyor: RESTIC_* değişkenleri restic'in kendisine
# de gerekiyor, yalnızca betiğe değil.
set -a; . ./.env; set +a
restic init
```

```bash
# Cron: /etc/cron.d/aslihangyd-yedek
0 3 * * * deploy /srv/aslihangyd/app/scripts/yedekle.sh >> /srv/aslihangyd/logs/yedek.log 2>&1
```

Yedeklenenler: PostgreSQL dökümü + yüklenen görseller.
Saklama: 7 gün, 4 hafta, 12 ay, 3 yıl.

### ⚠️ Ayda bir geri yükleme testi

Test edilmemiş yedek, yedek değildir.

```bash
cd /srv/aslihangyd/app
HEDEF_VERITABANI=geri_yukleme_testi ./scripts/geri-yukle.sh latest
```

Test veritabanını **elle oluşturmanız gerekmez**; betik yoksa
`template_postgis`'ten oluşturur. (Düz `createdb` ile oluşturmayın:
PostGIS uzantısı olmayan bir veritabanına `geometry` tipli döküm geri
yüklenemez.)

Üretim veritabanının üzerine yazmak için betik açık onay ister
(`EVET, USTUNE YAZ` yazmanız gerekir).

#### Geri yükleme başarılı mı — sayı saymak yetmez

Betiğin "✓ tamamlandı" demesi veriyi doğrulamaz. En az bunlara bakın:

```bash
# Tüm tablolarda satır sayısı karşılaştırması
SORGU="select string_agg(t.tablename||'='||(xpath('/row/c/text()',
  query_to_xml('select count(*) c from public.'||quote_ident(t.tablename),
  false,true,'')))[1]::text::int, E'\n' order by t.tablename)
  from pg_tables t where t.schemaname='public'"

for db in <uretim_db> geri_yukleme_testi; do
  docker exec aslihangyd-postgres psql -U <kullanici> -d "$db" -tAc "$SORGU" > "/tmp/$db.txt"
done
diff /tmp/<uretim_db>.txt /tmp/geri_yukleme_testi.txt && echo "✓ tüm tablolar aynı"

# PostGIS geometrileri sağ salim mi (en sinsi kayıp burada olur)
docker exec aslihangyd-postgres psql -U <kullanici> -d geri_yukleme_testi -tAc \
  "select count(*) filter (where merkez is not null) || ' mahalle konumu, srid=' ||
   coalesce(max(st_srid(merkez))::text,'yok') from mahalleler"
```

### ✅ Bu tatbikat yapıldı — 7 Ağustos 2026

Betikler o güne kadar **hiç çalıştırılmamıştı**. İlk koşuda üç hata çıktı
ve düzeltildi:

| Bulgu | Sonucu ne olurdu |
| --- | --- |
| Geri yükleme betiği hedef veritabanını oluşturmuyordu | Belgede önerilen aylık tatbikat hiçbir zaman çalışmazdı — `database does not exist` |
| Hata tuzağı çıkış kodunu **her zaman 0** yazıyordu | Başarısız bir yedekleme günlüğe "çıkış kodu 0" diye düşerdi; gerçek bir felaket gecesinde en yanıltıcı çıktı |
| Kap adları koda gömülüydü | Betik yalnızca üretimde koşabiliyordu, yani hiç denenemiyordu — "test edilmemiş yedek, yedek değildir" uyarısını taşıyan dosya kendi kendini test edilemez kılmıştı |

Düzeltmelerden sonra tam döngü koşturuldu: yedek al → ayrı veritabanına
geri yükle → **41 tablonun tamamında satır sayıları birebir aynı**,
PostGIS geometrisi (`POINT(27.7997 41.1592)`, SRID 4326) bozulmadan geldi.

---

## 8. İzleme

| Ne | Nerede |
| --- | --- |
| Sağlık kontrolü | `GET https://aslihangyd.com/api/saglik` — veritabanına gerçek sorgu atar |
| Gerçek IP zinciri | Uygulama günlüğünde `İstemci IP başlığı yok` satırı **olmamalı** (§5.6) |
| Uygulama günlükleri | `docker compose -f docker/compose.prod.yml logs -f uygulama` |
| Bakım günlüğü | `/srv/aslihangyd/logs/bakim.log` — günde üç `TAMAM` satırı olmalı |
| Bakım nöbetçisi | Her sabah 09:00, EİDS görevi çalışmadıysa günlüğe `UYARI` yazar |
| Yedek günlüğü | `/srv/aslihangyd/logs/yedek.log` |
| Performans | Her PR'da Lighthouse (`.github/workflows/lighthouse.yml`) |

`/api/saglik` bilinçli olarak sürüm veya yapılandırma bilgisi döndürmez —
herkese açık bir uçtur.

---

## 8b. Sertifika yenilemesi ⚠️

Caddy sertifikayı **otomatik yeniler** — süresinin son üçte birine
girildiğinde, yani 90 günlük Let's Encrypt sertifikasında ~30 gün kala.
Cron gerekmez, elle müdahale gerekmez.

Ama sessizce bozulabilir. Bu bölüm onun için.

### Neden sessizce bozulur

Yenileme arka planda olur ve başarısız olduğunda **site çalışmaya devam
eder** — eski sertifika hâlâ geçerlidir. Sorun ancak sertifika gerçekten
dolduğunda görünür: bir sabah tarayıcı "bu bağlantı güvenli değil" der ve
ziyaretçiler kaçar. Arada geçen ~30 gün boyunca hiçbir şey bunu söylemez.

En sık üç sebep:

1. **80 portu kapatılmış.** §5.4'teki `DOCKER-USER` kuralına 80 dahil
   edilirse, ya da güvenlik duvarında kapatılırsa, ACME doğrulaması
   ulaşamaz. Site normal çalıştığı için fark edilmez.
2. **`caddy_veri` birimi silinmiş.** `down -v` çalıştırıldıysa Caddy'nin
   ACME hesabı ve sertifikaları gitmiştir.
3. **Alan adı artık bu sunucuyu göstermiyor.** DNS taşındıysa doğrulama
   başka bir makineye gider.

### Nasıl anlarım

**Elle kontrol — sertifikanın kalan ömrü:**

```bash
echo | openssl s_client -servername aslihangyd.com -connect aslihangyd.com:443 2>/dev/null \
  | openssl x509 -noout -enddate -issuer
```

*Beklenen:* `notAfter` tarihi **bugünden en az 25 gün sonra** ve
`issuer` içinde `Let's Encrypt`.

⚠️ Cloudflare proxy açıkken bu komut **Cloudflare'in kenar
sertifikasını** gösterir, sizinkini değil. Origin'inkini görmek için
sunucunun kendisinden bakın:

```bash
docker exec aslihangyd-caddy sh -c \
  'echo | openssl s_client -connect 127.0.0.1:443 -servername aslihangyd.com 2>/dev/null | openssl x509 -noout -enddate'
```

**Caddy'nin kendi kaydı:**

```bash
docker logs aslihangyd-caddy 2>&1 | grep -iE "certificate obtained|renew|error"
```

Yenileme yaklaşırken `renewing certificate` ve ardından
`certificate obtained successfully` görürsünüz.

**Sertifika dosyasının tarihi:**

```bash
docker exec aslihangyd-caddy \
  find /data/caddy/certificates -name '*.crt' -newermt '-40 days' -ls
```
Boş çıktı, sertifikanın 40 gündür yenilenmediği anlamına gelir. 90 günlük
ömürde bu henüz normal olabilir; 70 günü geçtiyse değildir.

### Yenileme çalışmazsa ne yaparım

**1. Sebebi bul**

```bash
docker logs aslihangyd-caddy 2>&1 | grep -iE "challenge|could not|rate limit" | tail -20
```

**2. 80 portunun dışarıdan ulaşılabilir olduğunu doğrula**

Başka bir makineden:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://aslihangyd.com/.well-known/acme-challenge/test
```
*Beklenen:* `404` — yani istek Caddy'ye **ulaştı** ve o yolda dosya yok.
`connection refused` ya da zaman aşımı alıyorsanız port kapalı; §5.4'teki
uyarıyı okuyun ve 80'i açın.

**3. Elle yenilemeyi tetikle**

Caddy'de "şimdi yenile" komutu yok; yapılandırmayı yeniden yüklemek
denemeyi tetikler:

```bash
docker exec aslihangyd-caddy caddy reload --config /etc/caddy/Caddyfile
docker logs --tail 50 aslihangyd-caddy
```

**4. Hâlâ olmuyorsa: geçici olarak gri buluta al**

Cloudflare proxy'si doğrulamayı engelliyor olabilir (yapılandırma
değiştiyse). A kayıtlarını **DNS only** yapın, `caddy reload`, sertifika
alındıktan sonra **Proxied**'a döndürün. Adımların tamamı §5.2.

**5. Oran sınırına takıldıysanız**

`too many certificates already issued` görüyorsanız Let's Encrypt aynı
alan adı için haftalık sınırı uygulamış (5 sertifika / 168 saat).

⚠️ Panik etmeden önce: **Caddy varsayılan olarak ZeroSSL'i yedek CA olarak
kullanıyor.** Let's Encrypt sınıra takıldığında kendiliğinden ZeroSSL'e
geçer ve sertifikayı oradan alır — kayıtlarda `acme.zerossl.com` görürsünüz.
Yani çoğu durumda kendiliğinden düzelir. (Bunu `caddy adapt` çıktısında
doğruladım: iki CA da yapılandırılmış durumda.)

İkisi birden başarısız olursa beklemek gerekiyor; tekrar denemek sınırı
düşürmez. Bu sırada site eski sertifikayla çalışmaya devam eder — süresi
dolmadan sınır kalkarsa ziyaretçi hiçbir şey fark etmez.

### Erken uyarı

⚠️ Şu an sertifika ömrünü izleyen otomatik bir uyarı **yok**. `CADDY_EPOSTA`
sayesinde Let's Encrypt süre dolmadan önce e-posta gönderir — o yüzden bu
değişkenin dolu olması önemli. Daha sağlamı için aylık bir hatırlatıcı
kurun ve yukarıdaki `openssl` komutunu çalıştırın.

---

## 8c. ⚠️ Site açılmıyor ama sunucu 200 dönüyor

**18 Ağustos 2026'da yaşandı:** site saatlerce açılmadı. Sunucu sağlıklıydı,
Cloudflare sağlıklıydı, `/api/saglik` 200 dönüyordu. Sorun kayıt
kuruluşundaydı — alan adına `clientHold` konmuştu — ve hiçbir izleme
bunu yakalamadı.

⚠️ **Neden hiçbir izleme görmedi:** alan adı DNS'ten düştüğünde sunucuya
**hiç istek gelmez**. Sunucuyu izleyen her kontrol "her şey yolunda" der,
çünkü kendi tarafından bakıyordur. Bu bölüm dışarıdan bakmayı anlatıyor.

### Önce panele bakın

Panel ana ekranındaki bildirim şeridinde **"Erişim"** etiketli kırmızı bir
satır varsa cevap oradadır. Ayrıntı: **Ayarlar → Alan Adı Sağlığı**.

Şerit boşsa ve site yine açılmıyorsa aşağıdaki zinciri elle yürüyün.

### Zincir: nereden kopmuş?

Sırayla ilerleyin; ilk başarısız adım sorunun yeridir.

**1. Alan adı DNS'te var mı — dışarıdan sorun**

```bash
dig +short aslihangyd.com @1.1.1.1
dig +short aslihangyd.com @8.8.8.8
```

⚠️ **Kendi makinenizin DNS'ini kullanmayın.** Yerel çözümleyici önbellekten
cevap verip düşmüş bir alan adını "çalışıyor" gösterebilir. `@1.1.1.1`
kısmı bu yüzden zorunlu.

- **Adres dönüyorsa** → DNS sağlam, 4. adıma geçin.
- **Boş dönüyorsa** → alan adı DNS'ten düşmüş. 2. adım.

**2. Kayıt kuruluşu ne diyor — WHOIS/RDAP**

```bash
whois aslihangyd.com | grep -i "status\|expiry\|expiration"
```

`whois` kurulu değilse (sunucuda genellikle değildir) RDAP yeterli ve
daha okunaklı:

```bash
curl -s https://rdap.org/domain/aslihangyd.com \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('durum:', d.get('status')); print([e for e in d.get('events',[]) if e.get('eventAction')=='expiration'])"
```

**Durum satırı nasıl okunur:**

| Durum | Anlamı | Ne yapmalı |
| --- | --- | --- |
| `ok` / `active` | Normal | Sorun burada değil |
| `clientTransferProhibited` | Olağan koruma | Sorun değil |
| ⚠️ `clientHold` | **Kayıt kuruluşu alan adını DNS'ten düşürmüş** | Hemen kayıt kuruluşuna |
| ⚠️ `serverHold` | Kayıt otoritesi düşürmüş | Hemen kayıt kuruluşuna |
| ⚠️ `redemptionPeriod` | Süre dolmuş, kurtarma penceresi | Derhal yenileyin — pencere kapanırsa alan serbest kalır |
| ⚠️ `pendingDelete` | Silinme sırasında | Acil; bu aşamadan sonra üçüncü kişiler kaydedebilir |
| ⚠️ `inactive` | Ad sunucusu tanımlı değil | Nameserver kayıtlarını girin |
| `pendingTransfer` | Devir işleniyor | Siz talep etmediyseniz **hemen** kayıt kuruluşuna |

**3. Ad sunucuları doğru mu**

```bash
dig +short NS aslihangyd.com @1.1.1.1
```

Cloudflare kullanıyorsanız `*.ns.cloudflare.com` dönmeli. Boş ya da farklı
dönüyorsa kayıt kuruluşundaki nameserver kaydı bozulmuş.

**4. DNS sağlamsa: Cloudflare mı, origin mi?**

```bash
# Cloudflare üzerinden
curl -sS -o /dev/null -w "%{http_code}\n" https://aslihangyd.com

# Origin'e doğrudan (Cloudflare'i atlayarak)
curl -sS -o /dev/null -w "%{http_code}\n" --resolve aslihangyd.com:443:<ORIGIN_IP> https://aslihangyd.com
```

- İkisi de 200 → sorun sizde değil, ziyaretçinin ağında olabilir.
- Cloudflare hata, origin 200 → Cloudflare tarafı (SSL modu, kural, kesinti).
- İkisi de hata → uygulama tarafı; `docker compose ps` ve `logs`.

### Kime başvurulur

| Bulgu | Muhatap | Aciliyet |
| --- | --- | --- |
| `clientHold`, `serverHold` | **Kayıt kuruluşu (domain sağlayıcınız)** | Hemen — site kapalı |
| `redemptionPeriod`, süre dolmuş | Kayıt kuruluşu | Hemen — pencere kapanırsa alan kaybedilir |
| `pendingTransfer` (istenmeyen) | Kayıt kuruluşu + hesap güvenliği | Hemen — devir girişimi olabilir |
| Nameserver kaydı yanlış | Kayıt kuruluşu | Yüksek |
| DNS var, Cloudflare hata | Cloudflare paneli / durum sayfası | Yüksek |
| DNS ve Cloudflare sağlam, origin hata | Sunucu tarafı — §9'a bakın | Orta |

⚠️ **`clientHold` genellikle ödemeden ya da doğrulanmamış iletişim
bilgisinden gelir.** ICANN, alan adı sahibinin e-posta adresini doğrulamasını
zorunlu tutuyor; doğrulanmazsa kayıt kuruluşu alan adını askıya alabiliyor.
Kayıt kuruluşu hesabınızdaki e-postanın **okuduğunuz** bir adres olduğundan
emin olun.

### Elle kontrol

Bakım görevinin yaptığı işin aynısını hiçbir şey yazmadan koşturmak için:

```bash
cd /srv/aslihangyd/app && pnpm payload run scripts/alan-denetim.mjs
```

Çıktı durum, bitiş tarihi ve iki dış çözümleyicinin sonucunu birlikte verir.

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

## 9b. Font alt kümeleri

Site fontlarını **kendimiz barındırıyoruz** ve Türkçeye göre kesilmiş alt
kümelerini kullanıyoruz. Bu bölüm bir yıl sonra "bu dosyalar nereden geldi?"
diye soran kişi için.

### Ne kullanılıyor

| Aile | Rol | Dosya | Google Fonts sürümü | Font sürümü |
| --- | --- | --- | --- | --- |
| Inter | Arayüz ve gövde | `src/fonts/inter-turkce.woff2` | v20 | 4.001 (git-66647c0bb) |
| Source Serif 4 | Başlıklar | `src/fonts/source-serif-4-turkce.woff2` | v14 | 4.004 |

Kaynak: Google Fonts CSS API'si (`https://fonts.googleapis.com/css2`),
`text=` parametresiyle alt küme. Alınma tarihi 8 Ağustos 2026.
Güncel SHA-256 özetleri `src/fonts/uretim.json` içinde.

Lisans: ikisi de **SIL Open Font License 1.1**; lisans metinleri
`src/fonts/Inter-OFL.txt` ve `src/fonts/SourceSerif4-OFL.txt`.

### Neden

Google'ın hazır `latin` + `latin-ext` alt kümeleri iki aile için 226.684
bayt ediyordu — mobil sayfa ağırlığının **%51'i**. `latin-ext`ten bize
lazım olan yalnızca beş harf: İ ğ Ğ ş Ş.

`next/font/google` özel alt küme üretemiyor; `subsets` seçeneği yalnızca
Google'ın hazır unicode-range bloklarından seçim yaptırıyor. Bu yüzden alt
küme elle üretilip depoya konuyor.

### Alt küme nasıl üretildi

```bash
pnpm font:altkume            # üretir ve src/fonts/ içine yazar
pnpm font:altkume --kontrol  # yalnızca fark bildirir, dosya yazmaz
```

Betik: `scripts/font-altkume.ts`. Yaptığı iş:

1. `src/lib/tipografi/alfabe.ts` içindeki karakter listesini okur
   (şu an 193 karakter)
2. Her aile için şu isteği atar:
   `GET https://fonts.googleapis.com/css2`
   `?family=<Aile>:wght@400;500&text=<alfabe>&display=swap`
   ⚠️ `User-Agent` başlığı modern Chrome olarak gönderiliyor — Google
   yanıtı istemciye göre değiştiriyor ve bilinmeyen kimliğe `woff2`
   yerine eski biçimler dönebiliyor.
3. Dönen CSS'teki tek `url(...)` adresinden `.woff2` dosyasını indirir
4. `src/fonts/uretim.json` künyesini yazar (alfabe özeti + dosya özetleri)

⚠️ **Ağırlık ekseni daraltılamıyor.** `wght@400;500` istemek dosyayı
küçültmüyor: Google değişken fontu gliflere göre kesiyor ama `wght`
eksenini olduğu gibi bırakıyor (Inter 100–900, Source Serif 200–900).
Kazancın tamamı glif alt kümesinden geliyor. Denendi ve ölçüldü.

### Alfabeye karakter eklemek

Sitede alt kümede olmayan bir karakter kullanılırsa `alfabe.test.ts`
kapıyı kırmızıya döndürür. Yapılacaklar, **üçü birden**:

1. Karakteri `src/lib/tipografi/alfabe.ts` içindeki uygun gruba ekle
2. `pnpm font:altkume` çalıştır
3. Değişen `.woff2` dosyalarını **ve** `src/fonts/uretim.json`'u commit et

⚠️ Yalnızca 1. adımı yapmak testi yeşile döndürür ama fontta glif yine
olmaz. Bu boşluk için ikinci bir test var: `uretim.json` içindeki alfabe
özeti güncel alfabeyle karşılaştırılıyor, tutmazsa kapı düşer.

### Font sürümünü yükseltmek

1. `pnpm font:altkume --kontrol` — Google yeni sürüm yayımladıysa
   "DEĞİŞTİ" der ve çıkış kodu 1 verir
2. `pnpm font:altkume` — yeni dosyaları indirir
3. **Kapsamı doğrula** — yordam `src/fonts/OKUBENI.md` → "Kapsamı
   doğrulama". Yeni sürümde bir glif düşmüş olabilir.
4. `pnpm build` sonrası bir sayfayı gözle kontrol et: harf biçimleri ve
   satır yükseklikleri değişmiş olabilir
5. `src/fonts/OKUBENI.md` ve bu bölümdeki sürüm tablolarını güncelle

### Yedek font zinciri

Alt kümede ya da fontta olmayan karakterler sistem fontuna düşer, "tofu"
(boş kutu) görünmez. Zincir `src/app/(site)/layout.tsx` içinde:

- Gövde: `Inter → Arial (ölçü dengeli) → system-ui → … → sans-serif`
- Başlık: `Source Serif 4 → Times New Roman (ölçü dengeli) → Georgia → serif`

`adjustFontFallback` sayesinde yedek fontun ölçüleri gerçek fonta
yakınsanıyor; bu yüzden font yüklenirken düzen kaymıyor (CLS 0).

Bilerek yedeğe düşen beş karakter var (`‑ ▾ ⌖ ⌘ ✗`) — listesi ve gerekçesi
`src/fonts/OKUBENI.md` → "Bilinen eksikler".

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
| `src/fonts/OKUBENI.md` | Font alt kümeleri: kaynak, sürüm, lisans, eksikler |
| `src/lib/tipografi/alfabe.ts` | Alt kümedeki karakter listesi (tek gerçek kaynak) |
| `scripts/font-altkume.ts` | Alt küme üretici (`pnpm font:altkume`) |
