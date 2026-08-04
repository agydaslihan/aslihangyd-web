import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { sinif } from '@/lib/sinif'

/**
 * CMS zengin metnini render eder.
 *
 * Tipografi burada merkezî olarak ayarlanır: `@tailwindcss/typography`
 * eklentisi yerine elle yazılmış sınıflar kullanılıyor. Sebep, eklentinin
 * kendi renk ve ölçeğini getirip tasarım sistemindeki değişkenleri
 * ezmesi — ve ~15 kB'lık CSS eklemesi.
 *
 * İçerik yoksa `null` döner; çağıran boş durumu kendi bağlamına göre
 * gösterir.
 */
export function ZenginMetin({
  veri,
  sinifAdi,
}: {
  veri?: SerializedEditorState | null
  sinifAdi?: string
}) {
  if (!veri) return null

  return (
    <div
      className={sinif(
        'max-w-2xl leading-relaxed',
        '[&_p]:text-murekkep-2 [&_p]:mb-4 [&_p]:text-[1.0625rem]',
        '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-[1.5rem] [&_h2]:leading-tight',
        '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-[1.25rem] [&_h3]:leading-tight',
        '[&_ul]:text-murekkep-2 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:text-murekkep-2 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:mb-1.5',
        '[&_a]:text-lacivert [&_a]:underline [&_a]:underline-offset-2',
        '[&_strong]:text-murekkep [&_strong]:font-semibold',
        '[&_blockquote]:border-pirinc [&_blockquote]:text-murekkep-2 [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic',
        sinifAdi,
      )}
    >
      <RichText data={veri} />
    </div>
  )
}

/** Zengin metin alanının kelime sayısı — "800 kelime" hedefini ölçmek için. */
export function kelimeSay(veri?: SerializedEditorState | null): number {
  if (!veri) return 0

  let toplam = 0
  const gez = (dugum: unknown): void => {
    if (typeof dugum !== 'object' || dugum === null) return
    const kayit = dugum as Record<string, unknown>

    if (typeof kayit.text === 'string') {
      toplam += kayit.text.trim().split(/\s+/).filter(Boolean).length
    }
    if (Array.isArray(kayit.children)) kayit.children.forEach(gez)
  }

  gez(veri.root)
  return toplam
}
