import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import '@/components/panel/aktarim.css'

import { POI_TIPLERI } from '@/collections/IlgiNoktalari'
import { yoneticiMi } from '@/lib/erisim'
import { googlePlacesKapaliSebebi } from '@/lib/google/ayarlar'
import { kullanimiGetir } from '@/lib/google/sayac'

import { GoogleSihirbazi, type PoiSatiri } from './GoogleSihirbazi'

/**
 * Google Places eşleştirme ekranı (`/admin/google-places`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EKRAN GOOGLE İÇERİĞİNİ KAYDETMİYOR
 *
 * Yazdığı tek alan `googlePlaceId`. Ad, adres, çalışma saati — hiçbiri
 * veritabanına girmiyor; Places lisansı yer kimliği dışındaki içeriğin
 * saklanmasına izin vermiyor ve saklanan bir çalışma saati zaten birkaç
 * ay içinde yanlışa dönüşürdü.
 *
 * Noktanın adı ve konumu OpenStreetMap'ten ya da elle girişten gelmeye
 * devam ediyor. Google yalnızca "bu noktanın Google'daki karşılığı bu"
 * bağlantısını kuruyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yalnızca yönetici: her arama ücretli bir çağrı.
 */
export default async function GoogleGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Görünüm gövdesi oturumsuz da çalışır; kapı zorunlu (CLAUDE.md).
  if (!req.user) return null

  if (!yoneticiMi(req.user)) {
    return (
      <div className="aktarim">
        <h1 className="aktarim-baslik">Google Places eşleştirme</h1>
        <p className="aktarim-not">
          Bu ekran yalnızca yöneticiye açık. Her arama ücretli bir API çağrısı üretiyor.
        </p>
      </div>
    )
  }

  const [sebep, kullanim] = await Promise.all([
    googlePlacesKapaliSebebi(),
    kullanimiGetir(req.payload),
  ])

  const poiler = await req.payload.find({
    collection: 'ilgi-noktalari',
    limit: 500,
    depth: 0,
    sort: 'ad',
    user: req.user,
    overrideAccess: false,
  })

  const tipEtiketleri = new Map(POI_TIPLERI.map((tip) => [tip.value, tip.label]))

  const satirlar: PoiSatiri[] = poiler.docs.map((poi) => ({
    id: poi.id as number,
    ad: String(poi.ad ?? ''),
    tip: tipEtiketleri.get(poi.tip) ?? String(poi.tip ?? ''),
    kaynak: String(poi.kaynak ?? 'elle'),
    googlePlaceId: typeof poi.googlePlaceId === 'string' ? poi.googlePlaceId : null,
    konumVar: Array.isArray(poi.konum) && poi.konum.length >= 2,
  }))

  return (
    <div className="aktarim">
      <h1 className="aktarim-baslik">Google Places eşleştirme</h1>

      <div className="aktarim-uyari">
        <p>
          <strong>Google verisi kaydedilmiyor.</strong> Bu ekranın yazdığı tek şey{' '}
          <strong>yer kimliği</strong>. İşletme adı, adres ve çalışma saati veritabanına girmiyor —
          gösterileceği anda Google&apos;dan çekiliyor ve Google atfıyla gösteriliyor. Places
          lisansı yer kimliği dışındaki içeriğin saklanmasına izin vermiyor.
        </p>
        <p>
          <strong>Bu bir veri kazıma (scraping) değil.</strong> Places, bu iş için yapılmış resmî ve
          ücretli bir arayüz; anahtar bizim. İlan platformlarından otomatik veri çekme yasağı (kural
          6) burada geçerli değil.
        </p>
        <p>
          <strong>Her çağrı ücretli.</strong> Aylık sayılar aşağıda ve Ayarlar → Google Places
          Kullanımı ekranında görünür. Katmanı kapatmak için Site Bölümleri →{' '}
          <em>Google Places katmanı</em>.
        </p>
      </div>

      <section className="aktarim-adim">
        <h2>Aylık çağrı sayısı</h2>
        {kullanim.length === 0 ? (
          <p className="aktarim-not">Henüz hiç çağrı yapılmadı.</p>
        ) : (
          <div className="aktarim-tablo-sarmal">
            <table className="aktarim-tablo">
              <thead>
                <tr>
                  <th scope="col">Ay</th>
                  <th scope="col">Arama</th>
                  <th scope="col">Detay</th>
                  <th scope="col">Toplam</th>
                  <th scope="col">Son çağrı</th>
                </tr>
              </thead>
              <tbody>
                {kullanim.slice(0, 12).map((ay) => (
                  <tr key={ay.ay}>
                    <td>{ay.ay}</td>
                    <td>{ay.aramaCagrisi}</td>
                    <td>{ay.detayCagrisi}</td>
                    <td>{ay.aramaCagrisi + ay.detayCagrisi}</td>
                    <td>
                      {ay.sonCagri
                        ? new Date(ay.sonCagri).toLocaleString('tr-TR', {
                            timeZone: 'Europe/Istanbul',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sebep !== null ? (
        <div className="aktarim-bos">
          <p>
            <strong>Google Places katmanı şu anda kapalı.</strong>
          </p>
          {sebep === 'bolum_kapali' ? (
            <p>
              Site Bölümleri ayarında <em>Google Places katmanı</em> kapalı. Açmadan önce maliyeti
              göze aldığınızdan emin olun — her arama ve her çalışma saati gösterimi ücretli bir
              çağrıdır.
            </p>
          ) : (
            <p>
              <code>GOOGLE_PLACES_API_KEY</code> tanımlı değil. Anahtarı sunucudaki{' '}
              <code>.env</code> dosyasına ekleyip uygulamayı yeniden başlatın. Anahtar olmadan
              katman sessizce kapalı kalır ve site OpenStreetMap verisiyle aynen çalışır.
            </p>
          )}
          <p>
            Veri kaynaklarının tamamı ve lisansları{' '}
            <Link href="/veri-kaynaklari">/veri-kaynaklari</Link> sayfasında yayınlanıyor.
          </p>
        </div>
      ) : (
        <GoogleSihirbazi satirlar={satirlar} />
      )}
    </div>
  )
}
