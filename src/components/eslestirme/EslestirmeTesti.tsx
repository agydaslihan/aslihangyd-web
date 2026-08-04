'use client'

import { useMemo, useState } from 'react'

import { SayiAlani, sayiyaCevir } from '@/components/hesaplayici/Alanlar'
import { BosDurum } from '@/components/ui/BosDurum'
import { Buton } from '@/components/ui/Buton'
import { Feragat } from '@/components/ui/Feragat'
import { OkIkon, WhatsappIkon } from '@/components/ui/Ikon'
import { m2Yaz, whatsappBaglantisi, yuzdeYaz } from '@/lib/bicimlendirme'
import { kusUcusuMesafe, mahalleEslestir } from '@/lib/eslestirme/motor'
import type {
  Amac,
  MahalleEslesmesi,
  Oncelik,
  TestCevaplari,
  ZamanUfku,
} from '@/lib/eslestirme/tipler'
import { sinif } from '@/lib/sinif'
import type { HedefNokta, MahalleProfiliVerisi } from '@/lib/veri/eslestirme'

/**
 * Mahalle Eşleştirme Testi.
 *
 * ⚠️ Sonuç iletişim bilgisi arkasında KİLİTLİ DEĞİL (CLAUDE.md kural 6b).
 * Ziyaretçi hiçbir şey vermeden üç mahalle önerisini ve gerekçesini görür.
 * WhatsApp ve e-posta butonları sonucu *paylaşmak* içindir, açmak için değil.
 *
 * Adım adım akış bilinçli: değerleme aracında tek ekran daha iyiydi (her
 * girdinin sonucu nasıl değiştirdiğini görmek aracın kendisini öğretiyor),
 * ama burada 7 soru tek ekranda bir anket duvarına dönüşür. Tek soru + ilerleme
 * çubuğu, form türleri arasında en yüksek tamamlanma oranına sahip yapıdır.
 */

interface Adim {
  anahtar: keyof TestCevaplari
  soru: string
  yardim?: string
  /** Bu adım atlanabilir mi — atlanırsa ilgili ölçüt hesaba katılmaz. */
  atlanabilir: boolean
}

const ADIMLAR: readonly Adim[] = [
  { anahtar: 'amac', soru: 'Ne arıyorsunuz?', atlanabilir: false },
  {
    anahtar: 'butce',
    soru: 'Bütçeniz ne kadar?',
    yardim:
      'Bu rakamı kaydetmiyoruz; yalnızca bütçenizle hangi mahallede kaç m² alabildiğinizi hesaplamak için kullanıyoruz.',
    atlanabilir: true,
  },
  {
    anahtar: 'hedefNoktaId',
    soru: 'Düzenli olarak nereye gidiyorsunuz?',
    yardim: 'İş yeriniz, okulunuz veya sık gittiğiniz bir nokta.',
    atlanabilir: true,
  },
  { anahtar: 'cocukVar', soru: 'Hanede okul çağında çocuk var mı?', atlanabilir: true },
  { anahtar: 'oncelik', soru: 'Hangisi sizin için daha önemli?', atlanabilir: true },
  { anahtar: 'aracKullaniyor', soru: 'Araç kullanıyor musunuz?', atlanabilir: true },
  {
    anahtar: 'zamanUfku',
    soru: 'Ne zaman taşınmayı/almayı düşünüyorsunuz?',
    yardim:
      'Bu cevap mahalle önerisini etkilemez — yalnızca size nasıl yardımcı olacağımızı belirler.',
    atlanabilir: true,
  },
]

const AMAC_SECENEKLERI: readonly { deger: Amac; etiket: string; aciklama: string }[] = [
  {
    deger: 'oturmak',
    etiket: 'Oturmak için ev',
    aciklama: 'Günlük yaşam kalitesi, okul, ulaşım ve sakinlik öne çıkar.',
  },
  {
    deger: 'yatirim',
    etiket: 'Yatırım',
    aciklama: 'Fiyat trendi, kira çarpanı ve istihdam yakınlığı öne çıkar.',
  },
  {
    deger: 'ikisi',
    etiket: 'İkisi birden',
    aciklama: 'Oturacağım ama getirisi de olsun.',
  },
]

const ONCELIK_SECENEKLERI: readonly { deger: Oncelik; etiket: string; aciklama: string }[] = [
  { deger: 'sessizlik', etiket: 'Sakinlik', aciklama: 'Trafikten ve gürültüden uzak olsun.' },
  { deger: 'merkez', etiket: 'Merkeze yakınlık', aciklama: 'Her şey yürüme mesafesinde olsun.' },
  { deger: 'farketmez', etiket: 'İkisi de olur', aciklama: 'Bu konuda esneğim.' },
]

const ZAMAN_SECENEKLERI: readonly { deger: ZamanUfku; etiket: string; aciklama: string }[] = [
  { deger: 'yakin', etiket: '6 ay içinde', aciklama: 'Kararımı vermek üzereyim.' },
  { deger: 'orta', etiket: '6–18 ay içinde', aciklama: 'Planlıyorum ama acelem yok.' },
  { deger: 'arastiriyorum', etiket: 'Henüz araştırıyorum', aciklama: 'Bilgi topluyorum.' },
]

export function EslestirmeTesti({
  mahalleler,
  hedefNoktalari,
  whatsapp,
}: {
  mahalleler: MahalleProfiliVerisi[]
  hedefNoktalari: HedefNokta[]
  whatsapp: string | null
}) {
  const [adimNo, setAdimNo] = useState(0)
  const [cevaplar, setCevaplar] = useState<TestCevaplari>({})
  const [bitti, setBitti] = useState(false)

  // Hedef nokta yoksa o adım hiç gösterilmez: seçenek listesi boş bir soru
  // sormak, ziyaretçiye çıkmaz bir ekran göstermektir.
  const adimlar = useMemo(
    () => ADIMLAR.filter((adim) => adim.anahtar !== 'hedefNoktaId' || hedefNoktalari.length > 0),
    [hedefNoktalari.length],
  )

  const profiller = useMemo(() => {
    const hedef = hedefNoktalari.find((nokta) => nokta.id === cevaplar.hedefNoktaId) ?? null

    return mahalleler.map((mahalle) => ({
      ...mahalle,
      hedefeMesafe: hedef && mahalle.merkez ? kusUcusuMesafe(mahalle.merkez, hedef.konum) : null,
    }))
  }, [mahalleler, hedefNoktalari, cevaplar.hedefNoktaId])

  const sonuc = useMemo(() => mahalleEslestir(cevaplar, profiller), [cevaplar, profiller])

  const adim = adimlar[adimNo]
  const ilerleme = Math.round((adimNo / adimlar.length) * 100)

  function cevapla<A extends keyof TestCevaplari>(anahtar: A, deger: TestCevaplari[A]): void {
    setCevaplar((oncekiler) => ({ ...oncekiler, [anahtar]: deger }))
  }

  function ilerle(): void {
    if (adimNo + 1 >= adimlar.length) {
      setBitti(true)
    } else {
      setAdimNo(adimNo + 1)
    }
  }

  if (bitti) {
    return (
      <Sonuclar
        sonuc={sonuc}
        cevaplar={cevaplar}
        whatsapp={whatsapp}
        onBastanBasla={() => {
          setCevaplar({})
          setAdimNo(0)
          setBitti(false)
        }}
      />
    )
  }

  if (adim === undefined) return null

  const cevaplandi = cevaplar[adim.anahtar] !== undefined && cevaplar[adim.anahtar] !== null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="text-murekkep-3 text-mikro mb-2 flex items-center justify-between">
          <span>
            Soru {adimNo + 1} / {adimlar.length}
          </span>
          <span>{ilerleme > 0 ? `%${ilerleme} tamamlandı` : 'Başlayalım'}</span>
        </div>
        <div
          className="bg-yuzey-2 h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={adimNo + 1}
          aria-valuemin={1}
          aria-valuemax={adimlar.length}
          aria-label="Test ilerlemesi"
        >
          <div
            className="bg-lacivert h-full rounded-full transition-[width] duration-300"
            style={{ width: `${Math.max(ilerleme, 4)}%` }}
          />
        </div>
      </div>

      <div className="border-cizgi bg-yuzey rounded-yumusak border p-6 sm:p-8">
        <h2 className="text-[1.375rem] leading-snug font-semibold sm:text-[1.5rem]">{adim.soru}</h2>
        {adim.yardim ? (
          <p className="text-murekkep-2 mt-2 text-sm leading-relaxed">{adim.yardim}</p>
        ) : null}

        <div className="mt-6">
          <AdimIcerigi
            adim={adim}
            cevaplar={cevaplar}
            hedefNoktalari={hedefNoktalari}
            onCevap={cevapla}
            onIlerle={ilerle}
          />
        </div>

        <div className="border-cizgi mt-8 flex items-center justify-between gap-3 border-t pt-5">
          <Buton
            gorunum="sessiz"
            boyut="kucuk"
            onClick={() => setAdimNo(Math.max(adimNo - 1, 0))}
            disabled={adimNo === 0}
          >
            Geri
          </Buton>

          <div className="flex gap-2">
            {adim.atlanabilir ? (
              <Buton gorunum="sessiz" boyut="kucuk" onClick={ilerle}>
                Atla
              </Buton>
            ) : null}
            <Buton boyut="kucuk" onClick={ilerle} disabled={!cevaplandi && !adim.atlanabilir}>
              {adimNo + 1 >= adimlar.length ? 'Sonucu gör' : 'Devam'}
              <OkIkon width={16} height={16} />
            </Buton>
          </div>
        </div>
      </div>

      <p className="text-murekkep-3 text-mikro mt-4 text-center leading-relaxed">
        Sonucu görmek için hiçbir iletişim bilgisi gerekmiyor. Cevaplarınız yalnızca tarayıcınızda
        tutulur; siz göndermedikçe bize ulaşmaz.
      </p>
    </div>
  )
}

function AdimIcerigi({
  adim,
  cevaplar,
  hedefNoktalari,
  onCevap,
  onIlerle,
}: {
  adim: Adim
  cevaplar: TestCevaplari
  hedefNoktalari: HedefNokta[]
  onCevap: <A extends keyof TestCevaplari>(anahtar: A, deger: TestCevaplari[A]) => void
  onIlerle: () => void
}) {
  switch (adim.anahtar) {
    case 'amac':
      return (
        <KartSecimi
          secenekler={AMAC_SECENEKLERI}
          secili={cevaplar.amac ?? null}
          onSec={(deger) => {
            onCevap('amac', deger)
            onIlerle()
          }}
        />
      )

    case 'butce':
      return (
        <SayiAlani
          etiket="Ayırdığınız bütçe"
          deger={
            cevaplar.butce === null || cevaplar.butce === undefined ? '' : String(cevaplar.butce)
          }
          onDegisim={(yeni) => onCevap('butce', sayiyaCevir(yeni))}
          birim="₺"
          yerTutucu="4.000.000"
        />
      )

    case 'hedefNoktaId':
      return (
        <KartSecimi
          secenekler={hedefNoktalari.map((nokta) => ({
            deger: nokta.id,
            etiket: nokta.ad,
            aciklama: '',
          }))}
          secili={cevaplar.hedefNoktaId ?? null}
          onSec={(deger) => {
            onCevap('hedefNoktaId', deger)
            onIlerle()
          }}
        />
      )

    case 'cocukVar':
      return (
        <KartSecimi
          secenekler={[
            { deger: 'evet', etiket: 'Evet', aciklama: 'Okul erişimi öne çıkarılır.' },
            { deger: 'hayir', etiket: 'Hayır', aciklama: '' },
          ]}
          secili={
            cevaplar.cocukVar === undefined || cevaplar.cocukVar === null
              ? null
              : cevaplar.cocukVar
                ? 'evet'
                : 'hayir'
          }
          onSec={(deger) => {
            onCevap('cocukVar', deger === 'evet')
            onIlerle()
          }}
        />
      )

    case 'oncelik':
      return (
        <KartSecimi
          secenekler={ONCELIK_SECENEKLERI}
          secili={cevaplar.oncelik ?? null}
          onSec={(deger) => {
            onCevap('oncelik', deger)
            onIlerle()
          }}
        />
      )

    case 'aracKullaniyor':
      return (
        <KartSecimi
          secenekler={[
            { deger: 'evet', etiket: 'Evet', aciklama: 'Ana artere erişim öne çıkarılır.' },
            { deger: 'hayir', etiket: 'Hayır', aciklama: 'Toplu taşıma öne çıkarılır.' },
          ]}
          secili={
            cevaplar.aracKullaniyor === undefined || cevaplar.aracKullaniyor === null
              ? null
              : cevaplar.aracKullaniyor
                ? 'evet'
                : 'hayir'
          }
          onSec={(deger) => {
            onCevap('aracKullaniyor', deger === 'evet')
            onIlerle()
          }}
        />
      )

    case 'zamanUfku':
      return (
        <KartSecimi
          secenekler={ZAMAN_SECENEKLERI}
          secili={cevaplar.zamanUfku ?? null}
          onSec={(deger) => {
            onCevap('zamanUfku', deger)
            onIlerle()
          }}
        />
      )

    default:
      return null
  }
}

function KartSecimi<T extends string>({
  secenekler,
  secili,
  onSec,
}: {
  secenekler: readonly { deger: T; etiket: string; aciklama: string }[]
  secili: T | null
  onSec: (deger: T) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {secenekler.map((secenek) => (
        <button
          key={secenek.deger}
          type="button"
          aria-pressed={secili === secenek.deger}
          onClick={() => onSec(secenek.deger)}
          className={sinif(
            'rounded-yumusak flex min-h-13 flex-col justify-center border px-4 py-3 text-left transition-colors',
            secili === secenek.deger
              ? 'border-lacivert bg-lacivert-acik'
              : 'border-cizgi hover:border-cizgi-guclu',
          )}
        >
          <span className="text-[0.9375rem] font-medium">{secenek.etiket}</span>
          {secenek.aciklama ? (
            <span className="text-murekkep-2 mt-0.5 text-sm leading-snug">{secenek.aciklama}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════

function Sonuclar({
  sonuc,
  cevaplar,
  whatsapp,
  onBastanBasla,
}: {
  sonuc: ReturnType<typeof mahalleEslestir>
  cevaplar: TestCevaplari
  whatsapp: string | null
  onBastanBasla: () => void
}) {
  if (sonuc.durum !== 'eslesti') {
    return (
      <div className="mx-auto max-w-2xl">
        <BosDurum
          baslik="Henüz eşleştirme yapamıyoruz"
          aciklama={
            sonuc.durum === 'cevap_eksik'
              ? 'Eşleştirme için en az ne aradığınızı bilmemiz gerekiyor.'
              : 'Mahallelerin eşleştirme profilleri henüz doldurulmadı. Yarım veriyle "%89 uyum" demek, o yüzdeyi anlamsız kılardı — bu yüzden sonuç üretmiyoruz.'
          }
          eylem={
            <div className="flex flex-wrap justify-center gap-3">
              <Buton onClick={onBastanBasla} gorunum="ikincil" boyut="kucuk">
                Baştan başla
              </Buton>
              <Buton href="/iletisim" boyut="kucuk">
                Aslıhan&apos;a sorun
              </Buton>
            </div>
          }
        />
      </div>
    )
  }

  const paylasimMetni = [
    'Mahalle Eşleştirme Testi sonucum:',
    ...sonuc.eslesmeler.map((e, sira) => `${sira + 1}. ${e.ad} — %${e.uyum} uyum`),
  ].join('\n')

  const waBaglantisi = whatsappBaglantisi(whatsapp, paylasimMetni)

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 text-center">
        <h2 className="text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">
          Size en uygun {sonuc.eslesmeler.length} mahalle
        </h2>
        <p className="text-murekkep-2 mx-auto mt-2 max-w-xl text-sm leading-relaxed">
          Uyum yüzdesi, cevaplarınızdan çıkan ağırlıklarla mahalle özniteliklerinin birleşiminden
          hesaplandı. Her mahallenin altında kırılımı açabilirsiniz — burada kara kutu bir puan yok.
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {sonuc.eslesmeler.map((eslesme, sira) => (
          <EslesmeKarti key={eslesme.slug} eslesme={eslesme} sira={sira + 1} />
        ))}
      </ol>

      <details className="border-cizgi rounded-yumusak mt-5 border">
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium marker:content-none">
          Cevaplarınız hangi ağırlıkları oluşturdu?
        </summary>
        <div className="px-5 pb-5">
          <p className="text-murekkep-2 mb-3 text-sm leading-relaxed">
            Aşağıdaki ağırlıklar yalnızca sizin cevaplarınıza göre belirlendi. Bu tablo{' '}
            <strong>portföyümüzden ve elimizdeki ilanlardan tamamen bağımsızdır</strong>; hangi
            mahallede kaç ilanımız olduğu hesaba hiç girmez.
          </p>
          <dl className="flex flex-col gap-1">
            {sonuc.agirliklar.map((satir) => (
              <div key={satir.olcut} className="flex items-baseline justify-between gap-4 py-1">
                <dt className="text-sm">{satir.etiket}</dt>
                <dd className="rakam text-murekkep-2 shrink-0 text-sm">
                  {yuzdeYaz(satir.agirlik, 0)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </details>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {waBaglantisi ? (
          <Buton href={waBaglantisi} dis gorunum="whatsapp" boyut="orta">
            <WhatsappIkon width={18} height={18} />
            Sonucu WhatsApp&apos;tan gönder
          </Buton>
        ) : null}
        <Buton href="/mahalleler/karsilastir" gorunum="ikincil" boyut="orta">
          Mahalleleri karşılaştır
        </Buton>
        <Buton onClick={onBastanBasla} gorunum="sessiz" boyut="orta">
          Testi tekrar çöz
        </Buton>
      </div>

      {cevaplar.zamanUfku === 'yakin' ? (
        <div className="border-cizgi bg-lacivert-acik rounded-yumusak mt-6 border p-5 text-center">
          <p className="text-sm leading-relaxed">
            Yakın zamanda karar verecekseniz, bu üç mahalledeki güncel portföyü ve henüz
            yayınlanmamış seçenekleri birlikte gözden geçirelim.
          </p>
          <div className="mt-4">
            <Buton href="/iletisim" boyut="kucuk">
              Aslıhan&apos;la görüşün
            </Buton>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <Feragat ek="Mahalle önerileri kişisel tercihlerinize göre sıralanmış bir yönlendirmedir; yerinde inceleme ve kendi araştırmanızın yerine geçmez." />
      </div>
    </div>
  )
}

function EslesmeKarti({ eslesme, sira }: { eslesme: MahalleEslesmesi; sira: number }) {
  const gosterilecek = [...eslesme.kirilim]
    .filter((satir) => satir.puan !== null)
    .sort((a, b) => b.katki - a.katki)

  return (
    <li className="border-cizgi bg-yuzey rounded-yumusak border p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[1.25rem] font-semibold">
          <span className="text-murekkep-3 mr-2">{sira}.</span>
          {eslesme.ad}
        </h3>
        <p className="rakam text-pirinc-koyu text-[1.5rem] font-semibold">
          {yuzdeYaz(eslesme.uyum, 0)} uyum
        </p>
      </div>

      {eslesme.butceyleAlinabilirM2 !== null ? (
        <p className="text-murekkep-2 mt-2 text-sm">
          Bütçenizle bu mahallede yaklaşık{' '}
          <strong className="rakam">{m2Yaz(eslesme.butceyleAlinabilirM2)}</strong> alabilirsiniz
          <span className="text-murekkep-3"> (ortalama m² fiyatına göre)</span>.
        </p>
      ) : null}

      {eslesme.kapsam < 1 ? (
        <p className="text-murekkep-3 text-mikro mt-2 leading-relaxed">
          Bu mahallede {eslesme.eksikOlcutler.join(', ').toLocaleLowerCase('tr')} verisi henüz yok;
          o ölçütler hesaba katılmadı.
        </p>
      ) : null}

      <details className="mt-4">
        <summary className="text-lacivert cursor-pointer list-none text-sm font-medium marker:content-none">
          Neden bu mahalle? ▾
        </summary>
        <dl className="border-cizgi mt-3 flex flex-col gap-2 border-t pt-3">
          {gosterilecek.map((satir) => (
            <div key={satir.olcut} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-medium">
                  {satir.etiket}
                  <span className="text-murekkep-3 ml-1.5 font-normal">
                    ağırlık {yuzdeYaz(satir.agirlik, 0)}
                  </span>
                </dt>
                <dd className="rakam shrink-0 text-sm">{satir.puan}/100</dd>
              </div>
              <div className="bg-yuzey-2 h-1 w-full overflow-hidden rounded-full">
                <div
                  className="bg-lacivert h-full rounded-full"
                  style={{ width: `${satir.puan ?? 0}%` }}
                />
              </div>
              <p className="text-murekkep-3 text-mikro leading-snug">{satir.aciklama}</p>
            </div>
          ))}
        </dl>
      </details>

      <div className="mt-4 flex flex-wrap gap-2">
        <Buton href={`/mahalleler/${eslesme.slug}`} gorunum="ikincil" boyut="kucuk">
          {eslesme.ad} sayfasına git
        </Buton>
        <Buton href={`/portfoy?mahalle=${eslesme.slug}`} gorunum="sessiz" boyut="kucuk">
          Bu mahalledeki portföy
        </Buton>
      </div>
    </li>
  )
}
