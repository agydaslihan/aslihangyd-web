import { YETKI_UYARI_ESIGI_GUN } from '@/lib/eids'

/**
 * Bakım görevlerinin künyesi — SAF modül.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN `gorevler.ts`TEN AYRI.
 *
 * `gorevler.ts` `import 'server-only'` taşıyor: içinde veritabanına yazan,
 * kişisel veri silen kod var ve o kodun istemci paketine sızması kabul
 * edilemez. Ama görevlerin ADI, SIKLIĞI ve yasal olup olmadığı bilgisi
 * sunucuya özel değil — Payload yapılandırması, panel bileşeni ve belgeler
 * de aynı listeyi okumak istiyor.
 *
 * Payload yapılandırması `server-only` bayrağını çözemeyen bir ortamda
 * (tsx ile `payload generate:types`) yüklenir ve modül hata fırlatır.
 * Künyeyi ayırmak bu çakışmayı çözer; alternatif, listeyi ikinci kez elle
 * yazmaktı — iki listenin er geç ayrışacağı kesin.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Görev anahtarları.
 *
 * ⚠️ Görevlerin AYRI AYRI çağrılabilmesi bir kolaylık değil, arıza
 * yalıtımı. Üçü tek çağrıda koşsaydı ve KVKK silme görevi bozulsaydı, uç
 * her gece 500 dönerdi; işletmecinin en olası tepkisi cron satırını
 * susturmak olurdu ve EİDS kontrolü de onunla birlikte susardı.
 */
export type GorevAnahtari =
  'eids-kaldir' | 'eids-uyar' | 'kvkk-sil' | 'olcum-ayrinti-sil' | 'alan-sagligi'

export interface GorevKunyesi {
  anahtar: GorevAnahtari
  ad: string
  /** Cron'da önerilen sıklık — belgeye ve panele aynı yerden yansır. */
  siklik: string
  /**
   * ⚠️ Bu görev çalışmazsa NE OLUR. Belgeye kopyalanan değil, kaynağı
   * burada olan cümle: görevi değiştiren kişi sonucunu da güncellemek
   * zorunda kalsın.
   */
  calismazsaSonuc: string
  /** Yasal yükümlülük mü? Öyleyse aksaması ertelenemez. */
  yasal: boolean
}

export const GOREV_KUNYELERI: readonly GorevKunyesi[] = [
  {
    /**
     * ⚠️ LİSTENİN BAŞINDA — ve bu sıra bilinçli.
     *
     * Alan adı düşerse site kimseye açılmaz; o durumda EİDS uyarısını
     * okuyacak bir panel de yoktur. Erişilebilirlik, yasal uyarıların
     * önünde gelir çünkü diğer her şeyin ön koşuludur.
     */
    anahtar: 'alan-sagligi',
    ad: 'Alan adı sağlığı — durum, bitiş tarihi ve dış DNS',
    siklik: 'Her gün 05:10 (Europe/Istanbul)',
    calismazsaSonuc:
      'Alan adı bir kayıt kuruluşu işlemi yüzünden DNS’ten düşerse (clientHold, ' +
      'serverHold, süre dolması) site HERKESE erişilemez olur ve bunu hiçbir sunucu ' +
      'izlemesi göremez — sunucu sağlıklıdır, istek hiç gelmez. 18 Ağustos 2026’da tam ' +
      'olarak bu yaşandı ve site saatlerce kapalı kaldı. Bu görev, dışarıdan bakan tek ' +
      'kontroldür. ⚠️ Yasal ihlal doğurmaz ama sitenin var olmaması, yasal uyarıyı ' +
      'okuyacak yerin de olmaması demektir.',
    yasal: false,
  },
  {
    anahtar: 'eids-kaldir',
    ad: 'EİDS — yetkisi dolan ilanları yayından kaldır',
    siklik: 'Her gün 03:10 (Europe/Istanbul)',
    calismazsaSonuc:
      'Yetki belgesi süresi dolmuş ilan yayında kalır. Bu, Taşınmaz Ticareti ' +
      'Hakkında Yönetmelik kapsamında yetkisiz ilan yayını sayılır; idari yaptırım ' +
      've ilan kaldırma riski doğar. Kancalar yalnızca KAYDETME anında çalıştığı ' +
      'için hiç kimse ilana dokunmazsa yetki sessizce dolar — bu görev o boşluğu ' +
      'kapatan tek mekanizmadır.',
    yasal: true,
  },
  {
    anahtar: 'eids-uyar',
    ad: `EİDS — ${YETKI_UYARI_ESIGI_GUN} gün içinde yetkisi bitecekler`,
    siklik: 'Her gün 08:10 (Europe/Istanbul)',
    calismazsaSonuc:
      'Yaklaşan yetki bitişleri fark edilmez. Yasal ihlal doğurmaz — çünkü ' +
      '"eids-kaldir" ilanı zaten yayından alır — ama portföy sessizce görünmez ' +
      'olur ve yetki yenileme fırsatı kaçar. Etkisi ticari, yasal değil.',
    yasal: false,
  },
  {
    anahtar: 'kvkk-sil',
    ad: 'KVKK — saklama süresi dolan kayıtları sil',
    siklik: 'Her gün 03:40 (Europe/Istanbul)',
    calismazsaSonuc:
      'Saklama süresi dolmuş kişisel veri (talepler ve danışman başvuruları) ' +
      'silinmeden kalır. KVKK md. 7 ve md. 12 kapsamında ihlal; veri sahibinin ' +
      'başvurusu ya da denetim halinde yaptırım riski. Gecikme her gün büyür, ' +
      'kendiliğinden düzelmez.',
    yasal: true,
  },
  {
    anahtar: 'olcum-ayrinti-sil',
    ad: 'Ölçüm — 90 günden eski olay ayrıntılarını temizle',
    siklik: 'Her gün 04:10 (Europe/Istanbul)',
    calismazsaSonuc:
      'Gözlem kayıtlarının en ayrıntılı katmanı (hangi filtre, hangi alan, hangi ' +
      'fiyat bandı) 90 günden uzun saklanır. ⚠️ Bu kayıtlar KİŞİSEL VERİ DEĞİL — ' +
      'gün bazında toplulaştırılmış sayaçlar ve tek bir ziyaretçiyi işaret edemezler; ' +
      'dolayısıyla aksaması KVKK ihlali doğurmaz. Yine de aydınlatma metninde 90 gün ' +
      'taahhüt edildiği için verilen sözün tutulmaması demek. Toplulaştırılmış ' +
      'sayaçlar (sayfa, kaynak, cihaz) kalıcıdır ve bu görev onlara dokunmaz.',
    yasal: false,
  },
]

export function gorevKunyesi(anahtar: GorevAnahtari): GorevKunyesi {
  const kunye = GOREV_KUNYELERI.find((aday) => aday.anahtar === anahtar)
  if (kunye === undefined) throw new Error(`Bilinmeyen bakım görevi: ${anahtar}`)
  return kunye
}

export function gecerliGorevMi(deger: string): deger is GorevAnahtari {
  return GOREV_KUNYELERI.some((gorev) => gorev.anahtar === deger)
}
