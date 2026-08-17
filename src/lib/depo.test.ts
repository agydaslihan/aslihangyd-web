import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Kaynak dosyalarının depoya gerçekten girdiğini sınar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU HATA GERÇEKTEN OLDU VE KAPI ONU GÖRMEDİ.
 *
 * `.gitignore` içindeki `medya/` deseni — Payload'ın yükleme dizini için
 * konmuştu — eğik çizgisiz olduğu için HER derinlikteki `medya` klasörünü
 * yutuyordu. `src/components/medya/` ve `src/lib/medya/` hiç commit
 * edilmedi.
 *
 * Yerelde `typecheck && lint && test && build` TERTEMİZ geçti: dosyalar
 * diskte duruyordu. CI depoyu o dosyalar olmadan çekince
 * `Cannot find module '@/components/medya/DroneVideo'` ile düştü.
 *
 * Yani kalite kapısının tamamı, var olmayan bir kod tabanını onaylamıştı.
 * Yerel disk ile deponun içeriği ayrıştığında hiçbir yerel kontrol bunu
 * göremez — o yüzden bu testin işi tam olarak o ikisini karşılaştırmak.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KOK = join(import.meta.dirname, '..', '..')

/** İzlenmesi beklenen kaynak ve yapılandırma dizinleri. */
const IZLENECEK = ['src', 'scripts', 'docker', 'docs', '.github']

/**
 * Bilinçli olarak depo dışında tutulanlar.
 *
 * ⚠️ Buraya eklenen her satır "bu dosya depoda OLMAYACAK" demektir ve
 * gerekçesi yazılı olmak zorunda. Gerekçesiz bir muafiyet, testin
 * yakalamak için var olduğu hatayı elle onaylamaktan başka bir şey değil.
 */
const BEKLENEN_DISARIDA: Record<string, string> = {
  'docker/certs/':
    'Eski Cloudflare origin sertifikası ve ÖZEL ANAHTARI. Kurgu kaldırıldı ' +
    "(Caddy artık Let's Encrypt kullanıyor), ama eski kurulumlarda dosya " +
    'diskte kalmış olabilir. Depoya girerse origin sunucunun kimliği taklit ' +
    'edilebilir hale gelir (CLAUDE.md kural 7).',

  'src/migrations/index.ts':
    'Payload ÜRETİYOR: her `migrate:create` dosyanın sonuna bir satır ekliyor ' +
    've göç içeren her ikinci PR çakışıyordu (docs/ILERLEME.md ile aynı ' +
    'hastalık). ⚠️ Bu muafiyet yukarıdaki kuralı gevşetmiyor, çünkü kuralın ' +
    'gerekçesi "çalışma anında gereken dosya sessizce eksik kalmasın" — bu ' +
    'dosya çalışma anında GEREKMİYOR: Payload göçleri `migrationDir` ' +
    'dizinini okuyarak buluyor. ⚠️ Varsayılmadı, ölçüldü: göçmen imajının ' +
    'içinde (`docker build --target gocmen`) dosya silinip ' +
    '`payload migrate:status` koşuldu, yirmi göçü de eksiksiz listeledi. ' +
    'Kimsenin onu içe aktarmadığını `src/lib/gocIndeksi.test.ts` denetliyor.',
}

describe('depo bütünlüğü', () => {
  /**
   * ⚠️ Testin kendisi git'e bağlı; git yoksa sessizce geçmemeli.
   * Sessiz geçen bir bütünlük kontrolü, olmayan bir kontroldür.
   */
  it('git deposu içinde koşuyor', () => {
    expect(existsSync(join(KOK, '.git'))).toBe(true)
  })

  it.each(IZLENECEK.filter((dizin) => existsSync(join(KOK, dizin))))(
    '%s içinde git tarafından yok sayılan dosya yok',
    (dizin) => {
      const cikti = execFileSync('git', ['status', '--ignored', '--short', '--', dizin], {
        cwd: KOK,
        encoding: 'utf8',
      })

      const yoksayilan = cikti
        .split('\n')
        .filter((satir) => satir.startsWith('!!'))
        .map((satir) => satir.slice(3).trim())
        .filter((yol) => !(yol in BEKLENEN_DISARIDA))

      expect(
        yoksayilan,
        `Bu yollar .gitignore tarafından yutuluyor ve depoya GİRMİYOR: ` +
          `${yoksayilan.join(', ')}. Yerelde her kontrol geçer, CI "Cannot find module" ile düşer.`,
      ).toEqual([])
    },
  )

  /**
   * ⚠️ Neden "henüz eklenmemiş (untracked) dosya" SINANMIYOR.
   *
   * Denendi ve kaldırıldı: her yeni dosya, `git add` edilene kadar testi
   * kırmış oluyordu. Dosya yazıp test koşturmak en sıradan iş akışı;
   * orada düşen bir kontrol yanlış alarmdır ve yanlış alarm veren bir
   * uyarı kısa sürede görmezden gelinir — bakım eşiğinde 26 saat
   * seçilmesinin gerekçesiyle aynı.
   *
   * Ayrıca gerek de yok: eklenmemiş dosya `git status` çıktısında zaten
   * görünür. Sinsi olan, yukarıdaki testin yakaladığı durum — `.gitignore`
   * tarafından yutulan dosya `git status`'ta da GÖRÜNMEZ.
   */
})
