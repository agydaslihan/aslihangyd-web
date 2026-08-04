'use client'

import { useEffect } from 'react'

import { Buton } from '@/components/ui/Buton'

/**
 * Beklenmedik hata ekranı.
 *
 * Kullanıcıya teknik ayrıntı gösterilmez (yığın izi bilgi sızdırır ve
 * kimsenin işine yaramaz). Bunun yerine: ne olduğu, ne yapılabileceği ve
 * alternatif bir iletişim yolu.
 */
export default function HataSayfasi({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Sunucu günlüklerinde `digest` ile eşleştirilebilsin.
    console.error('Beklenmedik hata:', error)
  }, [error])

  return (
    <div className="kapsayici flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-[1.75rem] leading-tight sm:text-[2.25rem]">Bir şeyler ters gitti</h1>

      <p className="text-murekkep-2 mt-4 max-w-md leading-relaxed">
        Sayfayı yüklerken beklenmedik bir sorun oluştu. Genellikle geçicidir — tekrar denemek çoğu
        zaman yeterli oluyor.
      </p>

      {error.digest ? (
        <p className="text-murekkep-3 rakam mt-3 text-mikro">Hata kodu: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Buton onClick={reset}>Tekrar deneyin</Buton>
        <Buton href="/" gorunum="ikincil">
          Ana sayfaya dönün
        </Buton>
        <Buton href="/iletisim" gorunum="sessiz">
          Bize bildirin
        </Buton>
      </div>
    </div>
  )
}
