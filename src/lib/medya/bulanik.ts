import type { Medya } from '@/payload-types'

/**
 * `next/image` için bulanık önizleme özellikleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: BOŞ GRİ KUTU BİR TASARIM DEĞİL, EKSİKLİKTİR.
 *
 * Görsel inene kadar kartın yerinde düz bir zemin duruyordu. Bulanık
 * önizleme o boşluğu görselin kendi renkleriyle dolduruyor — sayfa
 * yüklenirken "ne geleceği" belli oluyor ve algılanan hız artıyor.
 *
 * ⚠️ CLS'İ BULANIK ÖNİZLEME KORUMUYOR — ORAN KORUYOR.
 *
 * Yaygın bir yanlış anlama: "blur placeholder koyduk, CLS düzelir."
 * Düzelmez. Kayma, görselin kapladığı alan önceden bilinmediğinde olur;
 * çözümü sabit en-boy oranı (`aspect-*` sınıfı) ya da `width`/`height`.
 * Bu projede kart kapsayıcılarında oran zaten sabit ve CLS 0,000 ölçüldü.
 * Bulanık önizleme oraya bir şey eklemiyor; algılanan hızı iyileştiriyor.
 *
 * Veri `bulanikVeri` alanında: 16 piksel genişliğinde WebP, base64 gömülü,
 * yükleme sırasında sharp ile üretiliyor (`src/collections/Medya.ts`
 * kancası). Ayrı bir ağ isteği YOK — HTML'in içinde geliyor, bu yüzden
 * boyutu küçük tutmak zorunlu.
 * ─────────────────────────────────────────────────────────────────────────
 */

interface BulanikOzellikleri {
  placeholder?: 'blur'
  blurDataURL?: string
}

/**
 * ⚠️ Eski kayıtlarda `bulanikVeri` YOK ve olmayacak.
 *
 * Alan sonradan eklendi; kanca yalnızca yeni yüklemelerde çalışıyor. Eski
 * görseller için sessizce boş dönüyoruz — `placeholder` verilmediğinde
 * `next/image` eski davranışını sürdürür. Zorunlu tutmak, arşivdeki her
 * görselin yeniden yüklenmesini gerektirirdi.
 */
export function bulanikOzellikleri(gorsel: Medya | null | undefined): BulanikOzellikleri {
  const veri = gorsel?.bulanikVeri
  if (typeof veri !== 'string' || !veri.startsWith('data:image/')) return {}
  return { placeholder: 'blur', blurDataURL: veri }
}
