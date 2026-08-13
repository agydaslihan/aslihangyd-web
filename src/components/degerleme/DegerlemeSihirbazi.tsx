'use client'

import { useMemo, useState } from 'react'

import { SayiAlani, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { BilgiIkon, OkIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { Rozet } from '@/components/ui/Rozet'
import { paraYaz, sayiYaz } from '@/lib/bicimlendirme'
import {
  BINA_DURUMLARI,
  degerlemeYap,
  GUVEN_ETIKETLERI,
  KAT_TIPLERI,
  type BinaDurumu,
  type DegerlemeKatsayilari,
  type KatTipi,
} from '@/lib/degerleme/motor'
import { raporAdresi } from '@/lib/rapor/parametreler'
import { sinif } from '@/lib/sinif'

/**
 * "Evim ne eder?" sihirbazı.
 *
 * ⚠️ Sonuç iletişim bilgisi arkasında KİLİTLİ DEĞİL (CLAUDE.md kural 6b).
 * Ziyaretçi hiçbir şey vermeden gerçek bir sonuç görür. İletişim yalnızca
 * *derinleştirme* için istenir: gerçek değerleme randevusu.
 *
 * Akış tek ekranda ve canlı: kullanıcı m² girdiği anda aralık belirmeye
 * başlar, diğer alanlarla daralır. Adım adım ilerleyen bir sihirbaz burada
 * daha kötü olurdu — sonucun her girdiyle nasıl değiştiğini görmek, aracın
 * kendisini öğretiyor.
 */

export interface MahalleSecenegi {
  slug: string
  ad: string
  m2Fiyati: number | null
  gozlemSayisi: number | null
}

export function DegerlemeSihirbazi({
  mahalleler,
  katsayilar,
  whatsapp,
}: {
  mahalleler: MahalleSecenegi[]
  katsayilar: DegerlemeKatsayilari
  whatsapp: string | null
}) {
  const [mahalleSlug, setMahalleSlug] = useState('')
  const [m2, setM2] = useState('')
  const [kat, setKat] = useState<KatTipi | ''>('')
  const [binaYasi, setBinaYasi] = useState('')
  const [durum, setDurum] = useState<BinaDurumu | ''>('')

  const secilenMahalle = mahalleler.find((mahalle) => mahalle.slug === mahalleSlug) ?? null

  const sonuc = useMemo(
    () =>
      degerlemeYap(
        {
          mahalleM2Fiyati: secilenMahalle?.m2Fiyati ?? null,
          gozlemSayisi: secilenMahalle?.gozlemSayisi ?? null,
          brutM2: sayiyaCevir(m2),
          kat: kat || null,
          binaYasi: sayiyaCevir(binaYasi),
          durum: durum || null,
        },
        katsayilar,
      ),
    [secilenMahalle, m2, kat, binaYasi, durum, katsayilar],
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-12">
      <form className="flex flex-col gap-5" onSubmit={(olay) => olay.preventDefault()}>
        <Secim
          etiket="Mahalle"
          deger={mahalleSlug}
          onDegisim={setMahalleSlug}
          bosEtiket="Mahalle seçin"
          secenekler={mahalleler.map((mahalle) => ({
            value: mahalle.slug,
            label: mahalle.ad,
            // Verisi olmayan mahalle seçilebilir ama bunu önceden söylüyoruz.
            devreDisi: mahalle.m2Fiyati === null,
          }))}
        />

        <SayiAlani
          etiket="Brüt metrekare"
          deger={m2}
          onDegisim={setM2}
          birim="m²"
          yerTutucu="135"
          ipucu="Tapuda veya ilanda yazan brüt alan"
        />

        <Secim
          etiket="Bulunduğu kat"
          deger={kat}
          onDegisim={(deger) => setKat(deger as KatTipi | '')}
          bosEtiket="Belirtmek istemiyorum"
          secenekler={KAT_TIPLERI.map((tip) => ({ value: tip.value, label: tip.label }))}
        />

        <SayiAlani
          etiket="Bina yaşı"
          deger={binaYasi}
          onDegisim={setBinaYasi}
          birim="yaş"
          bicimli={false}
          yerTutucu="7"
        />

        <Secim
          etiket="Yapının durumu"
          deger={durum}
          onDegisim={(deger) => setDurum(deger as BinaDurumu | '')}
          bosEtiket="Belirtmek istemiyorum"
          secenekler={BINA_DURUMLARI.map((tip) => ({ value: tip.value, label: tip.label }))}
        />
      </form>

      <div>
        {sonuc.durum === 'hesaplandi' ? (
          <SonucEkrani
            sonuc={sonuc.veri}
            mahalle={secilenMahalle}
            whatsapp={whatsapp}
            raporBaglantisi={raporAdresi('/rapor/degerleme', {
              mahalle: mahalleSlug,
              m2: sayiyaCevir(m2),
              kat: kat || null,
              yas: sayiyaCevir(binaYasi),
              durum: durum || null,
            })}
          />
        ) : (
          <BeklemeEkrani
            sebep={sonuc.sebep}
            mahalleAdi={secilenMahalle?.ad ?? null}
            mahalleSecildi={secilenMahalle !== null}
          />
        )}
      </div>
    </div>
  )
}

function SonucEkrani({
  sonuc,
  mahalle,
  whatsapp,
  raporBaglantisi,
}: {
  sonuc: Extract<ReturnType<typeof degerlemeYap>, { durum: 'hesaplandi' }>['veri']
  mahalle: MahalleSecenegi | null
  whatsapp: string | null
  raporBaglantisi: string
}) {
  const guvenTonlari = {
    yuksek: 'basari',
    orta: 'uyari',
    dusuk: 'hata',
  } as const

  return (
    <div className="flex flex-col gap-5">
      <div className="border-kenar bg-yuzey shadow-kart rounded-kart border-[0.5px] p-6 sm:p-8">
        <p className="text-metin-3 text-mikro font-medium">Tahmini değer aralığı</p>

        <p className="rakam text-rakam mt-2 font-medium sm:text-rakam-buyuk">
          {paraYaz(sonuc.altDeger)}
          <span className="text-metin-3 mx-2 font-normal">–</span>
          {paraYaz(sonuc.ustDeger)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Rozet ton={guvenTonlari[sonuc.guvenDuzeyi]}>
            Güven düzeyi: {GUVEN_ETIKETLERI[sonuc.guvenDuzeyi]}
          </Rozet>
          {sonuc.gozlemSayisi !== null ? (
            <Rozet>
              {mahalle?.ad} — {sayiYaz(sonuc.gozlemSayisi)} gözlem
            </Rozet>
          ) : null}
        </div>

        {sonuc.guvenDuzeyi === 'dusuk' ? (
          <p className="text-metin-2 border-kenar mt-4 border-t-[0.5px] pt-4 text-govde-kucuk leading-relaxed">
            <strong className="font-medium">Bu aralık neden geniş?</strong> Bu mahalle için
            elimizdeki gözlem sayısı henüz az veya bazı özellikler hesaba katılamadı. Dar bir aralık
            verip yanılmaktansa geniş ve dürüst bir aralık vermeyi tercih ediyoruz.
          </p>
        ) : null}
      </div>

      {/* Yöntem — kara kutu olmasın */}
      <details className="border-kenar bg-yuzey rounded-kart group border-[0.5px] p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-govde-kucuk font-medium marker:content-none">
          <BilgiIkon width={16} height={16} className="text-metin-3" />
          Bu tahmin nasıl hesaplandı?
          <span className="text-metin-3 ml-auto transition-transform group-open:rotate-45">+</span>
        </summary>

        <dl className="mt-4 flex flex-col gap-2 text-govde-kucuk">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-metin-2">{mahalle?.ad} mahallesi ortalama m² fiyatı</dt>
            <dd className="rakam font-medium">{paraYaz(mahalle?.m2Fiyati ?? null)}</dd>
          </div>

          {sonuc.etkiler.map((etki) => (
            <div key={etki.ad} className="flex items-baseline justify-between gap-4">
              <dt className="text-metin-2">
                {etki.ad}
                <span className="text-metin-3"> — {etki.aciklama}</span>
              </dt>
              <dd className="rakam font-medium">× {etki.katsayi.toLocaleString('tr-TR')}</dd>
            </div>
          ))}

          <div className="border-kenar flex items-baseline justify-between gap-4 border-t-[0.5px] pt-2">
            <dt className="font-medium">Tahmini m² birim fiyatı</dt>
            <dd className="rakam font-medium">{paraYaz(sonuc.m2BirimFiyati)}</dd>
          </div>
        </dl>

        {sonuc.katilmayanFaktorler.length > 0 ? (
          <p className="text-metin-3 mt-4 text-mikro leading-relaxed">
            <strong className="font-medium">Hesaba katılmayanlar:</strong>{' '}
            {sonuc.katilmayanFaktorler.join(', ')}. Bu faktörlerin katsayıları henüz tanımlanmadığı
            için tahmine dahil edilmedi — varsayım üretmiyoruz.
          </p>
        ) : null}
      </details>

      {/* Kademeli bağlılık: sonuç zaten görüldü, şimdi derinleşme teklifi */}
      <div className="border-vurgu/20 bg-vurgu-zemin rounded-kart border-[0.5px] p-5 sm:p-6">
        <h2 className="font-sans text-govde font-medium">
          Bu bir tahmin. Gerçek değerleme daha fazlasını gerektirir.
        </h2>
        <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
          Yukarıdaki aralık mahalle ortalamalarına dayanıyor. Gerçek değeri; cephe, manzara, bina
          yönetimi, kat planı, aidat ve o an piyasada kaç benzeri olduğu belirler. Taşınmazı yerinde
          görüp size gerçek bir fiyat aralığı ve satış stratejisi sunabiliriz.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {/* ⚠️ Rapor iletişim bilgisinin ARKASINDA DEĞİL (CLAUDE.md 6b):
              ziyaretçi hiçbir şey vermeden raporu açıp PDF olarak kaydedebilir.
              İletişim yalnızca YERİNDE değerleme için isteniyor. */}
          <Buton href={raporBaglantisi} gorunum="ikincil">
            Ayrıntılı raporu aç
          </Buton>
          <Buton href={`/iletisim?tip=degerleme${mahalle ? `&mahalle=${mahalle.slug}` : ''}`}>
            Gerçek değerleme isteyin
            <OkIkon width={16} height={16} />
          </Buton>
          {whatsapp ? (
            <Buton href={whatsapp} dis gorunum="ikincil">
              <WhatsappIkon width={16} height={16} />
              WhatsApp&apos;tan sorun
            </Buton>
          ) : null}
        </div>
      </div>

      <Feragat ek="Bu tahmin bilgilendirme amaçlıdır; SPK lisanslı gayrimenkul değerleme raporu yerine geçmez." />
    </div>
  )
}

function BeklemeEkrani({
  sebep,
  mahalleAdi,
  mahalleSecildi,
}: {
  sebep: 'mahalle_verisi_yok' | 'm2_girilmedi'
  mahalleAdi: string | null
  mahalleSecildi: boolean
}) {
  // Mahalle seçilmiş ama o mahallenin verisi yoksa, bu bir "eksik girdi"
  // değil "elimizde veri yok" durumudur ve öyle söylenmelidir.
  if (sebep === 'mahalle_verisi_yok' && mahalleSecildi) {
    return (
      <div className="border-kenar bg-uyari-zemin rounded-kart border-[0.5px] p-6">
        <h2 className="font-sans text-govde font-medium">
          {mahalleAdi} için henüz yeterli veri yok
        </h2>
        <p className="text-metin-2 mt-2 text-govde-kucuk leading-relaxed">
          Bu mahalle için güvenilir bir ortalama üretecek kadar gözlem toplamadık. Tahmini bir rakam
          göstermek yerine size doğrudan yardımcı olmayı tercih ediyoruz — mahalleyi biliyoruz,
          taşınmazınızı konuşalım.
        </p>
        <div className="mt-4">
          <Buton href="/iletisim?tip=degerleme">Bize sorun</Buton>
        </div>
      </div>
    )
  }

  return (
    <div className="border-kenar bg-yuzey-2/60 rounded-kart flex flex-col items-center gap-3 border-[0.5px] border-dashed px-6 py-16 text-center">
      <p className="font-medium">
        {mahalleSecildi ? 'Metrekareyi girin' : 'Mahalleyi seçin, sonuç anında belirsin'}
      </p>
      <p className="text-metin-2 max-w-sm text-govde-kucuk leading-relaxed">
        Hiçbir iletişim bilgisi istemiyoruz. Sonucu göreceksiniz; devamını isteyip istememek size
        kalmış.
      </p>
    </div>
  )
}

function Secim({
  etiket,
  deger,
  onDegisim,
  secenekler,
  bosEtiket,
}: {
  etiket: string
  deger: string
  onDegisim: (yeni: string) => void
  secenekler: { value: string; label: string; devreDisi?: boolean }[]
  bosEtiket: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-govde-kucuk font-medium">
        {etiket}
        <select
          value={deger}
          onChange={(olay) => onDegisim(olay.target.value)}
          className={sinif(
            'border-kenar-giris bg-yuzey rounded-buton focus:border-vurgu mt-1.5 min-h-11 w-full border-[0.5px] px-3 text-govde font-normal',
          )}
        >
          <option value="">{bosEtiket}</option>
          {secenekler.map((secenek) => (
            <option key={secenek.value} value={secenek.value}>
              {secenek.label}
              {secenek.devreDisi ? ' (veri yok)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
