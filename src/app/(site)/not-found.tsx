import { Buton } from '@/components/ui/Buton'

/**
 * 404.
 *
 * Ölü uçlu bir "Sayfa bulunamadı" ekranı ziyaretçiyi siteden atar. Buradan
 * çıkış yolları verilir: portföy, mahalleler, iletişim.
 */
export default function BulunamadiSayfasi() {
  return (
    <div className="kapsayici flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-vurgu rakam text-mikro font-medium tracking-[0.1em]">404</p>

      <h1 className="mt-3 font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
        Aradığınız sayfayı bulamadık
      </h1>

      <p className="text-metin-2 mt-4 max-w-md leading-relaxed">
        Adres değişmiş veya sayfa kaldırılmış olabilir. Bir ilan arıyorsanız satılmış ya da yayından
        kaldırılmış olabilir — portföyün tamamına göz atın.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Buton href="/portfoy">Portföyü inceleyin</Buton>
        <Buton href="/mahalleler" gorunum="ikincil">
          Mahalleler
        </Buton>
        <Buton href="/iletisim" gorunum="hayalet">
          Bize ulaşın
        </Buton>
      </div>
    </div>
  )
}
