# aslihangyd.com

Çorlu (Tekirdağ) odaklı gayrimenkul danışmanlık ve yatırım platformu.

Amaç ilan listelemek değil; Çorlu'yu dijital olarak deneyimletmek ve yatırımcıya
veriyle karar aldırmak. Mahalle sayfaları, yatırım skoru, hesaplayıcılar ve
harita katmanları bu amaca hizmet eder.

Projenin ihlal edilemez kuralları ve mimari kararları [`CLAUDE.md`](./CLAUDE.md)
dosyasındadır. Kod yazmadan önce okuyun.

---

## Teknoloji yığını

| Katman           | Teknoloji                                              |
| ---------------- | ------------------------------------------------------ |
| Uygulama         | Next.js 16 (App Router) · React 19 · TypeScript strict |
| CMS              | Payload CMS 3 (aynı uygulama içinde)                   |
| Veritabanı       | PostgreSQL 17 + PostGIS 3.5                            |
| Önbellek         | Redis 7                                                |
| Stil             | Tailwind CSS 4                                         |
| Harita           | MapLibre GL JS + MapTiler                              |
| Test             | vitest                                                 |
| Paket yöneticisi | pnpm                                                   |

---

## Gereksinimler

- **Node.js 22 LTS** (`node --version` → v22.x)
- **pnpm 11+** (`corepack enable` ile gelir, veya `npm i -g pnpm`)
- **Docker** ve **Docker Compose v2** (`docker compose version`)

Uygulamanın kendisi container'da değil, **host üzerinde** çalışır. Docker
yalnızca PostgreSQL ve Redis içindir — bu, bellek tüketimini düşük tutar ve
yeniden derlemeyi hızlandırır.

---

## Sıfırdan geliştirmeye başlama

### 1. Depoyu alın ve bağımlılıkları kurun

```bash
git clone <depo-adresi> aslihangyd-web
cd aslihangyd-web
pnpm install
```

### 2. Ortam değişkenlerini hazırlayın

```bash
cp .env.example .env
```

`.env` dosyasını açın ve şu değerleri doldurun:

```bash
# Payload gizli anahtarı üretin:
openssl rand -base64 32

# Veritabanı şifresi üretin:
openssl rand -hex 16
```

> **Önemli:** `POSTGRES_PASSWORD` ile `DATABASE_URI` içindeki şifre **aynı**
> olmalıdır. `.env.example` içindeki her değişkenin yanında değerin nereden
> alınacağı yazılıdır.
>
> `AslihanTarafindanDoldurulacak` yazan alanlar (MapTiler, Bunny Stream, SMTP,
> WhatsApp) gerçek değerler girilene kadar ilgili özellikler çalışmaz. Temel
> geliştirme için yalnızca veritabanı bilgileri ve `PAYLOAD_SECRET` yeterlidir.

`.env` dosyası `.gitignore`'dadır ve **asla commit edilmez**.

### 3. Veritabanı ve Redis'i başlatın

```bash
pnpm db:up
```

Servislerin hazır olduğunu doğrulayın (ikisi de `healthy` olmalı):

```bash
docker compose --env-file .env -f docker/compose.dev.yml ps
```

### 4. Veritabanı şemasını oluşturun

```bash
pnpm payload migrate
```

Bu adım PostGIS eklentisini etkinleştirir ve Payload tablolarını oluşturur.
Doğrulamak için:

```bash
docker exec aslihangyd-postgres-dev \
  psql -U aslihangyd -d aslihangyd_dev -c "SELECT PostGIS_Version();"
```

### 5. Geliştirme sunucusunu başlatın

```bash
pnpm dev
```

- Site: <http://localhost:3000>
- Yönetim paneli: <http://localhost:3000/admin>

### 6. İlk yönetici hesabını oluşturun

Panel ilk kez açıldığında bir hesap oluşturma formu gelir. Hesap bilgileri koda
veya `.env`'e yazılmaz; doğrudan panelden oluşturulur.

---

## ⚠️ Sunucuda tarayıcı yok — admin paneline SSH tüneli ile erişim

Geliştirme sunucusunda grafik arayüz ve tarayıcı bulunmaz. Yönetim paneline
**kendi bilgisayarınızdan** SSH tüneli açarak erişirsiniz.

**Kendi bilgisayarınızda** (sunucuda değil) şunu çalıştırın:

```bash
ssh -L 3000:localhost:3000 agydadmin@SUNUCU_IP
```

`SUNUCU_IP` yerine sunucunun IP adresini yazın. Bağlantı açıkken sunucuda
`pnpm dev` çalışıyor olmalıdır.

Ardından **kendi bilgisayarınızın tarayıcısında** açın:

```
http://localhost:3000/admin
```

Tünel, SSH oturumu açık kaldığı sürece çalışır. Oturumu kapattığınızda tünel de
kapanır.

> Veritabanına doğrudan bir istemciyle (DBeaver, pgAdmin, TablePlus) bağlanmak
> isterseniz aynı yöntemi kullanın:
>
> ```bash
> ssh -L 5432:localhost:5432 agydadmin@SUNUCU_IP
> ```
>
> Veritabanı portu bilerek dışarıya kapalıdır; SSH tüneli tek erişim yoludur.

---

## Komutlar

| Komut            | Açıklama                                                    |
| ---------------- | ----------------------------------------------------------- |
| `pnpm dev`       | Geliştirme sunucusu (http://localhost:3000)                 |
| `pnpm build`     | Production derlemesi                                        |
| `pnpm start`     | Derlenmiş uygulamayı çalıştırır (önce `build` gerekir)      |
| `pnpm typecheck` | TypeScript tip denetimi                                     |
| `pnpm lint`      | ESLint denetimi                                             |
| `pnpm lint:fix`  | ESLint hatalarını otomatik düzeltir                         |
| `pnpm format`    | Prettier ile biçimlendirir                                  |
| `pnpm test`      | Testleri çalıştırır (vitest)                                |
| `pnpm db:up`     | PostgreSQL ve Redis'i başlatır                              |
| `pnpm db:down`   | Servisleri durdurur — **veri korunur**                      |
| `pnpm db:logs`   | Servis günlüklerini canlı izler (`Ctrl+C` ile çıkın)        |
| `pnpm db:reset`  | ⚠️ Servisleri durdurur, **VERİYİ SİLER**, sıfırdan başlatır |

Payload komutları:

| Komut                              | Açıklama                                |
| ---------------------------------- | --------------------------------------- |
| `pnpm payload migrate`             | Bekleyen migration'ları uygular         |
| `pnpm payload migrate:create <ad>` | Şema değişikliğinden migration üretir   |
| `pnpm payload generate:types`      | `src/payload-types.ts` dosyasını üretir |
| `pnpm payload generate:importmap`  | Admin panel import map'ini üretir       |

> Koleksiyon ekledikten veya alan değiştirdikten sonra `generate:types` ve
> `migrate:create` çalıştırmayı unutmayın.

---

## Güvenlik notları

### Portlar yalnızca 127.0.0.1'e bağlıdır

`docker/compose.dev.yml` içinde portlar `127.0.0.1:5432:5432` biçiminde
tanımlıdır. Bu **kasıtlıdır ve değiştirilmemelidir**.

Docker, port yayınlarken iptables kurallarını doğrudan değiştirir ve **UFW
kurallarını atlar**. Port `5432:5432` veya `0.0.0.0:5432:5432` olarak yazılırsa,
`ufw status` çıktısında port kapalı görünmesine rağmen veritabanı tüm internete
açılır.

Uzaktan erişim için SSH tüneli kullanın (yukarıya bakın).

### Sırlar

Hiçbir API anahtarı, şifre veya token koda girmez — hepsi `.env` dosyasındadır
(`CLAUDE.md` kural 7). `.env` `.gitignore`'dadır. Yeni bir değişken eklerken
`.env.example` dosyasına da **placeholder ile** ekleyin.

---

## Sorun giderme

### `permission denied ... docker.sock`

Kullanıcınız `docker` grubunda değil veya oturumunuz grup eklenmeden önce
açılmış.

```bash
# Grupta olup olmadığınızı kontrol edin:
getent group docker

# Değilseniz ekleyin (bir kez):
sudo usermod -aG docker $USER
```

Grup değişikliğinin geçerli olması için **SSH oturumunu kapatıp yeniden açın**.
`id` çıktısında `docker` görünmelidir. Yeniden giriş yapmadan geçici çözüm:

```bash
sg docker -c "pnpm db:up"
```

### Port çakışması — `address already in use`

Sunucuda başka bir PostgreSQL veya Redis çalışıyor olabilir.

```bash
# 5432 ve 6379'u kim dinliyor?
ss -tlnp | grep -E "5432|6379"
```

Host üzerinde sistem PostgreSQL'i çalışıyorsa durdurun:

```bash
sudo systemctl stop postgresql
sudo systemctl disable postgresql
```

Alternatif olarak `docker/compose.dev.yml` içinde host portunu değiştirin
(`127.0.0.1:5433:5432` gibi) ve `.env` içindeki `DATABASE_URI`'yi güncelleyin.

### PostgreSQL bağlantı hatası

**`password authentication failed`**

`.env` içindeki `POSTGRES_PASSWORD` ile `DATABASE_URI` içindeki şifre
uyuşmuyordur. Ayrıca container ilk oluşturulduğunda şifreyi kalıcı olarak
saklar — şifreyi sonradan değiştirdiyseniz veritabanını sıfırlamanız gerekir:

```bash
pnpm db:reset   # ⚠️ tüm geliştirme verisini siler
pnpm payload migrate
```

**`ECONNREFUSED 127.0.0.1:5432`**

Container ayakta değil veya henüz hazır değil.

```bash
docker compose --env-file .env -f docker/compose.dev.yml ps
pnpm db:logs
```

`STATUS` sütununda `healthy` yazmasını bekleyin. İlk başlatmada veritabanı
oluşturulurken 30 saniyeye kadar sürebilir.

**`relation "kullanicilar" does not exist`**

Migration çalıştırılmamış:

```bash
pnpm payload migrate
```

### Build sırasında bellek yetersizliği (OOM)

Belirtiler: `JavaScript heap out of memory`, ya da build'in çıktı vermeden
`Killed` ile sonlanması.

Önce gerçekten bellek sorunu olduğunu doğrulayın:

```bash
free -h
dmesg | tail -20 | grep -i "out of memory"
```

Çözümler, sırayla:

1. Build sırasında `pnpm dev`'i ve diğer ağır süreçleri kapatın.
2. Node'un yığın tavanını geçici olarak yükseltin:

   ```bash
   NODE_OPTIONS=--max-old-space-size=2048 pnpm build
   ```

3. Swap alanı olduğundan emin olun (`free -h` → `Swap` satırı):

   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. Sorun sürerse Docker servislerini build sırasında durdurun
   (`pnpm db:down`), build bitince tekrar başlatın.

> `NODE_OPTIONS` bilerek `package.json` script'lerine gömülmemiştir; sabit bir
> tavan gereksiz kısıt yaratır. Yalnızca ihtiyaç anında komut satırında verin.

### `tiger` ve `topology` şemaları nedir?

`postgis/postgis` imajı, PostGIS yanında `postgis_topology` ve
`postgis_tiger_geocoder` eklentilerini de otomatik kurar. `tiger` şeması ABD
nüfus sayımı adres verisi içindir ve bu projede **kullanılmaz**; yalnızca `\dt`
çıktısını kalabalıklaştırır. Zararsızdır, bırakılabilir.

---

## Klasör yapısı

```
src/app/(site)       genel site
src/app/(payload)    CMS admin paneli, REST ve GraphQL uçları
src/collections      Payload koleksiyonları
src/components       UI bileşenleri
src/lib              iş mantığı
src/lib/eids         EİDS kuralları (izole + test edilmiş)
src/migrations       veritabanı migration'ları
docker/              geliştirme ve production compose dosyaları
docs/                Türkçe dokümantasyon
```

---

## Katkı ve dal (branch) düzeni

- `main` → production
- `develop` → staging
- `feature/*` → geliştirme

`main`'e **doğrudan push yapılmaz**, değişiklikler PR üzerinden gelir.

Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/)
biçiminde, açıklama Türkçe yazılır:

```
feat: EİDS yetki süresi kontrolü eklendi
```

Commit öncesinde `pnpm typecheck` ve `lint-staged` otomatik çalışır (husky).

Her fazın sonunda hepsi temiz olmalıdır:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Faz durumu

| Faz       | Kapsam                                                    | Durum         |
| --------- | --------------------------------------------------------- | ------------- |
| 1.1       | Proje iskeleti (Next.js, Payload, lint, test altyapısı)   | ✅ Tamamlandı |
| 1.2       | Docker geliştirme ortamı, PostGIS, README                 | ✅ Tamamlandı |
| 1.3       | Veri modeli ve koleksiyonlar                              | ⬜ Bekliyor   |
| 1.4       | EİDS kuralları ve testleri                                | ⬜ Bekliyor   |
| 1 (kalan) | KVKK iskeleti, temel sayfalar, CI/CD                      | ⬜ Bekliyor   |
| 2         | Harita, hesaplayıcılar, ticari dikey                      | ⬜ Bekliyor   |
| 2B        | Bal küpü modülleri, portföy yönetimi/CRM, sosyal medya    | ⬜ Bekliyor   |
| 2C        | Gözlem giriş sistemi ve endeks altyapısı (6. ayda açılır) | ⬜ Bekliyor   |
| 3         | Drone/360 medya, CDN                                      | ⬜ Bekliyor   |
| 4         | Yatırım skoru, AI arama, raporlar                         | ⬜ Bekliyor   |
| 5         | Çorlu Live zaman serisi                                   | ⬜ Bekliyor   |

Faz kapsamlarının ayrıntısı için [`CLAUDE.md`](./CLAUDE.md) ve
[`docs/`](./docs/) klasörüne bakın.
