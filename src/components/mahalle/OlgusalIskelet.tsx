import type { OlgusalBolum } from '@/lib/mahalle/olgusal'

/**
 * Mahallenin olgusal iskeleti — hesaplanan rakamlar ve kaynakları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KAYNAK HER SATIRIN YANINDA, DİPNOTTA DEĞİL.
 *
 * "OSB'ye 3,2 km" cümlesine bakıp karar veren biri, o rakamın nereden
 * geldiğini aynı satırda görmeli. Kaynağı sayfanın altına atmak, bu
 * projenin "her rakamın yanında n" kuralının ihlalinin başka bir biçimi.
 *
 * ⚠️ BOŞ BÖLÜM ÇİZİLMİYOR. Hesaplanamayan satırlar zaten `olgusalIskelet`
 * içinde eleniyor; burada da bölüm boşsa hiç basılmıyor. "Veri
 * toplanıyor" yazan bir tablo, boş durum tasarımı değil gürültüdür.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function OlgusalIskelet({ bolumler }: { bolumler: OlgusalBolum[] }) {
  if (bolumler.length === 0) return null

  return (
    <section aria-labelledby="olgular">
      <h2 id="olgular" className="text-metin font-baslik text-baslik-3 mb-4 font-medium">
        Ölçülebilir bilgiler
      </h2>

      <p className="text-metin-2 text-govde mb-6 leading-relaxed">
        Bu bölümdeki rakamlar mahalle sınırı ve konum verisinden hesaplanır; elle girilmez.
        Hesaplanamayan satırlar hiç gösterilmez.
      </p>

      <div className="flex flex-col gap-8">
        {bolumler.map((bolum) => (
          <div key={bolum.baslik}>
            <h3 className="text-metin font-baslik text-govde font-medium">{bolum.baslik}</h3>

            <dl className="border-kenar mt-3 flex flex-col divide-y divide-[color:var(--color-kenar)] border-y-[0.5px]">
              {bolum.satirlar.map((satir) => (
                <div key={satir.etiket} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <dt className="text-metin-2 text-govde-kucuk">{satir.etiket}</dt>
                    <dd className="text-metin rakam text-govde font-medium">{satir.deger}</dd>
                  </div>

                  <p className="text-metin-3 text-mikro leading-snug">{satir.kaynak}</p>

                  {satir.not === undefined ? null : (
                    <p className="text-metin-3 text-mikro leading-relaxed">⚠️ {satir.not}</p>
                  )}
                </div>
              ))}
            </dl>

            {bolum.not === undefined ? null : (
              <p className="text-metin-3 mt-2 text-mikro leading-relaxed">{bolum.not}</p>
            )}
          </div>
        ))}
      </div>

      {/* ⚠️ ODbL — POI verisinin göründüğü her yerde atıf zorunlu. */}
      <p className="text-metin-3 mt-6 text-mikro">
        İlgi noktası ve sınır verisi: © OpenStreetMap katkıcıları.
      </p>
    </section>
  )
}
