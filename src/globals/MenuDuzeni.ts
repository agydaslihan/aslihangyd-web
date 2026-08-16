import { revalidatePath } from 'next/cache'
import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'
import { MENU_SIRA_SECENEKLERI, VARSAYILAN_MENU_SIRASI } from '@/lib/gezinme'

/**
 * Üst menü düzeni — yalnızca SIRA.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EKRAN MENÜYÜ TANIMLAMAZ, DİZER.
 *
 * Menüde hangi başlıkların bulunduğu kodda; hangisinin görüneceği Site
 * Bölümleri anahtarlarında; hangi sırada duracağı burada. Üçü ayrı çünkü
 * üçü ayrı türde karar:
 *
 *  · İçerik  → uygulamanın bilgisi (adresler, mega menüler)
 *  · Görünme → Aslıhan'ın yayın kararı (Site Bölümleri)
 *  · Sıra    → Aslıhan'ın editoryal tercihi (burası)
 *
 * Serbest bir "menü yöneticisi" (ad + adres elle yazılan) üçünü tek yerde
 * toplardı ve ilk yanlış yazılan adreste menü sessizce 404'e bağlanırdı.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BURADAN ÖĞE GİZLENMEZ. Bir sayfayı menüden kaldırmak istiyorsanız
 * Site Bölümleri'nden KAPATIN — o zaman menüden de altbilgiden de site
 * haritasından da kalkar ve adresi 404 döner. Yalnızca menüden düşürmek,
 * "kapattım ama Google hâlâ gösteriyor" durumunu üretirdi.
 *
 * ⚠️ Listeden silinen bir başlık KAYBOLMAZ, menünün sonuna iner. Kayıt
 * yanlışlıkla eksik kalırsa sayfa erişilemez hâle gelmesin diye.
 */
export const MenuDuzeni: GlobalConfig = {
  slug: 'menu-duzeni',
  label: 'Menü Düzeni',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: sitenin ana gezinmesi — editoryal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Üst menüdeki başlıkların sırası. Satırları sürükleyerek düzenleyin. Bir başlığı ' +
      'tamamen kaldırmak için Site Bölümleri’nden kapatın — buradan silmek onu yalnızca ' +
      'menünün sonuna atar.',
  },

  hooks: {
    // Menü her sayfanın düzeninde; değişiklik anında görünmeli.
    afterChange: [
      () => {
        try {
          revalidatePath('/', 'layout')
        } catch {
          // Payload REST bağlamında istek dışı çağrılabilir; sorun değil.
        }
      },
    ],
  },

  fields: [
    {
      name: 'sira',
      type: 'array',
      label: 'Menü sırası',
      labels: { singular: 'Başlık', plural: 'Başlıklar' },
      /**
       * ⚠️ Varsayılan kod sırası. Boş bir liste ile açılsaydı Aslıhan
       * sekiz satırı tek tek eklemek zorunda kalırdı ve ilk kaydetmeye
       * kadar menü sırası panelde yanlış görünürdü.
       */
      defaultValue: VARSAYILAN_MENU_SIRASI.map((anahtar) => ({ oge: anahtar })),
      /**
       * ⚠️ Tekrar eden başlık KAYDEDİLMEZ, sessizce yok sayılmaz.
       *
       * Çizim tarafı zaten ikinciyi atlıyor (bir sayfa menüde iki kez
       * duramaz) ama panelde "ekledim, görünmedi" demek en kötü geri
       * bildirim. Hata burada, sebebiyle birlikte söyleniyor.
       */
      validate: (deger: unknown) => {
        if (!Array.isArray(deger)) return true

        const gorulen = new Set<string>()
        for (const satir of deger) {
          const oge = (satir as { oge?: unknown }).oge
          if (typeof oge !== 'string') continue
          if (gorulen.has(oge)) {
            const ad = MENU_SIRA_SECENEKLERI.find((secenek) => secenek.value === oge)?.label ?? oge
            return `"${ad}" listede birden çok kez var. Bir başlık menüde yalnızca bir kez yer alabilir.`
          }
          gorulen.add(oge)
        }

        return true
      },
      admin: {
        description:
          'Soldan sağa menü sırası. Kapalı bölümler bu listede dursa da sitede görünmez.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'oge',
          type: 'select',
          label: 'Başlık',
          required: true,
          /**
           * ⚠️ Seçenekler koddan türetiliyor, elle yazılmıyor. Elle
           * yazılsaydı yeni bir menü başlığı eklendiğinde burayı
           * güncellemeyi unutmak kaçınılmazdı — ve yeni başlık
           * sıralanamaz olurdu.
           */
          options: [...MENU_SIRA_SECENEKLERI],
        },
      ],
    },
  ],
}
