import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DESTEKLENEN_KAYNAKLAR,
  desteklenmeyenSaglayici,
  gecerliBunnyBicimiMi,
  videoDurumMesaji,
  videoKaynaginiCoz,
  youtubeGommeAdresi,
  youtubeKapakAdresi,
  youtubeKimligiCoz,
} from './video'

const KOK = path.resolve(path.join(import.meta.dirname, '..', '..', '..'))
const oku = (yol: string) => readFileSync(path.join(KOK, yol), 'utf8')

/**
 * Yorumları çıkarır.
 *
 * ⚠️ Gerekli: "eski hata metni kalmadı" denetimi ilk koşumda kırmızı verdi,
 * çünkü `DroneVideo.tsx` açıklaması o metni TARİHÇE olarak alıntılıyor.
 * Aynı tuzağa ölçüm testlerinde de düşülmüştü. Kararın gerekçesini silmek
 * yerine denetimi koda bakacak hâle getirmek doğru cevap.
 */
const kodu = (yol: string) =>
  oku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: DRONE VİDEOSU İÇİN GOOGLE DRIVE LİNKİ VERİLDİ.
 *
 * 17 Ağustos 2026: link verildi, sayfa "Video oynatıcı henüz
 * yapılandırılmadı" dedi. Mesaj hem genel hem YANLIŞTI — yapılandırma
 * değil kaynak sorunluydu ve mesaj ne yapılacağını söylemiyordu.
 *
 * Bu dosya karar tablosunun tamamını kilitliyor: hangi girdi hangi sonucu
 * ve hangi mesajı doğuruyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const BUNNY_ID = '0123abcd-45ef-6789-abcd-0123456789ef'
const YT = 'dQw4w9WgXcQ'

describe('YouTube adresi ayrıştırma', () => {
  /** ⚠️ Beş biçim de aynı videoyu gösteriyor; beşi de kabul edilmeli. */
  it.each([
    [`https://www.youtube.com/watch?v=${YT}`, YT],
    [`https://youtube.com/watch?v=${YT}&t=42s`, YT],
    [`https://m.youtube.com/watch?v=${YT}`, YT],
    [`https://youtu.be/${YT}`, YT],
    [`https://youtu.be/${YT}?t=42`, YT],
    [`https://www.youtube.com/embed/${YT}`, YT],
    [`https://www.youtube-nocookie.com/embed/${YT}`, YT],
    [`https://www.youtube.com/shorts/${YT}`, YT],
    [`https://www.youtube.com/live/${YT}`, YT],
    [YT, YT],
    [`  ${YT}  `, YT],
    [`youtube.com/watch?v=${YT}`, YT],
  ])('%s → %s', (girdi, beklenen) => {
    expect(youtubeKimligiCoz(girdi)).toBe(beklenen)
  })

  it.each([
    ['', null],
    ['   ', null],
    ['https://www.youtube.com/', null],
    ['https://www.youtube.com/watch?v=kisa', null],
    ['https://www.youtube.com/channel/UCabcdefghij', null],
    ['tamamen alakasiz metin', null],
    [null, null],
    [undefined, null],
  ])('geçersiz: %s', (girdi, beklenen) => {
    expect(youtubeKimligiCoz(girdi)).toBe(beklenen)
  })
})

describe('desteklenmeyen sağlayıcılar', () => {
  /**
   * ⚠️ ASIL OLAY BU SATIRDA. Google Drive linki adıyla reddedilmeli;
   * "geçersiz adres" demek, kullanıcıyı aynı hatayı tekrar yapmaya bırakır.
   */
  it.each([
    ['https://drive.google.com/file/d/1a2b3c/view?usp=sharing', 'Google Drive'],
    ['https://docs.google.com/file/d/1a2b3c/preview', 'Google Drive'],
    ['https://www.dropbox.com/s/abc/video.mp4?dl=0', 'Dropbox'],
    ['https://wetransfer.com/downloads/abc', 'WeTransfer'],
    ['https://we.tl/t-abc123', 'WeTransfer'],
    ['https://1drv.ms/v/s!abc', 'OneDrive'],
    ['https://acme-my.sharepoint.com/:v:/g/abc', 'OneDrive'],
    ['https://www.icloud.com/iclouddrive/abc', 'iCloud'],
    ['https://vimeo.com/123456789', 'Vimeo'],
  ])('%s → %s', (adres, ad) => {
    expect(desteklenmeyenSaglayici(adres)?.ad).toBe(ad)
  })

  /** ⚠️ "neden" alanı boş olamaz: ne yapılacağını söylemeyen mesaj işe yaramaz. */
  it('her sağlayıcı bir gerekçe taşıyor', () => {
    const sonuc = desteklenmeyenSaglayici('https://drive.google.com/file/d/1/view')
    expect(sonuc?.neden.length).toBeGreaterThan(20)
  })

  it('YouTube ve Bunny desteklenmeyen sayılmıyor', () => {
    expect(desteklenmeyenSaglayici(`https://youtu.be/${YT}`)).toBeNull()
    expect(desteklenmeyenSaglayici(BUNNY_ID)).toBeNull()
    expect(desteklenmeyenSaglayici(null)).toBeNull()
  })
})

describe('gömme adresi', () => {
  /**
   * ⚠️ `youtube-nocookie.com` ZORUNLU — KVKK kararı (CLAUDE.md kural 8).
   * Normal alan adı çerçeve yüklenirken çerez atıyor.
   */
  it('nocookie alan adı kullanılıyor', () => {
    const adres = youtubeGommeAdresi(YT, true)
    expect(adres).toContain('https://www.youtube-nocookie.com/embed/')
    expect(adres).not.toContain('//www.youtube.com/')
  })

  it('otomatik oynatma parametresi tek ve doğru', () => {
    expect(youtubeGommeAdresi(YT, true)).toContain('autoplay=1')
    expect(youtubeGommeAdresi(YT, false)).toContain('autoplay=0')
    // Aynı parametre iki kez geçmemeli — hangisinin kazandığı tanımsız olurdu.
    expect(youtubeGommeAdresi(YT, true)?.match(/autoplay=/g)).toHaveLength(1)
  })

  /** Öneri kuyruğu rakip içerik göstermesin. */
  it('öneriler kısıtlı ve arayüz Türkçe', () => {
    const adres = youtubeGommeAdresi(YT, false)
    expect(adres).toContain('rel=0')
    expect(adres).toContain('hl=tr')
  })

  it('geçersiz kimlikte adres kurulmuyor', () => {
    expect(youtubeGommeAdresi('kisa', true)).toBeNull()
  })
})

describe('kapak görseli', () => {
  /**
   * ⚠️ EN KRİTİK DENETİM: kapak KENDİ sunucumuzdan geçiyor.
   *
   * Doğrudan `i.ytimg.com` kullanmak, sayfa açılır açılmaz Google'a istek
   * atmak demek — tıkla-oynat cephesinin bütün amacını boşa çıkarır.
   */
  it('kapak adresi kendi alan adımızda', () => {
    const adres = youtubeKapakAdresi(YT)
    expect(adres).toBe(`/api/video-kapak/youtube/${YT}`)
    expect(adres).not.toContain('ytimg')
    expect(adres).not.toContain('http')
  })

  it('vekil ucu kimliği doğruluyor (SSRF kapısı)', () => {
    const uc = oku('src/app/api/video-kapak/youtube/[kimlik]/route.ts')
    expect(uc).toContain('KIMLIK_DESENI.test(kimlik)')
    expect(uc).toContain('status: 404')
    // Gelen şeyin görsel olduğu da doğrulanmalı.
    expect(uc).toContain("tur.startsWith('image/')")
  })

  it('vekil önbellekli — her görüntülemede dış çağrı yapmıyor', () => {
    const uc = oku('src/app/api/video-kapak/youtube/[kimlik]/route.ts')
    expect(uc).toContain('revalidate: ONBELLEK_SANIYE')
    expect(uc).toContain('cache-control')
  })
})

describe('kaynak çözümleme — karar tablosu', () => {
  const temel = { bunnyHazir: true, bunnyGomme: 'https://iframe.mediadelivery.net/embed/1/x' }

  it('kaynak yok → bölüm gösterilmiyor', () => {
    expect(videoKaynaginiCoz({ ...temel, kaynak: 'yok' }).durum).toBe('yok')
    expect(videoKaynaginiCoz({ ...temel, kaynak: 'youtube', youtube: '' }).durum).toBe('yok')
    expect(videoKaynaginiCoz({ ...temel, kaynak: 'bunny', bunnyId: '' }).durum).toBe('yok')
  })

  it('YouTube hazır', () => {
    const sonuc = videoKaynaginiCoz({
      ...temel,
      kaynak: 'youtube',
      youtube: `https://youtu.be/${YT}`,
    })
    expect(sonuc).toMatchObject({ durum: 'hazir', saglayici: 'youtube' })
    if (sonuc.durum === 'hazir') {
      expect(sonuc.gomme).toContain('youtube-nocookie.com')
      expect(sonuc.kapak).toBe(`/api/video-kapak/youtube/${YT}`)
    }
  })

  /** Kullanıcının yüklediği kapak, servisin kapağını eziyor. */
  it('yüklenen kapak önce geliyor', () => {
    const sonuc = videoKaynaginiCoz({
      ...temel,
      kaynak: 'youtube',
      youtube: YT,
      kapakUrl: '/medya/kendi-kapagimiz.avif',
    })
    if (sonuc.durum === 'hazir') expect(sonuc.kapak).toBe('/medya/kendi-kapagimiz.avif')
  })

  /**
   * ⚠️ SIRA ÖNEMLİ: Drive adresi hem "geçersiz kimlik" hem "desteklenmeyen
   * kaynak"tır. Söylenmesi gereken ikincisi — çünkü ne yapılacağını o
   * söylüyor.
   */
  it('Drive linki desteklenmeyen kaynak olarak raporlanıyor', () => {
    const sonuc = videoKaynaginiCoz({
      ...temel,
      kaynak: 'youtube',
      youtube: 'https://drive.google.com/file/d/1a2b/view',
    })
    expect(sonuc).toMatchObject({ durum: 'desteklenmeyen_kaynak', saglayici: 'Google Drive' })
  })

  it('Bunny alanına Drive linki de yakalanıyor', () => {
    const sonuc = videoKaynaginiCoz({
      ...temel,
      kaynak: 'bunny',
      bunnyId: 'https://drive.google.com/file/d/1a2b/view',
    })
    expect(sonuc.durum).toBe('desteklenmeyen_kaynak')
  })

  it('okunamayan YouTube adresi ayrı durum', () => {
    expect(
      videoKaynaginiCoz({ ...temel, kaynak: 'youtube', youtube: 'bu bir adres degil' }).durum,
    ).toBe('gecersiz_youtube')
  })

  it('Bunny yapılandırılmamış durumu geçersiz kimlikten ayrı', () => {
    expect(videoKaynaginiCoz({ kaynak: 'bunny', bunnyId: BUNNY_ID, bunnyHazir: false }).durum).toBe(
      'bunny_yapilandirilmamis',
    )
    expect(videoKaynaginiCoz({ kaynak: 'bunny', bunnyId: 'bozuk', bunnyHazir: true }).durum).toBe(
      'gecersiz_bunny',
    )
  })

  /**
   * ⚠️ ESKİ KAYIT TOLERANSI. Göç `videoKaynagi`'yı dolduruyor ama tek bir
   * güncellenmemiş kayıt yüzünden yayındaki bir videonun kaybolması kabul
   * edilemez: kaynak boş + Bunny kimliği dolu → Bunny varsayılıyor.
   */
  it('kaynak boşsa Bunny kimliği varsayılıyor', () => {
    const sonuc = videoKaynaginiCoz({ ...temel, kaynak: null, bunnyId: BUNNY_ID })
    expect(sonuc).toMatchObject({ durum: 'hazir', saglayici: 'bunny' })
  })

  it('kaynak da kimlik de boşsa sessizce yok', () => {
    expect(videoKaynaginiCoz({ kaynak: null, bunnyHazir: true }).durum).toBe('yok')
  })
})

describe('mesajlar', () => {
  /**
   * ⚠️ HER MESAJ NE YAPILACAĞINI SÖYLEMEK ZORUNDA.
   *
   * "Video oynatıcı henüz yapılandırılmadı" tam olarak bunu yapmıyordu ve
   * bu yüzden değiştirildi. Denetim kaba ama işe yarıyor: teşhis
   * durumlarının mesajı bir eylem ya da alternatif içermeli.
   */
  it('teşhis mesajları eylem öneriyor', () => {
    expect(videoDurumMesaji({ durum: 'bunny_yapilandirilmamis' })).toContain('YouTube')
    expect(videoDurumMesaji({ durum: 'gecersiz_youtube' })).toMatch(/youtu\.be|watch\?v=/)
    expect(videoDurumMesaji({ durum: 'gecersiz_bunny' })).toMatch(/biçim|haneli/)
    expect(
      videoDurumMesaji({
        durum: 'desteklenmeyen_kaynak',
        saglayici: 'Google Drive',
        neden: 'HTML döndürüyor',
      }),
    ).toContain("YouTube'a yükleyip")
  })

  /** Panel yardım metni desteklenen ve desteklenmeyeni birlikte saymalı. */
  it('alan yardımı hem destekleneni hem desteklenmeyeni sayıyor', () => {
    expect(DESTEKLENEN_KAYNAKLAR).toContain('YouTube')
    expect(DESTEKLENEN_KAYNAKLAR).toContain('Bunny')
    expect(DESTEKLENEN_KAYNAKLAR).toContain('Google Drive')
    expect(DESTEKLENEN_KAYNAKLAR).toContain('liste dışı')
  })
})

describe('sitede iç jargon gösterilmiyor', () => {
  /**
   * ⚠️ TEŞHİS PANELDE, SİTEDE DEĞİL.
   *
   * Ziyaretçi Bunny'yi yapılandıramaz; ona "yapılandırılmamış" demek hem
   * anlamsız hem iç bilgi sızdırmak. Site tarafı çözülemeyen videoda
   * hiçbir şey çizmiyor.
   */
  /**
   * ⚠️ MESAJLAR TEK KAYNAKTAN. İlk hâlde aynı cümleler hem `video.ts` hem
   * `VideoDurumu.tsx` içinde duruyordu; iki kopya ilk düzeltmede ayrışır ve
   * panel ile kaydetme doğrulaması farklı şey söylerdi.
   */
  it('panel göstergesi metni kendisi yazmıyor', () => {
    const gosterge = kodu('src/components/medya/VideoDurumu.tsx')
    expect(gosterge).toContain('videoDurumMesaji(sonuc)')
    // Mesaj gövdelerinin kopyası burada olmamalı.
    expect(gosterge).not.toContain("YouTube'a yükleyip")
  })

  it('DroneVideo çözülemeyen videoda null dönüyor', () => {
    const bilesen = kodu('src/components/medya/DroneVideo.tsx')
    expect(bilesen).toContain("if (sonuc.durum !== 'hazir') return null")
    expect(bilesen).not.toContain('yapılandırılmadı')
  })

  it('eski genel hata metni hiçbir yerde kalmadı', () => {
    for (const dosya of [
      'src/components/medya/DroneVideo.tsx',
      'src/components/medya/DroneVideoOynatici.tsx',
    ]) {
      expect(kodu(dosya), dosya).not.toContain('Video oynatıcı henüz yapılandırılmadı')
    }
  })
})

describe('performans sözleşmesi', () => {
  /**
   * ⚠️ IFRAME ASLA BAŞTAN YÜKLENMEZ — bütçe 700 kB+ ve LCP hedefi 2,5 sn.
   * YouTube desteği eklenirken bu desenin korunması şartnamede açıkça
   * yazılıydı; denetim onu kilitliyor.
   */
  it('iframe yalnızca tıklamadan sonra DOM’a giriyor', () => {
    const oynatici = kodu('src/components/medya/DroneVideoOynatici.tsx')
    expect(oynatici).toContain('const [oynatiliyor, setOynatiliyor] = useState(false)')
    expect(oynatici).toContain('if (oynatiliyor)')
    expect(oynatici).toContain('onClick={() => setOynatiliyor(true)}')

    // Kapak düğmesi bölümünde iframe olmamalı.
    const dugumBolumu = oynatici.slice(oynatici.indexOf('return (\n    <button'))
    expect(dugumBolumu).not.toContain('<iframe')
  })

  it('Bunny biçim denetimi ortam okumadan çalışıyor', () => {
    expect(gecerliBunnyBicimiMi(BUNNY_ID)).toBe(true)
    expect(gecerliBunnyBicimiMi('bozuk')).toBe(false)
    // ⚠️ `video.ts` istemci bileşeninde de kullanılıyor: ortam okuması olamaz.
    const kaynak = kodu('src/lib/medya/video.ts')
    expect(kaynak).not.toContain('process.env')
    expect(kaynak).not.toContain("from '@/lib/ayarlar'")
    expect(kaynak).not.toContain("from './bunny'")
  })
})
