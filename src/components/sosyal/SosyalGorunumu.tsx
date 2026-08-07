import type { AdminViewServerProps } from 'payload'

import './sosyal.css'

import { SosyalKart } from './SosyalKart'

import { GORSEL_BICIMLERI, type PaylasimGirdisi } from '@/lib/sosyal/metin'
import { HERKESE_ACIK_DURUMLAR } from '@/lib/eids'
import { SITE_ADRESI } from '@/lib/site'

/**
 * Sosyal medya materyali ekranı (`/admin/sosyal-materyal`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OTOMATİK YAYIN YOK — ve eklenmeyecek.
 *
 * Bu ekran görsel ve metin TASLAĞI üretir. Hiçbir hesaba bağlanılmaz,
 * hiçbir gönderi zamanlanmaz. Aslıhan indirir, metni okur, düzeltir ve
 * kendi hesabından paylaşır.
 *
 * Gerekçe teknik değil: bir gayrimenkul danışmanının hesabından çıkan her
 * cümle onun sözüdür. Makinenin yazdığı bir cümlenin altına imza atmak,
 * yazdığını okumadan imza atmaktır. Üstelik ilan metni yasal sonuç
 * doğurur — EİDS kapsamındaki bir ilanı yanlış tarif etmek, düzeltilmesi
 * en pahalı hatalardandır.
 *
 * ⚠️ Yalnızca YAYINDAKİ ilanlar listelenir. Taslak bir ilanın görselini
 * üretip paylaşmak, yayında olmayan bir şeyi duyurmak olurdu — EİDS
 * açısından da yanlış.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default async function SosyalGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  /**
   * ⚠️ Oturum kapısı — CLAUDE.md gereği zorunlu.
   *
   * Payload oturumsuz ziyaretçiye giriş ekranını gösterir ama görünüm
   * gövdesi yine de ÇALIŞIR (sihirbaz görünümünde duman testiyle
   * doğrulandı). Kapı olmadan portföy verisi sunucu bileşeni yükünde
   * dışarı sızardı.
   */
  if (!req.user) return null

  const sonuc = await req.payload.find({
    collection: 'ilanlar',
    where: { durum: { in: [...HERKESE_ACIK_DURUMLAR] } },
    sort: '-updatedAt',
    depth: 1,
    limit: 60,
  })

  const ilanlar: (PaylasimGirdisi & { id: number })[] = sonuc.docs.map((ilan) => ({
    id: ilan.id,
    baslik: ilan.baslik,
    slug: ilan.slug ?? String(ilan.id),
    tip: ilan.tip,
    kategori: ilan.kategori,
    mahalleAdi:
      typeof ilan.mahalle === 'object' && ilan.mahalle !== null && 'ad' in ilan.mahalle
        ? String(ilan.mahalle.ad)
        : null,
    fiyat: ilan.fiyat ?? null,
    brutM2: ilan.brutM2 ?? null,
    odaSayisi: ilan.odaSayisi ?? null,
    ozet: ilan.ozet ?? null,
    tasinmazNo: ilan.tasinmazNo ?? null,
  }))

  return (
    <div className="sosyal">
      <h1 className="sosyal-baslik">Sosyal medya materyali</h1>

      <div className="sosyal-uyari">
        <p>
          <strong>Buradan hiçbir şey yayınlanmaz.</strong> Görselleri indirip metni kopyalarsınız;
          paylaşımı kendi hesabınızdan siz yaparsınız.
        </p>
        <p>
          Metin bir <em>taslaktır</em>. Yayınlamadan önce okuyun: hesabınızdan çıkan her cümle sizin
          sözünüz sayılır ve ilan metni yasal sonuç doğurur.
        </p>
      </div>

      {ilanlar.length === 0 ? (
        <p className="sosyal-bos">
          Yayında ilan yok. Materyal yalnızca yayındaki ilanlar için üretilir — yayında olmayan bir
          şeyi duyurmak EİDS açısından da yanlış olurdu.
        </p>
      ) : (
        <>
          <p className="sosyal-ozet">
            {ilanlar.length} yayındaki ilan · Her ilan için {Object.keys(GORSEL_BICIMLERI).length}{' '}
            görsel biçimi
          </p>

          <div className="sosyal-izgara">
            {ilanlar.map((ilan) => (
              <SosyalKart key={ilan.id} ilan={ilan} siteAdresi={SITE_ADRESI} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
