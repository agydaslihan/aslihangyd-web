import Image from 'next/image'

import { Sahne } from '@/components/hareket/Sahne'
import { Manyetik } from '@/components/hareket/Manyetik'
import { Buton } from '@/components/ui/Buton'
import { Eyebrow } from '@/components/ui/Bolum'
import { DogrulanmisIkon, OkIkon } from '@/components/ui/Ikon'

/**
 * Sinematik hero — şartname §6.1.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MEDYA SIRASI: VİDEO → GÖRSEL → SICAK GRADYAN. BOŞ GRİ KUTU YOK.
 *
 * Bunny Stream yapılandırılmadığı için video bu sürümde yok; şartname de
 * sırayı böyle veriyor. Görsel varsa (panelden yüklenen hero slaydı) tam
 * ekran zemin oluyor; yoksa sıcak bej → beyaz gradyan devreye giriyor.
 *
 * ⚠️ ÜÇÜNCÜ BASAMAK BİR YEDEK DEĞİL, TASARIM. "Görsel bekleniyor" yazan
 * gri bir dikdörtgen, şartnamenin istediği premium hissi ilk saniyede
 * öldürürdü. Gradyan zemin kendi başına eksiksiz duruyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ OVERLAY BEYAZ, KOYU DEĞİL.
 *
 * Klasik hero "fotoğrafı karart, üstüne beyaz yaz" der. Aurora'nın metni
 * mürekkep ve zemini sıcak beyaz; karartma o ekseni tersine çevirirdi.
 * Beyaz örtü %78–92 arasında: fotoğraf ne olursa olsun metnin altındaki
 * yüzey açık kalıyor, yani kontrast fotoğrafı yükleyen kişinin seçimine
 * bağlı olmaktan çıkıyor.
 *
 * ⚠️ 100svh, 100vh DEĞİL. Mobil tarayıcıda adres çubuğu kaydırırken
 * büyüyüp küçülüyor; `vh` o değişimi görmediği için hero kaydırma sırasında
 * zıplıyor. `svh` en küçük görüntü alanını temel alıyor.
 *
 * ⚠️ YÜKSEKLİK `.vitrin-boy` SINIFINDAN — ÇEREZ BANDI KADAR KISALIYOR.
 * Sabit `100svh` iken bant, hero'nun iki çağrı butonunu da örtüyordu ve
 * onlar tıklanamıyordu (31 Ağustos 2026, ölçüldü). Gerekçe globals.css.
 *
 * ⚠️ GÖRSEL VARSA LCP ÖĞESİ ODUR: `priority` + `sizes="100vw"`. Yoksa LCP
 * öğesi `<h1>` ve hiçbir görsel indirilmiyor.
 */
export function SinematikHero({
  ustBaslik,
  baslik,
  vurgu,
  baslikDevam,
  aciklama,
  birincilEylem,
  ikincilEylem,
  arkaplan,
}: {
  ustBaslik: string
  baslik: string
  /** Altınla yazılan kelime. */
  vurgu: string
  baslikDevam: string
  aciklama: string
  birincilEylem: { ad: string; adres: string }
  ikincilEylem: { ad: string; adres: string }
  arkaplan: { url: string; alt: string } | null
}) {
  return (
    <section className="bg-zemin vitrin-boy relative isolate flex flex-col overflow-hidden">
      {arkaplan ? (
        <>
          <Image
            src={arkaplan.url}
            alt={arkaplan.alt}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
          {/* ⚠️ Beyaz örtü — gerekçe bileşen başında. Fotoğrafın alt kenarı
              daha açık: kaydırma göstergesi ve bir sonraki bölüm oraya
              bağlanıyor. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                'linear-gradient(to bottom, color-mix(in oklab, var(--color-zemin) 82%, transparent), color-mix(in oklab, var(--color-zemin) 92%, transparent) 55%, var(--color-zemin))',
            }}
          />
        </>
      ) : (
        /* ⚠️ Görsel yokken tek bir radyal gradyan: ayrı dosya inmiyor,
           LCP'ye etkisi sıfır. */
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(75% 60% at 50% 12%, color-mix(in oklab, var(--color-gold-400) 16%, transparent), transparent 64%),' +
              'linear-gradient(to bottom, var(--color-yuzey-2), var(--color-zemin) 60%)',
          }}
        />
      )}

      <div className="kapsayici vitrin-govde relative flex flex-1 flex-col items-center justify-center py-24 text-center sm:py-28">
        <Sahne>
          <Eyebrow>{ustBaslik}</Eyebrow>
        </Sahne>

        <Sahne gecikme={60}>
          {/* ⚠️ 72px masaüstü / 40px mobil — şartname §3'ün hero ölçeği. */}
          <h1 className="text-metin font-baslik text-hero-mobil mt-6 max-w-4xl font-medium text-balance sm:text-hero">
            {baslik} <span className="text-[color:var(--color-vurgu-baslik)]">{vurgu}</span>{' '}
            {baslikDevam}
          </h1>
        </Sahne>

        <Sahne gecikme={120}>
          <p className="text-metin-2 mt-7 max-w-2xl text-baslik-3 leading-relaxed">{aciklama}</p>
        </Sahne>

        <Sahne gecikme={180}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {/* ⚠️ Manyetik çekim yalnızca birincil eylemde — hiyerarşi. */}
            <Manyetik>
              <Buton href={birincilEylem.adres} gorunum="koyu" boyut="buyuk" sinifAdi="group">
                {birincilEylem.ad}
                <OkIkon
                  width={18}
                  height={18}
                  className="transition-transform duration-[var(--sure-basma)] group-hover:translate-x-0.5"
                />
              </Buton>
            </Manyetik>

            <Buton href={ikincilEylem.adres} gorunum="ikincil" boyut="buyuk">
              {ikincilEylem.ad}
            </Buton>
          </div>
        </Sahne>

        <Sahne gecikme={240}>
          {/* ⚠️ EİDS ibaresi hero'da kalıyor: dokunulmazlar listesinde ve
              ilk ekranda söylenmesi gereken tek teknik cümle. */}
          <p className="text-metin-3 mt-10 flex items-center justify-center gap-2 text-govde-kucuk">
            <DogrulanmisIkon width={16} height={16} className="shrink-0" />
            Tüm ilanlarımız EİDS doğrulamalıdır ve taşınmaz numarasıyla yayınlanır.
          </p>
        </Sahne>
      </div>

      {/*
        Kaydırma göstergesi.

        ⚠️ Ok ya da "aşağı kaydır" yazısı değil, ince bir çizgi: şartname
        "minimal, zarif çizgi animasyonu" diyor. `aria-hidden` çünkü hiçbir
        bilgi taşımıyor — kaydırma zaten mümkün.

        ⚠️ Animasyon `transform` üzerinden ve `prefers-reduced-motion`
        bloğunda duruyor.
      */}
      <div aria-hidden="true" className="vitrin-ipucu relative flex justify-center pb-10">
        <span className="bg-kenar-guclu relative block h-14 w-px overflow-hidden">
          <span className="bg-gold-cizgi kaydirma-ipucu absolute inset-x-0 top-0 block h-6" />
        </span>
      </div>
    </section>
  )
}
