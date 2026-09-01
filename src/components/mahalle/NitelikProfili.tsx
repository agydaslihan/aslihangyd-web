import type { NitelikBlogu } from '@/lib/mahalle/nitelikler'

/**
 * Mahallenin niteliksel profili — Aslıhan'ın girdiği bilgiler.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BÖLÜM "ÖLÇÜLEBİLİR BİLGİLER"İN KARDEŞİ, KOPYASI DEĞİL.
 *
 * Bir üstteki bölüm hesaplanan rakamları gösteriyor; bu bölüm
 * hesaplanamayanı. İkisini ayırmak bilinçli: okuyucu hangi cümlenin
 * ölçümden, hangisinin gözlemden geldiğini bilmeli.
 *
 * ⚠️ Boş blok üretilmiyor; hepsi boşsa bölüm hiç çizilmiyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function NitelikProfili({
  bloklar,
  mahalleAdi,
}: {
  bloklar: NitelikBlogu[]
  mahalleAdi: string
}) {
  if (bloklar.length === 0) return null

  return (
    <section aria-labelledby="nitelik">
      <h2 id="nitelik" className="text-metin font-baslik text-baslik-3 mb-4 font-medium">
        {mahalleAdi} Mahallesi’nde yerinde gözlem
      </h2>

      <p className="text-metin-2 text-govde mb-6 leading-relaxed">
        Aşağıdakiler ölçümle değil, mahallede bulunarak edinilmiş bilgilerdir. Hiçbir kaynakta
        bulunmadıkları için burada yazılıdır.
      </p>

      <div className="flex flex-col gap-6">
        {bloklar.map((blok) => (
          <div key={blok.baslik}>
            <h3 className="text-metin font-baslik text-govde font-medium">{blok.baslik}</h3>

            {blok.etiketler && blok.etiketler.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {blok.etiketler.map((etiket) => (
                  <li
                    key={etiket}
                    className="border-kenar bg-yuzey-2 text-metin-2 rounded-rozet border-[0.5px] px-2.5 py-1 text-mikro"
                  >
                    {etiket}
                  </li>
                ))}
              </ul>
            ) : null}

            {blok.paragraflar?.map((paragraf) => (
              <p
                key={paragraf.slice(0, 40)}
                className="text-metin-2 text-govde mt-2 leading-relaxed"
              >
                {paragraf}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
