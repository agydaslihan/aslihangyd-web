'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Buton } from '@/components/ui/Buton'
import { AraIkon } from '@/components/ui/Ikon'
import { sinif } from '@/lib/sinif'

/**
 * Hero arama widget'ı — sayfanın merkezi (şartname §5.1).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ PARAMETRE ADLARI LİSTELEME SAYFASININ SÖZLEŞMESİ.
 *
 * `/portfoy` şu adları okuyor: `tip`, `kategori`, `mahalle`, `oda`,
 * `enAz`, `enCok`, `siralama`. Burada farklı bir ad yazmak widget'ı
 * sessizce işlevsiz kılardı: sayfa açılır, filtre uygulanmaz ve kimse
 * hata görmez. Adlar `gezinme.test.ts` kardeşi bir testle korunuyor.
 *
 * ⚠️ BOŞ SEÇİMLER URL'E YAZILMAZ. "Farketmez" seçili bir alan için
 * `?mahalle=` yazmak, paylaşılan bağlantıyı çirkinleştirir ve listeleme
 * sayfasında "aktif filtre" sayacını yanlış artırırdı.
 *
 * ⚠️ Ticari sekmesi ayrı bir SAYFAYA gider (`/ticari`), `/portfoy`ye
 * filtre olarak değil: ticari portföyün kendi bölümü ve kendi anlatımı
 * var. Bölüm kapalıysa sekme hiç basılmaz.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface MahalleSecenegi {
  slug: string
  ad: string
}

type Sekme = 'satilik' | 'kiralik' | 'ticari'

/** Fiyat aralıkları — TL, kaba basamaklar. Alan/üst sınır `enAz`/`enCok`. */
const SATILIK_FIYATLARI = [
  { deger: '', etiket: 'Fiyat farketmez' },
  { deger: '0-1500000', etiket: '1,5 milyon ₺ altı' },
  { deger: '1500000-3000000', etiket: '1,5 – 3 milyon ₺' },
  { deger: '3000000-5000000', etiket: '3 – 5 milyon ₺' },
  { deger: '5000000-0', etiket: '5 milyon ₺ üstü' },
]

const KIRALIK_FIYATLARI = [
  { deger: '', etiket: 'Fiyat farketmez' },
  { deger: '0-15000', etiket: '15.000 ₺ altı' },
  { deger: '15000-30000', etiket: '15.000 – 30.000 ₺' },
  { deger: '30000-0', etiket: '30.000 ₺ üstü' },
]

const KATEGORILER = [
  { deger: '', etiket: 'Tür farketmez' },
  { deger: 'konut', etiket: 'Konut' },
  { deger: 'isyeri', etiket: 'İşyeri' },
  { deger: 'arsa', etiket: 'Arsa' },
  { deger: 'depo', etiket: 'Depo' },
]

export function AramaWidgeti({
  mahalleler,
  ticariAcik,
}: {
  mahalleler: readonly MahalleSecenegi[]
  ticariAcik: boolean
}) {
  const router = useRouter()
  const [sekme, setSekme] = useState<Sekme>('satilik')
  const [mahalle, setMahalle] = useState('')
  const [kategori, setKategori] = useState('')
  const [fiyat, setFiyat] = useState('')

  const sekmeler: { deger: Sekme; etiket: string }[] = [
    { deger: 'satilik', etiket: 'Satılık' },
    { deger: 'kiralik', etiket: 'Kiralık' },
    ...(ticariAcik ? [{ deger: 'ticari' as const, etiket: 'Ticari' }] : []),
  ]

  const fiyatlar = sekme === 'kiralik' ? KIRALIK_FIYATLARI : SATILIK_FIYATLARI

  function ara() {
    if (sekme === 'ticari') {
      router.push('/ticari')
      return
    }

    const parametreler = new URLSearchParams({ tip: sekme })
    if (mahalle !== '') parametreler.set('mahalle', mahalle)
    if (kategori !== '') parametreler.set('kategori', kategori)

    if (fiyat !== '') {
      const [enAz, enCok] = fiyat.split('-')
      // "0" alt/üst sınırın olmadığını gösteriyor; URL'e yazılmıyor.
      if (enAz !== undefined && enAz !== '0') parametreler.set('enAz', enAz)
      if (enCok !== undefined && enCok !== '0') parametreler.set('enCok', enCok)
    }

    router.push(`/portfoy?${parametreler.toString()}`)
  }

  return (
    <form
      onSubmit={(olay) => {
        olay.preventDefault()
        ara()
      }}
      className="bg-zemin rounded-kart shadow-kalkik border-kenar border-[0.5px] p-4 sm:p-5"
      aria-label="Portföyde ara"
    >
      {/* ── Sekmeler ── */}
      {/* ⚠️ Seçili sekme DOLU ADAÇAYI DEĞİL.
          Dolu adaçayı yalnızca iki eylemde kullanılıyor (header CTA'sı ve
          erişim talebi). Bir sekme durumu eylem değil; dolu zemin
          verilseydi kuralın nadirliği kaybolur ve iki gerçek eylem
          sıradanlaşırdı. Disiplin testi yakaladı.
          Yerine klasik segment kontrolü: oluklu zemin + beyaz seçili yüzey. */}
      <div
        role="tablist"
        aria-label="İşlem türü"
        className="bg-yuzey-2 rounded-buton mb-4 flex gap-1 p-1"
      >
        {sekmeler.map((s) => (
          <button
            key={s.deger}
            type="button"
            role="tab"
            aria-selected={sekme === s.deger}
            onClick={() => {
              setSekme(s.deger)
              // Fiyat aralıkları sekmeye göre değişiyor; eski seçim anlamsız.
              setFiyat('')
            }}
            className={sinif(
              'rounded-buton min-h-11 px-4 text-govde-kucuk transition-colors',
              sekme === s.deger
                ? 'bg-yuzey text-metin shadow-kart font-medium'
                : 'text-metin-2 hover:text-metin',
            )}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {/*
        ─────────────────────────────────────────────────────────────────
        ⚠️ BUTON ALANLARLA AYNI SATIRDA — ALTINDA TAM GENİŞLİK DEĞİL.

        Önceki düzen üç eşit açılır menü ve altlarında tam genişlik bir
        buton koyuyordu. Orantı bozuktu: buton, üç alanın toplamı kadar
        yer kaplayınca formun ağırlık merkezi aşağı kayıyor ve "Ara" bir
        eylem değil bir bant gibi görünüyordu.

        Masaüstünde buton alanların yanında ve genişliği içeriği kadar.
        Mobilde tek kolona düşüyor, dikey yığılma aynen korunuyor — dar
        ekranda tam genişlik buton doğru cevap.

        ⚠️ Buton koşulun DIŞINDA: iki ayrı `Buton` yazmak altın görünümün
        çağrı sayısını iki katına çıkarıyordu ve o sayı denetleniyor
        (`disiplin.test.ts` — altın nadir kalmalı).
        ─────────────────────────────────────────────────────────────────
      */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        {sekme === 'ticari' ? (
          <p className="text-metin-2 text-govde-kucuk flex-1 py-2">
            Ticari portföyün kendi sayfası var — dükkân, ofis, depo ve arsa orada listeleniyor.
          </p>
        ) : (
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <Secim etiket="Mahalle" deger={mahalle} onDegisim={setMahalle}>
              <option value="">Mahalle farketmez</option>
              {mahalleler.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.ad}
                </option>
              ))}
            </Secim>

            <Secim etiket="Tür" deger={kategori} onDegisim={setKategori}>
              {KATEGORILER.map((k) => (
                <option key={k.deger} value={k.deger}>
                  {k.etiket}
                </option>
              ))}
            </Secim>

            <Secim etiket="Fiyat" deger={fiyat} onDegisim={setFiyat}>
              {fiyatlar.map((f) => (
                <option key={f.deger} value={f.deger}>
                  {f.etiket}
                </option>
              ))}
            </Secim>
          </div>
        )}

        {/*
          ⚠️ ALTIN, MÜREKKEP DEĞİL — VE BU BİLİNÇLİ BİR İSTİSNA.

          `Buton`un `koyu` görünümü "form gönderimi altın harcamasın" diye
          seçilmişti ve gerekçesi hâlâ geçerli: dolu altın nadir kaldıkça
          değerli. Ama Aslıhan bu butonun altın olmasını istedi ve karar
          onun: ana sayfanın vitrinindeki tek eylem bu.

          ⚠️ Kenarlık ve mürekkep metin `Buton`dan geliyor: altın zemin
          sayfadan 2,28:1 ayrışıyor (WCAG 1.4.11 için 3:1 gerekli) ve
          üzerinde beyaz metin 2,36:1 kalıyor. İkisi de orada çözülmüş;
          burada elle sınıf yazmak o çözümü atlamak olurdu.
        */}
        <Buton type="submit" gorunum="aksan" sinifAdi="min-h-11 w-full sm:w-auto">
          <AraIkon width={18} height={18} />
          {sekme === 'ticari' ? 'Ticari portföyü aç' : 'Ara'}
        </Buton>
      </div>
    </form>
  )
}

/**
 * Etiketli açılır liste.
 *
 * ⚠️ Etiket görsel olarak gizli DEĞİL, üstte duruyor: mobilde üç kutu alt
 * alta gelince "hangi kutu neydi" sorusu doğuyor ve yalnızca placeholder'a
 * güvenmek seçim yapıldıktan sonra bağlamı siliyor.
 */
function Secim({
  etiket,
  deger,
  onDegisim,
  children,
}: {
  etiket: string
  deger: string
  onDegisim: (deger: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-metin-3 text-eyebrow font-medium uppercase">{etiket}</span>
      <select
        value={deger}
        onChange={(olay) => onDegisim(olay.target.value)}
        className="border-kenar-giris rounded-buton bg-yuzey min-h-11 border-[0.5px] px-3 text-govde-kucuk"
      >
        {children}
      </select>
    </label>
  )
}
