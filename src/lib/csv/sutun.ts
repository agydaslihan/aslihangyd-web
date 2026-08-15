/**
 * CSV sütun eşleştirme — içe aktarma ekranlarının ortak çekirdeği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN ORTAK
 *
 * Gözlem ve rayiç bedel içe aktarmaları aynı sorunu çözüyor: Türkçe bir
 * elektronik tablonun başlıklarını bizim alan adlarımıza bağlamak. İki ayrı
 * yerde yazılsaydı, biri "Brüt m2 (net değil)" başlığını tanırken diğeri
 * tanımazdı ve fark hiçbir yerde görünmezdi.
 *
 * ⚠️ SABİT SÜTUN DÜZENİ DAYATILMIYOR. Sütunlar başlıklarından tahmin
 * edilir, tahmin kullanıcıya gösterilir ve elle düzeltilebilir. Eşlenemeyen
 * sütun sessizce atılmaz — "bu sütun kullanılmadı" diye bildirilir.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Türkçe duyarlı sadeleştirme — başlık ve değer eşleştirmesi için.
 *
 * ⚠️ Sıra önemli: önce Türkçe küçültme, sonra `ı → i`, sonra aksan
 * temizliği. `'I'.toLowerCase()` İngilizce kurala göre `i` verir ve
 * "IŞIK" gibi başlıklarda yanlış eşleşme üretir.
 */
export function sadelestir(metin: string): string {
  return metin
    .replace(/²/g, '2')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+]/g, '')
}

export interface SutunTanimi<TAnahtar extends string> {
  anahtar: TAnahtar
  etiket: string
  zorunlu: boolean
  ipucu: string
  esanlamlilar: readonly string[]
}

/** Sütun eşlemesi: alan → CSV sütun sırası (`null` = eşlenmedi). */
export type SutunEslemesiGenel<TAnahtar extends string> = Partial<Record<TAnahtar, number | null>>

/**
 * Başlıklardan sütun eşlemesi tahmini.
 *
 * Tahmin, kullanıcıya **öneri** olarak sunulur; onaylamadan içe aktarma
 * başlamaz. Bir sütun birden fazla alana uyarsa ilk alan kazanır ve diğeri
 * boş kalır — sessizce ikisine birden bağlamak, aynı veriyi iki yere
 * yazmak olurdu.
 */
export function sutunlariEslestirGenel<TAnahtar extends string>(
  basliklar: readonly string[],
  tanimlar: readonly SutunTanimi<TAnahtar>[],
): SutunEslemesiGenel<TAnahtar> {
  const sadeBasliklar = basliklar.map(sadelestir)
  const eslesme: SutunEslemesiGenel<TAnahtar> = {}
  const kullanilan = new Set<number>()

  for (const tanim of tanimlar) {
    const adaylar = [sadelestir(tanim.etiket), ...tanim.esanlamlilar.map(sadelestir)]

    // Önce tam eşleşme; "kat" başlığı "katalog"a bağlanmasın diye.
    let bulunan = sadeBasliklar.findIndex(
      (baslik, sira) => !kullanilan.has(sira) && baslik !== '' && adaylar.includes(baslik),
    )

    // Tam eşleşme yoksa içerme: "Brüt m2 (net değil)" → m2
    if (bulunan === -1) {
      bulunan = sadeBasliklar.findIndex(
        (baslik, sira) =>
          !kullanilan.has(sira) &&
          baslik !== '' &&
          adaylar.some((aday) => aday.length >= 3 && baslik.includes(aday)),
      )
    }

    if (bulunan !== -1) {
      eslesme[tanim.anahtar] = bulunan
      kullanilan.add(bulunan)
    } else {
      eslesme[tanim.anahtar] = null
    }
  }

  return eslesme
}

/** Eşlemede kullanılmayan sütunların sırası — kullanıcıya bildirilir. */
export function eslenmemisSutunlarGenel(
  basliklar: readonly string[],
  eslesme: Readonly<Record<string, number | null | undefined>>,
): { sira: number; baslik: string }[] {
  const kullanilan = new Set(
    Object.values(eslesme).filter((sira): sira is number => typeof sira === 'number'),
  )
  return basliklar
    .map((baslik, sira) => ({ sira, baslik }))
    .filter(({ sira, baslik }) => !kullanilan.has(sira) && baslik.trim() !== '')
}

/** Bir satırın hücresini güvenle okur. */
export function hucre(satir: readonly string[], sira: number | null | undefined): string {
  if (sira === null || sira === undefined) return ''
  return (satir[sira] ?? '').trim()
}

/**
 * Mahalle adını sistemdeki kayda bağlar.
 *
 * "Muhittin", "Muhittin Mah.", "MUHİTTİN MAHALLESİ" hepsi aynı kayda
 * gitmeli. Bulunamazsa **tahmin edilmez** — hatalı satır olarak işaretlenir.
 * Yanlış mahalleye yazılan bir kayıt, o mahallenin rakamlarını sessizce
 * bozar.
 */
export function mahalleyiCozGenel(
  ham: string,
  mahalleler: readonly { id: number; ad: string; slug: string }[],
): { id: number; ad: string; slug: string } | null {
  const sade = sadelestir(ham).replace(/mahallesi$|mahalle$|mah$/, '')
  if (sade === '') return null

  return (
    mahalleler.find((m) => sadelestir(m.ad).replace(/mahallesi$|mahalle$|mah$/, '') === sade) ??
    mahalleler.find((m) => sadelestir(m.slug) === sade) ??
    null
  )
}
