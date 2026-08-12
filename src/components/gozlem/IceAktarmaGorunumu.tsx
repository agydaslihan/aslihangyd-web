import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import './iceAktarma.css'

import { IceAktarmaSihirbazi } from './IceAktarmaSihirbazi'

/**
 * Gözlem CSV içe aktarma ekranı (`/admin/gozlem-ice-aktar`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN VAR
 *
 * ENDEKS-VERI-YONETIMI.md §6: "Site 3-4 ay sonra hazır olacak. Ama veri
 * toplamayı bugün başlatabilirsiniz... Site hazır olduğunda bu tablo CSV
 * olarak içe aktarılır."
 *
 * Elle biriktirilmiş aylarca veriyi tek tek Hızlı Gözlem ekranına girmek,
 * kayıt başına 15 saniyeden 500 kayıt için iki saatten fazla eder — ve
 * pratikte hiç yapılmaz. Endeksi 9. ay yerine 6. ayda yayınlamanın yolu
 * bu ekrandan geçiyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Bu ekran veri YAZAR (diğer özel görünümlerin aksine). Bu yüzden
 * oturum kapısı burada daha da kritik; ayrıca yazma yolu Local API +
 * `overrideAccess: false` üzerinden gider, koleksiyon kuralları ve
 * kancalar aynen çalışır.
 */
export default async function IceAktarmaGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Payload oturumsuz ziyaretçiye giriş ekranını gösterir ama görünüm
  // gövdesi yine de çalışır. Veri yazan bir ekranda bu kapı zorunlu.
  if (!req.user) return null

  const mahalleler = await req.payload.count({ collection: 'mahalleler' })
  const adminYolu = req.payload.config.routes.admin ?? '/admin'

  return (
    <div className="ice-aktar-sayfa">
      <h1 className="ice-aktar-baslik">Gözlem içe aktarma (CSV)</h1>

      <div className="ice-aktar-uyari">
        <p>
          <strong>Hiçbir satır sessizce düzeltilmez ve sessizce atlanmaz.</strong> Her satır ya
          aktarılır, ya uyarıyla aktarılır, ya da sebebi yazılarak dışarıda bırakılır. Endeksin
          değeri, içindeki her rakamın arkasında durabilmekten geliyor.
        </p>
        <p>
          Sütun düzeniniz sabit olmak zorunda değil — başlıklardan tahmin edilir, tahmini önizlemede
          düzeltirsiniz.
        </p>
        <p>
          ⚠️ Aktarım <strong>geri alınamaz değil</strong> ama zahmetlidir: yanlış aktarılan kayıtlar{' '}
          <Link href={`${adminYolu}/collections/gozlemler`}>Gözlemler koleksiyonundan</Link> tek tek
          silinir. Önizlemeye bakmadan aktarmayın.
        </p>
      </div>

      <IceAktarmaSihirbazi mahalleSayisi={mahalleler.totalDocs} />

      <p className="ice-aktar-alt">
        Tek tek giriş için{' '}
        <Link href={`${adminYolu}/collections/gozlemler/create`}>Hızlı Gözlem</Link> ekranı daha
        uygundur; bu ekran biriktirilmiş tabloları aktarmak içindir. Yöntem:{' '}
        <Link href="/endeks-metodolojisi">/endeks-metodolojisi</Link>
      </p>
    </div>
  )
}
