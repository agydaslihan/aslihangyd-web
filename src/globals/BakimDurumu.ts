import type { GlobalConfig } from 'payload'

import { GOREV_KUNYELERI } from '@/lib/bakim/kunye'
import { yalnizcaPanel, yalnizcaYonetici } from '@/lib/erisim'

/**
 * Bakım görevlerinin son durumu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VERİTABANINDA, GÜNLÜK DOSYASINDA DEĞİL.
 *
 * Cron nöbetçisi günlük dosyasına bakıyor ve o dosya sunucuda. Panel ise
 * uygulamanın içinde çalışıyor ve dosya sistemine güvenle erişemez
 * (kap yeniden oluşturulduğunda günlük başka yerde olabilir).
 *
 * Görev her koştuğunda buraya yazıyor; panel buradan okuyor. İki katman
 * birbirini yedekliyor: cron nöbetçisi sunucuda, panel şeridi ekranda.
 *
 * ⚠️ Bu global ELLE DÜZENLENMEZ. Okunur alan olarak duruyor ki biri
 * "son çalışma"yı elle ileri alıp uyarıyı susturmasın — susturulan uyarı,
 * çalışmayan bir yasal görev demek.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const BakimDurumu: GlobalConfig = {
  slug: 'bakim-durumu',
  label: 'Bakım Durumu',

  access: {
    // Panel dışına açılmaz: hangi görevin ne zaman koştuğu iç bilgi.
    read: yalnizcaPanel,
    // ⚠️ Yalnızca yönetici: bakım görevlerinin durumu — sistem kaydı.
    update: yalnizcaYonetici,
  },

  admin: {
    group: 'Ayarlar',
    description:
      'Bakım görevlerinin son çalışma bilgisi. Görevler otomatik yazar; elle değiştirmeyin.',
  },

  fields: [
    {
      name: 'gorevler',
      type: 'array',
      label: 'Görevler',
      admin: {
        readOnly: true,
        description:
          'Her satır bir bakım görevinin son durumunu tutar. ' +
          `Tanımlı görevler: ${GOREV_KUNYELERI.map((g) => g.anahtar).join(', ')}`,
      },
      fields: [
        { name: 'anahtar', type: 'text', label: 'Görev', required: true },
        { name: 'sonCalisma', type: 'date', label: 'Son çalışma' },
        { name: 'sonBasariliCalisma', type: 'date', label: 'Son BAŞARILI çalışma' },
        { name: 'sonHata', type: 'text', label: 'Son hata' },
        { name: 'sonIslenen', type: 'number', label: 'Son işlenen kayıt' },
      ],
    },
  ],
}
