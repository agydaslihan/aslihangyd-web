import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import '@/components/panel/aktarim.css'

import { yoneticiMi } from '@/lib/erisim'
import { CORLU_MAHALLELERI } from '@/lib/mahalle/corluMahalleleri'

import { MahalleVerisiSihirbazi } from './MahalleVerisiSihirbazi'

/**
 * Mahalle verisi kurulum ekranı (`/admin/mahalle-verisi`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN İKİ İŞ TEK EKRANDA
 *
 * Mahalle listesini açmak ve sınırları çekmek ayrı ekranlar olabilirdi ama
 * sıraları zorunlu: sınır, adı sistemde olan bir mahalleye yazılır. Ayrı
 * ekranlar olsaydı bu sıra yalnızca dokümantasyonda yazardı ve ikinci
 * ekran "hiçbir mahalle eşleşmedi" diye sebebi görünmeyen bir sonuç
 * verirdi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Yalnızca yönetici: yirmiden fazla kayıt açıyor ve mahalle
 * sınırlarını topluca değiştiriyor.
 */
export default async function MahalleVerisiGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Görünüm gövdesi oturumsuz da çalışır; kapı zorunlu (CLAUDE.md).
  if (!req.user) return null

  if (!yoneticiMi(req.user)) {
    return (
      <div className="aktarim">
        <h1 className="aktarim-baslik">Mahalle verisi kurulumu</h1>
        <p className="aktarim-not">
          Bu ekran yalnızca yöneticiye açık. Toplu kayıt açıyor ve mahalle sınırlarını topluca
          değiştiriyor.
        </p>
      </div>
    )
  }

  const merkezSayisi = CORLU_MAHALLELERI.filter((m) => m.tur === 'merkez').length
  const kirsalSayisi = CORLU_MAHALLELERI.length - merkezSayisi

  return (
    <div className="aktarim">
      <h1 className="aktarim-baslik">Mahalle verisi kurulumu</h1>

      <div className="aktarim-uyari">
        <p>
          <strong>Bu ekran rakam yazmaz.</strong> Mahalle adını ve merkez/kırsal işaretini açar,
          sınırını OpenStreetMap&apos;ten getirir. Nüfus, m² fiyatı, kira ve yatırım skoru boş kalır
          — onlar veridir ve sizden gelir.
        </p>
        <p>
          <strong>Lisans: ODbL — atıf zorunlu.</strong> İçe aktarılan sınırlar sitede &quot;©
          OpenStreetMap katkıcıları&quot; ibaresiyle gösterilir ve lisans açıklaması{' '}
          <Link href="/veri-kaynaklari">/veri-kaynaklari</Link> sayfasında yayınlanır. Bu ibareyi
          kaldırmayın.
        </p>
        <p>
          <strong>Elle çizdiğiniz ya da düzelttiğiniz sınır bir daha ezilmez.</strong> OSM&apos;de
          mahalle sınırları eksik ya da kaba olabilir; düzelttiğinizde kayıt işaretlenir ve sonraki
          içe aktarmalar onu atlar.
        </p>
        <p>
          <strong>Velimeşe listede yok</strong> — Ergene ilçesine bağlı, Çorlu&apos;ya değil. Erken
          taslaklarda yanlışlıkla sayılmıştı.
        </p>
      </div>

      <MahalleVerisiSihirbazi merkezSayisi={merkezSayisi} kirsalSayisi={kirsalSayisi} />
    </div>
  )
}
