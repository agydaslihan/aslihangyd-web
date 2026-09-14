'use client'

import type { DefaultCellComponentProps } from 'payload'

import './ilanDurumHucresi.css'

import {
  eidsIlerlemesi,
  EIDS_DURUMLARI,
  ILAN_DURUM_ETIKETLERI,
  type EidsDurum,
  type IlanDurumu,
} from '@/lib/eids'

/**
 * İlan listesinde durum sütunu — yanında EİDS eksiği.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: HANGİ İLANIN NEYİ EKSİK, LİSTEDE GÖRÜNMÜYORDU.
 *
 * Liste yalnızca "Taslak" yazıyordu. Bir ilanın neden taslakta kaldığını
 * öğrenmenin tek yolu onu açıp EİDS alanlarına bakmaktı — on ilan için on
 * kez. Rozet aynı bilgiyi listede veriyor: "Taslak — EİDS eksik (4)".
 *
 * ⚠️ BU BİR KAPI DEĞİL, AYNA. Gerçek kapı `eidsYayinEngeli` kancası ve
 * sunucuda çalışıyor. Buradaki sayı aynı motordan (`eidsIlerlemesi` →
 * `eidsDegerlendir`) geliyor; kendi kural kopyasını taşısaydı listede
 * yazan sayı ile kaydetmede çıkan hata ayrışabilirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** `rowData`dan güvenli okuma — liste sorgusu alanı getirmemiş olabilir. */
function metin(veri: Record<string, unknown>, alan: string): string | undefined {
  const deger = veri[alan]
  return typeof deger === 'string' && deger.trim() !== '' ? deger : undefined
}

export default function IlanDurumHucresi({
  cellData,
  rowData,
}: DefaultCellComponentProps<never, unknown>) {
  const durum = typeof cellData === 'string' ? (cellData as IlanDurumu) : null
  const etiket = durum !== null ? (ILAN_DURUM_ETIKETLERI[durum] ?? durum) : '—'

  const satir = (rowData ?? {}) as Record<string, unknown>
  const hamDurum = metin(satir, 'eidsDurum')

  const ilerleme = eidsIlerlemesi({
    eidsDurum: EIDS_DURUMLARI.includes(hamDurum as EidsDurum) ? (hamDurum as EidsDurum) : undefined,
    tasinmazNo: metin(satir, 'tasinmazNo'),
    ada: metin(satir, 'ada'),
    parsel: metin(satir, 'parsel'),
    eidsYetkiBaslangic: metin(satir, 'eidsYetkiBaslangic'),
    eidsYetkiBitis: metin(satir, 'eidsYetkiBitis'),
  })

  /**
   * ⚠️ YAYINDAKİ İLANDA ROZET YOK. Yayına alınmış bir ilan EİDS'ten
   * geçmiş demektir; orada eksik göstermek kafa karıştırırdı. Rozet
   * yalnızca yayına GİDEMEYEN kayıtlar için bilgi taşıyor.
   */
  const rozetGoster = ilerleme.eksikler.length > 0 && durum !== 'yayinda' && durum !== 'rezerve'

  return (
    <span className="ilan-durum-hucre">
      <span>{etiket}</span>

      {rozetGoster && (
        <span
          className="ilan-durum-rozet"
          /* ⚠️ Renk tek taşıyıcı değil (WCAG 1.4.1): metin sayıyı da yazıyor. */
          title={ilerleme.eksikler.map((e) => e.etiket).join(', ')}
        >
          EİDS eksik ({ilerleme.eksikler.length})
        </span>
      )}
    </span>
  )
}
