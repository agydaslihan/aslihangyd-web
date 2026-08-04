import type { AdminViewServerProps } from 'payload'

import { PortfoySihirbazi } from './PortfoySihirbazi'
import './sihirbaz.css'

/**
 * Payload admin'i içindeki sihirbaz görünümü (`/admin/portfoy-sihirbazi`).
 *
 * Sunucu bileşeni: mahalle listesini Payload'ın kendi `req.payload`
 * örneğiyle çekip istemci sihirbazına geçirir. Ayrı bir sayfa yerine
 * **admin görünümü** seçilmesinin sebepleri:
 *
 *  - Oturum yönetimi Payload'ın: ayrı bir kimlik doğrulama yolu açılmıyor.
 *  - Kullanıcı admin'den çıkmıyor; sihirbaz yan menüde bir bağlantı.
 *  - Tema, dil ve düzen admin'den miras alınıyor.
 *
 * ⚠️ Görünüm herkese açık değil. Payload, `admin.user` koleksiyonunda
 * oturumu olmayan isteği giriş ekranına yönlendirir. Yine de sunucu eylemi
 * (`ilanTaslagiOlustur`) kendi başına da oturum doğrular — görünüm
 * korumasının atlanabileceği bir yol kalmasın diye.
 */
export default async function SihirbazGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const adminYolu = req.payload.config.routes.admin

  /**
   * ⚠️ Oturum kapısı — bilinçli ve gerekli.
   *
   * Payload, oturumu olmayan ziyaretçiye giriş ekranını gösterir; ama
   * görünüm bileşeninin gövdesi yine de ÇALIŞIR. Bu kontrol olmadan
   * aşağıdaki sorgu oturumsuz istekte de koşuyor ve mahalle listesi
   * sunucu bileşeni yükünde dışarı sızıyordu (duman testiyle doğrulandı).
   *
   * Şu an sızan veri (mahalle adları) zaten büyük ölçüde herkese açık
   * olsa da, buna güvenmek yanlış olurdu: görünüme ileride portföy veya
   * müşteri verisi eklendiğinde aynı sızıntı sessizce ciddileşirdi.
   */
  if (!req.user) return null

  const mahalleler = await req.payload.find({
    collection: 'mahalleler',
    limit: 200,
    sort: ['siraNo', 'ad'],
    depth: 0,
    // Yalnızca ihtiyaç duyulan alan çekiliyor; mahalle kayıtları GeoJSON
    // sınır verisi taşıyor ve tamamını istemciye göndermek gereksiz
    // yüzlerce kilobayt demek.
    select: { ad: true },
    // ⚠️ Local API'de `overrideAccess` varsayılanı `true`'dur; yani erişim
    // kuralları ATLANIR. Açıkça `false` yazılmazsa yayında olmayan mahalleler
    // de listeye girer. Kullanıcı zaten panel kullanıcısı, ama kuralı
    // varsayılan davranışa bırakmak yerine açıkça uygulamak doğru.
    overrideAccess: false,
    user: req.user,
    req,
  })

  return (
    <div className="gutter--left gutter--right">
      <header className="sihirbaz-basliklar">
        <h1>Portföy giriş sihirbazı</h1>
        <p className="sihirbaz-aciklama">
          Yeni bir taşınmazı adım adım sisteme girin. Sihirbaz ilanı <strong>taslak olarak</strong>{' '}
          kaydeder; fotoğraf, uzun açıklama ve yayına alma işlemi ilan sayfasında yapılır.
        </p>
      </header>

      <PortfoySihirbazi
        adminTemelAdresi={adminYolu}
        mahalleler={mahalleler.docs.map((mahalle) => ({
          id: String(mahalle.id),
          ad: mahalle.ad,
        }))}
      />
    </div>
  )
}
