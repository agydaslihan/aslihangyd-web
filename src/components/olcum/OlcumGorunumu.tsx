import type { AdminViewServerProps } from 'payload'

import {
  ASGARI_VITAL_ORNEK,
  raporuGetir,
  type AdSayi,
  type HaftaOzeti,
  type HuniAsamasi,
  type Rapor,
  type VitalSatiri,
} from '@/lib/olcum/rapor'
import { KATMAN_ETIKETI, type Katman } from '@/lib/olcum/tipler'
import { yoneticiMi } from '@/lib/erisim'

/**
 * Gözlemlenebilirlik ekranı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HER BÖLÜM BİR SORUYA CEVAP VERİYOR — RAKAM YIĞINI DEĞİL.
 *
 * Şartnamenin ilk şartı buydu ve ekranın tamamını belirledi: başlıklar
 * metrik adı değil SORU. "Ziyaretçi nerede kayboluyor?" başlığı altındaki
 * tablo bir cevap; "Sayfa görüntüleme: 1.284" ise bir bilgi kırıntısı.
 *
 * ⚠️ HER METRİĞİN YANINDA KATMANI YAZIYOR. Katman A her ziyaretçiyi,
 * Katman B yalnızca onay verenleri kapsıyor. Bunu gizlemek, iki farklı
 * paydayı aynı tabloda yan yana koyup yanlış karar aldırmak olurdu.
 *
 * ⚠️ "POTANSİYEL MÜŞTERİ TESPİTİ" DİLİ KULLANILMIYOR (şartname §4). Burada
 * kimse profillenmiyor; toplulaştırılmış davranış okunuyor ve ekranın dili
 * de bunu söylüyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ Oturum kapısı gövdede zorunlu: admin görünümleri oturumsuz da
 * çalışıyor (CLAUDE.md — portföy sihirbazında aynı tuzağa düşülmüştü).
 */
/**
 * ⚠️ OTURUM `initPageResult.req.user`DAN OKUNUR — ÜST DÜZEY `user`DAN DEĞİL.
 * Gerekçe `anasayfa/AnaSayfaGorunumu.tsx` içinde uzun uzun yazılı: tipte
 * var ama isteğe bağlı, Payload özel görünümlere geçmiyor; ekran sessizce
 * boş açılıyor. Denetim: `lib/panel/gorunumKapisi.test.ts`.
 */
export default async function GozlemGorunumu({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult

  if (!req.user) return null
  if (!yoneticiMi(req.user)) {
    return (
      <Kutu>
        <p style={metin}>Bu ekran yalnızca yöneticilere açık.</p>
      </Kutu>
    )
  }

  const rapor = await raporuGetir(7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '68rem' }}>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Gözlemlenebilirlik</h1>
        <p style={{ ...metin, marginTop: '.5rem' }}>
          {rapor.ilkGun} – {rapor.sonGun} ({rapor.gunSayisi} gün). Buradaki her sayı
          <strong> toplulaştırılmıştır</strong>: tek bir ziyaretçiye ait kayıt tutulmuyor, IP
          saklanmıyor, oturum kimliği üretilmiyor.
        </p>
      </header>

      {rapor.bos ? <BosDurum tani={rapor.tani} /> : null}

      {rapor.bos ? null : <OnaySeridi oran={rapor.onayOrani} />}

      {rapor.bos ? null : (
        <>
          {/* ── 3.1 ── */}
          <Kutu>
            <h2 style={baslik}>Bu hafta ne oldu?</h2>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <Ozet etiket="Sayfa görüntüleme" ozet={rapor.ziyaretci} />
              <Ozet etiket="Yüksek niyetli olay" ozet={rapor.yuksekNiyet} />
              <Ozet etiket="Gelen talep" ozet={rapor.lead} />
              <div>
                <p style={kucuk}>Dönüşüm</p>
                <p style={buyukSayi}>
                  {rapor.donusumYuzde === null ? '—' : `%${rapor.donusumYuzde}`}
                </p>
                <p style={kucuk}>
                  {rapor.donusumYuzde === null
                    ? 'Örneklem küçük, oran hesaplanmadı'
                    : 'Talep / sayfa görüntüleme'}
                </p>
              </div>
            </div>
          </Kutu>

          {/* ── 3.2 — en değerli bölüm ── */}
          <Kutu>
            <h2 style={baslik}>Ziyaretçi nerede kayboluyor?</h2>
            <p style={{ ...kucuk, marginBottom: '.5rem' }}>Bu ekranın en değerli bölümü.</p>
            <p style={metin}>
              Aşamalar arası düşüş. <strong>En büyük düşüş kırmızı</strong> — düzeltilecek yer
              orası.
            </p>
            <p style={{ ...kucuk, marginBottom: '.75rem' }}>
              ⚠️ Bu huni <strong>toplulaştırılmıştır</strong>: aynı ziyaretçinin sayfa dizisi takip
              edilmiyor. Aşamalar ayrı ayrı sayılan toplamlardır, birbirinin alt kümesi değil.
            </p>
            <Huni asamalar={rapor.huni} />
          </Kutu>

          {/* ── 3.3 ── */}
          <Kutu>
            <h2 style={baslik}>Hangi içerik lead getiriyor?</h2>
            <p style={metin}>
              Sıralama tıklamaya göre <strong>değil</strong>, lead başına görüntülemeye göre. 500
              görüntülemeyle hiç lead getirmeyen sayfa, 20 görüntülemeyle üç lead getirenden daha az
              değerlidir.
            </p>
            <Tablo
              basliklar={['Sayfa', 'Görüntüleme (A)', 'Lead', 'Lead başına görüntüleme']}
              satirlar={rapor.sayfalar.map((satir) => [
                satir.rota,
                String(satir.goruntuleme),
                String(satir.lead),
                satir.leadBasinaGoruntuleme === null
                  ? '— (lead yok)'
                  : String(satir.leadBasinaGoruntuleme),
              ])}
            />
          </Kutu>

          {/* ── 3.4 ── */}
          <Kutu>
            <h2 style={baslik}>Değerleme akışı nerede bırakılıyor?</h2>
            <p style={metin}>
              ⚠️ Bu form <strong>çok adımlı bir sihirbaz değil</strong>: tek sayfada beş alanı olan
              ve canlı hesaplayan bir araç. Bu yüzden ölçü birimi &quot;adım&quot; değil{' '}
              <strong>alan</strong> — hangi alana kadar doldurup vazgeçildiği.
            </p>
            <Huni asamalar={rapor.degerlemeHunisi} />
          </Kutu>

          {/* ── 3.5 ── */}
          <Kutu>
            <h2 style={baslik}>Ziyaretçi ne arıyor?</h2>
            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <Liste baslik="En çok kullanılan filtreler" katman="B" satirlar={rapor.filtreler} />
              <Liste baslik="Aranan fiyat aralıkları" katman="B" satirlar={rapor.fiyatBantlari} />
              <Liste baslik="En çok bakılan mahalleler" katman="A" satirlar={rapor.mahalleler} />
            </div>
            <div
              style={{
                marginTop: '1rem',
                padding: '.75rem',
                background: 'var(--theme-warning-100)',
                borderRadius: '.25rem',
              }}
            >
              <p style={{ ...metin, margin: 0 }}>
                <strong>Sonuç bulunamayan arama: {rapor.sonucsuzArama}</strong> — portföy boşluğunu
                gösterir. Ziyaretçi aradığını bulamadı; bu sayı yükseliyorsa eksik olan ilan tipini
                yukarıdaki filtre listesi söylüyor.
              </p>
            </div>
          </Kutu>

          {/* ── 3.6 ── */}
          <Kutu>
            <h2 style={baslik}>Nereden geliyorlar?</h2>
            <p style={kucuk}>
              ⚠️ Yalnızca yönlendiren <strong>alan adı</strong> saklanıyor, tam adres değil.
            </p>
            <Tablo
              basliklar={['Kaynak', 'Sayfa görüntüleme (A)', 'Lead']}
              satirlar={rapor.kaynaklar.map((satir) => [
                satir.ad,
                String(satir.ziyaretci),
                String(satir.lead),
              ])}
            />
            <div style={{ marginTop: '1rem' }}>
              <Liste baslik="UTM kampanya kaynakları" katman="A" satirlar={rapor.utmKaynaklar} />
            </div>
          </Kutu>

          {/* ── 3.7 ── */}
          <Kutu>
            <h2 style={baslik}>Teknik sağlık</h2>
            <p style={kucuk}>
              Süreler sunucunun isteği karşılama süresidir (Katman A); tarayıcıdaki toplam yükleme
              süresi değil.
            </p>
            <Tablo
              basliklar={['Sayfa', 'Ortalama', 'En yavaş', 'Görüntüleme', 'Hata']}
              satirlar={rapor.teknik.map((satir) => [
                satir.rota,
                `${satir.ortalamaMs} ms`,
                `${satir.enYavasMs} ms`,
                String(satir.goruntuleme),
                String(satir.hata),
              ])}
            />
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
              <div>
                <p style={kucuk}>Hata oranı</p>
                <p style={buyukSayi}>{rapor.hataOrani === null ? '—' : `%${rapor.hataOrani}`}</p>
              </div>
              {rapor.cihazlar.map((cihaz) => (
                <div key={cihaz.ad}>
                  <p style={kucuk}>{cihaz.ad === 'mobil' ? 'Mobil' : 'Masaüstü'}</p>
                  <p style={buyukSayi}>{cihaz.adet}</p>
                </div>
              ))}
            </div>
          </Kutu>

          {/* ── 3.8 ── */}
          <Kutu>
            <h2 style={baslik}>Gerçek cihazlarda hız (Core Web Vitals)</h2>
            <p style={kucuk}>
              ⚠️ Bu sayılar <strong>alan verisi</strong>: gerçek ziyaretçilerin gerçek cihazlarında
              ölçüldü. Lighthouse&apos;un raporladığı sayı bir ölçüm değil bir modeldir — sayfayı
              hızlı bir makinede yükleyip sonucu yavaş bir 4G telefona yansıtır (istek başına 562 ms
              varsayım). Bir ölçümde laboratuvar 3,4 sn derken sayfa gerçekte 194 ms&apos;de
              boyanıyordu.
            </p>
            <p style={kucuk}>
              ⚠️ Örneklem yalnızca <strong>analitik onayı veren</strong> ziyaretçilerden oluşur
              (Katman B). Onay vermeyenlerin cihazları sistematik olarak farklı olabilir; sapma
              gizlenmiyor.
            </p>

            {rapor.vitaller.length === 0 ? (
              <p style={metin}>
                Henüz ölçüm yok. Analitik onayı veren ziyaretçiler geldikçe burası dolacak.
              </p>
            ) : (
              <>
                <Tablo
                  basliklar={[
                    'Metrik',
                    'Cihaz',
                    'p75 (yaklaşık)',
                    'İyi',
                    'Geliştirilmeli',
                    'Zayıf',
                    'Ölçüm',
                  ]}
                  satirlar={rapor.vitaller.map((satir) => [
                    satir.ad,
                    satir.cihaz === 'mobil' ? 'Mobil' : 'Masaüstü',
                    vitalDegeri(satir),
                    yuzde(satir.iyiYuzde),
                    yuzde(satir.ortaYuzde),
                    yuzde(satir.zayifYuzde),
                    String(satir.ornek),
                  ])}
                />
                <p style={kucuk}>
                  ⚠️ p75 <strong>yaklaşıktır</strong>: ham değer saklanmadığı için histogramdan
                  interpolasyonla hesaplanır (CrUX de böyle yapar). {ASGARI_VITAL_ORNEK} ölçümün
                  altındaki satırlarda sayı gösterilmez — üç ölçümden p75 çıkarmak matematiksel
                  olarak mümkün ama anlamsızdır.
                </p>
                <p style={kucuk}>Hedefler: LCP ≤ 2,5 sn · CLS ≤ 0,1 · INP ≤ 200 ms</p>
              </>
            )}
          </Kutu>
        </>
      )}

      <Kutu>
        <h2 style={baslik}>Bu ekran neyi ölçmüyor?</h2>
        <ul style={{ ...metin, paddingLeft: '1.25rem' }}>
          <li>
            <strong>Isı haritası ve oturum kaydı yok.</strong> Ağır, KVKK açısından riskli ve bu
            ölçekte gereksiz.
          </li>
          <li>
            <strong>Tek ziyaretçi profili yok.</strong> Böyle bir kayıt hiç tutulmuyor; şema
            düzeyinde imkânsız.
          </li>
          <li>
            <strong>Canlı ziyaretçi göstergesi yok.</strong> Eğlenceli ama hiçbir karar
            değiştirmiyor.
          </li>
          <li>
            <strong>Üçüncü taraf analitik yok.</strong> Veri yurt dışına gitmiyor.
          </li>
          <li>
            <strong>Hız ölçümünde ham değer saklanmıyor.</strong> &quot;LCP = 2.431 ms&quot; tek bir
            ziyarete ait bir kayıt olurdu; yalnızca kova sayaçları tutuluyor.
          </li>
        </ul>
        <p style={kucuk}>Ayrıntı: docs/KVKK-ANALITIK.md</p>
      </Kutu>
    </div>
  )
}

/* ── Görsel parçalar ─────────────────────────────────────────────────────
 *
 * ⚠️ Satır içi stil kullanılıyor, Tailwind DEĞİL. Payload admin'i sitenin
 * CSS'ini yüklemiyor; panel bileşenleri kendi stilini taşımak zorunda.
 * Diğer özel görünümlerdeki desenle aynı.
 *
 * ⚠️ RENKLER PAYLOAD'IN KENDİ DEĞİŞKENLERİNDEN, HAM HEX YOK.
 *
 * İlk hâlde `var(--theme-elevation-150, #ddd)` biçiminde yedekler vardı ve
 * `tasarim/disiplin.test.ts` haklı olarak reddetti: kuralın klasör bazında
 * muafiyeti YOK ve olmaması doğru — bir yerde gevşetilen tasarım disiplini
 * her yerde gevşer. Yedekler zaten gereksizdi: bu bileşen yalnızca Payload
 * admin'i içinde render ediliyor ve o değişkenler orada daima tanımlı.
 * ──────────────────────────────────────────────────────────────────────── */

const baslik = { fontSize: '1.1rem', margin: '0 0 .5rem' } as const
const metin = { fontSize: '.875rem', lineHeight: 1.6, margin: '0 0 .5rem' } as const
const kucuk = { fontSize: '.75rem', opacity: 0.7, margin: 0 } as const
const buyukSayi = { fontSize: '1.5rem', fontWeight: 600, margin: '.15rem 0' } as const

/**
 * Boş durum — "çalışmıyor mu, veri mi yok" sorusunu ekranda cevaplıyor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BOŞ SAYFA BİR CEVAP DEĞİL, BİR SORU DOĞURUR.
 *
 * Panel ilk açıldığında boş geldi ve akla gelen ilk soru "bozuk mu?" oldu.
 * O soruyu yanıtlamak için sunucuya bağlanıp tabloya bakmak gerekti —
 * yani panelin var olma sebebiyle çelişen bir iş.
 *
 * Artık ekranın kendisi ayırt ediyor:
 *
 *   · bellekte bekleyen sayaç varsa  → ölçüm ÇALIŞIYOR, henüz yazılmadı
 *   · son yazma zamanı varsa         → yazma da çalışıyor, o gün trafik yok
 *   · ikisi de boşsa                 → gerçekten hiç ziyaret olmamış
 * ─────────────────────────────────────────────────────────────────────────
 */
function BosDurum({ tani }: { tani: Rapor['tani'] }) {
  const calisiyor = tani.bekleyenIstek > 0 || tani.sonYazma !== null

  return (
    <Kutu>
      <h2 style={baslik}>Henüz veri toplanmadı</h2>
      <p style={metin}>
        Sayaçlar bellekte toplanıp <strong>{tani.yazmaAraligiSn} saniyede bir</strong> yazılıyor;
        ilk kayıtlar birkaç ziyaret sonra görünür. Site yeni yayına alındıysa bir tur beklemek
        yeterli.
      </p>

      <div
        style={{
          marginTop: '.75rem',
          padding: '.75rem 1rem',
          borderRadius: '.25rem',
          background: 'var(--theme-elevation-50)',
          fontSize: '.8125rem',
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: '0 0 .4rem' }}>
          <strong>
            {calisiyor
              ? 'Ölçüm çalışıyor — bu ekran boş çünkü henüz sayılacak ziyaret yok.'
              : 'Henüz hiçbir ziyaret sayılmadı.'}
          </strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          <li>
            Bellekte bekleyen (henüz yazılmamış): <strong>{tani.bekleyenIstek}</strong> sayfa
            görüntüleme, <strong>{tani.bekleyenOlay}</strong> olay
          </li>
          <li>
            Son yazma:{' '}
            <strong>{tani.sonYazma === null ? 'hiç yazılmadı' : zamanYaz(tani.sonYazma)}</strong>
          </li>
          <li>
            Kayıtlı gün sayısı: <strong>{tani.gunKaydi}</strong>
          </li>
        </ul>
        {calisiyor ? null : (
          <p style={{ margin: '.5rem 0 0' }}>
            ⚠️ Bu üç satır da sıfırsa ve sitede gezinmenize rağmen değişmiyorsa ölçüm katmanı
            çalışmıyor olabilir. Sayfayı yenileyip tekrar bakın; hâlâ sıfırsa bildirin.
          </p>
        )}
      </div>
    </Kutu>
  )
}

/**
 * Zamanı okunur yazar.
 *
 * ⚠️ Europe/Istanbul: "son yazma 09:12" diyen bir satır, okuyanın saatiyle
 * aynı olmalı. UTC gösterilseydi üç saatlik fark "bir şey yazılmıyor"
 * izlenimi verirdi.
 */
function zamanYaz(iso: string): string {
  const tarih = new Date(iso)
  if (Number.isNaN(tarih.getTime())) return iso
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(tarih)
}

/**
 * p75 değerinin okunabilir hâli.
 *
 * ⚠️ CLS BİRİMSİZ, diğerleri milisaniye. Aynı sütunda "0,08" ile "2.431 ms"
 * yan yana duracak; birimi metrikten türetmek tek doğru yol.
 *
 * ⚠️ `asgari` işareti kaybolmuyor: p75 üst sınırsız kovaya düştüyse gerçek
 * değer bilinmiyor, yalnızca alt sınırı biliniyor. "10.000 ms" yazmak onu
 * kesinmiş gibi gösterirdi.
 */
function vitalDegeri(satir: VitalSatiri): string {
  if (satir.p75 === null) return `— (${satir.ornek} ölçüm)`

  const onek = satir.p75Asgari ? '≥ ' : ''
  if (satir.ad === 'CLS') return `${onek}${satir.p75.toFixed(3)}`
  return `${onek}${Math.round(satir.p75)} ms`
}

function yuzde(deger: number | null): string {
  return deger === null ? '—' : `%${Math.round(deger)}`
}

function Kutu({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '.375rem',
        padding: '1.25rem',
      }}
    >
      {children}
    </section>
  )
}

/**
 * Onay oranı şeridi.
 *
 * ⚠️ ŞARTNAMENİN AÇIK ŞARTI: Katman B için onay oranı görünmeli. Eksik
 * veriyi gizlemek yanlış karar aldırır — %12 onay oranıyla ölçülen bir
 * huniye bakıp "ziyaretçiler WhatsApp'a basmıyor" demek, aslında
 * "ziyaretçilerin %88'ini ölçmüyoruz" demektir.
 */
function OnaySeridi({ oran }: { oran: number | null }) {
  return (
    <div
      style={{
        padding: '.75rem 1rem',
        borderRadius: '.375rem',
        background: 'var(--theme-elevation-50)',
        fontSize: '.8125rem',
      }}
    >
      <strong>Analitik onay oranı: {oran === null ? '—' : `%${oran}`}</strong> — Katman B metrikleri
      (olaylar, huni, filtreler) yalnızca bu kesimi kapsıyor. Katman A (sayfa, kaynak, cihaz, ülke,
      süre) <strong>tüm</strong> ziyaretçileri kapsıyor; çerez ve betik kullanmıyor.
    </div>
  )
}

function KatmanEtiketi({ katman }: { katman: Katman }) {
  return (
    <abbr
      title={KATMAN_ETIKETI[katman]}
      style={{
        fontSize: '.6875rem',
        padding: '.05rem .3rem',
        marginLeft: '.35rem',
        borderRadius: '.2rem',
        border: '1px solid currentColor',
        opacity: 0.65,
        textDecoration: 'none',
      }}
    >
      {katman}
    </abbr>
  )
}

function Ozet({ etiket, ozet }: { etiket: string; ozet: HaftaOzeti }) {
  return (
    <div>
      <p style={kucuk}>
        {etiket}
        <KatmanEtiketi katman={ozet.katman} />
      </p>
      <p style={buyukSayi}>{ozet.buHafta}</p>
      <p style={kucuk}>
        {ozet.ornekLemKucuk ? (
          <>
            geçen hafta {ozet.gecenHafta} — <strong>örneklem küçük, yüzde güvenilir değil</strong>
          </>
        ) : (
          <>
            geçen hafta {ozet.gecenHafta}
            {ozet.degisimYuzde === null
              ? ''
              : ` (${ozet.degisimYuzde > 0 ? '+' : ''}${ozet.degisimYuzde}%)`}
          </>
        )}
      </p>
    </div>
  )
}

function Huni({ asamalar }: { asamalar: HuniAsamasi[] }) {
  const enBuyuk = Math.max(1, ...asamalar.map((asama) => asama.sayi))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {asamalar.map((asama) => (
        <div key={asama.ad} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ width: '11rem', fontSize: '.8125rem' }}>
            {asama.ad}
            <KatmanEtiketi katman={asama.katman} />
          </div>
          <div style={{ flex: 1, background: 'var(--theme-elevation-50)', borderRadius: '.2rem' }}>
            <div
              style={{
                width: `${Math.max(2, (asama.sayi / enBuyuk) * 100)}%`,
                height: '1.25rem',
                borderRadius: '.2rem',
                background: asama.enBuyukDusus
                  ? 'var(--theme-error-500)'
                  : 'var(--theme-success-500)',
              }}
            />
          </div>
          <div style={{ width: '4rem', textAlign: 'right', fontSize: '.8125rem' }}>
            {asama.sayi}
          </div>
          <div
            style={{
              width: '9rem',
              fontSize: '.75rem',
              fontWeight: asama.enBuyukDusus ? 600 : 400,
              color: asama.enBuyukDusus ? 'var(--theme-error-500)' : undefined,
            }}
          >
            {asama.dususYuzde === null
              ? ''
              : `−%${asama.dususYuzde}${asama.enBuyukDusus ? ' ← en büyük düşüş' : ''}`}
          </div>
        </div>
      ))}
    </div>
  )
}

function Tablo({ basliklar, satirlar }: { basliklar: string[]; satirlar: string[][] }) {
  if (satirlar.length === 0) {
    return <p style={kucuk}>Bu dönemde veri yok.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8125rem' }}>
        <thead>
          <tr>
            {basliklar.map((ad) => (
              <th
                key={ad}
                style={{
                  textAlign: 'left',
                  padding: '.35rem .5rem',
                  borderBottom: '1px solid var(--theme-elevation-150)',
                  whiteSpace: 'nowrap',
                }}
              >
                {ad}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((satir, sira) => (
            <tr key={`${satir[0]}-${sira}`}>
              {satir.map((hucre, sutun) => (
                <td
                  key={sutun}
                  style={{
                    padding: '.35rem .5rem',
                    borderBottom: '1px solid var(--theme-elevation-50)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {hucre}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Liste({
  baslik: listeBasligi,
  katman,
  satirlar,
}: {
  baslik: string
  katman: Katman
  satirlar: AdSayi[]
}) {
  return (
    <div>
      <p style={{ ...kucuk, marginBottom: '.35rem' }}>
        {listeBasligi}
        <KatmanEtiketi katman={katman} />
      </p>
      {satirlar.length === 0 ? (
        <p style={kucuk}>Veri yok.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '.8125rem' }}>
          {satirlar.map((satir) => (
            <li
              key={satir.ad}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '.2rem 0',
              }}
            >
              <span>{satir.ad}</span>
              <strong>{satir.adet}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type { Rapor }
