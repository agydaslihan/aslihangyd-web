/**
 * Koleksiyonlar arasında paylaşılan alan tanımları.
 */

import type { Field, FieldHook } from 'payload'

import { slugUret } from '@/lib/slug'

/** Aynı slug'a sahip başka bir kayıt var mı? */
async function slugKullanimda(hook: Parameters<FieldHook>[0], aday: string): Promise<boolean> {
  const koleksiyon = hook.collection?.slug
  if (!koleksiyon || !hook.req?.payload) return false

  const kendiId = (hook.originalDoc as { id?: number | string } | undefined)?.id

  const sonuc = await hook.req.payload.find({
    collection: koleksiyon,
    where:
      kendiId === undefined
        ? { slug: { equals: aday } }
        : { and: [{ slug: { equals: aday } }, { id: { not_equals: kendiId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  return sonuc.docs.length > 0
}

/**
 * Kaynak alandan otomatik slug üretir — ama yalnızca slug boşsa.
 *
 * İki bilinçli davranış:
 *
 * 1. **Yayına girmiş kaydın slug'ı başlık değişince DEĞİŞMEZ.** Slug kalıcı
 *    URL'dir; sessizce değişmesi indekslenmiş sayfanın 404'e düşmesi demektir.
 *    Gerekirse editör elle değiştirir ve yönlendirmeyi bilerek üstlenir.
 *
 * 2. **Çakışma sessizce sayıyla çözülür** ("muhittin-3-1", "muhittin-3-1-2").
 *    Aynı başlıkla iki ilan girmek olağandır; editörün karşısına
 *    "geçersiz alan: slug" çıkarmak, sebebi anlaşılmayan bir duvardır.
 */
function slugKancasi(kaynakAlan: string): FieldHook {
  return async (hook) => {
    const { value, data, originalDoc } = hook

    const elleGirilen = typeof value === 'string' && value.trim().length > 0
    const mevcut = (originalDoc as Record<string, unknown> | undefined)?.slug

    // Kayıtlı slug varsa ve editör elle değiştirmediyse dokunma.
    if (!elleGirilen && typeof mevcut === 'string' && mevcut.length > 0) return mevcut

    const kaynak = (data as Record<string, unknown> | undefined)?.[kaynakAlan]
    const hamMetin = elleGirilen ? (value as string) : typeof kaynak === 'string' ? kaynak : ''

    const temel = slugUret(hamMetin)
    if (temel === '') return value

    // Aynı slug zaten bu kayda aitse sorgu yapma.
    if (temel === mevcut) return temel

    let aday = temel
    for (let sayac = 2; sayac < 100; sayac += 1) {
      if (!(await slugKullanimda(hook, aday))) return aday
      aday = `${temel}-${sayac}`
    }

    return aday
  }
}

export function slugAlani(kaynakAlan = 'baslik'): Field {
  return {
    name: 'slug',
    type: 'text',
    label: 'URL adresi (slug)',
    required: true,
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description:
        'Sayfanın adres satırındaki adı. Boş bırakırsan başlıktan otomatik üretilir. ' +
        'Yayına girdikten sonra değiştirmek eski adresi 404 yapar.',
    },
    hooks: {
      beforeValidate: [slugKancasi(kaynakAlan)],
    },
  }
}

/** SEO alanları — arama motoru görünürlüğü sayfa bazında ayarlanabilsin. */
export const seoAlanlari: Field = {
  type: 'collapsible',
  label: 'Arama motoru (SEO)',
  admin: { initCollapsed: true },
  fields: [
    {
      name: 'seoBaslik',
      type: 'text',
      label: 'SEO başlığı',
      maxLength: 70,
      admin: {
        description: 'Boş bırakılırsa sayfa başlığı kullanılır. En fazla 70 karakter.',
      },
    },
    {
      name: 'seoAciklama',
      type: 'textarea',
      label: 'SEO açıklaması',
      maxLength: 170,
      admin: {
        description: 'Google sonuçlarında başlığın altında görünen metin. En fazla 170 karakter.',
      },
    },
    {
      name: 'seoGorsel',
      type: 'upload',
      relationTo: 'medya',
      label: 'Paylaşım görseli',
      admin: {
        description:
          'WhatsApp ve sosyal medyada paylaşıldığında görünecek görsel. Önerilen: 1200×630 piksel.',
      },
    },
  ],
}

/**
 * "Veri Aslıhan tarafından doldurulacak" işareti.
 *
 * CLAUDE.md kural 2: gerçek veri bilinmiyorsa alan boş bırakılır. Bu alan,
 * boş bırakılmış kayıtların panelde filtrelenebilmesini sağlar — böylece
 * eksikler kaybolmaz.
 */
export const veriEksikAlani: Field = {
  name: 'veriEksik',
  type: 'checkbox',
  label: 'Veri eksik — doldurulacak',
  defaultValue: false,
  index: true,
  admin: {
    position: 'sidebar',
    description:
      'İşaretliyse bu kaydın rakamları henüz girilmemiştir. Arayüzde boş durum gösterilir, uydurma sayı yazılmaz.',
  },
}
