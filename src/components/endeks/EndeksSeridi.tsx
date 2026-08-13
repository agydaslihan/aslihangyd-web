import Link from 'next/link'

import { OkIkon } from '@/components/ui/Ikon'
import { endeksVerisiniGetir, endeksSayfasiAcikMi } from '@/lib/veri/endeks'

/**
 * Ana sayfadaki Çorlu Konut Endeksi şeridi (şartname §5.6).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ VERİ YOKKEN DE GÖRÜNÜR — boş durum birinci sınıf bileşen.
 *
 * Şerit ilk yazımda hiç yapılmamıştı; endeks yayınlanamadığı için "bölüm de
 * olmasın" varsayılmıştı. Yanlıştı: site aylarca kısmi veriyle çalışacak ve
 * "böyle bir endeks üretiyoruz, şu koşullarda yayınlayacağız" bilgisi
 * endeksin kendisi kadar değerli. Kaybolan bir bölüm, olmayan bir çalışma
 * izlenimi veriyor.
 *
 * ⚠️ ENDEKS DÜRÜSTLÜĞÜ (CLAUDE.md 6c) BURADA DA GEÇERLİ.
 *
 * Şerit yalnızca `endeksSayfasiAcikMi()` doğruysa rakam gösteriyor — o
 * yardımcı hem Aslıhan'ın onayına hem veri eşiklerine bakıyor ve `/endeks`
 * sayfasının kapısıyla AYNI. İki yerde ayrı koşul yazmak, birinin diğerinden
 * ayrışması demekti: ana sayfa rakam gösterirken sayfanın 404 dönmesi.
 *
 * ⚠️ Serinin adı "İSTENEN FİYAT" endeksi ve bu gizlenmiyor. Gerçekleşen
 * satış fiyatı değil; şeritte de böyle yazıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function EndeksSeridi() {
  const [veri, yayinda] = await Promise.all([endeksVerisiniGetir(), endeksSayfasiAcikMi()])

  const aylar = veri.seri?.aylar ?? []
  const degerler = aylar
    .map((ay) => ay.endeks)
    .filter((deger): deger is number => typeof deger === 'number')

  const gosterilebilir = yayinda && degerler.length >= 2

  return (
    <section aria-label="Çorlu Konut Endeksi" className="bg-yuzey-2">
      {/* ⚠️ Gold ince üst/alt çizgi — şartnamenin gold'a ayırdığı üç yerden
          biri. Dekoratif: şeridin kendisi zaten "Endeks" diyor. */}
      <div aria-hidden="true" className="bg-gold-cizgi h-px w-full" />

      <div className="kapsayici py-8">
        {gosterilebilir ? (
          <DoluSerit aylar={degerler} seriTipi={veri.seri?.seriTipi ?? 'istenen_fiyat'} />
        ) : (
          <BosSerit gozlem={veri.toplamGozlem} />
        )}
      </div>

      <div aria-hidden="true" className="bg-gold-cizgi h-px w-full" />
    </section>
  )
}

function DoluSerit({
  aylar,
  seriTipi,
}: {
  aylar: readonly number[]
  seriTipi: 'istenen_fiyat' | 'gerceklesen_fiyat'
}) {
  const son = aylar.at(-1)!
  const onceki = aylar.at(-2)!
  const aylikDegisim = ((son - onceki) / onceki) * 100

  /**
   * Yıllık değişim yalnızca 13 ay veri varken hesaplanıyor.
   *
   * ⚠️ Daha azıyla "yıllık" demek uydurma olurdu: elde 4 ay varsa
   * dördüncüyü birinciyle kıyaslayıp "yıllık değişim" etiketi koymak,
   * bilmediğimiz bir şeyi iddia etmektir.
   */
  const yillikDegisim = aylar.length >= 13 ? ((son - aylar.at(-13)!) / aylar.at(-13)!) * 100 : null

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <div>
          <p className="text-metin-3 text-eyebrow font-medium uppercase">
            Çorlu Konut {seriTipi === 'istenen_fiyat' ? 'İstenen Fiyat' : 'Gerçekleşen Fiyat'}{' '}
            Endeksi
          </p>
          <p className="rakam text-rakam text-metin mt-1 font-medium">{son.toFixed(1)}</p>
        </div>

        <Degisim etiket="Aylık" yuzde={aylikDegisim} />
        <Degisim etiket="Yıllık" yuzde={yillikDegisim} />
      </div>

      <div className="flex items-center gap-6">
        <Sparkline degerler={aylar} />
        <MetodolojiBaglantisi />
      </div>
    </div>
  )
}

/**
 * Boş durum.
 *
 * ⚠️ "Hazırlanıyor" demek yetmez; NEDEN hazırlanmadığı da yazıyor.
 * Eşik bilgisi ziyaretçiye "bu insanlar rakamı acele etmiyor" mesajı
 * veriyor — bir yatırım sitesinde bu, boş bir grafikten daha değerli.
 */
function BosSerit({ gozlem }: { gozlem: number }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-metin-3 text-eyebrow font-medium uppercase">Çorlu Konut Endeksi</p>
        <p className="text-metin mt-1.5 text-govde">
          Çorlu Konut Endeksi hazırlanıyor. Güvenilir bir seri için katman başına en az{' '}
          <span className="rakam">8</span> gözlem topluyoruz.
          {gozlem > 0 ? (
            <>
              {' '}
              Şu ana kadar <span className="rakam">{gozlem}</span> gözlem girildi.
            </>
          ) : null}
        </p>
      </div>

      <MetodolojiBaglantisi />
    </div>
  )
}

/**
 * ⚠️ `/endeks-metodolojisi` site bölümü kapısı TAŞIMIYOR (`BOLUMLER`
 * içindeki `endeks` bölümünün rotaları yalnızca `/endeks`). Yani bu sayfa
 * her durumda 200 dönüyor ve bağlantı güvenli. Metodoloji sayfası bir gün
 * kapatılabilir hale gelirse bu bağlantı da koşullanmalı.
 */
function MetodolojiBaglantisi() {
  return (
    <Link
      href="/endeks-metodolojisi"
      className="text-aksan-metin inline-flex shrink-0 items-center gap-1.5 text-govde-kucuk font-medium underline-offset-2 hover:underline"
    >
      Metodolojiyi okuyun
      <OkIkon width={15} height={15} />
    </Link>
  )
}

function Degisim({ etiket, yuzde }: { etiket: string; yuzde: number | null }) {
  return (
    <div>
      <p className="text-metin-3 text-eyebrow font-medium uppercase">{etiket}</p>
      {yuzde === null ? (
        // ⚠️ "—" değil: tire, "sıfır" ile "bilinmiyor" arasındaki farkı siler.
        <p className="text-metin-3 mt-1 text-govde-kucuk">yeterli veri yok</p>
      ) : (
        <p className="rakam text-metin mt-1 text-govde font-medium">
          {yuzde >= 0 ? '+' : ''}
          {yuzde.toFixed(1)}%
        </p>
      )}
    </div>
  )
}

/**
 * Mini sparkline — ek kütüphane YOK, düz SVG.
 *
 * ⚠️ `aria-hidden`: eğri hiçbir bilgiyi tek başına taşımıyor; endeks
 * değeri ve iki değişim oranı zaten metin olarak yanında. Ekran okuyucuya
 * anlamsız bir yol tarifi okutmanın karşılığı yok.
 */
function Sparkline({ degerler }: { degerler: readonly number[] }) {
  const enAz = Math.min(...degerler)
  const enCok = Math.max(...degerler)
  const aralik = enCok - enAz || 1

  const genislik = 120
  const yukseklik = 32

  const noktalar = degerler
    .map((deger, sira) => {
      const x = (sira / (degerler.length - 1)) * genislik
      const y = yukseklik - ((deger - enAz) / aralik) * yukseklik
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={genislik}
      height={yukseklik}
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      aria-hidden="true"
      focusable="false"
      className="hidden shrink-0 sm:block"
    >
      <polyline
        points={noktalar}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-aksan-metin"
      />
    </svg>
  )
}
