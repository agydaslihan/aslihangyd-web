/**
 * Rayiç bedel — emlak vergisine esas asgari değer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ RAYİÇ BEDEL PİYASA FİYATI DEĞİLDİR
 *
 * Belediyelerin takdir komisyonlarınca dört yılda bir belirlenen, emlak
 * vergisi ve tapu harcı için ASGARİ matrahtır. Piyasa fiyatının çoğu yerde
 * belirgin biçimde altındadır ve bu bir hata değil, tanımı gereğidir.
 *
 * Bu ayrımı gizlemek, sitedeki en yanıltıcı rakam olurdu: ziyaretçi "bu
 * mahallede m² 12 bin lira" diye okuyup piyasada 40 bin lirayla karşılaşır.
 * Bu yüzden rayiç bedel gösterilen HER YERDE kaynağı ve yılı yazılıyor ve
 * "vergiye esas asgari değer" ibaresi kaldırılmıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN DEĞERLİ: BU VERİ KAMUYA AÇIK VE RESMÎ
 *
 * Rakip siteler istenen ilan fiyatını gösterir; biz onun altında duran
 * resmî tabanı da gösterebiliyoruz. İki sonucu var:
 *
 *  · Alım maliyeti hesabı doğrulanır — tapu harcı rayiç bedelin ALTINA
 *    düşemez, dolayısıyla düşük beyanla harç kaçırma hesabı tutmaz.
 *  · Rayiç/piyasa oranı türetilebilir: "bu mahallede piyasa fiyatı rayiç
 *    bedelin ~3,2 katı". Türkiye'de bunu kimse yayınlamıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const RAYIC_KAYNAKLARI = [
  { value: 'belediye', label: 'Belediye (takdir komisyonu)' },
  { value: 'tkgm', label: 'TKGM / tapu kaydı' },
  { value: 'elle', label: 'Elle girildi (kaynak notta)' },
] as const

export type RayicKaynagi = (typeof RAYIC_KAYNAKLARI)[number]['value']

export function rayicKaynagiEtiketi(deger: unknown): string | null {
  return RAYIC_KAYNAKLARI.find((kaynak) => kaynak.value === deger)?.label ?? null
}

/**
 * Rayiç/piyasa oranı.
 *
 * @param piyasaM2 Bizim gözlemlerimizden gelen ortalama m² satış fiyatı
 * @param rayicM2  Resmî m² rayiç bedeli
 * @returns Piyasa fiyatının rayiç bedele oranı; hesaplanamıyorsa `null`
 */
export function rayicPiyasaOrani(
  piyasaM2: number | null | undefined,
  rayicM2: number | null | undefined,
): number | null {
  if (typeof piyasaM2 !== 'number' || !Number.isFinite(piyasaM2) || piyasaM2 <= 0) return null
  if (typeof rayicM2 !== 'number' || !Number.isFinite(rayicM2) || rayicM2 <= 0) return null

  return piyasaM2 / rayicM2
}

/**
 * Tapu harcının matrahı.
 *
 * ⚠️ HARÇ, RAYİÇ BEDELİN ALTINA DÜŞEMEZ. Emlak Vergisi Kanunu'na göre
 * beyan edilen değer, emlak vergisi değerinden (rayiç bedel) düşük olamaz;
 * düşük beyan edilirse harç yine rayiç üzerinden hesaplanır ve aradaki
 * fark cezasıyla istenir.
 *
 * Bu yüzden hesaplayıcı satış bedeliyle rayiç bedelin BÜYÜĞÜNÜ kullanıyor.
 * Yalnızca satış bedelini kullansaydık, düşük beyanla alım yapmayı düşünen
 * birine gerçekte ödeyeceğinden az bir rakam gösterirdik.
 *
 * @param satisBedeli Sözleşmedeki bedel
 * @param rayicBedel  Taşınmazın toplam rayiç bedeli; bilinmiyorsa `null`
 */
export function harcMatrahi(
  satisBedeli: number,
  rayicBedel: number | null | undefined,
): { matrah: number; rayicMiBelirledi: boolean } {
  if (typeof rayicBedel !== 'number' || !Number.isFinite(rayicBedel) || rayicBedel <= 0) {
    return { matrah: satisBedeli, rayicMiBelirledi: false }
  }

  return rayicBedel > satisBedeli
    ? { matrah: rayicBedel, rayicMiBelirledi: true }
    : { matrah: satisBedeli, rayicMiBelirledi: false }
}
