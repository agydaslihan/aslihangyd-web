import { readFileSync } from 'node:fs'
import path from 'node:path'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { Bolum } from '@/components/ui/Bolum'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Feragat, VeriNotu } from '@/components/ui/Feragat'
import { GuvenDuzeyi } from '@/components/ui/GuvenDuzeyi'
import { IstatistikIzgarasi, IstatistikKarti } from '@/components/ui/IstatistikKarti'
import { IstatistikIskeleti, KartIskeleti, MetinIskeleti } from '@/components/ui/Iskelet'
import { KilitliKart } from '@/components/ui/KilitliKart'
import {
  DogrulanmisIlanRozeti,
  Rozet,
  YayinlanmayanRozeti,
  YetkiSuresiRozeti,
} from '@/components/ui/Rozet'
import { kontrastOrani, oraniYuvarla, temalariCoz } from '@/lib/tasarim/kontrast'

/**
 * Stil rehberi — tasarım sisteminin canlı belgesi.
 *
 * ⚠️ YALNIZCA GELİŞTİRME ORTAMINDA. Üretimde 404 döner ve robots.txt'te
 * kapalıdır: iç araçların arama sonuçlarında görünmesi hem gürültü hem
 * gereksiz bir yüzey.
 *
 * Neden statik bir Figma dosyası değil: burada gösterilen bileşenler
 * sitede çalışan bileşenlerin ta kendisi. Bir bileşen bozulduğunda rehber
 * de bozulur — belgeyle gerçeğin ayrışması mümkün değil.
 *
 * Renk değerleri globals.css'ten OKUNUR, buraya elle yazılmaz; jeton
 * kutucukları `var(--color-…)` ile boyanır. Böylece rehber, jetonun
 * gerçekten üretildiğini de kanıtlar.
 */

export const metadata: Metadata = {
  title: 'Stil rehberi',
  robots: { index: false, follow: false },
}

function jetonlariOku() {
  const css = readFileSync(path.join(process.cwd(), 'src/app/(site)/globals.css'), 'utf8')
  return temalariCoz(css)
}

/* ══════════════════════════════════════════════════════════════════════════
   Rehber düzeni
   ══════════════════════════════════════════════════════════════════════════ */

function Blok({ baslik, not, children }: { baslik: string; not?: string; children: ReactNode }) {
  return (
    <section className="border-kenar flex flex-col gap-4 border-t-[0.5px] pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-baslik-2">{baslik}</h2>
        {not ? <p className="text-metin-2 text-govde-kucuk olcu">{not}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Ornek({ etiket, children }: { etiket: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-metin-3 text-minik tracking-wide uppercase">{etiket}</span>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Renk
   ══════════════════════════════════════════════════════════════════════════ */

function Kutucuk({
  jetonAdi,
  deger,
  kontrast,
}: {
  jetonAdi: string
  deger: string | undefined
  kontrast?: string
}) {
  return (
    <div className="flex min-w-[8.5rem] flex-col gap-1.5">
      <span
        className="border-kenar h-12 rounded-kucuk border-[0.5px]"
        style={{ backgroundColor: `var(${jetonAdi})` }}
      />
      <span className="text-mikro leading-tight">{jetonAdi.replace('--color-', '')}</span>
      <span className="text-metin-3 text-minik rakam uppercase">{deger ?? '—'}</span>
      {kontrast ? <span className="text-metin-3 text-minik">{kontrast}</span> : null}
    </div>
  )
}

function Rampa({
  baslik,
  onEk,
  basamaklar,
  jetonlar,
}: {
  baslik: string
  onEk: string
  basamaklar: readonly number[]
  jetonlar: ReadonlyMap<string, string>
}) {
  return (
    <Ornek etiket={baslik}>
      {basamaklar.map((basamak) => (
        <Kutucuk
          key={basamak}
          jetonAdi={`--color-${onEk}-${basamak}`}
          deger={jetonlar.get(`--color-${onEk}-${basamak}`)}
        />
      ))}
    </Ornek>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Sayfa
   ══════════════════════════════════════════════════════════════════════════ */

const BASAMAKLAR = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

export default function StilRehberiSayfasi() {
  // ⚠️ Üretimde bu sayfa yoktur. Derleme sırasında da buradan döner.
  if (process.env.NODE_ENV === 'production') notFound()

  const { acik } = jetonlariOku()

  const oran = (on: string, arka: string) => {
    const a = acik.get(on)
    const b = acik.get(arka)
    if (a === undefined || b === undefined) return undefined
    return `${oraniYuvarla(kontrastOrani(a, b))}:1`
  }

  return (
    <Bolum>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-baslik-1">Stil rehberi</h1>
          <p className="text-metin-2 olcu">
            Tasarım sisteminin tek gerçek kaynağı{' '}
            <code className="text-mikro">src/app/(site)/globals.css</code>. Bu sayfa onu okur ve
            bileşenleri gerçek hâlleriyle gösterir. Yalnızca geliştirme ortamında açıktır.
          </p>
        </header>

        {/* ── Renk ───────────────────────────────────────────────────── */}
        <Blok
          baslik="Renk"
          not="Rampalar temaya göre değişmez; anlamsal jetonlar rampanın farklı basamağına bağlanır. Kontrast oranları src/lib/tasarim/kontrast.test.ts içinde her derlemede ölçülür."
        >
          <Rampa
            baslik="Koyu kakao — metin ve koyu zemin · taban 900 (metin, üst şerit, altbilgi, koyu tema zemini)"
            onEk="kakao"
            basamaklar={BASAMAKLAR}
            jetonlar={acik}
          />
          <Rampa
            baslik="Terracotta — ana vurgu · İKİ çapa: 200 pudra gülü (yalnızca zemin), 600 terracotta (dolu bant; metin için vurgu jetonu)"
            onEk="terracotta"
            basamaklar={BASAMAKLAR}
            jetonlar={acik}
          />
          <Rampa
            baslik="Adaçayı — eylem · taban 600 (dolu zemin yalnızca iki eylemde; metin için aksan-metin)"
            onEk="adacayi"
            basamaklar={BASAMAKLAR}
            jetonlar={acik}
          />
          <Rampa
            baslik="Soft gold — dekoratif · taban 400 (ASLA metin rengi değil)"
            onEk="gold"
            basamaklar={BASAMAKLAR}
            jetonlar={acik}
          />
          <Rampa
            baslik="Sıcak nötr — 50 kırık beyaz (ana zemin), 100 krem (bölüm ayrımı)"
            onEk="notr"
            basamaklar={BASAMAKLAR}
            jetonlar={acik}
          />

          <Ornek etiket="Anlamsal — metin (beyaz üzerinde kontrast)">
            {(['metin', 'metin-2', 'metin-3', 'metin-pasif', 'vurgu', 'aksan-metin'] as const).map(
              (ad) => (
                <Kutucuk
                  key={ad}
                  jetonAdi={`--color-${ad}`}
                  deger={acik.get(`--color-${ad}`)}
                  kontrast={oran(`--color-${ad}`, '--color-yuzey')}
                />
              ),
            )}
          </Ornek>

          <Ornek etiket="Anlamsal — zemin rolleri (üzerine yazılan metinle)">
            {(
              [
                ['--color-pudra-zemin', '--color-metin'],
                ['--color-vurgu-zemin', '--color-vurgu'],
                ['--color-terracotta-yuzey', '--color-yuzey'],
                ['--color-kakao-yuzey', '--color-yuzey'],
                ['--color-aksan', '--color-aksan-uzeri'],
              ] as const
            ).map(([zemin, on]) => (
              <Kutucuk
                key={zemin}
                jetonAdi={zemin}
                deger={acik.get(zemin)}
                kontrast={oran(on, zemin)}
              />
            ))}
          </Ornek>

          <Ornek etiket="Anlamsal — durum">
            {(['basari', 'uyari', 'uyari-metin', 'hata', 'bilgi', 'gosterge'] as const).map(
              (ad) => (
                <Kutucuk
                  key={ad}
                  jetonAdi={`--color-${ad}`}
                  deger={acik.get(`--color-${ad}`)}
                  kontrast={oran(`--color-${ad}`, '--color-yuzey')}
                />
              ),
            )}
          </Ornek>

          <p className="text-metin-3 text-mikro olcu">
            ⚠️ Onaylanan uyarı rengi beyaz üzerinde 3,87:1 verir — ikon ve kenarlık için yeterli,
            metin için değil. Bu yüzden <code>uyari</code> ve <code>uyari-metin</code> ayrıldı. Aynı
            şekilde nötr-400 metin olarak kullanılmaz; yalnızca pasif öğelerin rengidir.
          </p>
        </Blok>

        {/* ── Tipografi ──────────────────────────────────────────────── */}
        <Blok
          baslik="Tipografi"
          not="Ağırlık yalnızca 400 (gövde) ve 500 (başlık). Metin genişliği en fazla 58ch. Tüm rakamlar hizalı (tabular-nums) — istisnasız."
        >
          <div className="flex flex-col gap-3">
            <p className="text-baslik-1">Sayfa başlığı — 34 · Çorlu&apos;da yatırım</p>
            <p className="text-baslik-2">Bölüm başlığı — 22 · Şeyhsinan mahallesi</p>
            <p className="text-baslik-3">Alt bölüm — 19 · Ğ ı İ ş Ç ö ü</p>
            <p className="text-govde olcu">
              Gövde — 16, satır yüksekliği 1,7. Yatırımcı bir sayfayı üç saniyede tarar; bu metnin
              işi rakamların arasını bağlamak, onların yerini almak değil.
            </p>
            <p className="text-govde-kucuk text-metin-2">Küçük gövde — 14 · kart açıklaması</p>
            <p className="text-yardimci text-metin-3">Yardımcı — 13 · kaynak ve tarih</p>
            <p className="text-mikro text-metin-3">Mikro — 12 · n = 23</p>
            <p className="text-minik text-metin-3">Minik — 11 · m² fiyatı</p>
          </div>

          <Ornek etiket="Rakam gösterimi — hizalı ve sıkı">
            <div className="flex flex-col gap-1">
              <span className="rakam text-rakam-buyuk font-medium">14.850.000 ₺</span>
              <span className="rakam text-rakam font-medium">14,8 yıl</span>
              <span className="rakam text-rakam font-medium">1.111.111 ₺</span>
            </div>
          </Ornek>
        </Blok>

        {/* ── Köşe, kenarlık, geçiş ──────────────────────────────────── */}
        <Blok
          baslik="Köşe · kenarlık · geçiş"
          not="Kenarlık 0,5px. Kalın kenarlık kutuları koparır ve sayfayı ızgaraya benzetir."
        >
          <Ornek etiket="Köşe yarıçapı">
            {(
              [
                ['rozet', '4'],
                ['kucuk', '6'],
                ['buton', '8'],
                ['kart', '12'],
                ['buyuk', '20'],
              ] as const
            ).map(([ad, px]) => (
              <div key={ad} className="flex flex-col items-center gap-1.5">
                <span
                  className="bg-yuzey-2 border-kenar-guclu size-16 border-[0.5px]"
                  style={{ borderRadius: `var(--radius-${ad})` }}
                />
                <span className="text-minik text-metin-3">
                  {ad} · {px}px
                </span>
              </div>
            ))}
          </Ornek>
        </Blok>

        {/* ── Butonlar ───────────────────────────────────────────────── */}
        <Blok
          baslik="Butonlar"
          not="Varsayılan görünüm çerçevelidir: bir butonun dolu olması bilinçli bir karar olmalı. Dokunma hedefi en az 44px."
        >
          <Ornek etiket="Görünümler">
            <Buton gorunum="aksan">Değerleme isteyin</Buton>
            <Buton gorunum="kakao">Talebi gönder</Buton>
            <Buton>İkincil eylem</Buton>
            <Buton gorunum="hayalet">Hayalet</Buton>
            <Buton gorunum="whatsapp">WhatsApp&apos;tan yaz</Buton>
          </Ornek>

          <Ornek etiket="Boyutlar">
            <Buton boyut="kucuk">Küçük</Buton>
            <Buton boyut="orta">Orta</Buton>
            <Buton boyut="buyuk">Büyük</Buton>
          </Ornek>

          <Ornek etiket="Pasif — sebebi ALTINDA yazar">
            <Buton
              pasif
              pasifSebebi="EİDS yetki belgesinin süresi dolduğu için bu ilan yayına alınamaz."
            >
              Yayına al
            </Buton>
            <Buton pasif pasifSebebi="Devam etmek için bir seçenek işaretleyin.">
              Devam
            </Buton>
          </Ornek>

          <p className="text-metin-3 text-mikro olcu">
            Pasif buton <code>disabled</code> değil <code>aria-disabled</code> kullanır: sekme
            sırasından çıkarılan bir buton klavye kullanıcısına sebebini de duyuramaz.
          </p>
        </Blok>

        {/* ── Rozetler ───────────────────────────────────────────────── */}
        <Blok
          baslik="Rozetler"
          not="Doğrulanmış ilan rozeti yasal bir beyandır. Taşınmaz numarası olmadan hiç render edilmez."
        >
          <Ornek etiket="İlan durumu">
            <DogrulanmisIlanRozeti tasinmazNo="59/2026/0001234" />
            <YayinlanmayanRozeti />
            <YetkiSuresiRozeti kalanGun={12} />
            <YetkiSuresiRozeti kalanGun={0} />
          </Ornek>

          <Ornek etiket="Taşınmaz numarası yoksa — hiç görünmez">
            <span className="text-metin-3 text-mikro">
              <DogrulanmisIlanRozeti tasinmazNo={null} />
              (yukarıda boşluk var, rozet yok)
            </span>
          </Ornek>

          <Ornek etiket="Genel tonlar">
            <Rozet>Nötr</Rozet>
            <Rozet ton="vurgu">Lacivert</Rozet>
            <Rozet ton="basari">Fırsat</Rozet>
            <Rozet ton="hata">Risk</Rozet>
            <Rozet ton="uyari">Dikkat</Rozet>
            <Rozet ton="yetki">Yetki</Rozet>
          </Ornek>
        </Blok>

        {/* ── İstatistik kartı ───────────────────────────────────────── */}
        <Blok
          baslik="İstatistik kartı"
          not="Gözlem sayısı HER İSTATİSTİKTE görünür ve tip düzeyinde zorunludur. Rakamı zayıflatmaz, güçlendirir."
        >
          <IstatistikIzgarasi>
            <IstatistikKarti
              etiket="Ortalama m² satış"
              deger="42.500 ₺"
              gozlemSayisi={23}
              altBilgi="Haziran 2026"
            />
            <IstatistikKarti etiket="Kira çarpanı" deger="14,8 yıl" gozlemSayisi={11} />
            <IstatistikKarti etiket="12 ay değişim" deger="%18,4" gozlemSayisi={23} ton="artis" />
            <IstatistikKarti etiket="Arz baskısı" deger="%6,1" gozlemSayisi={9} ton="azalis" />
          </IstatistikIzgarasi>

          <IstatistikIzgarasi>
            <IstatistikKarti
              etiket="Ortalama kira"
              deger={null}
              gozlemSayisi={null}
              bosAciklama="Bu mahalle için henüz gözlem girilmedi."
            />
            <IstatistikKarti etiket="Gözlem yok ama rakam var" deger="38.000 ₺" gozlemSayisi={0} />
            <IstatistikKarti
              etiket="Bilinmeyen n"
              deger="21.400 ₺"
              gozlemSayisi={null}
              altBilgi="Dış kaynak"
            />
            <IstatistikKarti etiket="Öne çıkan rakam" deger="14,8" gozlemSayisi={31} vurgulu />
          </IstatistikIzgarasi>

          <VeriNotu kaynak="Aslıhan GYD saha gözlemleri" tarih="6 Ağustos 2026" gozlemSayisi={23} />
          <Feragat />
        </Blok>

        {/* ── Kilitli kart ───────────────────────────────────────────── */}
        <Blok
          baslik="Kilitli portföy kartı"
          not="Fotoğrafın yerinde çapraz çizgili doku var — bulanık fotoğraf değil. Bulanık görsel yine de indirilir; doku hiçbir görsel isteği yapmaz."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KilitliKart
              mahalleAdi="Şeyhsinan"
              odaSayisi="3+1"
              m2Araligi="125 – 150 m²"
              fiyatBandi="4,0 – 4,5 M ₺"
              kiraCarpani={14.8}
            />
            <KilitliKart mahalleAdi={null} m2Araligi={null} fiyatBandi={null} kiraCarpani={null} />
          </div>
        </Blok>

        {/* ── Güven düzeyi ───────────────────────────────────────────── */}
        <Blok
          baslik="Güven düzeyi"
          not="Düşük güven gizlenmez. Az gözlem varsa iki şey birden olur: aralık genişler ve gösterge 'düşük' der."
        >
          <div className="grid gap-6 sm:grid-cols-3">
            <GuvenDuzeyi kademe="dusuk" gozlemSayisi={3} />
            <GuvenDuzeyi kademe="orta" gozlemSayisi={12} />
            <GuvenDuzeyi kademe="yuksek" gozlemSayisi={41} />
          </div>
        </Blok>

        {/* ── Boş durum ──────────────────────────────────────────────── */}
        <Blok
          baslik="Boş durum"
          not="Bu projede birinci sınıf bileşen. Dört şey söyler: ne yok, neden yok, ne zaman dolacak, şimdi ne yapılır."
        >
          <BosDurum
            baslik="Bu mahalle için endeks henüz hazır değil"
            neden="Güvenilir bir seri için katman başına en az 8 gözlem topluyoruz. Şu an 5 gözlem var."
            neZaman="Eşik aşıldığında sayfa kendiliğinden açılır; tahmini bir tarih vermiyoruz."
            eylem={<Buton href="/mahalleler">Mahalle sayfalarına dön</Buton>}
          />

          <BosDurum
            baslik="Filtrelere uyan ilan bulunamadı"
            neden="Portföyümüzde bu ölçütlere uyan bir taşınmaz şu an yok."
            eylem={<Buton href="/portfoy">Filtreleri temizle</Buton>}
            sade
          />
        </Blok>

        {/* ── Yükleme ────────────────────────────────────────────────── */}
        <Blok
          baslik="Yükleme"
          not="Spinner değil iskelet. Spinner 'bir şey oluyor' der; iskelet ne geleceğini gösterir ve düzen zıplamaz."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KartIskeleti />
            <IstatistikIskeleti />
            <MetinIskeleti satir={5} />
          </div>
        </Blok>
      </div>
    </Bolum>
  )
}
