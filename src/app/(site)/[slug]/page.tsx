import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Buton } from '@/components/ui/Buton'
import { ZenginMetin } from '@/components/ui/ZenginMetin'
import { mutlakAdres } from '@/lib/site'
import { tarihiYaz } from '@/lib/tarih'
import { sayfaGetir } from '@/lib/veri/sayfalar'

/**
 * CMS sayfaları — özellikle hukuki metinler (/kvkk, /gizlilik, …).
 *
 * ⚠️ Bu metinlerin içeriğini agent YAZMAZ (CLAUDE.md kural 3). Sayfa
 * kaydı varsa içerik gösterilir; içerik henüz girilmemişse ziyaretçiye
 * dürüst bir "hazırlanıyor" ekranı çıkar. Uydurma bir KVKK metni,
 * metnin hiç olmamasından daha risklidir — çünkü hukuki bir taahhüt
 * gibi okunur.
 */

type SayfaOzellikleri = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: SayfaOzellikleri): Promise<Metadata> {
  const { slug } = await params
  const sayfa = await sayfaGetir(slug)

  if (!sayfa) return { title: 'Sayfa bulunamadı' }

  return {
    title: sayfa.seoBaslik ?? sayfa.baslik,
    description: sayfa.seoAciklama ?? sayfa.ozet ?? undefined,
    alternates: { canonical: mutlakAdres(`/${sayfa.slug}`) },
    // Hukuki metinler arama sonuçlarında öne çıkmamalı; site içeriğiyle
    // rekabet edip alakasız sorgulara düşerler.
    robots: sayfa.hukukiMetin ? { index: false, follow: true } : undefined,
  }
}

export default async function CmsSayfasi({ params }: SayfaOzellikleri) {
  const { slug } = await params
  const sayfa = await sayfaGetir(slug)

  if (!sayfa) notFound()

  return (
    <div className="kapsayici py-10 sm:py-14">
      <nav aria-label="Sayfa yolu" className="text-murekkep-3 mb-6 text-sm">
        <Link href="/" className="hover:text-murekkep underline-offset-2 hover:underline">
          Ana sayfa
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{sayfa.baslik}</span>
      </nav>

      <article className="max-w-2xl">
        <h1 className="text-[2rem] leading-tight sm:text-[2.5rem]">{sayfa.baslik}</h1>

        {sayfa.hukukiMetin ? (
          <p className="text-murekkep-3 mt-3 text-sm">
            Son güncelleme: {tarihiYaz(sayfa.updatedAt)}
          </p>
        ) : null}

        {sayfa.ozet ? (
          <p className="text-murekkep-2 mt-4 text-lg leading-relaxed">{sayfa.ozet}</p>
        ) : null}

        {sayfa.icerik ? (
          <div className="mt-8">
            <ZenginMetin veri={sayfa.icerik} />
          </div>
        ) : (
          <div className="border-cizgi bg-yuzey-2/60 rounded-yumusak mt-8 border border-dashed p-6">
            <h2 className="font-sans text-base font-semibold">Bu metin hazırlanıyor</h2>
            <p className="text-murekkep-2 mt-2 text-sm leading-relaxed">
              Bu sayfanın içeriği hukuk danışmanımız tarafından hazırlanıyor. Metin hazır olana
              kadar, bu konudaki sorularınızı doğrudan bize iletebilirsiniz.
            </p>
            <div className="mt-4">
              <Buton href="/iletisim" gorunum="ikincil" boyut="kucuk">
                Bize ulaşın
              </Buton>
            </div>
          </div>
        )}
      </article>
    </div>
  )
}
