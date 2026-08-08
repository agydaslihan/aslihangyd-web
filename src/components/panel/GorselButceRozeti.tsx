import { baytYaz, BUTCE_BAYT, butceDurumu, type ButceDurumu } from '@/lib/medya/gorselButcesi'

import './gorselButceRozeti.css'

/**
 * Panelde görselin gerçek indirilme boyutunu ve bütçe durumunu gösterir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ GÖSTERİLEN SAYI ORİJİNAL DOSYA BOYUTU DEĞİL.
 *
 * Panelin kendi `filesize` alanı yüklenen JPEG'i söyler; ziyaretçi onu
 * indirmez. `next/image` görseli AVIF'e çevirip ekrana uygun genişliğe
 * indirir. Burada gösterilen, o dönüşümün GERÇEKTEN ÜRETTİĞİ bayt —
 * yükleme sırasında sharp ile ölçülüyor (`src/lib/medya/gorselButcesi.ts`).
 *
 * Orijinal boyutu göstermek iki yönde de yanıltırdı: 3 MB'lık bir JPEG
 * mobilde 60 kB inebilir (gereksiz alarm), tersine kötü optimize edilmiş
 * küçük bir PNG şişebilir (kaçan sorun).
 *
 * ⚠️ HÜKÜM KULLANIMA BAĞLI — TEK EŞİK YANLIŞ ALARM ÜRETİYORDU.
 *
 * İlk sürüm her görseli hero bütçesiyle yargılıyordu ve kart görselleri de
 * kırmızı görünüyordu; oysa kart hiçbir zaman 828 piksel inmez. Kalıcı
 * yanlış alarm, kısa sürede görmezden gelinen bir uyarıdır — bakım
 * eşiğinde 26 saat seçilmesinin gerekçesiyle aynı.
 *
 * Kullanım "belirsiz" ise sayılar gösterilir ama hüküm verilmez.
 *
 * ⚠️ SUNUCU BİLEŞENİ — bilinçli. İstemci bileşeni olsaydı canlı form
 * durumunu okumak için `@payloadcms/ui` doğrudan bağımlılık olurdu; proje
 * bunu bilerek yapmıyor (bkz. `SihirbazNavBaglantisi`). Gerekli de değil:
 * ölçüm kaydetme kancasında üretiliyor, değer ancak kayıttan SONRA var.
 *
 * ⚠️ Bu bir KAPI DEĞİL, AYNA. Bütçe aşıldığında yükleme engellenmiyor;
 * bazen büyük görsel bilinçli karardır ve içerik girişini bloke etmek
 * Aslıhan'ı panelde durdururdu.
 * ─────────────────────────────────────────────────────────────────────────
 */

const DURUM_METNI: Record<ButceDurumu, string> = {
  uygun: 'Bütçe içinde',
  sinirda: 'Sınırda',
  asildi: 'Bütçe aşıldı',
}

/** ⚠️ Renk tek taşıyıcı değil (WCAG 1.4.1): durum metinle ve simgeyle de yazılı. */
const DURUM_SIMGESI: Record<ButceDurumu, string> = {
  uygun: '✓',
  sinirda: '!',
  asildi: '×',
}

function Satir({
  etiket,
  bayt,
  butce,
  aciklama,
}: {
  etiket: string
  bayt: number
  butce?: number
  aciklama?: string
}) {
  const durum = butce === undefined ? null : butceDurumu(bayt, butce)

  return (
    <div className={`gbr-satir${durum ? ` gbr-${durum}` : ''}`}>
      <div className="gbr-ust">
        <span className="gbr-etiket">{etiket}</span>
        <span className="gbr-deger">{baytYaz(bayt)}</span>
      </div>
      {durum && butce !== undefined ? (
        <div className="gbr-alt">
          <span aria-hidden="true">{DURUM_SIMGESI[durum]}</span> {DURUM_METNI[durum]} — bütçe{' '}
          {baytYaz(butce)}
        </div>
      ) : null}
      {durum === 'asildi' && aciklama ? <p className="gbr-oneri">{aciklama}</p> : null}
    </div>
  )
}

interface RozetOzellikleri {
  data?: {
    kullanim?: string | null
    tahminiKartBayt?: number | null
    tahminiMobilBayt?: number | null
    tahminiMasaustuBayt?: number | null
  }
}

export function GorselButceRozeti({ data }: RozetOzellikleri) {
  const kart = data?.tahminiKartBayt
  const mobil = data?.tahminiMobilBayt
  const masaustu = data?.tahminiMasaustuBayt
  const kullanim = data?.kullanim ?? 'belirsiz'

  if (typeof mobil !== 'number' || typeof masaustu !== 'number') {
    return (
      <div className="gbr">
        <h4 className="gbr-baslik">Boyut bütçesi</h4>
        <p className="gbr-bos">
          Görsel kaydedildikten sonra, ziyaretçiye gerçekten inecek boyut burada görünecek. Eski
          görsellerde ölçüm yok; yeniden yüklenirse hesaplanır.
        </p>
      </div>
    )
  }

  return (
    <div className="gbr">
      <h4 className="gbr-baslik">Boyut bütçesi</h4>

      {kullanim === 'kart' && typeof kart === 'number' ? (
        <Satir
          etiket="Kart boyutunda"
          bayt={kart}
          butce={BUTCE_BAYT.kart}
          aciklama={
            'Kart görselleri genelde ilk ekranda birkaç tane birden yüklenir; ' +
            'her biri toplam ağırlığa ekleniyor. Daha küçük çözünürlükte dışa aktarın.'
          }
        />
      ) : null}

      {kullanim === 'hero' ? (
        <>
          <Satir
            etiket="Mobilde"
            bayt={mobil}
            butce={BUTCE_BAYT.mobilHero}
            aciklama={
              'Hero görseli sayfanın en büyük öğesidir; mobilde açılış hızını ' +
              'doğrudan geciktirir. Daha küçük çözünürlükte yeniden dışa aktarmayı ' +
              'ya da fotoğrafı sadeleştirmeyi deneyin.'
            }
          />
          <Satir
            etiket="Masaüstünde"
            bayt={masaustu}
            butce={BUTCE_BAYT.masaustuHero}
            aciklama="Masaüstü hero bütçesi aşıldı. Görseli 1920 pikselden geniş dışa aktarmayın."
          />
        </>
      ) : null}

      {kullanim === 'belirsiz' ? (
        <>
          {typeof kart === 'number' ? <Satir etiket="Kart boyutunda" bayt={kart} /> : null}
          <Satir etiket="Mobilde" bayt={mobil} />
          <Satir etiket="Masaüstünde" bayt={masaustu} />
          <p className="gbr-not">
            Hüküm verilmedi: bu görselin nerede kullanılacağı seçilmemiş. Yukarıdaki{' '}
            <strong>Nerede kullanılacak</strong> alanını doldurursanız bütçeye göre değerlendirilir.
          </p>
        </>
      ) : null}

      <p className="gbr-not">
        Yüklenen dosyanın boyutu değil, <strong>ziyaretçiye AVIF olarak inecek</strong> boyut.
        Bütçeler: hero mobil {baytYaz(BUTCE_BAYT.mobilHero)}, hero masaüstü{' '}
        {baytYaz(BUTCE_BAYT.masaustuHero)}, kart {baytYaz(BUTCE_BAYT.kart)}.
      </p>
    </div>
  )
}
