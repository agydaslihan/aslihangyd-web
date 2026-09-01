import type { AdminViewServerProps } from 'payload'

import '@/components/panel/aktarim.css'

import { yoneticiMi } from '@/lib/erisim'

import { OlcekSihirbazi } from './OlcekSihirbazi'

/**
 * Ölçek düzeltme ekranı (`/admin/olcek-duzeltme`).
 *
 * ⚠️ Yalnızca yönetici: tek çağrıda 26 mahallenin rakamını bin katına
 * çıkarabilen bir araç.
 */
export default async function OlcekGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Görünüm gövdesi oturumsuz da çalışır; kapı zorunlu (CLAUDE.md).
  if (!req.user) return null

  if (!yoneticiMi(req.user)) {
    return (
      <div className="aktarim">
        <h1 className="aktarim-baslik">Ölçek düzeltme</h1>
        <p className="aktarim-not">Bu ekran yalnızca yöneticiye açık.</p>
      </div>
    )
  }

  return (
    <div className="aktarim">
      <h1 className="aktarim-baslik">Ölçek düzeltme (binlik ayırıcı)</h1>

      <div className="aktarim-uyari">
        <p>
          <strong>Sorun nereden çıkıyor:</strong> panelin sayı alanı noktayı{' '}
          <strong>ondalık</strong> ayırıcı sayar. Türkçe yazan biri <code>39.704</code> yazdığında
          niyeti otuz dokuz bin yedi yüz dört; alanın anladığı otuz dokuz tam yedi yüz dört binde.
          Hata sessiz: alan kabul eder, kayıt oluşur, uyarı çıkmaz.
        </p>
        <p>
          <strong>Bu araç düzeltmeyi ÖNERİR, karar vermez.</strong> ×1000 en olası düzeltme ama
          doğru rakamı sistem bilmiyor. Her satırı tek tek onaylayın; seçmediğiniz hiçbir alana
          dokunulmaz.
        </p>
        <p>
          <strong>Kira çarpanı, değişim oranı, m² ve gözlem sayısı taranmaz.</strong> Bunların küçük
          olması normal (12 yıl çarpan, %23 değişim, 145 m²); taramaya dahil etmek doğru rakamları
          şüpheli göstererek uyarıyı değersizleştirirdi.
        </p>
      </div>

      <OlcekSihirbazi />
    </div>
  )
}
