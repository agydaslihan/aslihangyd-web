/**
 * Hesaplayıcıların ortak sonuç tipi.
 *
 * Tasarımın özü: **hesaplayıcı asla "yaklaşık doğru" bir sayı uydurmaz.**
 * Bir parametre veya girdi eksikse sonuç döndürmez, neyin eksik olduğunu
 * söyler. Yanlış bir vergi rakamı, rakam olmamasından çok daha zararlıdır.
 */

import { parametreEtiketi } from '@/lib/vergi/parametreler'

export interface EksikBilgi {
  anahtar: string
  etiket: string
}

export type HesapSonucu<T> =
  | { durum: 'hesaplandi'; veri: T }
  | { durum: 'parametre_eksik'; eksikler: EksikBilgi[] }
  | { durum: 'girdi_eksik'; eksikler: EksikBilgi[] }

export function hesaplandi<T>(veri: T): HesapSonucu<T> {
  return { durum: 'hesaplandi', veri }
}

export function parametreEksik<T>(anahtarlar: readonly string[]): HesapSonucu<T> {
  return {
    durum: 'parametre_eksik',
    eksikler: anahtarlar.map((anahtar) => ({ anahtar, etiket: parametreEtiketi(anahtar) })),
  }
}

export function girdiEksik<T>(eksikler: readonly EksikBilgi[]): HesapSonucu<T> {
  return { durum: 'girdi_eksik', eksikler: [...eksikler] }
}

/** Para tutarlarını kuruşa yuvarlar. Kayan nokta birikimini engeller. */
export function kurusaYuvarla(deger: number): number {
  return Math.round(deger * 100) / 100
}

export function liraYaYuvarla(deger: number): number {
  return Math.round(deger)
}

export function pozitifMi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger) && deger > 0
}

export function negatifDegilMi(deger: number | null | undefined): deger is number {
  return typeof deger === 'number' && Number.isFinite(deger) && deger >= 0
}
