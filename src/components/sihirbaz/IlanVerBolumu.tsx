import type { ServerProps } from 'payload'

import './sihirbaz.css'

import { IlanVerDugmesi } from './IlanVerDugmesi'

/**
 * Panel ana ekranındaki "İlan ver" bölümü.
 *
 * ⚠️ MAHALLE LİSTESİ BURADA ÇEKİLİYOR, MODAL AÇILDIĞINDA DEĞİL. Modal
 * içinde sunucu verisi çekmek, düğmeye basan kişiyi boş bir listeyle
 * karşılardı; liste zaten küçük (yalnızca ad ve kimlik).
 *
 * ⚠️ Oturumsuz çağrıda hiçbir sorgu çalışmıyor — panel görünümlerindeki
 * kuralın aynısı.
 */
export default async function IlanVerBolumu({ payload, user }: ServerProps) {
  if (!user || payload === undefined) return null

  const mahalleler = await payload.find({
    collection: 'mahalleler',
    limit: 200,
    sort: ['siraNo', 'ad'],
    depth: 0,
    // Sınır verisi GeoJSON; tamamını istemciye göndermek yüzlerce kB.
    select: { ad: true },
    overrideAccess: false,
    user,
  })

  return (
    <div className="sihirbaz-hizli-giris">
      <div>
        <h2>Yeni taşınmaz</h2>
        <p>
          Sayfadan çıkmadan, adım adım girin. Mahalle dışında hiçbir alan zorunlu değil; sihirbaz 30
          saniyede bir kendiliğinden kaydeder.
        </p>
      </div>

      <IlanVerDugmesi
        mahalleler={mahalleler.docs.map((mahalle) => ({
          id: String(mahalle.id),
          ad: mahalle.ad,
        }))}
        adminTemelAdresi={payload.config.routes.admin}
      />
    </div>
  )
}
