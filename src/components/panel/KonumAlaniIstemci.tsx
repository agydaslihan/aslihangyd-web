'use client'

import type { StaticLabel } from 'payload'

import { FieldDescription, FieldLabel, useField } from '@payloadcms/ui'
import dynamic from 'next/dynamic'
import { useId, useState } from 'react'

import './konumAlani.css'

import {
  konumuDenetle,
  koordinatCoz,
  koordinatYaz,
  noktadanCoz,
  noktayaCevir,
} from '@/lib/konum/dogrula'

/**
 * ⚠️ maplibre-gl ~200 kB gzip ve `window` istiyor. Panelin her ekranına
 * girmemesi için dinamik; koordinat alanı olmayan sayfalarda hiç inmiyor.
 */
const KonumSecici = dynamic(() => import('./KonumSecici'), {
  ssr: false,
  loading: () => <div className="konum-harita konum-harita-bekliyor" aria-hidden="true" />,
})

/**
 * ⚠️ PAYLOAD'IN PROP TİPİ DEĞİL, DARALTILMIŞ BİR ARAYÜZ.
 *
 * Bu bileşeni Payload doğrudan çizmiyor; sunucu kabuğu (`KonumAlani`)
 * çiziyor. Yani props'un şeklini biz belirliyoruz ve yalnızca gerçekten
 * okunan alanları istemek, Payload'ın sürüm sürüm değişen alan tiplerine
 * bağlanmaktan iyi. Sunucu ve istemci alan tipleri (`PointField` /
 * `PointFieldClient`) birbirine atanabilir DEĞİL; tümünü geçirmek
 * kabukta tip hatası üretiyordu.
 */
export interface KonumAlaniIstemciOzellikleri {
  path: string
  etiket?: StaticLabel
  zorunlu?: boolean
  aciklama?: string
  readOnly?: boolean
  stilAdresi: string | null
}

/**
 * Koordinat alanı — Payload'ın varsayılan `point` editörünün yerine.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ENLEM ÖNCE, BOYLAM SONRA — VE BU DÜZELTMENİN TAMAMI.
 *
 * Payload'ın kendi editörü GeoJSON sırasını izliyor ve panele önce
 * "Boylam" kutusunu basıyor. İnsanın bildiği sıra bunun tersi: koordinat
 * her yerde "enlem, boylam" diye okunur — haritada, GPS'te, tapuda.
 * Form alışkanlığın tersini sorduğu için 13 Eylül 2026'da girilen iki
 * ilanın da koordinatı bozuktu; biri Suudi Arabistan'a düşüyordu.
 *
 * ⚠️ SAKLAMA SIRASI DEĞİŞMEDİ. Veritabanında ve Payload dizisinde sıra
 * hâlâ GeoJSON: `[boylam, enlem]`. Değişen tek şey ekrandaki sıra.
 * Dönüşüm `lib/konum/dogrula.ts` içinde tek bir yerde.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function KonumAlaniIstemci(props: KonumAlaniIstemciOzellikleri) {
  const { aciklama, etiket, path: yolProp, readOnly, stilAdresi, zorunlu } = props
  const { disabled, path, setValue, value } = useField<[number, number] | null>({
    potentiallyStalePath: yolProp,
  })

  const kilitli = readOnly === true || disabled === true
  const kimlik = useId()

  const kayitli = noktadanCoz(value)

  /**
   * ⚠️ Metin yerel, değer formda — `TurkceSayiAlani` ile aynı kalıp.
   * Kullanıcı "41." yazarken ara durumu forma yazmak alanı bozardı.
   */
  const [metin, setMetin] = useState(() => ({
    enlem: koordinatYaz(kayitli.enlem),
    boylam: koordinatYaz(kayitli.boylam),
  }))

  // Dışarıdan gelen değişiklik (haritadan seçim, sunucu yanıtı) metni tazeler.
  const [oncekiDeger, setOncekiDeger] = useState(value)
  if (value !== oncekiDeger) {
    setOncekiDeger(value)
    const yeni = noktadanCoz(value)
    setMetin({ enlem: koordinatYaz(yeni.enlem), boylam: koordinatYaz(yeni.boylam) })
  }

  const enlem = koordinatCoz(metin.enlem)
  const boylam = koordinatCoz(metin.boylam)
  const denetim = konumuDenetle(enlem, boylam)
  /**
   * ⚠️ Yer tutucu değerin işaretçisi ÇİZİLMİYOR. `1, 1` Gine Körfezi'ne
   * düşer; haritayı oraya uçurmak, uyarının "bu bir konum değil" dediği
   * şeyi konummuş gibi göstermek olurdu.
   */
  const noktaGosterilmez = denetim.durum === 'gecersiz' || denetim.durum === 'yer_tutucu'

  const yaz = (yeniEnlem: number | null, yeniBoylam: number | null) => {
    setValue(noktayaCevir(yeniEnlem, yeniBoylam))
  }

  const kutuyaYazildi = (alan: 'enlem' | 'boylam', ham: string) => {
    const sonraki = { ...metin, [alan]: ham }
    setMetin(sonraki)
    yaz(koordinatCoz(sonraki.enlem), koordinatCoz(sonraki.boylam))
  }

  const haritadanSecildi = (yeniEnlem: number, yeniBoylam: number) => {
    setMetin({ enlem: koordinatYaz(yeniEnlem), boylam: koordinatYaz(yeniBoylam) })
    yaz(Number(yeniEnlem.toFixed(6)), Number(yeniBoylam.toFixed(6)))
  }

  const takasEt = () => {
    const takas = denetim.takas
    if (takas === null) return
    haritadanSecildi(takas.enlem, takas.boylam)
  }

  return (
    <div className="field-type point konum-alani">
      <FieldLabel label={etiket} required={zorunlu} />

      {/*
        ⚠️ SIRA: ENLEM ÖNCE. Bu satırın yeri değiştirilmemeli — düzeltmenin
        tamamı bu sıralamada.
      */}
      <div className="konum-kutular">
        <div className="konum-kutu">
          <label htmlFor={`${kimlik}-enlem`}>Enlem (kuzey–güney)</label>
          <input
            id={`${kimlik}-enlem`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="41.148930"
            value={metin.enlem}
            disabled={kilitli}
            onChange={(olay) => kutuyaYazildi('enlem', olay.target.value)}
          />
          <span className="konum-ipucu">Çorlu için ~41.1</span>
        </div>

        <div className="konum-kutu">
          <label htmlFor={`${kimlik}-boylam`}>Boylam (doğu–batı)</label>
          <input
            id={`${kimlik}-boylam`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="27.827424"
            value={metin.boylam}
            disabled={kilitli}
            onChange={(olay) => kutuyaYazildi('boylam', olay.target.value)}
          />
          <span className="konum-ipucu">Çorlu için ~27.8</span>
        </div>
      </div>

      {denetim.mesaj !== null && (
        <div className={`konum-uyari konum-uyari-${denetim.durum}`} role="status">
          {/* ⚠️ Renk tek taşıyıcı değil (WCAG 1.4.1): simge ve metin de var. */}
          <span aria-hidden="true">⚠️</span>
          <div>
            <p>{denetim.mesaj}</p>

            {/*
              ⚠️ DÜZELTMEYİ SUNUYOR, YALNIZCA ŞİKÂYET ETMİYOR. "Yanlış"
              deyip bırakmak, aynı hatanın ikinci kez yapılmasına açık
              kapı bırakırdı.
            */}
            {denetim.takas !== null && !kilitli && (
              <button type="button" className="konum-takas" onClick={takasEt}>
                Enlem ve boylamı takas et
              </button>
            )}
          </div>
        </div>
      )}

      {/*
        ⚠️ HARİTA KUTULARDAN SONRA. Elle giriş tam yetkili yol; harita bir
        kolaylık. Sıralama bunu söylüyor ve klavye kullanıcısı haritayı
        atlayıp alanları doldurabiliyor.
      */}
      <p className="konum-harita-baslik">
        Haritaya tıklayarak da seçebilirsiniz — işaretçi sürüklenebilir.
      </p>

      <KonumSecici
        enlem={noktaGosterilmez ? null : enlem}
        boylam={noktaGosterilmez ? null : boylam}
        onSecim={haritadanSecildi}
        stilAdresi={stilAdresi}
        kilitli={kilitli}
      />

      <FieldDescription description={aciklama} path={path} />
    </div>
  )
}
