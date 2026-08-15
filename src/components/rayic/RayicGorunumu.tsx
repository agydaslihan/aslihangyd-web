import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import '@/components/panel/aktarim.css'

import { yoneticiMi } from '@/lib/erisim'

import { RayicSihirbazi } from './RayicSihirbazi'

/**
 * Rayiç bedel CSV içe aktarma ekranı (`/admin/rayic-ice-aktar`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ RAYİÇ BEDEL PİYASA FİYATI DEĞİLDİR
 *
 * Emlak vergisine esas ASGARİ değerdir ve piyasanın çoğu yerde altındadır.
 * Bu ayrım ekranda açıkça yazıyor çünkü karıştırılması sitedeki en
 * yanıltıcı rakamı üretirdi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yalnızca yönetici: bu veri alım maliyeti hesaplayıcısını besliyor;
 * yanlış rakam ziyaretçiye yanlış vergi hesabı gösterir.
 */
export default async function RayicGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Görünüm gövdesi oturumsuz da çalışır; kapı zorunlu (CLAUDE.md).
  if (!req.user) return null

  if (!yoneticiMi(req.user)) {
    return (
      <div className="aktarim">
        <h1 className="aktarim-baslik">Rayiç bedel içe aktarma</h1>
        <p className="aktarim-not">
          Bu ekran yalnızca yöneticiye açık. Rayiç bedeller alım maliyeti hesaplayıcısını besliyor.
        </p>
      </div>
    )
  }

  const mahalleler = await req.payload.count({
    collection: 'mahalleler',
    user: req.user,
    overrideAccess: false,
  })

  return (
    <div className="aktarim">
      <h1 className="aktarim-baslik">Rayiç bedel içe aktarma</h1>

      <div className="aktarim-uyari">
        <p>
          <strong>Rayiç bedel piyasa fiyatı değildir.</strong> Belediyenin takdir komisyonunca
          belirlenen, emlak vergisi ve tapu harcı için <em>asgari</em> değerdir ve piyasanın çoğu
          yerde altındadır. Sitede gösterildiği her yerde kaynağı ve yılı birlikte yayınlanıyor.
        </p>
        <p>
          <strong>Kaynağı ve yılı boş bırakmayın.</strong> Yılsız bir rayiç bedel anlamsızdır: her
          yıl yeniden değerleme oranıyla artar. Kaynağı &quot;elle&quot; seçtiyseniz nereden
          aldığınızı nota yazın.
        </p>
        <p>
          <strong>Aynı mahalle, sokak ve yıl varsa üzerine yazılır.</strong> Belediye tabloları
          düzeltmeyle yeniden yayınlanıyor; her aktarmada yeni kayıt açsaydık hangisinin geçerli
          olduğu belirsizleşirdi.
        </p>
      </div>

      {mahalleler.totalDocs === 0 ? (
        <div className="aktarim-bos">
          <p>
            <strong>Önce mahalle kayıtları gerekiyor.</strong> Rayiç bedel bir mahalleye bağlanır;
            mahalle yoksa hiçbir satır eşleşmez.
          </p>
          <p>
            Panelden <Link href="mahalle-verisi">Mahalle verisi kurulumu</Link> ekranını çalıştırıp
            Çorlu mahallelerini tek tıkla açabilirsiniz.
          </p>
        </div>
      ) : (
        <RayicSihirbazi />
      )}
    </div>
  )
}
