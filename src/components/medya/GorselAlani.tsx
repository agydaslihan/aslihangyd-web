import type { ArrayFieldServerProps } from 'payload'

import GorselAlaniIstemci, { type BaslangicGorseli } from './GorselAlaniIstemci'

/**
 * İlan fotoğrafları alanının sunucu kabuğu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TEK İŞİ KAYITLI GÖRSELLERİN ÖNİZLEMESİNİ İNDİRMEK.
 *
 * Payload'ın form durumu `gorseller.0.gorsel` için yalnızca KİMLİĞİ
 * taşıyor; dosya adı ve küçük resim adresi yok. İstemci bunları
 * bilmeden mevcut fotoğrafları gösteremez — sıralanacak şeyin ne olduğu
 * görünmezse sıralama arayüzü işe yaramaz.
 *
 * Alternatif, istemciden `/api/medya?where[id][in]=…` çağırmaktı: panel
 * her ilan açılışında fazladan bir tur daha atardı. Kabuk zaten sunucuda
 * çalışıyor ve `req.payload` elinde.
 *
 * ⚠️ `depth: 0` ve ALAN SEÇİMİ YOK: `url` ve `sizes` Payload tarafından
 * yükleme alanlarına sonradan ekleniyor; `select` ile daraltmak küçük
 * resim adresini düşürüyordu.
 *
 * ⚠️ HATA YUTULUYOR. Önizleme bir kolaylık; getirilemezse alan yine
 * çalışmalı (yükleme, sıralama, silme). Boş bir önizlemeyle açılan ekran,
 * hiç açılmayan ekrandan iyidir.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default async function GorselAlani({
  data,
  field,
  path,
  readOnly,
  req,
  schemaPath,
}: ArrayFieldServerProps) {
  const satirlar = Array.isArray(data?.gorseller) ? data.gorseller : []

  const kimlikler = satirlar
    .map((satir: unknown) => {
      const deger = (satir as { gorsel?: unknown } | null)?.gorsel
      if (typeof deger === 'number') return deger
      if (typeof deger === 'string' && /^\d+$/.test(deger)) return Number(deger)
      if (typeof deger === 'object' && deger !== null && 'id' in deger) {
        return Number((deger as { id: unknown }).id)
      }
      return null
    })
    .filter((id): id is number => id !== null && Number.isFinite(id))

  let baslangic: BaslangicGorseli[] = []

  if (kimlikler.length > 0) {
    try {
      const sonuc = await req.payload.find({
        collection: 'medya',
        where: { id: { in: kimlikler } },
        limit: kimlikler.length,
        depth: 0,
        overrideAccess: false,
        user: req.user,
      })

      baslangic = sonuc.docs.map((belge) => ({
        id: Number(belge.id),
        url: typeof belge.url === 'string' ? belge.url : '',
        ad: typeof belge.filename === 'string' ? belge.filename : `#${belge.id}`,
        /**
         * ⚠️ OTOMATİK ÜRETİLMİŞ METİN KUTUYA YAZILMIYOR.
         *
         * Kanca boş alt metni dosya adından türetip `altOtomatik`
         * işaretliyor. O metni kutuda göstermek, insan eliyle yazılmış
         * gibi görünürdü; odak çıkışında da aynen geri yazılır ve işaret
         * sessizce kalkardı — erişilebilirlik borcu panelden kaybolurdu.
         */
        alt: belge.altOtomatik === true ? '' : (belge.alt ?? ''),
      }))
    } catch {
      baslangic = []
    }
  }

  return (
    <GorselAlaniIstemci
      path={path}
      /**
       * ⚠️ `addFieldRow` bunu KULLANMIYOR (yerel bir indirgeyici çağrısı);
       * yine de geçiriliyor, çünkü Payload'ın kendi dizi alanı geçiriyor ve
       * bir gün gereken hâle gelirse değer burada hazır olsun. Elle
       * uydurulmuyor: props'tan geliyor.
       */
      schemaPath={schemaPath ?? 'gorseller'}
      etiket={typeof field?.label === 'string' ? field.label : 'Fotoğraflar'}
      readOnly={readOnly}
      baslangic={baslangic}
    />
  )
}
