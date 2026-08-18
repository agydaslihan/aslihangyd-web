import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'

/**
 * Altbilgi ayarları — logo çevresindeki düzenlenebilir metinler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BURADA OLMAYAN ÜÇ ŞEY VE HER BİRİNİN SEBEBİ.
 *
 * 1. LOGO. `MarkaGorunum`dan geliyor. Buraya ikinci bir yükleme alanı
 *    konsaydı iki logo arasında hangisinin kazandığı belirsizleşir ve biri
 *    güncellenip diğeri unutulurdu.
 *
 * 2. SOSYAL MEDYA HESAPLARI. `KurumsalBilgiler → İletişim` sekmesinde
 *    zaten var ve sıralanabilir. Aynı gerekçe: tek kaynak.
 *
 * 3. YETKİ BELGESİ NUMARASI VE FERAGAT METNİ. ⚠️ BUNLAR DÜZENLENEMEZ VE
 *    DÜZENLENEBİLİR OLMAMALI. Yetki belgesi numarası yasal zorunluluk
 *    (CLAUDE.md kural 1); yatırım tavsiyesi feragati de öyle (kural 5).
 *    Panelde bir metin kutusuna konsaydı yanlışlıkla silinebilir ya da
 *    değiştirilebilirdi ve bunun farkına ancak denetimde varılırdı.
 *    Numara `KurumsalBilgiler`den okunuyor, feragat cümlesi kodda sabit.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const AltbilgiAyarlari: GlobalConfig = {
  slug: 'altbilgi-ayarlari',
  label: 'Altbilgi Ayarları',

  access: {
    read: herkesOkur,
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Altbilgideki tanıtım metni ve sütun başlıkları. Logo "Marka ve Görünüm"den, sosyal ' +
      'medya hesapları "Kurumsal Bilgiler"den geliyor. ⚠️ Yetki belgesi numarası ve yatırım ' +
      'tavsiyesi feragati yasal zorunluluktur; buradan değiştirilemez.',
  },

  fields: [
    {
      name: 'tanitimMetni',
      type: 'textarea',
      label: 'Logo altı tanıtım metni',
      admin: {
        description:
          'Altbilgide logonun hemen altında görünür. Boş bırakırsanız mevcut metin kalır: ' +
          '"Çorlu ve çevresinde gayrimenkul danışmanlığı. Kararlarınızı hisle değil, rakamla verin."',
      },
    },
    {
      type: 'collapsible',
      label: 'Sütun başlıkları',
      admin: {
        description:
          'Boş bıraktığınız her başlıkta mevcut metin kalır. ⚠️ Başlıkları yeniden ' +
          'adlandırabilirsiniz ama sütunların İÇERİĞİ koddan ve diğer ayarlardan geliyor; ' +
          '"Hukuksal metinler" sütununu başka bir adla anmak, oradaki bağlantıların ne ' +
          'olduğunu değiştirmez.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'kurumsalBasligi',
              type: 'text',
              label: 'Kurumsal',
              admin: { width: '33%', description: 'Boşsa "Kurumsal".' },
            },
            {
              name: 'portfoyBasligi',
              type: 'text',
              label: 'Portföy',
              admin: { width: '33%', description: 'Boşsa "Portföy".' },
            },
            {
              name: 'faydaliBasligi',
              type: 'text',
              label: 'Faydalı bağlantılar',
              admin: { width: '34%', description: 'Boşsa "Faydalı bağlantılar".' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'hukuksalBasligi',
              type: 'text',
              label: 'Hukuksal metinler',
              admin: { width: '50%', description: 'Boşsa "Hukuksal metinler".' },
            },
            {
              name: 'iletisimBasligi',
              type: 'text',
              label: 'İletişim',
              admin: { width: '50%', description: 'Boşsa "İletişim".' },
            },
          ],
        },
      ],
    },
    {
      name: 'sosyalBasligi',
      type: 'text',
      label: 'Sosyal medya başlığı',
      admin: {
        description:
          'Hesapların üstünde görünür. Boşsa "Bizi takip edin". ⚠️ Hesapların kendisi ' +
          'Kurumsal Bilgiler → İletişim sekmesinde; oradan sürükleyerek sıralayabilirsiniz.',
      },
    },
  ],
}
