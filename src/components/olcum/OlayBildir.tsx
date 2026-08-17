'use client'

import { useEffect } from 'react'

import { gozlemOlayi } from '@/lib/olcum/istemci'

/**
 * Bir olayı görüntülenince bir kez bildirir.
 *
 * ⚠️ SUNUCU BİLEŞENLERİ İÇİN VAR. "Sonuç bulunamadı" gibi durumlar sunucuda
 * belirleniyor ama olay ancak istemcide gönderilebiliyor. Bu bileşen o boşluğu
 * kapatıyor ve hiçbir şey ÇİZMİYOR — düzeni etkilemiyor.
 *
 * ⚠️ Onay yoksa `gozlemOlayi` hiçbir şey yapmıyor: gönderici fonksiyon var
 * olmuyor. Kapı burada değil, `KatmanB.tsx` içinde ve tek yerde.
 */
export function OlayBildir({ ad, ayrinti }: { ad: string; ayrinti?: string }): null {
  useEffect(() => {
    gozlemOlayi(ad, ayrinti)
  }, [ad, ayrinti])

  return null
}
