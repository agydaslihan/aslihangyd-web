'use client'

import { useFormFields } from '@payloadcms/ui'

import './olcekUyarisi.css'

import { NITELIK_ALANLARI } from '@/lib/mahalle/nitelikler'

/**
 * Niteliksel profilin tamamlanma göstergesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YÜZDE BİR OYUN DEĞİL, BİR HATIRLATMA.
 *
 * Yirmi altı mahallenin profilini doldurmak uzun bir iş ve yarım kalması
 * en olası sonuç. Hangi mahallede neyin eksik olduğunu görmeden, hangisine
 * devam edileceği de bilinmiyor.
 *
 * ⚠️ Uzun analiz metni (`icerik`) yüzdeye GİRMİYOR: tek paragraf yazan
 * kişiye "%60 tamam" demek, yüzdeyi işe yaramaz kılardı.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function NitelikDurumu() {
  const alanlar = useFormFields(([fields]) => fields)

  const durumlar = NITELIK_ALANLARI.map((alan) => {
    const deger = alanlar?.[alan.anahtar]?.value
    const dolu = Array.isArray(deger)
      ? deger.length > 0
      : typeof deger === 'string'
        ? deger.trim() !== ''
        : deger !== null && deger !== undefined
    return { ...alan, dolu }
  })

  const dolu = durumlar.filter((d) => d.dolu).length
  const yuzde = Math.round((dolu / durumlar.length) * 100)
  const eksikler = durumlar.filter((d) => !d.dolu).map((d) => d.etiket)

  return (
    <div
      className="olcek-uyari"
      role="status"
      style={{ borderColor: 'var(--theme-elevation-200)' }}
    >
      <p className="olcek-uyari-baslik">
        Niteliksel profil: %{yuzde} ({dolu}/{durumlar.length} alan)
      </p>

      {eksikler.length === 0 ? (
        <p>Tüm alanlar dolu. Bu mahallenin profili sitede görünüyor.</p>
      ) : (
        <>
          <p>Eksik: {eksikler.join(', ')}.</p>
          <p className="olcek-uyari-neden">
            ⚠️ Bu bölüm siz doldurmadan sitede <strong>hiç gösterilmiyor</strong>. Yarım bir profil
            yayınlamaktansa, boş durum metni doğru şeyi söylüyor.
          </p>
        </>
      )}
    </div>
  )
}
