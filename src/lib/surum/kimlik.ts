import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Yayında çalışan sürümün kimliği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: SUNUCU 35 COMMIT GERİDE KALDI VE KİMSE FARK ETMEDİ.
 *
 * 1 Eylül 2026'da canlıdaki uygulamanın 35 commit gerisinde olduğu ancak
 * elle bakılarak anlaşıldı. O ana kadar sitede yapılan bütün denemeler
 * eski sürüme bakıyordu: "düzeltildi" denen şeyler yayında yoktu,
 * "hâlâ bozuk" denenler ise aslında düzelmişti. Yani yalnızca bir
 * gecikme değil, YANLIŞ BİLGİ üretiyordu.
 *
 * ⚠️ ORTAM DEĞİŞKENİ DEĞİL, İMAJA GÖMÜLÜ DOSYA. İki sebep:
 *
 *  1. `compose.prod.yml` içindeki bir `KAYNAK_COMMIT: ${KAYNAK_COMMIT:-}`
 *     satırı, imaja gömülü değeri BOŞ dizeyle ezerdi. Sürümü söylemesi
 *     gereken alan sessizce boşalır ve uyarı hiç çıkmazdı.
 *  2. Bu bir yapılandırma değil, imajın kimliği. Çalışma zamanında
 *     değiştirilebilir olması, "hangi kod çalışıyor" sorusunun cevabını
 *     yalan söylenebilir hâle getirirdi.
 *
 * Dosyayı `docker/Dockerfile` derleme sırasında yazıyor; değeri
 * `.github/workflows/imaj.yml` derleme argümanı olarak geçiyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** İmaja gömülen sürüm dosyasının adı — Dockerfile ile aynı olmalı. */
export const SURUM_DOSYASI = 'surum.json'

export interface CalisanSurum {
  /** Tam commit SHA'sı. Bilinmiyorsa `null`. */
  commit: string | null
  /** İmajın derlendiği an (ISO). */
  derlemeAni: string | null
  /** `sahip/depo` — uzak karşılaştırma bunu kullanıyor. */
  depo: string | null
  /**
   * Bilgi nereden geldi.
   *
   * ⚠️ `depo` yalnızca GELİŞTİRMEDE olur: kapta `.git` yok. Ayrımı
   * göstermek şart — geliştiricinin kendi dalını "yayındaki sürüm"
   * sanmak, çözmeye çalıştığımız hatanın aynısı olurdu.
   */
  kaynak: 'imaj' | 'depo' | 'bilinmiyor'
}

const BOS: CalisanSurum = { commit: null, derlemeAni: null, depo: null, kaynak: 'bilinmiyor' }

function metinYaDaNull(deger: unknown): string | null {
  return typeof deger === 'string' && deger.trim() !== '' ? deger.trim() : null
}

/** İmaja gömülü sürüm dosyası. Yoksa `null`. */
function imajdanOku(kok: string): CalisanSurum | null {
  try {
    const ham = readFileSync(join(kok, SURUM_DOSYASI), 'utf-8')
    const veri = JSON.parse(ham) as Record<string, unknown>
    const commit = metinYaDaNull(veri.commit)
    if (commit === null) return null

    return {
      commit,
      derlemeAni: metinYaDaNull(veri.derlemeAni),
      depo: metinYaDaNull(veri.depo),
      kaynak: 'imaj',
    }
  } catch {
    return null
  }
}

/**
 * Geliştirmedeki geri düşüş: çalışma ağacının `.git/HEAD`'i.
 *
 * ⚠️ Bu YAYINDAKİ sürüm değil, geliştiricinin dalı. `kaynak: 'depo'`
 * olarak işaretleniyor ve arayüz bunu açıkça yazıyor.
 */
function depodanOku(kok: string): CalisanSurum | null {
  try {
    const head = readFileSync(join(kok, '.git', 'HEAD'), 'utf-8').trim()

    if (!head.startsWith('ref: ')) {
      return { commit: head, derlemeAni: null, depo: null, kaynak: 'depo' }
    }

    const ref = head.slice('ref: '.length).trim()
    const commit = readFileSync(join(kok, '.git', ref), 'utf-8').trim()
    return { commit, derlemeAni: null, depo: null, kaynak: 'depo' }
  } catch {
    return null
  }
}

/** Çalışan sürümün kimliği. Hiçbir kaynak okunamazsa `kaynak: 'bilinmiyor'`. */
export function calisanSurum(kok: string = process.cwd()): CalisanSurum {
  return imajdanOku(kok) ?? depodanOku(kok) ?? BOS
}

/**
 * Uygulamanın bu sürümle çalışmaya başladığı an.
 *
 * ⚠️ "Son dağıtım" için EN YAKIN dürüst ölçü bu, ama aynısı DEĞİL: kap
 * yeniden başlatıldığında (sunucu yeniden açıldı, kap çöktü) dağıtım
 * olmadan da sıfırlanır. Arayüz bu yüzden "dağıtıldı" değil, "bu
 * sürüm ... tarihinden beri çalışıyor" diyor. Yanlış etiketlenmiş bir
 * tarih, hiç tarih olmamasından kötüdür.
 */
export function baslangicAni(simdi: Date = new Date()): string {
  return new Date(simdi.getTime() - process.uptime() * 1000).toISOString()
}
