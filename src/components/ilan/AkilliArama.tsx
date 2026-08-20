'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Rozet } from '@/components/ui/Rozet'
import { akilliAramaCoz } from '@/lib/arama/eylemler'
import type { AramaSonucu } from '@/lib/arama/motor'
import { AZAMI_SORGU_UZUNLUGU } from '@/lib/arama/sabitler'
import { paraKisaYaz } from '@/lib/bicimlendirme'
import { etiketBul, ILAN_KATEGORILERI, ILAN_TIPLERI } from '@/lib/secenekler'

/**
 * Doğal dil arama kutusu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SONUÇ ÜRETMEZ — FİLTRE ÜRETİR
 *
 * Bu kutu cevap yazmaz. Cümleyi filtreye çevirir, **ne anladığını gösterir**
 * ve normal filtre adresine yönlendirir. Sonuçlar aşağıdaki listeden,
 * yani veritabanından gelir.
 *
 * Anlaşılan filtre yönlendirme sonrası filtre çubuğunda görünür ve elle
 * düzeltilebilir — kara kutu bir "akıllı arama" değil.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function AkilliArama() {
  const [sorgu, setSorgu] = useState('')
  const [sonuc, setSonuc] = useState<AramaSonucu | null>(null)
  const [bekliyor, basla] = useTransition()
  const router = useRouter()

  function gonder(olay: React.FormEvent): void {
    olay.preventDefault()
    if (sorgu.trim() === '') return

    basla(async () => {
      const cikti = await akilliAramaCoz(sorgu)
      setSonuc(cikti)

      if (cikti.durum === 'cozuldu' && cikti.parametreler !== '') {
        router.push(`/portfoy?${cikti.parametreler}`)
      }
    })
  }

  const cozuldu = sonuc?.durum === 'cozuldu' ? sonuc : null
  const hataMesaji =
    sonuc?.durum === 'hata' || sonuc?.durum === 'gecersiz_sorgu' ? sonuc.mesaj : null

  return (
    <section aria-labelledby="akilli-arama" className="mb-6">
      <h2 id="akilli-arama" className="sr-only">
        Doğal dille arama
      </h2>

      <form onSubmit={gonder} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Aradığınızı kendi cümlenizle yazın</span>
          <input
            type="search"
            value={sorgu}
            onChange={(olay) => setSorgu(olay.target.value)}
            maxLength={AZAMI_SORGU_UZUNLUGU}
            placeholder="Örn: Muhittin'de 5 milyon altı 3+1, getirisi iyi olsun"
            className="border-kenar bg-yuzey text-govde rounded-buton focus-visible:outline-vurgu w-full border-[0.5px] px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          />
        </label>

        <button
          type="submit"
          disabled={bekliyor || sorgu.trim() === ''}
          className="bg-koyu-bant text-koyu-bant-metin rounded-buton focus-visible:outline-vurgu shrink-0 px-5 py-3 text-govde-kucuk font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {bekliyor ? 'Anlaşılıyor…' : 'Ara'}
        </button>
      </form>

      {/* ⚠️ KVKK — yurt dışına aktarım. Gizlenmez, küçültülmez. */}
      <p className="text-metin-3 text-mikro mt-2 leading-relaxed">
        Yazdığınız cümle, filtreye çevrilmek üzere Anthropic&apos;in sunucularına gönderilir.
        Yalnızca bu metin gider; kimlik, iletişim veya konum bilgisi gönderilmez. Sonuçlar bizim
        veritabanımızdan gelir — yapay zekâ taşınmaz önermez, yalnızca filtre kurar.
      </p>

      <div aria-live="polite">
        {hataMesaji ? <p className="text-hata text-govde-kucuk mt-3">{hataMesaji}</p> : null}

        {cozuldu ? <AnlasilanFiltre sonuc={cozuldu} /> : null}
      </div>
    </section>
  )
}

/**
 * Ne anlaşıldığının özeti.
 *
 * ⚠️ `anlasilmayan` listesi gizlenmez. "OSB'ye 10 dakika" gibi bir istek
 * filtre alanlarımızda karşılığı olmadığı için uygulanamaz; bunu söylememek,
 * ziyaretçiye isteğinin tamamının uygulandığını düşündürür.
 */
function AnlasilanFiltre({ sonuc }: { sonuc: Extract<AramaSonucu, { durum: 'cozuldu' }> }) {
  const { filtre } = sonuc
  const rozetler: string[] = []

  const tip = etiketBul(ILAN_TIPLERI, filtre.tip)
  if (tip) rozetler.push(tip)

  const kategori = etiketBul(ILAN_KATEGORILERI, filtre.kategori)
  if (kategori) rozetler.push(kategori)

  if (filtre.odaSayisi) rozetler.push(filtre.odaSayisi)

  const enAz = paraKisaYaz(filtre.enAzFiyat)
  const enCok = paraKisaYaz(filtre.enCokFiyat)
  if (enAz && enCok) rozetler.push(`${enAz} – ${enCok}`)
  else if (enCok) rozetler.push(`en çok ${enCok}`)
  else if (enAz) rozetler.push(`en az ${enAz}`)

  const bosCikti = sonuc.parametreler === ''

  return (
    <div className="mt-3 flex flex-col gap-2">
      {bosCikti ? (
        <p className="text-metin-2 text-govde-kucuk">
          Bu cümleden filtre çıkaramadık. Aşağıdaki filtreleri elle kullanabilir ya da daha somut
          yazabilirsiniz — örneğin mahalle, oda sayısı veya bütçe belirtin.
        </p>
      ) : rozetler.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-metin-3 text-mikro">Şöyle anladık:</span>
          {rozetler.map((rozet) => (
            <Rozet key={rozet} ton="vurgu">
              {rozet}
            </Rozet>
          ))}
        </div>
      ) : null}

      {filtre.anlasilmayan.length > 0 ? (
        <p className="text-metin-2 text-mikro leading-relaxed">
          <strong className="font-medium">Şunları filtreye çeviremedik:</strong>{' '}
          {filtre.anlasilmayan.join(' · ')}. Bu ölçütler için filtre alanımız yok — sonuçları gözden
          geçirirken bunları kendiniz değerlendirmeniz gerekiyor.
        </p>
      ) : null}
    </div>
  )
}
