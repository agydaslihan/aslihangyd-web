import type { PointFieldServerProps } from 'payload'

import { haritaStilAdresi } from '@/lib/harita/sunucu'

import KonumAlaniIstemci from './KonumAlaniIstemci'

/**
 * Koordinat alanının sunucu kabuğu.
 *
 * ⚠️ TEK İŞİ STİL ADRESİNİ İNDİRMEK. `haritaStilAdresi()` `server-only`
 * ve anahtarı çalışma zamanında okuyor; istemci bileşeninden çağrılamaz.
 * CLAUDE.md kural 7b'nin tam olarak istediği zincir: ön eksiz değişken,
 * sunucuda okunuyor, prop olarak iniyor.
 *
 * ⚠️ Anahtar yoksa `null` iniyor ve harita yerel sınır stiline düşüyor —
 * koordinat girişi yine çalışıyor. Harita bir kolaylık, tek yol değil.
 */
export default function KonumAlani({ field, path, readOnly }: PointFieldServerProps) {
  /**
   * ⚠️ PROPS OLDUĞU GİBİ GEÇİRİLMİYOR. Payload sunucu bileşenine sunucu
   * alan tipini (`PointField`), istemciye ise istemci tipini
   * (`PointFieldClient`) veriyor; ikisi birbirine atanabilir değil.
   * Yalnızca istemcinin okuduğu alanlar seçiliyor.
   */
  return (
    <KonumAlaniIstemci
      path={path}
      // `label` `false` da olabilir (etiketi gizle) ya da bir fonksiyon.
      etiket={
        typeof field?.label === 'string' || typeof field?.label === 'object'
          ? field.label
          : undefined
      }
      zorunlu={field?.required}
      aciklama={typeof field?.admin?.description === 'string' ? field.admin.description : undefined}
      readOnly={readOnly}
      stilAdresi={haritaStilAdresi()}
    />
  )
}
