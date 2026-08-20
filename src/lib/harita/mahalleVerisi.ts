import type { MahalleVerisi } from '@/components/harita/HaritaSahnesi'
import type { Mahalleler } from '@/payload-types'

import { geometriCoz, noktaCoz } from './geometri'
import { kabaMerkez } from './sutunlar'

/**
 * Mahalle kaydını harita verisine çevirir — TEK KAYNAK.
 *
 * ⚠️ Eskiden bu eşleme `/harita` sayfasının içinde duruyordu. Ana sayfaya
 * ikinci bir harita bölümü gelince kopyalanacaktı; kopyalanan bir eşleme,
 * alan adı değiştiğinde bir tarafta sessizce `null` üretir ve o mahalle
 * haritadan düşer — hata vermeden.
 *
 * ⚠️ MERKEZİ BİLİNMEYEN MAHALLE İÇİN SÜTUN ÇİZİLMEZ ama mahalle listeden
 * düşmez. Tahmini koordinat uydurmak (kural 2) yanlış yerde duran bir sütun
 * demek; mahalleyi yok saymak ise panelin ve rakamların kaybolması.
 */
export function mahalleyiHaritaVerisineCevir(mahalle: Mahalleler): MahalleVerisi {
  const sayisal = (deger: unknown): number | null =>
    typeof deger === 'number' && Number.isFinite(deger) ? deger : null

  const sinir = geometriCoz(mahalle.sinir)

  return {
    slug: mahalle.slug,
    ad: mahalle.ad,
    merkez: noktaCoz(mahalle.merkez) ?? kabaMerkez(sinir),
    sinir,
    satisM2: sayisal(mahalle.ortalamaM2Satis),
    kira: sayisal(mahalle.ortalamaKira),
    kiraCarpani: sayisal(mahalle.kiraCarpani),
    yatirimSkoru: sayisal(mahalle.yatirimSkoru?.toplam),
    degisim12Ay: sayisal(mahalle.degisim12Ay),
    gozlemSayisi: sayisal(mahalle.gozlemSayisi),
    verilerinTarihi: mahalle.verilerinTarihi ?? null,
  }
}
