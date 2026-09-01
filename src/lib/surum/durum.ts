/**
 * Sürüm karşılaştırmasının SAF katmanı.
 *
 * ⚠️ Ağa dokunmuyor. Uzak sorgular `uzak.ts` içinde; buradaki kurallar
 * ağ olmadan test edilebiliyor — "kaç commit geride" sorusunun cevabı,
 * GitHub'ın o an ayakta olmasına bağlı olmamalı.
 */

export interface SurumDurumu {
  /** Yayında çalışan sürümün commit'i. */
  calisanCommit: string | null
  /** Çalışan sürüm bilgisinin kaynağı. */
  calisanKaynak: 'imaj' | 'depo' | 'bilinmiyor'
  /** `main` dalının ucundaki commit. */
  enSonCommit: string | null
  /**
   * Çalışan sürümün `main`in kaç commit gerisinde olduğu.
   *
   * ⚠️ `null` = HESAPLANAMADI, sıfır DEĞİL. İkisini aynı göstermek,
   * ölçemediğimiz bir şeyi "sorun yok" diye raporlamak olurdu.
   */
  gerideCommit: number | null
  /** GHCR'daki `:latest` etiketinin gösterdiği commit. */
  imajCommit: string | null
  /** İmajın derlendiği an (ISO). */
  derlemeAni: string | null
  /** Uygulamanın bu sürümle çalışmaya başladığı an (ISO). */
  baslangicAni: string | null
  /** Denetim yapılamadıysa sebebi. */
  hata: string | null
  /** Denetimin çalıştığı an (ISO). */
  kontrolZamani: string
}

/** Ekranda gösterilecek kısa commit — yedi hane, git'in kendi alışkanlığı. */
export function kisaCommit(commit: string | null): string | null {
  if (commit === null) return null
  const sade = commit.trim()
  return sade === '' ? null : sade.slice(0, 7)
}

/**
 * İmaj, en son commit için yayımlanmış mı?
 *
 * ⚠️ Bu ayrı bir soru ve cevabı eylemi değiştiriyor: imaj hazır değilse
 * dağıtım komutu ESKİ sürümü kurar ve "dağıttım" diyen kişi hiçbir şeyin
 * değişmediğini görür. Bilinmiyorsa `null` — "hayır" değil.
 */
export function imajHazirMi(durum: SurumDurumu): boolean | null {
  if (durum.imajCommit === null || durum.enSonCommit === null) return null
  return durum.imajCommit === durum.enSonCommit
}

/** Tarihi Türkçe ve okunur yazar. Geçersizse `null`. */
export function tarihYaz(iso: string | null): string | null {
  if (iso === null) return null
  const an = new Date(iso)
  if (Number.isNaN(an.getTime())) return null

  return an.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })
}

/**
 * Şeridin altındaki kalıcı sürüm satırı.
 *
 * ⚠️ UYARI OLMASA DA GÖRÜNÜR. Yalnızca uyumsuzlukta gösterilseydi
 * "yayındaki sürüm ne?" sorusunun cevabı ancak bir sorun varken
 * okunabilirdi; oysa asıl ihtiyaç, sorun olmadığından EMİN OLMAK.
 */
export function surumOzeti(durum: SurumDurumu | null): string {
  if (durum === null) return 'Yayındaki sürüm henüz denetlenmedi.'

  const parcalar: string[] = []
  const kisa = kisaCommit(durum.calisanCommit)

  if (kisa === null) {
    parcalar.push('Yayındaki sürüm bilinmiyor')
  } else if (durum.calisanKaynak === 'depo') {
    // ⚠️ Geliştirme kabuğu: bu, yayındaki sürüm DEĞİL.
    parcalar.push(`Yerel çalışma ağacı ${kisa}`)
  } else {
    parcalar.push(`Yayındaki sürüm ${kisa}`)
  }

  const baslangic = tarihYaz(durum.baslangicAni)
  if (baslangic !== null) parcalar.push(`${baslangic}'ten beri çalışıyor`)

  const derleme = tarihYaz(durum.derlemeAni)
  if (derleme !== null) parcalar.push(`imaj ${derleme}`)

  if (durum.gerideCommit === null) {
    parcalar.push('main ile karşılaştırılamadı')
  } else if (durum.gerideCommit === 0) {
    parcalar.push('main ile aynı')
  } else {
    parcalar.push(`main'in ${durum.gerideCommit} commit gerisinde`)
  }

  return parcalar.join(' · ') + '.'
}
