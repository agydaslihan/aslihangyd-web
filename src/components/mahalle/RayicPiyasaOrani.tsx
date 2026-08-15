import { BosDurum } from '@/components/ui/BosDurum'
import { GrafikIkon } from '@/components/ui/Ikon'
import { paraYaz } from '@/lib/bicimlendirme'
import { rayicKaynagiEtiketi, rayicPiyasaOrani } from '@/lib/rayic/tipler'
import { sinif } from '@/lib/sinif'
import { tarihiYaz } from '@/lib/tarih'
import type { MahalleRayici } from '@/lib/veri/rayic'

/**
 * Rayiç / piyasa oranı — "piyasa fiyatı rayiç bedelin kaç katı?"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN DEĞERLİ VE NEDEN TEHLİKELİ
 *
 * Değerli: rayiç bedel resmî ve kamuya açık; piyasa fiyatı bizim
 * gözlemimiz. İkisinin oranı, bir mahallenin resmî tabanla piyasa arasında
 * nerede durduğunu gösterir ve Türkiye'de bunu yayınlayan yok.
 *
 * Tehlikeli: iki rakam farklı şeyler ölçüyor ve karıştırılırsa sitedeki en
 * yanıltıcı sayı olur. Bu yüzden bileşen üç şeyi ASLA gizlemez:
 *   1. Rayiç bedelin ne olduğu (vergiye esas ASGARİ değer, piyasa değil)
 *   2. Piyasa rakamının ne olduğu (bizim gözlemimiz, İSTENEN fiyat)
 *   3. İkisinin de kaynağı ve tarihi
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Veri yoksa uydurulmaz: boş durum gösterilir ve neyin beklendiği
 * yazılır (CLAUDE.md kural 2).
 */
export function RayicPiyasaOrani({
  rayic,
  /** Mahallenin ortalama m² satış fiyatı — bizim gözlemlerimizden. */
  piyasaM2,
  /** Piyasa rakamının kaç gözleme dayandığı. */
  gozlemSayisi,
  /** Piyasa rakamının tarihi. */
  verilerinTarihi,
  sinifAdi,
}: {
  rayic: MahalleRayici | null
  piyasaM2: number | null | undefined
  gozlemSayisi?: number | null
  verilerinTarihi?: string | null
  sinifAdi?: string
}) {
  const rayicM2 = rayic?.metrekareRayicBedel ?? null

  if (rayicM2 === null) {
    return (
      <BosDurum
        ikon={<GrafikIkon width={32} height={32} />}
        baslik="Rayiç bedel henüz girilmedi"
        neden="Belediyenin emlak vergisine esas aldığı m² rayiç bedeli, resmî ve kamuya açık bir veridir. Tabloyu elimize geçtikçe mahalle mahalle giriyoruz; tahmin etmiyoruz."
        neZaman="Rakam girildiğinde bu bölüm kendiliğinden dolar."
        sinifAdi={sinifAdi}
      />
    )
  }

  const oran = rayicPiyasaOrani(piyasaM2, rayicM2)
  const kaynak = rayicKaynagiEtiketi(rayic?.kaynak) ?? 'belirtilmedi'
  const kaynakTarihi = tarihiYaz(rayic?.guncellemeTarihi ?? null)

  return (
    <div className={sinif('border-kenar rounded-kart bg-yuzey border-[0.5px] p-5', sinifAdi)}>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-metin-3 text-mikro font-medium tracking-wide uppercase">
            Rayiç bedel ({rayic?.yil})
          </dt>
          <dd className="text-baslik-3 mt-1 font-sans font-medium tabular-nums">
            {paraYaz(rayicM2)}/m²
          </dd>
          <p className="text-metin-3 text-mikro mt-1">Vergiye esas asgari değer</p>
        </div>

        <div>
          <dt className="text-metin-3 text-mikro font-medium tracking-wide uppercase">
            Piyasa (gözlemimiz)
          </dt>
          <dd className="text-baslik-3 mt-1 font-sans font-medium tabular-nums">
            {piyasaM2 ? `${paraYaz(piyasaM2)}/m²` : 'Veri bekleniyor'}
          </dd>
          <p className="text-metin-3 text-mikro mt-1">
            İstenen fiyat
            {typeof gozlemSayisi === 'number' ? ` · n=${gozlemSayisi}` : ''}
          </p>
        </div>

        <div>
          <dt className="text-metin-3 text-mikro font-medium tracking-wide uppercase">Oran</dt>
          <dd className="text-baslik-3 mt-1 font-sans font-medium tabular-nums">
            {oran === null ? '—' : `${oran.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}×`}
          </dd>
          <p className="text-metin-3 text-mikro mt-1">
            {oran === null ? 'Piyasa gözlemi bekleniyor' : 'Piyasa / rayiç'}
          </p>
        </div>
      </dl>

      {/*
        ⚠️ BU PARAGRAF KALDIRILMAZ.

        İki rakam farklı şeyler ölçüyor. Açıklama olmadan yan yana konan
        bu sayılar, ziyaretçiye "mahallede m² 9.500 lira" dedirtir ve
        piyasada üç katıyla karşılaşır.
      */}
      <p className="text-metin-3 text-mikro mt-4 leading-relaxed">
        <strong className="text-metin-2 font-medium">Rayiç bedel piyasa fiyatı değildir.</strong>{' '}
        Belediyenin takdir komisyonunca belirlenen, emlak vergisi ve tapu harcı için <em>asgari</em>{' '}
        değerdir; piyasanın çoğu yerde altındadır. Tapu harcı bu değerin altına düşemez. Kaynak:{' '}
        {kaynak}
        {kaynakTarihi ? ` · ${kaynakTarihi} itibarıyla` : ''}.
      </p>

      <p className="text-metin-3 text-mikro mt-2 leading-relaxed">
        Piyasa rakamı <strong className="text-metin-2 font-medium">kendi gözlemlerimize</strong>{' '}
        dayanır ve <strong className="text-metin-2 font-medium">istenen fiyattır</strong> —
        gerçekleşen satış fiyatı değildir.
        {verilerinTarihi ? ` Veriler ${tarihiYaz(verilerinTarihi)} itibarıyladır.` : ''}
      </p>
    </div>
  )
}
