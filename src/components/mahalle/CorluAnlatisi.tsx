import type { CorluAnlatisiVerisi } from '@/lib/veri/corluAnlatisi'

/**
 * Çorlu Değer Anlatısı — tüm mahalle sayfalarında ortak bölüm.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KAYNAK LİSTESİ BÖLÜMÜN PARÇASI, DİPNOT DEĞİL.
 *
 * Bu bir yatırım sitesi: "Çorlu’da 41 firma 4.800 kişi çalıştırıyor"
 * cümlesine bakıp taşınmaz alan biri, o rakamın nereden geldiğini
 * görebilmeli. Kaynakları gizli bir sayfaya taşımak, iddiayı kaynaksız
 * yazmaya yaklaşır.
 *
 * ⚠️ Her başlığın kendi kaynakları hemen altında; bölümün sonunda ise
 * tekilleştirilmiş tam liste. İkisi birden çünkü okuyucu iki farklı şey
 * yapıyor: bir iddiayı doğrulamak ve genel olarak "bu bilgi nereden
 * geliyor" sorusunu sormak.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Bağlantılar `rel="noopener noreferrer"` ve yeni sekmede: ziyaretçi
 * kaynağa bakarken mahalle sayfasını kaybetmesin.
 */
export function CorluAnlatisi({ anlati }: { anlati: CorluAnlatisiVerisi | null }) {
  // ⚠️ Kapalıysa ya da kaynaklı tek bir blok bile yoksa hiç çizilmez.
  if (anlati === null) return null

  return (
    <section aria-labelledby="corlu-anlatisi">
      <h2 id="corlu-anlatisi" className="font-baslik text-baslik-3 mb-4 font-medium">
        {anlati.baslik}
      </h2>

      {anlati.giris !== '' ? (
        <p className="text-metin-2 text-govde mb-6 leading-relaxed">{anlati.giris}</p>
      ) : null}

      <div className="flex flex-col gap-8">
        {anlati.bloklar.map((blok) => (
          <article key={blok.baslik}>
            <h3 className="text-metin font-baslik text-govde font-medium">{blok.baslik}</h3>

            <div className="mt-3 flex flex-col gap-3">
              {blok.paragraflar.map((paragraf) => (
                <p key={paragraf.slice(0, 40)} className="text-metin-2 text-govde leading-relaxed">
                  {paragraf}
                </p>
              ))}
            </div>

            <p className="text-metin-3 mt-3 text-mikro leading-relaxed">
              <span className="font-medium">Kaynak:</span>{' '}
              {blok.kaynaklar.map((kaynak, sira) => (
                <span key={kaynak.adres}>
                  {sira > 0 ? ' · ' : ''}
                  <a
                    href={kaynak.adres}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-vurgu underline underline-offset-2"
                  >
                    {kaynak.ad}
                  </a>
                  {kaynak.erisim === null ? '' : ` (${kaynak.erisim})`}
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>

      {/*
        ⚠️ TAM KAYNAK LİSTESİ — talimatın açık şartı. Blok başına kaynak
        zaten var; buradaki liste "bu bölümdeki her şey nereden geliyor"
        sorusunun tek yerdeki cevabı.
      */}
      <div className="border-kenar mt-8 border-t-[0.5px] pt-4">
        <h3 className="text-metin-2 text-mikro font-medium tracking-wide uppercase">
          Bu bölümde kullanılan kaynaklar
        </h3>
        <ol className="text-metin-3 mt-2 flex list-decimal flex-col gap-1 pl-5 text-mikro">
          {anlati.tumKaynaklar.map((kaynak) => (
            <li key={kaynak.adres}>
              <a
                href={kaynak.adres}
                target="_blank"
                rel="noopener noreferrer"
                className="text-vurgu underline underline-offset-2"
              >
                {kaynak.ad}
              </a>
              {kaynak.erisim === null ? '' : ` — erişim: ${kaynak.erisim}`}
            </li>
          ))}
        </ol>

        <p className="text-metin-3 mt-3 text-mikro leading-relaxed">
          Rakamlar kaynakların yayınladığı tarihteki hâlidir. İki resmî kaynak farklı rakam
          veriyorsa ikisi de yazılmıştır — birini seçip diğerini gizlemek, olmayan bir kesinlik
          sunmak olurdu.
        </p>
      </div>
    </section>
  )
}
