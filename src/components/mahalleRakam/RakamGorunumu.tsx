import type { AdminViewServerProps } from 'payload'

import '@/components/panel/aktarim.css'

import { yoneticiMi } from '@/lib/erisim'
import { CARPAN_ALT, CARPAN_UST, DEGISIM_SINIRI, GUVEN_ESIGI } from '@/lib/mahalle/guven'

import { RakamSihirbazi } from './RakamSihirbazi'

/**
 * Mahalle rakamları CSV içe aktarma ekranı (`/admin/mahalle-rakamlari`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EKRAN VERİ GİRMEZ, VERİ GİRMEYİ MÜMKÜN KILAR.
 *
 * 26 mahallenin m², kira, çarpan, değişim ve nüfus rakamlarını buraya
 * Aslıhan giriyor. Rakamları koda ya da seed'e yazmak CLAUDE.md kural 2'nin
 * ihlali olurdu; üstelik bu veri her ay değişiyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yalnızca yönetici: bu rakamlar yatırım skorunu ve sitedeki her
 * "ortalama m²" ifadesini besliyor.
 */
export default async function RakamGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Görünüm gövdesi oturumsuz da çalışır; kapı zorunlu (CLAUDE.md).
  if (!req.user) return null

  if (!yoneticiMi(req.user)) {
    return (
      <div className="aktarim">
        <h1 className="aktarim-baslik">Mahalle rakamları içe aktarma</h1>
        <p className="aktarim-not">
          Bu ekran yalnızca yöneticiye açık. Bu rakamlar yatırım skorunu ve mahalle sayfalarındaki
          her ortalamayı besliyor.
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
      <h1 className="aktarim-baslik">Mahalle rakamları içe aktarma</h1>

      <div className="aktarim-uyari">
        <p>
          <strong>Bu ekran yalnızca MEVCUT mahalleleri günceller.</strong> Yeni mahalle açmaz:
          eşleşmeyen bir ad, mahallenin olmadığını değil adın farklı yazıldığını gösteriyor olabilir
          (&quot;Şeyhsinan&quot; / &quot;Seyhsinan&quot;). İkinci bir kayıt açmak, ikinci bir
          mahalle sayfası ve bölünmüş bir portföy demek olurdu.
        </p>
        <p>
          <strong>Boş hücre silmez.</strong> Dosyada olmayan bir sütuna hiç dokunulmaz; yalnızca
          nüfusu güncellemek için hazırladığınız bir dosya m² ve kira rakamlarını silmez.
        </p>
      </div>

      <div className="aktarim-uyari">
        <p>
          <strong>Uyarılar engellemez, işaretler.</strong> Aşağıdaki durumlarda satır sarı görünür
          ve sebebi yazılır; isterseniz yine de aktarırsınız:
        </p>
        <ul>
          <li>
            Gözlem sayısı (n) <strong>{GUVEN_ESIGI}</strong>&apos;in altındaysa ya da hiç
            girilmemişse — rakamlar sitede <strong>&quot;tahmini&quot;</strong> olarak işaretlenir
            ve endekse girmez.
          </li>
          <li>
            Aylık kiranın m² satış fiyatına oranı beklenen aralığın dışındaysa — genellikle birim
            karışıklığı (kira aylık mı, satış m² başına mı?).
          </li>
          <li>12 aylık değişim ±%{DEGISIM_SINIRI} dışındaysa.</li>
          <li>
            Kira çarpanı {CARPAN_ALT}–{CARPAN_UST} yıl aralığının dışındaysa.
          </li>
        </ul>
        <p>
          Bir rakamı &quot;aykırı&quot; diye reddetmek, veriyi kendi beklentimize göre budamak
          olurdu. Sistem soruyu sorar, kararı siz verirsiniz.
        </p>
      </div>

      <p className="aktarim-not">
        Sistemde {mahalleler.totalDocs} mahalle kayıtlı. Dosyadaki adlar bunlarla eşleşmeli.
      </p>

      <RakamSihirbazi />
    </div>
  )
}
