/**
 * Koşullu CSS sınıfı birleştirici.
 *
 * `clsx` + `tailwind-merge` yerine 4 satır: bu proje 3.2 GB RAM'li bir
 * sunucuda çalışıyor ve tarayıcıya inen her kilobayt LCP bütçesinden
 * düşüyor. Bileşenler, çakışan yardımcı sınıf üretmeyecek şekilde
 * tasarlandı; birleştirme mantığına ihtiyaç yok.
 */
export function sinif(...parcalar: Array<string | false | null | undefined>): string {
  return parcalar.filter(Boolean).join(' ')
}
