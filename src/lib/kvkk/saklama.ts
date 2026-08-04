/**
 * KVKK — kişisel veri saklama süresi.
 *
 * KVKK, kişisel verinin işlendiği amaç için gerekli olan süreden fazla
 * saklanmasını yasaklar. Bu yüzden her talep kaydına, oluşturulduğu anda
 * bir **saklama bitiş tarihi** yazılır; süresi dolan kayıtlar otomatik
 * silinir (bakım görevi).
 *
 * ⚠️ Süre hukuki bir tercihtir, teknik değil. Buradaki 24 ay makul bir
 * varsayılandır; Aslıhan'ın avukatı farklı bir süre belirlerse
 * `VARSAYILAN_SAKLAMA_AYI` güncellenir. Bu, SENDEN-BEKLENENLER.md'de
 * takip edilmektedir.
 */

export const VARSAYILAN_SAKLAMA_AYI = 24

/**
 * Onay tarihine saklama süresini ekleyip bitiş tarihini üretir.
 *
 * Ay ekleme, ayın son günlerinde taşma yapar (31 Ocak + 1 ay = 3 Mart gibi).
 * Bunu engellemek için hedef ay taştıysa ayın son gününe sabitlenir —
 * saklama süresinin kazara uzaması KVKK açısından hatadır.
 */
export function saklamaBitisi(onayTarihi: Date, ay: number = VARSAYILAN_SAKLAMA_AYI): Date {
  const bitis = new Date(onayTarihi.getTime())
  const hedefAy = bitis.getUTCMonth() + ay
  const gun = bitis.getUTCDate()

  bitis.setUTCDate(1)
  bitis.setUTCMonth(hedefAy)

  const aydakiSonGun = new Date(
    Date.UTC(bitis.getUTCFullYear(), bitis.getUTCMonth() + 1, 0),
  ).getUTCDate()

  bitis.setUTCDate(Math.min(gun, aydakiSonGun))
  return bitis
}
