'use client'

import { FieldDescription, FieldLabel, useForm, useFormFields } from '@payloadcms/ui'
import { useMemo, useState } from 'react'

import GorselYukleyici, { type YuklenmisGorsel } from './GorselYukleyici'

/**
 * İlan fotoğrafları — Payload'ın dizi alanı arayüzünün YERİNE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MEVCUT İLANA FOTOĞRAF EKLEMEK ÇALIŞIYORDU AMA KULLANILAMIYORDU.
 *
 * Payload'ın varsayılan dizi arayüzü fotoğraf eklemeye izin veriyor: "Satır
 * ekle" → çekmece aç → dosya seç → çekmece kapat. Yirmi fotoğraf için bu
 * yolun yirmi kez yürünmesi gerekiyordu, üstelik sürükle-bırak ve çoklu
 * dosya seçimi olmadan. Sihirbazda (yeni ilan) toplu yükleme vardı; mevcut
 * ilanda yoktu. Aynı işin iki ekranda iki farklı zorlukta olması bir
 * tutarsızlık değil, kullanımdan düşme sebebiydi.
 *
 * ⚠️ İKİNCİ BİR YÜKLEME YOLU YAZILMADI. Bu bileşen yalnızca bir KÖPRÜ:
 * sihirbazın yükleyicisini (`GorselYukleyici`) Payload'ın form durumuna
 * bağlıyor. Yükleme, tür süzgeci, boyut sınırı, alt metin politikası ve
 * bütçe uyarısı orada — tek yerde.
 *
 * ⚠️ VERİ MODELİ DEĞİŞMEDİ. `gorseller` hâlâ `{ gorsel: medya }` satırları
 * taşıyan bir dizi; göç gerekmedi, site tarafındaki okuma yolları aynen
 * çalışıyor. Değişen tek şey panelde çizilen arayüz.
 *
 * ⚠️ FORM DURUMUNA DOKUNMA YOLU PAYLOAD'IN KENDİ ARAYÜZÜ:
 * `addFieldRow` / `moveFieldRow` / `removeFieldRow`. Üçü de Payload'ın
 * dizi alanının kullandığı çağrılar; `dispatchFields` ile elle satır
 * kurmak, Payload'ın satır kimliği ve doğrulama defterini bizim
 * tutmamız demekti.
 *
 * ⚠️ KAYDEDİLMEDEN KALICI OLAN TEK ŞEY MEDYA KAYDININ KENDİSİ. Yüklenen
 * dosya anında `medya` koleksiyonuna giriyor (çöp olarak kalabilir),
 * ama ilana BAĞLANMASI formun kaydedilmesine bağlı — Payload'ın her
 * alanında olduğu gibi. Bu ayrım ekranda da yazılı.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface BaslangicGorseli {
  id: number
  url: string
  ad: string
  alt: string
}

export interface GorselAlaniIstemciOzellikleri {
  path: string
  schemaPath: string
  etiket: string
  readOnly?: boolean
  /** Sunucu kabuğunun indirdiği önizlemeler — kayıtlı satırlar için. */
  baslangic: BaslangicGorseli[]
}

export default function GorselAlaniIstemci({
  baslangic,
  etiket,
  path,
  readOnly,
  schemaPath,
}: GorselAlaniIstemciOzellikleri) {
  const { addFieldRow, disabled, moveFieldRow, removeFieldRow } = useForm()

  const kilitli = readOnly === true || disabled === true

  /**
   * Satırların görsel kimlikleri — SIRASIYLA.
   *
   * ⚠️ `useFormFields` seçicisi DİZGE DÖNÜYOR, dizi değil. Seçici her
   * tuşta çalışıyor ve yeni bir dizi döndürmek bileşeni formdaki her
   * değişiklikte yeniden çizdirirdi (fiyat alanına yazarken bile).
   * Dizge karşılaştırması referansa değil İÇERİĞE bakıyor.
   */
  const kimlikDizgesi = useFormFields(([alanlar]) => {
    const satirSayisi = alanlar[path]?.rows?.length ?? 0
    const kimlikler: string[] = []
    for (let sira = 0; sira < satirSayisi; sira += 1) {
      const deger = alanlar[`${path}.${sira}.gorsel`]?.value
      kimlikler.push(typeof deger === 'number' || typeof deger === 'string' ? String(deger) : '')
    }
    return kimlikler.join(',')
  })

  const kimlikler = useMemo(
    () =>
      kimlikDizgesi === ''
        ? []
        : kimlikDizgesi
            .split(',')
            .map((parca) => Number(parca))
            .filter((sayi) => Number.isFinite(sayi) && sayi > 0),
    [kimlikDizgesi],
  )

  /**
   * Oturum içinde öğrenilen önizlemeler — yüklenen dosyalar ve yazılan
   * alt metinler.
   *
   * ⚠️ SIRA BURADA TUTULMUYOR, YALNIZCA KİMLİK BAŞINA BİLGİ.
   *
   * Sıranın tek kaynağı Payload'ın form durumu. Sırayı burada da tutmak,
   * iki defterin ayrıştığı gün sessizce yanlış kapak gösterirdi: ekranda
   * birinci görünen fotoğrafla kaydedilen kapak farklı olurdu.
   */
  const [ogrenilenler, setOgrenilenler] = useState<Record<number, BaslangicGorseli>>({})

  const defter = useMemo(() => {
    const harita = new Map<number, BaslangicGorseli>()
    for (const gorsel of baslangic) harita.set(gorsel.id, gorsel)
    for (const gorsel of Object.values(ogrenilenler)) harita.set(gorsel.id, gorsel)
    return harita
  }, [baslangic, ogrenilenler])

  const gorseller: YuklenmisGorsel[] = useMemo(
    () =>
      kimlikler.map((id) => {
        const kayitli = defter.get(id)
        return {
          id,
          url: kayitli?.url ?? '',
          // Önizlemesi indirilemeyen satır da listede durmalı: gizlemek,
          // fotoğrafın silindiği izlenimi verirdi.
          ad: kayitli?.ad ?? `Görsel #${id}`,
          alt: kayitli?.alt ?? '',
        }
      }),
    [defter, kimlikler],
  )

  /**
   * Yükleyiciden gelen yeni listeyi form durumuna uygular.
   *
   * ⚠️ TAM YENİDEN YAZMA DEĞİL, FARK UYGULAMA. Diziyi silip baştan kurmak
   * Payload'ın satır kimliklerini her seferinde değiştirir; sıralama bir
   * yana, `id` alanı değişen her satır veritabanında silinip yeniden
   * yazılır. Onun yerine üç işlem ayrı ayrı uygulanıyor: çıkarılanlar
   * silinir, taşınanlar taşınır, eklenenler sona eklenir.
   */
  function uygula(yeni: YuklenmisGorsel[]): void {
    if (kilitli) return

    setOgrenilenler((onceki) => {
      const sonraki = { ...onceki }
      for (const gorsel of yeni) sonraki[gorsel.id] = gorsel
      return sonraki
    })

    const oncekiKimlikler = kimlikler
    const yeniKimlikler = yeni.map((g) => g.id)

    // 1. Çıkarılanlar — SONDAN BAŞA. Baştan silmek, henüz silinmemiş
    //    satırların sırasını kaydırır ve yanlış satır silinir.
    for (let sira = oncekiKimlikler.length - 1; sira >= 0; sira -= 1) {
      const id = oncekiKimlikler[sira]
      if (id !== undefined && !yeniKimlikler.includes(id)) {
        removeFieldRow({ path, rowIndex: sira })
      }
    }

    // 2. Sıralama — kalanların yeni sırası.
    const kalanlar = oncekiKimlikler.filter((id) => yeniKimlikler.includes(id))
    const hedef = yeniKimlikler.filter((id) => oncekiKimlikler.includes(id))
    for (let sira = 0; sira < hedef.length; sira += 1) {
      const beklenen = hedef[sira]
      const simdiki = kalanlar.indexOf(beklenen as number)
      if (simdiki !== -1 && simdiki !== sira) {
        moveFieldRow({ moveFromIndex: simdiki, moveToIndex: sira, path })
        const [alinan] = kalanlar.splice(simdiki, 1)
        if (alinan !== undefined) kalanlar.splice(sira, 0, alinan)
      }
    }

    // 3. Eklenenler — sırayı koruyarak sona.
    let eklemeSirasi = kalanlar.length
    for (const id of yeniKimlikler) {
      if (oncekiKimlikler.includes(id)) continue
      addFieldRow({
        path,
        rowIndex: eklemeSirasi,
        schemaPath,
        subFieldState: { gorsel: { initialValue: id, valid: true, value: id } },
      })
      eklemeSirasi += 1
    }
  }

  return (
    <div className="field-type array-field">
      <FieldLabel label={etiket} path={path} />
      <GorselYukleyici
        gorseller={gorseller}
        onDegisim={uygula}
        kilitli={kilitli}
        bosMetin="Bu ilanda henüz fotoğraf yok. Yukarıdaki alana sürükleyin ya da dosya seçin."
      />
      <FieldDescription
        description="İlk fotoğraf kapak olarak kullanılır. Sıralama sürükleyerek ya da oklarla değişir. ⚠️ Yüklenen dosya hemen görsel deposuna girer; ilana BAĞLANMASI için sayfayı kaydetmeniz gerekir."
        path={path}
      />
    </div>
  )
}
