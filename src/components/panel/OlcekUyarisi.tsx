'use client'

import { useFormFields } from '@payloadcms/ui'

import './olcekUyarisi.css'

import { OLCEK_KURALLARI, olcekSuphesi, type OlcekAlani } from '@/lib/veri/olcek'

/**
 * Ölçek uyarısı — panelde, YAZARKEN.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `validate` DEĞİL: `validate` ENGELLER, BU UYARIR.
 *
 * Payload'ın alan doğrulaması bir dize döndürdüğünde kaydı reddediyor.
 * Talimat açıkça "engelleme, UYAR" diyor ve haklı: Çorlu'da 900 ₺/m²
 * bir arsa gerçekten olabilir, kırsal bir mahallenin nüfusu 90 olabilir.
 * Reddedilen doğru bir kayıt, kabul edilen yanlış bir kayıttan daha çok
 * zarar verir — çünkü kullanıcı bir daha denemez.
 *
 * ⚠️ UYARI KAYDETMEDEN ÖNCE ÇIKIYOR. Bir `beforeChange` kancası uyarıyı
 * ancak kayıttan sonra üretebilirdi ve arayüze taşıyamazdı. Bu bileşen
 * form durumunu okuyor; rakam yazılır yazılmaz görünüyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function OlcekUyarisi() {
  const alanlar = useFormFields(([fields]) => fields)

  const supheler = OLCEK_KURALLARI.map((kural) => {
    const deger = alanlar?.[kural.alan]?.value
    return olcekSuphesi(kural.alan as OlcekAlani, typeof deger === 'string' ? Number(deger) : deger)
  }).filter((suphe) => suphe !== null)

  if (supheler.length === 0) return null

  return (
    <div className="olcek-uyari" role="status">
      <p className="olcek-uyari-baslik">
        ⚠️ {supheler.length} rakam bindebir görünüyor — kaydetmeden önce kontrol edin
      </p>

      <ul>
        {supheler.map((suphe) => (
          <li key={suphe.alan}>
            <strong>{suphe.etiket}:</strong> {suphe.mesaj}{' '}
            <span className="olcek-uyari-oneri">
              Kastedilen {suphe.onerilen.toLocaleString('tr-TR')} ise düzeltin.
            </span>
          </li>
        ))}
      </ul>

      {/*
        ⚠️ SEBEBİ YAZILI. "Rakam küçük görünüyor" demek, kullanıcıya ne
        yapacağını söylemiyor. Kök neden tarayıcının kendi davranışı ve
        bir kez okunduğunda bir daha yapılmıyor.
      */}
      <p className="olcek-uyari-neden">
        Sayı alanı noktayı <strong>ondalık</strong> ayırıcı sayar: <code>39.704</code> yazdığınızda
        kaydedilen değer <code>39,704</code> olur. Binlik ayırıcı kullanmayın — <code>39704</code>{' '}
        diye yazın.
      </p>

      <p className="olcek-uyari-neden">
        Bu bir uyarı, engel değil. Rakam gerçekten böyleyse kaydedebilirsiniz.
      </p>
    </div>
  )
}
