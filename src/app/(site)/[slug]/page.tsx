import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SayfaVitrini } from '@/components/duzen/SayfaVitrini'
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
    <>
      {/*
        ⚠️ HUKUKİ METİNLER DE AYNI BANDI ALIYOR.

        Ayrı tutmak — "bunlar sıkıcı sayfalar" — tam da bu sayfaların
        okunmamasına yol açardı. Bandın taşıdığı tek fazladan bilgi son
        güncelleme tarihi ve o, hukuki bir metinde başlığın hemen yanında
        durması gereken şey.
      */}
      <SayfaVitrini>
        <nav aria-label="Sayfa yolu" className="text-metin-3 mb-5 text-govde-kucuk">
          <Link href="/" className="hover:text-metin underline-offset-2 hover:underline">
            Ana sayfa
          </Link>
          <span aria-hidden> / </span>
          <span aria-current="page">{sayfa.baslik}</span>
        </nav>

        <h1 className="text-metin font-baslik text-baslik-1-mobil font-medium sm:text-baslik-1">
          {sayfa.baslik}
        </h1>

        {sayfa.hukukiMetin ? (
          <p className="text-metin-3 mt-3 text-govde-kucuk">
            Son güncelleme: {tarihiYaz(sayfa.updatedAt)}
          </p>
        ) : null}

        {sayfa.ozet ? (
          <p className="text-metin-2 mt-5 text-govde leading-relaxed">{sayfa.ozet}</p>
        ) : null}
      </SayfaVitrini>

      <div className="kapsayici py-12 sm:py-16">
        <article className="max-w-2xl">
          {sayfa.icerik ? (
            <ZenginMetin veri={sayfa.icerik} />
          ) : (
            <div className="border-kenar bg-yuzey-2/60 rounded-kart border-[0.5px] border-dashed p-6">
              <h2 className="font-sans text-govde font-medium">Bu metin hazırlanıyor</h2>
              <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
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
    </>
  )
}
