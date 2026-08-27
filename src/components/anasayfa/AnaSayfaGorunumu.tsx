import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import { anaSayfaHazirligi } from '@/lib/anasayfa/hazirlik'

/**
 * Ana sayfa bölümlerinin durumu — şartname §6.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: "BÖLÜM NEDEN GÖRÜNMÜYOR?" SORUSU.
 *
 * Verisi olmayan bölüm hiç çizilmiyor (şartnamenin kuralı) ve bu, panele
 * bakan kişi için görünmez bir davranış: sayfada olmayan bir şeyin neden
 * olmadığını sayfaya bakarak anlayamazsınız. Bu ekran o boşluğu kapatıyor.
 *
 * ⚠️ EKRAN KENDİ KOŞULUNU YAZMIYOR — sayfanın okuduğu fonksiyonun AYNISINI
 * okuyor (`anaSayfaHazirligi`). Ayrı yazılsalardı panel "hazır" derken
 * sayfa bölümü çizmeyebilirdi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ OTURUM KAPISI GÖVDEDE. Admin görünümleri oturumsuz da çalışıyor;
 * `if (!req.user) return null` olmadan bu ekran herkese açık olurdu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ OTURUM `initPageResult.req.user`DAN OKUNUR — ÜST DÜZEY `user`DAN DEĞİL.
 *
 * Bu ekran bir süre BOMBOŞ AÇILDI ve hiçbir hata vermedi. Sebep: gövde
 * `{ user }` prop'unu okuyordu. `AdminViewServerProps` tipinde `user`
 * var ama İSTEĞE BAĞLI (`user?: TypedUser`) ve Payload özel görünümlere
 * onu GEÇMİYOR. Yani:
 *
 *   · TypeScript memnun — alan tipte var.
 *   · Çalışma zamanında `undefined` — kapı herkesi çeviriyor.
 *   · `return null` — sayfa boş, konsol sessiz, sunucu günlüğü temiz.
 *
 * Oturum bilgisinin geçtiği tek yer `initPageResult.req`. Projedeki diğer
 * sekiz görünüm baştan böyle yazılmıştı; sapan iki tanesi bunlardı.
 *
 * Kural `lib/panel/gorunumKapisi.test.ts` ile denetleniyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default async function AnaSayfaGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  if (!req.user) return null

  const bolumler = await anaSayfaHazirligi()
  const hazirSayisi = bolumler.filter((bolum) => bolum.hazir).length

  return (
    <div style={{ padding: '2rem', maxWidth: '60rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 500, margin: 0 }}>Ana sayfa bölümleri</h1>
      <p style={{ marginTop: '0.75rem', lineHeight: 1.6, opacity: 0.8 }}>
        Verisi olmayan bölüm ana sayfada <strong>hiç çizilmiyor</strong> — boş durum kartı
        gösterilmiyor. Sayfa kısalıyor, zayıflamıyor. Veri girildiğinde bölüm kendiliğinden görünür
        hâle geliyor.
      </p>
      <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
        {hazirSayisi} / {bolumler.length} bölüm hazır.
      </p>

      {/*
        ⚠️ BU EKRAN "NEDEN GÖRÜNMÜYOR" SORUSUNU CEVAPLIYOR, "NEREDE
        DURUYOR" SORUSUNU DEĞİL. İkisi ayrı ekran; ayrı olduklarını
        söylemezsek kullanıcı sırayı burada arar ve bulamaz.
      */}
      <p style={{ marginTop: '1rem', opacity: 0.8, lineHeight: 1.6 }}>
        Bölümlerin <strong>sırasını</strong> ve ana sayfada görünüp görünmeyeceğini{' '}
        <Link href="/admin/globals/anasayfa-duzeni">Ana Sayfa Düzeni</Link> ekranından
        değiştirebilirsiniz. Buradaki liste yalnızca <strong>verisi hazır mı</strong> sorusunu
        cevaplar.
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1.5rem' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid currentColor', opacity: 0.6 }}>
            <th style={{ padding: '0.5rem' }}>§</th>
            <th style={{ padding: '0.5rem' }}>Bölüm</th>
            <th style={{ padding: '0.5rem' }}>Durum</th>
            <th style={{ padding: '0.5rem' }}>Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {bolumler.map((bolum) => (
            <tr key={bolum.anahtar} style={{ borderBottom: '1px solid rgba(128,128,128,0.25)' }}>
              <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap', opacity: 0.6 }}>
                {bolum.sira}
              </td>
              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>{bolum.ad}</td>
              <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                {/* ⚠️ Simge değil KELİME: ● ve ○ font alt kümesinde yok
                    (alfabe.test.ts yakaladı) ve durum bilgisi renge ya da
                    şekle değil metne bağlı olmalı (WCAG 1.4.1). */}
                {bolum.hazir ? 'hazır' : 'veri bekliyor'}
              </td>
              <td style={{ padding: '0.75rem 0.5rem', lineHeight: 1.6 }}>
                {bolum.aciklama}
                {bolum.nereden ? (
                  <span style={{ display: 'block', opacity: 0.65, marginTop: '0.25rem' }}>
                    Nereden: {bolum.nereden}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
