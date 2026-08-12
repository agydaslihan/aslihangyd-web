import { revalidatePath } from 'next/cache'
import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'
import { BOLUMLER } from '@/lib/siteBolumleri'

/**
 * Site bölümleri — açma/kapama anahtarları.
 *
 * ⚠️ Bir bölüm kapatıldığında ÜÇÜ BİRDEN gerçekleşir: ana sayfada
 * görünmez, altbilgide bağlantısı kaybolur, rotası 404 döner. Üçü tek
 * kaynaktan sürülür (`src/lib/siteBolumleri.ts`).
 *
 * ⚠️ KAPALI BÖLÜMÜN VERİSİ SİLİNMEZ. Kapatmak gizlemektir.
 *
 * Bölüm LİSTESİ kodda: her bölümün hangi rotaları kapsadığı bir
 * yapılandırma değil, uygulamanın bilgisi. CMS'te olsaydı yanlış yazılan
 * bir rota sessizce hiçbir şeyi kapatmazdı.
 */
export const SiteBolumleri: GlobalConfig = {
  slug: 'site-bolumleri',
  label: 'Site Bölümleri',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: ana sayfa vitrini — editoryal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Bir bölümü kapattığında ana sayfadan, altbilgiden ve arama motorundan aynı anda ' +
      'kalkar; adresine girilirse 404 döner. Verisi silinmez, geri açtığında yerinde olur.',
  },

  hooks: {
    /**
     * Anahtar değişince etki ANINDA görünmeli.
     *
     * Bugün tüm rotalar dinamik render ediliyor (kök düzen çerez onayını
     * okuyor), dolayısıyla değişiklik zaten ilk istekte görünür. Bu kanca
     * yine de duruyor: PPR ya da statik render açıldığı gün, onu açan
     * kişinin buradaki bayrağı ayrıca hatırlaması gerekmesin.
     *
     * Hata yutuluyor — panelde kaydetmeyi bir önbellek çağrısı
     * engellememeli.
     */
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

  fields: BOLUMLER.map((bolum) => ({
    name: bolum.anahtar,
    type: 'checkbox' as const,
    label: `${bolum.ad} açık`,
    defaultValue: bolum.varsayilanAcik,
    admin: { description: bolum.aciklama },
  })),
}
