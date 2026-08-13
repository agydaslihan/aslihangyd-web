'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useId, useTransition } from 'react'

import { sinif } from '@/lib/sinif'

/**
 * Sonuç sıralaması (şartname §7).
 *
 * ⚠️ Filtre panelinden AYRI bir bileşen ve bu bilinçli: sıralama bir filtre
 * değil, sonucun sunuş biçimi. Panelin içinde dursaydı "aktif filtre"
 * çipleri arasına düşer ve "temizle" ile birlikte sıfırlanırdı — oysa
 * sıralama tercihi filtre değiştikçe korunmalı.
 *
 * ⚠️ "Kira çarpanı: en iyi" bizim ayrıştırıcımız. Rakiplerde fiyat ve
 * tarih dışında sıralama yok.
 */
const SECENEKLER = [
  { value: '', label: 'Önce en yeni' },
  { value: 'fiyat_artan', label: 'Fiyat: düşükten yükseğe' },
  { value: 'fiyat_azalan', label: 'Fiyat: yüksekten düşüğe' },
  { value: 'carpan_artan', label: 'Kira çarpanı: en iyi' },
] as const

export function Siralama() {
  const sorgu = useSearchParams()
  const router = useRouter()
  const [gecisSuruyor, gecisBaslat] = useTransition()
  const id = useId()

  function degistir(deger: string) {
    const yeni = new URLSearchParams(sorgu.toString())
    if (deger) yeni.set('siralama', deger)
    else yeni.delete('siralama')
    // Sıralama değişince baştan göster.
    yeni.delete('goster')

    const metin = yeni.toString()
    gecisBaslat(() => router.push(metin ? `/portfoy?${metin}` : '/portfoy', { scroll: false }))
  }

  return (
    <div className={sinif('flex items-center gap-2', gecisSuruyor && 'opacity-60')}>
      <label htmlFor={id} className="text-metin-3 text-mikro">
        Sırala
      </label>
      <select
        id={id}
        value={sorgu.get('siralama') ?? ''}
        onChange={(olay) => degistir(olay.target.value)}
        className="border-kenar-giris bg-yuzey rounded-buton min-h-11 border-[0.5px] px-2.5 text-govde-kucuk"
      >
        {SECENEKLER.map((secenek) => (
          <option key={secenek.value} value={secenek.value}>
            {secenek.label}
          </option>
        ))}
      </select>
    </div>
  )
}
