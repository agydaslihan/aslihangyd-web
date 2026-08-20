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
 */
export default async function AnaSayfaGorunumu({ user }: AdminViewServerProps) {
  if (!user) return null

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
