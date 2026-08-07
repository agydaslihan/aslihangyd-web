import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * DEMO veri denetimi — yayın öncesi kapı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN CI'DA DEĞİL, DAĞITIM ÖNCESİNDE.
 *
 * CI'ın üretim veritabanına erişimi yok ve olmamalı. "[DEMO] kayıt var mı"
 * sorusu ancak HEDEF veritabanına bağlanarak cevaplanabilir. Bu yüzden
 * betik dağıtım öncesinde, üretim `.env`'iyle çalıştırılır.
 *
 * CI tarafında karşılığı, seed betiğinin yalnızca `NODE_ENV=development`
 * ile çalıştığını doğrulayan birim testidir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Kullanım:
 *   pnpm payload run scripts/demo-denetimi.ts
 *
 * Çıkış kodu:
 *   0  temiz
 *   1  demo kayıt bulundu — yayına çıkılmamalı
 */

const ONEK = '[DEMO]'
const YUK_ONEKI = '[YUK]'

interface Kontrol {
  koleksiyon: 'ilanlar' | 'mahalleler' | 'sayfalar'
  alan: string
}

const KONTROLLER: readonly Kontrol[] = [
  { koleksiyon: 'ilanlar', alan: 'baslik' },
  { koleksiyon: 'mahalleler', alan: 'ad' },
  { koleksiyon: 'sayfalar', alan: 'baslik' },
]

const payload = await getPayload({ config })

let bulunan = 0

for (const { koleksiyon, alan } of KONTROLLER) {
  for (const onek of [ONEK, YUK_ONEKI]) {
    const sonuc = await payload.count({
      collection: koleksiyon,
      where: { [alan]: { like: onek } },
    })

    if (sonuc.totalDocs > 0) {
      bulunan += sonuc.totalDocs
      console.error(`✗ ${koleksiyon}: ${sonuc.totalDocs} kayıt "${onek}" öneki taşıyor`)
    }
  }
}

if (bulunan > 0) {
  console.error('')
  console.error(`✗ Toplam ${bulunan} demo/yük-testi kaydı bulundu. YAYINA ÇIKILMAMALI.`)
  console.error('')
  console.error('  Geliştirme veritabanında:  TEMIZLE=1 pnpm seed')
  console.error('')
  /**
   * ⚠️ Üretimde tohum betiği ÖNERİLMEZ.
   *
   * Önceki metin "NODE_ENV=development TEMIZLE=1 pnpm seed" diyordu.
   * O satır, tohumlamayı üretimde engellemek için konmuş korumayı
   * ELLE DEVRE DIŞI BIRAKMAYI öğretiyordu — üretim veritabanına karşı
   * çalıştırılırsa demo kayıtları silmekle kalmaz, yerine yenilerini
   * yazar. Bir denetim aracının önerdiği ilk çözüm, korumayı aşmak
   * olmamalı.
   */
  console.error('  Üretimde: kayıtları yönetim panelinden elle silin.')
  console.error('  (Tohum betiğini üretimde çalıştırmayın — demo veriyi yeniden yazar.)')
  process.exit(1)
}

console.log('✓ Demo veri bulunmadı — veritabanı yayına uygun.')
process.exit(0)
