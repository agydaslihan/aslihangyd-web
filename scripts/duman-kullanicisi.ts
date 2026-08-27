/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ⚠️  TEST KULLANICISI — YALNIZCA GELİŞTİRME VE CI
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `scripts/gezinme-dumani.mjs` panel rotalarını **oturumlu** açmak zorunda:
 * admin görünümleri oturumsuz da 200 döner ama gövde boş gelir. Boş gövde
 * ile "sayfa açıldı" demek, tam olarak 27 Ağustos 2026'da kaçırdığımız
 * arızayı kaçırmak olurdu.
 *
 * Bu betik o oturum için tek kullanımlık bir yönetici açar.
 *
 * ⚠️ BEYAZ LİSTE, KARA LİSTE DEĞİL — `seed.ts` ile aynı gerekçe.
 * `NODE_ENV !== 'production'` yazmak yetmiyor: değişken tanımsızken (elle
 * açılmış bir kabukta en yaygın durum) betik çalışırdı. Üretim
 * veritabanına yönetici eklemek, kimsenin haberi olmadan bir arka kapı
 * açmaktır. Ortamın açıkça `development` olması gerekiyor.
 *
 * ⚠️ CI dışında bu hesabı bırakmayın. Şifre depoda yazılı; bilinen şifreli
 * bir yönetici, üretimde güvenlik açığıdır.
 *
 * Kullanım:
 *   NODE_ENV=development pnpm duman:kullanici
 * ═══════════════════════════════════════════════════════════════════════
 */

import config from '@payload-config'
import { getPayload } from 'payload'

export const DUMAN_EPOSTA = 'duman@ornek.test'
export const DUMAN_SIFRE = 'DumanTesti!2026'

if (process.env.NODE_ENV !== 'development') {
  console.error(
    `✗ Duman kullanıcısı yalnızca NODE_ENV=development ile açılır (şu an: ${
      process.env.NODE_ENV ?? 'tanımsız'
    }).`,
  )
  process.exit(1)
}

const payload = await getPayload({ config })

const mevcut = await payload.find({
  collection: 'kullanicilar',
  where: { email: { equals: DUMAN_EPOSTA } },
  limit: 1,
})

if (mevcut.docs[0]) {
  await payload.update({
    collection: 'kullanicilar',
    id: mevcut.docs[0].id,
    data: { password: DUMAN_SIFRE, rol: 'yonetici' },
  })
  console.log(`✓ Duman kullanıcısı güncellendi: ${DUMAN_EPOSTA}`)
} else {
  await payload.create({
    collection: 'kullanicilar',
    data: {
      email: DUMAN_EPOSTA,
      password: DUMAN_SIFRE,
      adSoyad: 'Duman Testi',
      rol: 'yonetici',
    },
  })
  console.log(`✓ Duman kullanıcısı açıldı: ${DUMAN_EPOSTA}`)
}

process.exit(0)
