import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

import {
  BOT_PENCERESI_GUN,
  botlariTopla,
  kapsamiHesapla,
  robotsDurumunuCoz,
  gunEkle,
  satirlariCoz,
  type BotRaporu,
} from './botToplama'
import { gunAnahtari } from './tampon'

/**
 * Bot ve arama motoru raporu — VERİTABANI VE ÜRETİCİ OKUMALARI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `rapor.ts` İÇİNDE DEĞİL — AYRILIK BİR TASARIM KARARI.
 *
 * Şartnamenin açık şartı: "insan trafiğinden ayrı tutulsun". Bot sayılarını
 * `Rapor` nesnesinin içine koymak, iki paydanın aynı yapıda yan yana
 * durması demekti — ve bir gün biri "toplamı" alırken ikisini topluyordu.
 * Ayrı modül, ayrı nesne, ayrı ekran bölümü: karışma kod seviyesinde
 * zorlaşıyor.
 *
 * ⚠️ PENCERE 7 GÜN DEĞİL 180 GÜN — ve sebebi "hiç taranmamış sayfa"
 * sorusu. Bu ölçekte bir siteyi Googlebot her sayfa için haftada bir
 * gezmez; yedi günlük bir pencerede sağlıklı sayfaların yarısı
 * "taranmamış" görünürdü ve liste işe yaramaz hâle gelirdi. Pencere,
 * saklama sınırıyla (`BOT_SAKLAMA_GUN`) aynı: daha uzunu, zaten
 * temizlenmiş satırları istemek olurdu.
 *
 * ⚠️ BU DOSYA KİŞİSEL VERİ OKUMUYOR. Okunan sütunlar bot sayaçları; bot
 * kişi değil. KVKK'nın 90 gün taahhüdü bu veriye uygulanmıyor, disk için
 * konan 180 gün uygulanıyor.
 *
 * ⚠️ Aritmetik burada DEĞİL, `botToplama.ts` içinde — gerekçesi orada.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type { BotRaporu, BotTurSatiri, SeoDurumu, TaramaSatiri } from './botToplama'
export { BOT_PENCERESI_GUN } from './botToplama'

export async function botRaporuGetir(gunSayisi = BOT_PENCERESI_GUN): Promise<BotRaporu> {
  const payload = await getPayload({ config })

  const sonGun = gunAnahtari()
  const ilkGun = gunEkle(sonGun, -(gunSayisi - 1))

  const sonuc = await payload.find({
    collection: 'gozlem-gunluk',
    where: { and: [{ gun: { greater_than_equal: ilkGun } }, { gun: { less_than_equal: sonGun } }] },
    limit: gunSayisi + 1,
    sort: 'gun',
    depth: 0,
    overrideAccess: true,
  })

  const satirlar = satirlariCoz(sonuc.docs)
  const toplam = botlariTopla(satirlar)

  /**
   * ⚠️ SİTE HARİTASI VE ROBOTS.TXT ÜRETİCİSİNDEN OKUNUYOR, ELLE
   * LİSTELENMİYOR.
   *
   * İkinci bir liste yazmak, haritaya yeni bir sayfa eklendiğinde panelin
   * onu görmemesi demekti — ve panel "her şey tarandı" derken gerçekte
   * taranmamış bir sayfa olurdu. Tek kaynak `app/sitemap.ts`.
   */
  let haritaRotalari: string[] = []
  let sonGuncelleme: string | null = null
  let haritaHatasi: string | null = null

  try {
    const girisler = await sitemap()
    haritaRotalari = girisler.map((giris) => new URL(giris.url).pathname)
    const zamanlar = girisler
      .map((giris) => giris.lastModified)
      .filter((deger): deger is string | Date => deger !== undefined)
      .map((deger) => (deger instanceof Date ? deger.getTime() : new Date(deger).getTime()))
      .filter((deger) => Number.isFinite(deger))
    sonGuncelleme = zamanlar.length === 0 ? null : new Date(Math.max(...zamanlar)).toISOString()
  } catch (hata) {
    // ⚠️ "Bakamadık" ile "veri yok" aynı şey değil; panel ikisini ayırıyor.
    haritaHatasi = hata instanceof Error ? hata.message : 'Site haritası üretilemedi.'
  }

  const robotsDurumu = robotsDurumunuCoz(robots() as Parameters<typeof robotsDurumunuCoz>[0])

  const kapsam = kapsamiHesapla(
    haritaRotalari,
    toplam.sayfalar.map((satir) => satir.rota),
    robotsDurumu.engellenenYollar,
  )

  return {
    gunSayisi,
    ilkGun,
    sonGun,
    toplamIstek: toplam.toplamIstek,
    turler: toplam.turler,
    sayfalar: toplam.sayfalar,
    dort04: toplam.dort04,
    besxx: toplam.besxx,
    /**
     * ⚠️ TÜRETME, SAYAÇ DEĞİL. Vekil katmanı yanıt kodunu görmüyor; 200
     * sayısı toplamdan çıkarılıyor ve 301/304 gibi ara durumlar bu tarafta
     * kalıyor. Negatife düşmesi mümkün değil ama yine de kırpılıyor:
     * 404 sayfası dinamik, vekil sayacı tamponda — iki kaynağın bir
     * boşaltma sınırında ayrışması teorik olarak mümkün.
     */
    turetilen200: Math.max(0, toplam.toplamIstek - toplam.dort04 - toplam.besxx),
    ...kapsam,
    seo: {
      sayfaSayisi: haritaRotalari.length,
      sonGuncelleme,
      hata: haritaHatasi,
      ...robotsDurumu,
    },
    ayrimsizGun: toplam.ayrimsizGun,
    bos: toplam.toplamIstek === 0,
  }
}
