import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import './osm.css'

import { yoneticiMi } from '@/lib/erisim'

import { OsmSihirbazi } from './OsmSihirbazi'

/**
 * OpenStreetMap POI içe aktarma ekranı (`/admin/osm-poi-ice-aktar`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LİSANS — ODbL, ATIF ZORUNLU
 *
 * OpenStreetMap verisi Open Database License altında; yeniden kullanım
 * serbest ama **atıf zorunlu**. Atıf iki yerde:
 *  · POI verisinin göründüğü her yerde "© OpenStreetMap katkıcıları"
 *  · `/veri-kaynaklari` sayfasında lisans açıklaması ve kategori eşlemesi
 *
 * Bu, CLAUDE.md kural 6'daki scraping yasağıyla çelişmez: yasak, ilan
 * platformlarının kullanım koşullarını ihlal eden otomatik veri çekmeye
 * ait. OSM açık veridir ve Overpass API bu iş için yapılmış resmî arayüz.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yalnızca yönetici: yüzlerce kayıt oluşturuyor ve dış servise sorgu
 * atıyor. Oturum kapısına ek olarak rol kapısı var.
 */
export default async function OsmGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Görünüm gövdesi oturumsuz da çalışır; kapı zorunlu (CLAUDE.md).
  if (!req.user) return null

  if (!yoneticiMi(req.user)) {
    return (
      <div className="osm">
        <h1 className="osm-baslik">POI içe aktarma</h1>
        <p className="osm-not">
          Bu ekran yalnızca yöneticiye açık. İçe aktarma yüzlerce kayıt oluşturuyor ve dış bir
          servise sorgu atıyor.
        </p>
      </div>
    )
  }

  const mahalleler = await req.payload.find({
    collection: 'mahalleler',
    limit: 500,
    depth: 0,
    user: req.user,
    overrideAccess: false,
  })

  const merkezliSayi = mahalleler.docs.filter(
    (m) => Array.isArray(m.merkez) && m.merkez.length >= 2,
  ).length

  return (
    <div className="osm">
      <h1 className="osm-baslik">POI içe aktarma — OpenStreetMap</h1>

      <div className="osm-uyari">
        <p>
          <strong>Lisans: ODbL — atıf zorunlu.</strong> İçe aktarılan noktalar sitede &quot;©
          OpenStreetMap katkıcıları&quot; ibaresiyle gösterilir ve lisans açıklaması{' '}
          <Link href="/veri-kaynaklari">/veri-kaynaklari</Link> sayfasında yayınlanır. Bu ibareyi
          kaldırmayın.
        </p>
        <p>
          <strong>Elle düzelttiğiniz kayıt bir daha ezilmez.</strong> OSM&apos;de eksik ve yanlış
          kayıt olur. Bir noktanın adını ya da konumunu düzelttiğinizde kayıt işaretlenir ve sonraki
          içe aktarmalar onu atlar.
        </p>
        <p>
          Arama alanı <strong>mahalle merkezlerinden</strong> hesaplanıyor — Çorlu&apos;nun
          koordinatlarını koda gömmedim. Yeni mahalle eklediğinizde alan kendiliğinden büyür.
        </p>
      </div>

      {merkezliSayi === 0 ? (
        <div className="osm-bos">
          <p>
            <strong>Önce mahalle merkezleri gerekiyor.</strong> Arama alanı onlardan hesaplanıyor;
            merkez yoksa nereyi sorgulayacağımızı bilemeyiz.
          </p>
          <p>
            Mahalleler → ilgili mahalle → Konum sekmesi → &quot;Mahalle merkezi&quot;. En az bir
            mahalle yeterli; ne kadar çoğu girilirse alan o kadar isabetli olur.
          </p>
        </div>
      ) : (
        <OsmSihirbazi merkezliMahalleSayisi={merkezliSayi} />
      )}
    </div>
  )
}
