import type { GlobalConfig } from 'payload'

import { herkesOkur, yalnizcaYonetici } from '@/lib/erisim'
import { sayfaAlanlari } from '@/lib/icerik/alanlar'

/**
 * Sayfa içerikleri — altı sayfanın düzenlenebilir metinleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ALTI AYRI GLOBAL DEĞİL, TEK GLOBAL + SEKMELER.
 *
 * Her sayfaya ayrı bir global açmak yan menüye altı satır daha eklerdi ve
 * o menü zaten uzun. Tek kayıt + sekme, aranan şeyi tek yerde topluyor:
 * "sayfa metinlerini nereden değiştiriyordum?" sorusunun tek cevabı var.
 *
 * ⚠️ `Danışman Ol` ve `Hakkımızda` bilinçli olarak DIŞARIDA.
 *
 * İkisinin de kendi globali VAR ve yayında. Buraya ikinci bir kopya
 * açmak, aynı sayfanın metnini iki yerde tutmak olurdu: biri güncellenir,
 * diğeri unutulur ve hangisinin kazandığı ancak sayfaya bakılınca
 * anlaşılır. Bu paketin görsel ve kart alanları o globallerin İÇİNE
 * eklendi.
 *
 * ⚠️ `Hakkimizda` ayrıca DIŞARIDA kaldı. Onun portre ve ek görsel
 * alanları sayfaya özel ve zaten yayında; buraya taşımak veri göçü
 * gerektirir ve kazancı yalnızca simetri olurdu. Yeni sayfa eklenirse
 * buraya eklenecek.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ HİÇBİR ALAN ZORUNLU DEĞİL VE BU TASARIMIN ÖZÜ. Boş bırakılan alanda
 * koddaki mevcut metin görünmeye devam ediyor. İçerik girilene kadar
 * sayfaların boşalması, "düzenlenebilir yaptık" diye site kırmak olurdu.
 */
export const SayfaIcerikleri: GlobalConfig = {
  slug: 'sayfa-icerikleri',
  label: 'Sayfa İçerikleri',

  access: {
    read: herkesOkur,
    // ⚠️ Yalnızca yönetici: sayfa metinleri marka sesi — editoryal karar.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'İçerik',
    description:
      'Sayfaların başlık ve açıklama metinleri. Boş bıraktığınız her alanda mevcut metin ' +
      'görünmeye devam eder; hiçbir alan zorunlu değil.',
  },

  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'İletişim',
          fields: [
            {
              name: 'iletisim',
              type: 'group',
              label: 'İletişim sayfası',
              fields: sayfaAlanlari({
                ad: 'İletişim',
                varsayilanBaslik: 'İletişim',
                gorseller: true,
              }),
            },
          ],
        },

        {
          label: 'Değerleme',
          description: 'Değerleme aracının üstünde görünen açıklama.',
          fields: [
            {
              name: 'degerleme',
              type: 'group',
              label: 'Değerleme sayfası',
              fields: sayfaAlanlari({
                ad: 'Değerleme',
                varsayilanBaslik: 'Evinizin değerini öğrenin',
                altBaslikEtiketi: 'Araç üstü açıklama',
              }),
            },
          ],
        },

        {
          label: 'Araçlar',
          fields: [
            {
              name: 'araclar',
              type: 'group',
              label: 'Araçlar sayfası',
              fields: sayfaAlanlari({
                ad: 'Araçlar',
                varsayilanBaslik: 'Hesaplayıcılar',
                altBaslikEtiketi: 'Giriş metni',
              }),
            },
          ],
        },

        {
          label: 'Portföy',
          description:
            'Yalnızca başlık ve açıklama. ⚠️ Liste, filtre ve sıralama koddan gelir; ' +
            'buradan değiştirilemez.',
          fields: [
            {
              name: 'portfoy',
              type: 'group',
              label: 'Portföy sayfası',
              fields: sayfaAlanlari({
                ad: 'Portföy',
                varsayilanBaslik: 'Portföy',
                zenginMetin: false,
              }),
            },
          ],
        },

        {
          label: 'Mahalleler',
          description: 'Yalnızca başlık ve açıklama. Mahalle listesi koddan gelir.',
          fields: [
            {
              name: 'mahalleler',
              type: 'group',
              label: 'Mahalleler sayfası',
              fields: sayfaAlanlari({
                ad: 'Mahalleler',
                varsayilanBaslik: 'Çorlu mahalleleri',
                zenginMetin: false,
              }),
            },
          ],
        },
      ],
    },
  ],
}
