import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'

import './skorOnerileri.css'

import { mesafeYaz } from '@/lib/bicimlendirme'
import { poiVeriKapsamiGetir, tumMahallelerinYakinligi } from '@/lib/veri/yakinlik'
import { skorOnerileriHesapla } from '@/lib/yakinlik/motor'
import { BILESEN_ETIKETLERI, CEVRE_GOSTERIM_SIRASI } from '@/lib/yakinlik/tipler'

/**
 * Skor önerileri ekranı (`/admin/skor-onerileri`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU EKRAN HİÇBİR ŞEY KAYDETMEZ — ve kaydetmeyecek.
 *
 * Yatırım skorunun üç bileşeni (sanayi yakınlığı, ulaşım, sosyal donatı)
 * ilgi noktası koordinatlarından türetilebiliyor. Türetilen değeri doğrudan
 * mahalle kaydına yazmak kolay olurdu ve YANLIŞ olurdu:
 *
 *   **POI kaydının yokluğu, donatının yokluğu değildir.** Bir mahalleye
 *   henüz okul girilmediyse otomatik yazım onu "donatısı zayıf" diye
 *   damgalar. Veri eksikliği, bir kez skora yazıldığında olguya dönüşür.
 *
 * Bu yüzden ekran öneri üretir, gerekçesini satır satır gösterir, veri
 * boşluklarını açıkça söyler. Alanı Aslıhan doldurur — Mahalleler → ilgili
 * mahalle → Skor sekmesi.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Ham SQL erişim denetimini atlar; bu ekran yayında olmayan mahalleleri
 * de gösterir. Oturum kapısı bu yüzden zorunlu (CLAUDE.md).
 */
export default async function SkorOnerileriGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  // ⚠️ Payload oturumsuz ziyaretçiye giriş ekranını gösterir ama görünüm
  // gövdesi yine de çalışır. Kapı olmadan yayınlanmamış mahalle verisi
  // sunucu bileşeni yükünde dışarı sızardı.
  if (!req.user) return null

  const [mahalleler, veriKapsami] = await Promise.all([
    tumMahallelerinYakinligi(),
    poiVeriKapsamiGetir(),
  ])

  const oneriler = skorOnerileriHesapla(mahalleler, veriKapsami)
  const adminYolu = req.payload.config.routes.admin ?? '/admin'

  const kapsamdakiTipler = CEVRE_GOSTERIM_SIRASI.filter((tip) => veriKapsami.has(tip))

  return (
    <div className="skor-oneri">
      <h1 className="skor-oneri-baslik">Yakınlıktan skor önerileri</h1>

      <div className="skor-oneri-uyari">
        <p>
          <strong>Bu ekran hiçbir şey kaydetmez.</strong> Aşağıdaki puanlar ilgi noktası
          koordinatlarından hesaplanmış <em>önerilerdir</em>. Beğendiğinizi ilgili mahallenin Skor
          sekmesine kendiniz yazarsınız.
        </p>
        <p>
          Otomatik yazmıyoruz çünkü <strong>kayıt yokluğu, donatı yokluğu değildir.</strong> Bir
          mahalleye henüz okul girilmediyse otomatik hesap onu &quot;donatısı zayıf&quot; diye
          damgalar ve bu, veri eksikliğini kalıcı bir olguya çevirir.
        </p>
        <p>
          Tüm mesafeler <strong>kuş uçuşudur</strong>; sürüş süresi değildir. Süre hesabı için yol
          ağı verisi gerekiyor ve elimizde yok — mesafeyi bir hıza bölüp &quot;12 dakika&quot;
          yazmak uydurma olurdu.
        </p>
      </div>

      <p className="skor-oneri-ozet">
        Merkez noktası tanımlı {mahalleler.length} mahalle ·{' '}
        {kapsamdakiTipler.length > 0
          ? `veri girilmiş nokta türleri: ${kapsamdakiTipler.length}`
          : 'henüz hiç ilgi noktası girilmemiş'}
      </p>

      {mahalleler.length === 0 ? (
        <div className="skor-oneri-bos">
          <p>
            <strong>Öneri üretilemiyor.</strong> Hesap iki şeye bağlı: mahallelerin{' '}
            <em>merkez noktası</em> ve en az bir <em>ilgi noktası</em> kaydı.
          </p>
          <p>
            Merkez noktası: Mahalleler → ilgili mahalle → Konum sekmesi. İlgi noktaları: sol
            menüdeki İlgi Noktaları koleksiyonu.
          </p>
        </div>
      ) : (
        <div className="skor-oneri-liste">
          {mahalleler.map((mahalle) => {
            const mahalleOnerileri = oneriler.get(mahalle.slug) ?? []

            return (
              <section key={mahalle.slug} className="skor-oneri-mahalle">
                <header className="skor-oneri-mahalle-baslik">
                  <h2>{mahalle.ad}</h2>
                  <span className="skor-oneri-kayit">
                    {mahalle.mesafeler.length} nokta türü hesaba girdi
                  </span>
                </header>

                <div className="skor-oneri-kartlar">
                  {mahalleOnerileri.map((oneri) => (
                    <article key={oneri.bilesen} className="skor-oneri-kart">
                      <header className="skor-oneri-kart-baslik">
                        <span className="skor-oneri-bilesen">
                          {BILESEN_ETIKETLERI[oneri.bilesen]}
                        </span>
                        <span
                          className={
                            oneri.puan === null
                              ? 'skor-oneri-puan skor-oneri-puan--yok'
                              : 'skor-oneri-puan'
                          }
                        >
                          {oneri.puan === null ? 'öneri yok' : oneri.puan}
                        </span>
                      </header>

                      {oneri.gerekce.length > 0 ? (
                        <ul className="skor-oneri-gerekce">
                          {oneri.gerekce.map((satir) => (
                            <li key={satir}>{satir}</li>
                          ))}
                        </ul>
                      ) : null}

                      {oneri.eksikler.length > 0 ? (
                        <ul className="skor-oneri-eksik">
                          {oneri.eksikler.map((satir) => (
                            <li key={satir}>{satir}</li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>

                <details className="skor-oneri-mesafeler">
                  <summary>Hesaba giren mesafeler</summary>
                  <ul>
                    {[...mahalle.mesafeler]
                      .sort((a, b) => a.enYakinMetre - b.enYakinMetre)
                      .map((mesafe) => (
                        <li key={mesafe.tip}>
                          <span>{mesafe.enYakinAd}</span>
                          <span className="skor-oneri-mesafe-deger">
                            {mesafeYaz(mesafe.enYakinMetre)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </details>
              </section>
            )
          })}
        </div>
      )}

      <p className="skor-oneri-alt">
        Puanları yazacağınız yer: <strong>Mahalleler → ilgili mahalle → Skor sekmesi</strong>.
        Metodoloji, eğrileriyle birlikte{' '}
        <Link href="/yatirim-skoru-metodolojisi">/yatirim-skoru-metodolojisi</Link> sayfasında
        yayınlanır — orada yazan eğri ile buradaki hesap aynı koddan gelir.
      </p>

      <p className="skor-oneri-alt">
        <Link href={`${adminYolu}/collections/ilgi-noktalari`}>İlgi noktalarını düzenle</Link>
      </p>
    </div>
  )
}
