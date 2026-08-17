/**
 * Video kaynağı çözümleme — Bunny Stream ve YouTube.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ YOUTUBE GEÇİCİ, BUNNY KALICI.
 *
 * Bunny Stream hesabı gelene kadar drone videoları YouTube'dan yayınlanıyor.
 * Bu bir mimari tercih değil, bir köprü: Bunny HLS ile uyarlanabilir kalite
 * veriyor, marka dışı öneri göstermiyor ve ziyaretçiyi başka bir siteye
 * götüren "sonraki video" kuyruğu kurmuyor.
 *
 * Köprünün açık kalması için kaynak seçimi KAYIT BAŞINA: bir mahalle Bunny'ye
 * geçerken diğeri YouTube'da kalabiliyor. Toplu geçiş beklemek, ilk videonun
 * yayınlanmasını Bunny hesabına bağlamak olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BU DOSYA SAF: ağ çağrısı ve `process.env` okuması YOK.
 *
 * Bunny'nin yapılandırılmış olup olmadığı `bunnyHazir` parametresiyle
 * dışarıdan veriliyor. Böylece bütün karar tablosu — hangi girdi hangi
 * mesajı doğuruyor — testte kurulabiliyor; ortam değişkeni taklit etmek
 * gerekmiyor.
 */

/**
 * Bunny video kimliği biçim denetimi.
 *
 * ⚠️ BU DOSYA `bunny.ts`'İ İÇE AKTARMIYOR — VE AKTARMAMASI ÖNEMLİ.
 *
 * `bunny.ts` ortam değişkeni okuyan `ayar()` fonksiyonunu içe aktarıyor.
 * Buradan ona bağlanmak, panel bileşeni (`VideoDurumu`) üzerinden sunucu
 * yapılandırma adlarını istemci paketine taşırdı. Denetim saf bir düzenli
 * ifade; kopyalanması değil, DOĞRU YERDE durması gerekiyordu — `bunny.ts`
 * artık bunu kullanıyor.
 */
export function gecerliBunnyBicimiMi(deger: string | null | undefined): deger is string {
  if (typeof deger !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deger.trim())
}

export type VideoKaynagi = 'bunny' | 'youtube' | 'yok'

/**
 * Desteklenmeyen ama sık denenen sağlayıcılar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN "SESSİZCE ÇALIŞMIYOR" YERİNE ADIYLA REDDEDİLİYOR.
 *
 * 17 Ağustos 2026: drone videoları için Google Drive paylaşım linki verildi
 * ve sayfa "Video oynatıcı henüz yapılandırılmadı" dedi. Mesaj doğru bile
 * değildi — yapılandırma değil KAYNAK sorunluydu.
 *
 * Google Drive akış için uygun değil: paylaşım adresi video değil HTML
 * döndürüyor, ayrıca bant genişliği kotası var. Desteklemek yanlış yola
 * sokardı; bu yüzden desteklenmiyor ve **sebebi söyleniyor**.
 * ─────────────────────────────────────────────────────────────────────────
 */
const DESTEKLENMEYENLER: readonly { desen: RegExp; ad: string; neden: string }[] = [
  {
    desen: /(^|\.)drive\.google\.com|(^|\.)docs\.google\.com/i,
    ad: 'Google Drive',
    neden:
      'paylaşım adresi video dosyası değil HTML sayfası döndürüyor ve bant genişliği kotası var',
  },
  {
    desen: /(^|\.)dropbox\.com/i,
    ad: 'Dropbox',
    neden: 'paylaşım adresi akış için değil indirme için tasarlanmış',
  },
  {
    desen: /(^|\.)wetransfer\.com|(^|\.)we\.tl/i,
    ad: 'WeTransfer',
    neden: 'bağlantılar süreli; video birkaç gün sonra kaybolur',
  },
  {
    desen: /(^|\.)1drv\.ms|(^|\.)onedrive\.live\.com|(^|\.)sharepoint\.com/i,
    ad: 'OneDrive',
    neden: 'paylaşım adresi akış için uygun değil',
  },
  {
    desen: /(^|\.)icloud\.com/i,
    ad: 'iCloud',
    neden: 'paylaşım adresi akış için uygun değil',
  },
  {
    desen: /(^|\.)vimeo\.com/i,
    ad: 'Vimeo',
    neden: 'gerçek bir video servisi ama bu sitede desteklenmiyor',
  },
]

/**
 * Girdinin ALAN ADINI çıkarır.
 *
 * ⚠️ Şema olmadan da çalışmalı: kullanıcı adresi kopyalarken `https://`
 * kısmını atlayabiliyor. Şema eklenmeden `new URL('drive.google.com/...')`
 * hata veriyor ve Drive linki "tanınmayan adres" olarak geçip giderdi.
 */
function alanAdi(deger: string): string | null {
  try {
    const adres = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(deger) ? deger : `https://${deger}`)
    return adres.hostname.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Adres desteklenmeyen bir sağlayıcıya mı işaret ediyor?
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ALAN ADINA BAKIYOR, TÜM DİZGEYE DEĞİL — ve ilk hâli tam bu yüzden
 * çalışmıyordu.
 *
 * Desenler `(^|\.)drive\.google\.com` biçiminde, yani bir alan adının
 * başına ya da bir noktadan sonrasına bakıyor. Tam adrese uygulandığında
 * `https://drive.google.com/...` dizgesinde `drive`ın solunda ne dizge
 * başı ne nokta var — eğik çizgi var. Sonuç: Google Drive linki
 * DESTEKLENİYOR gibi geçiyordu. Test yakaladı.
 *
 * Alan adı üzerinden eşleşmek ayrıca yanlış pozitifi de engelliyor:
 * `youtube.com/watch?v=drive.google.com` gibi bir adres artık Drive
 * sayılmıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `neden` alanı mesaja giriyor: "çalışmaz" demek yetmez, ne yapılacağını
 * söylemek gerekir.
 */
export function desteklenmeyenSaglayici(
  deger: string | null | undefined,
): { ad: string; neden: string } | null {
  if (typeof deger !== 'string' || deger.trim() === '') return null

  const host = alanAdi(deger.trim())
  if (host === null) return null

  for (const aday of DESTEKLENMEYENLER) {
    if (aday.desen.test(host)) return { ad: aday.ad, neden: aday.neden }
  }
  return null
}

/**
 * YouTube video kimliğini çıkarır.
 *
 * ⚠️ DÖRT BİÇİM DE KABUL EDİLİYOR, çünkü dördü de gerçek hayatta
 * kopyalanıyor:
 *
 *   https://www.youtube.com/watch?v=ID     ← adres çubuğundan
 *   https://youtu.be/ID                    ← "Paylaş" düğmesinden
 *   https://www.youtube.com/embed/ID       ← "Yerleştir" kodundan
 *   https://www.youtube.com/shorts/ID      ← telefondan
 *   ID                                     ← elle
 *
 * Tek biçim kabul edip diğerlerini reddetmek, hatayı kullanıcıya
 * yıkmak olurdu: beşi de aynı videoyu gösteriyor.
 *
 * ⚠️ LİSTE DIŞI (unlisted) VİDEOLAR DA ÇALIŞIR. Kimlik biçimi aynı;
 * "liste dışı" yalnızca YouTube aramasında görünmemek demek. Ayrı bir iş
 * yapılmasına gerek yok ve bu bilinçli olarak yazılı: ileride biri
 * "unlisted destekleniyor mu" diye sorduğunda cevabı burada.
 */
export function youtubeKimligiCoz(deger: string | null | undefined): string | null {
  if (typeof deger !== 'string') return null
  const metin = deger.trim()
  if (metin === '') return null

  // Çıplak kimlik: 11 karakter, YouTube'un alfabesi.
  if (/^[\w-]{11}$/.test(metin)) return metin

  let adres: URL
  try {
    adres = new URL(metin.startsWith('http') ? metin : `https://${metin}`)
  } catch {
    return null
  }

  const host = adres.hostname.toLowerCase().replace(/^www\./, '')
  const kimlikMi = (deger: string | null): string | null =>
    deger !== null && /^[\w-]{11}$/.test(deger) ? deger : null

  if (host === 'youtu.be') return kimlikMi(adres.pathname.slice(1).split('/')[0] ?? null)

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (adres.pathname === '/watch') return kimlikMi(adres.searchParams.get('v'))

    const parcalar = adres.pathname.split('/').filter(Boolean)
    if (parcalar[0] === 'embed' || parcalar[0] === 'shorts' || parcalar[0] === 'live') {
      return kimlikMi(parcalar[1] ?? null)
    }
  }

  return null
}

/**
 * YouTube gömme adresi.
 *
 * ⚠️ `youtube-nocookie.com` KULLANILIYOR — KVKK kararı.
 *
 * Normal `youtube.com` gömmesi çerçeve yüklenirken çerez atıyor. Bu site
 * onay alınmadan hiçbir izleme çerezine izin vermiyor (CLAUDE.md kural 8).
 * `nocookie` alan adı, ziyaretçi videoyu izlemeye karar verene kadar
 * çerez yazmıyor.
 *
 * ⚠️ Yine de bu bir üçüncü taraf çağrısı ve ancak ziyaretçi oynat'a
 * bastıktan sonra yapılıyor: çerçeve o ana kadar DOM'da yok.
 *
 * ⚠️ `rel=0` öneri kuyruğunu aynı kanala sınırlıyor: videonun sonunda
 * rakip ilanların çıkması, kendi sitemizde kendi elimizle olur.
 */
export function youtubeGommeAdresi(kimlik: string, otomatikOynat = false): string | null {
  if (!/^[\w-]{11}$/.test(kimlik)) return null

  const adres = new URL(`https://www.youtube-nocookie.com/embed/${kimlik}`)
  adres.searchParams.set('autoplay', otomatikOynat ? '1' : '0')
  adres.searchParams.set('rel', '0')
  adres.searchParams.set('modestbranding', '1')
  // Türkçe arayüz — oynatıcı düğmeleri de kullanıcıya görünen metindir.
  adres.searchParams.set('hl', 'tr')
  return adres.toString()
}

/**
 * Kapak görselinin KENDİ sunucumuzdaki adresi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `i.ytimg.com` ADRESİ DOĞRUDAN KULLANILMIYOR — VE BU ÖNEMLİ.
 *
 * Kapak görselini doğrudan YouTube'dan çekmek, sayfa açılır açılmaz
 * Google'a bir istek atmak demek. Ziyaretçi henüz videoyu istemedi;
 * tıkla-oynat cephesinin bütün amacı üçüncü taraf çağrısını o ana kadar
 * ertelemek. Kapak üzerinden sızan bir istek, cepheyi anlamsız kılardı.
 *
 * Bu yüzden kapak kendi sunucumuzdan geçiyor: tarayıcı yalnızca bizim
 * alan adımıza istek atıyor, YouTube'a giden çağrıyı sunucu yapıyor ve
 * sonucu önbelleğe alıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function youtubeKapakAdresi(kimlik: string): string | null {
  if (!/^[\w-]{11}$/.test(kimlik)) return null
  return `/api/video-kapak/youtube/${kimlik}`
}

/* ────────────────────────────────────────────────────────────────────────
 * Çözümleme sonucu
 * ──────────────────────────────────────────────────────────────────────── */

export type VideoSonucu =
  | { durum: 'hazir'; saglayici: 'bunny' | 'youtube'; gomme: string; kapak: string | null }
  /** Kaynak seçilmemiş ya da alan boş — bölüm hiç gösterilmez. */
  | { durum: 'yok' }
  /** Bunny seçili, kimlik girilmiş ama ortam değişkenleri boş. */
  | { durum: 'bunny_yapilandirilmamis' }
  /** Bunny seçili ama kimlik UUID biçiminde değil. */
  | { durum: 'gecersiz_bunny' }
  /** YouTube seçili ama adres okunamadı. */
  | { durum: 'gecersiz_youtube' }
  /** Drive/Dropbox gibi desteklenmeyen bir adres girilmiş. */
  | { durum: 'desteklenmeyen_kaynak'; saglayici: string; neden: string }

export interface VideoGirdisi {
  kaynak?: VideoKaynagi | null
  bunnyId?: string | null
  youtube?: string | null
  /** Kullanıcının yüklediği kapak — varsa YouTube kapağına düşülmez. */
  kapakUrl?: string | null
  /**
   * Bunny ortam değişkenleri dolu mu (çağıran sunucudan verir).
   *
   * ⚠️ Hazır adresten TÜRETİLEMEZ: `bunnyGomme` boşsa sebebi ya eksik
   * yapılandırma ya geçersiz kimliktir ve ikisinin mesajı farklı. Ayrı bir
   * bayrak taşımak, iki farklı arızaya aynı cevabı vermekten iyidir.
   */
  bunnyHazir: boolean
  /**
   * Sunucuda kurulmuş Bunny adresleri.
   *
   * ⚠️ Bu dosya SAF kalsın diye dışarıdan geliyor: `bunnyGommeAdresi()`
   * ortam değişkeni okuyor ve onu buraya çağırmak dosyayı test edilemez
   * yapardı. YouTube adresleri ise ortamdan bağımsız olduğu için burada
   * kuruluyor — ayrım, ortama erişim gerektirip gerektirmemesi.
   */
  bunnyGomme?: string | null
  bunnyKapak?: string | null
  /** Gömme adresi `autoplay` ile mi kurulsun. */
  otomatikOynat?: boolean
}

/**
 * Girdiyi oynatılabilir bir sonuca çevirir.
 *
 * ⚠️ SIRA ÖNEMLİ: desteklenmeyen kaynak kontrolü, biçim kontrolünden ÖNCE.
 * Bir Drive adresi hem "geçersiz YouTube kimliği" hem "desteklenmeyen
 * kaynak"tır; ikinci mesaj ne yapılacağını söylüyor, ilki söylemiyor.
 *
 * ⚠️ Eski kayıtlar için tolerans: `kaynak` boşsa ama Bunny kimliği
 * doluysa Bunny varsayılıyor. Göç bu alanı dolduruyor ama tek bir
 * güncellenmemiş kayıt yüzünden yayındaki bir videonun kaybolması kabul
 * edilemez.
 */
export function videoKaynaginiCoz(girdi: VideoGirdisi): VideoSonucu {
  const { bunnyId, youtube, kapakUrl, bunnyHazir, otomatikOynat = true } = girdi

  const bosMu = (deger: string | null | undefined): boolean =>
    typeof deger !== 'string' || deger.trim() === ''

  const kaynak: VideoKaynagi =
    girdi.kaynak === 'bunny' || girdi.kaynak === 'youtube'
      ? girdi.kaynak
      : girdi.kaynak === 'yok'
        ? 'yok'
        : bosMu(bunnyId)
          ? 'yok'
          : 'bunny'

  if (kaynak === 'yok') return { durum: 'yok' }

  if (kaynak === 'youtube') {
    if (bosMu(youtube)) return { durum: 'yok' }

    const desteklenmeyen = desteklenmeyenSaglayici(youtube)
    if (desteklenmeyen !== null) {
      return {
        durum: 'desteklenmeyen_kaynak',
        saglayici: desteklenmeyen.ad,
        neden: desteklenmeyen.neden,
      }
    }

    const kimlik = youtubeKimligiCoz(youtube)
    if (kimlik === null) return { durum: 'gecersiz_youtube' }

    const gomme = youtubeGommeAdresi(kimlik, otomatikOynat)
    if (gomme === null) return { durum: 'gecersiz_youtube' }

    return {
      durum: 'hazir',
      saglayici: 'youtube',
      gomme,
      kapak: bosMu(kapakUrl) ? youtubeKapakAdresi(kimlik) : (kapakUrl as string),
    }
  }

  // Bunny
  if (bosMu(bunnyId)) return { durum: 'yok' }

  const desteklenmeyen = desteklenmeyenSaglayici(bunnyId)
  if (desteklenmeyen !== null) {
    return {
      durum: 'desteklenmeyen_kaynak',
      saglayici: desteklenmeyen.ad,
      neden: desteklenmeyen.neden,
    }
  }

  if (!gecerliBunnyBicimiMi(bunnyId)) return { durum: 'gecersiz_bunny' }
  if (!bunnyHazir) return { durum: 'bunny_yapilandirilmamis' }

  const gomme = girdi.bunnyGomme
  // Kimlik geçerli ve yapılandırma tam olduğu hâlde adres kurulamadıysa
  // çağıran taraf onu vermeyi atlamış: sessiz bir boş çerçeve yerine
  // "yok" demek daha dürüst.
  if (bosMu(gomme)) return { durum: 'yok' }

  return {
    durum: 'hazir',
    saglayici: 'bunny',
    gomme: gomme as string,
    kapak: bosMu(kapakUrl) ? (girdi.bunnyKapak ?? null) : (kapakUrl as string),
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Panel mesajları
 *
 * ⚠️ BU METİNLER PANELE AİT, SİTEYE DEĞİL.
 *
 * "Bunny Stream yapılandırılmamış" cümlesi ziyaretçiye hiçbir şey
 * söylemiyor: ziyaretçi Bunny'yi yapılandıramaz. Sitede kırık bir
 * çerçeve ya da iç jargon göstermek yerine bölüm hiç çizilmiyor; teşhis,
 * hatayı düzeltebilecek kişinin gördüğü yerde — panelde — duruyor.
 *
 * Aynı metinler kaydetme doğrulamasında da kullanılıyor: yanlış adres
 * kaydedilemiyor ve sebebi o anda okunuyor.
 * ──────────────────────────────────────────────────────────────────────── */

export function videoDurumMesaji(sonuc: VideoSonucu): string {
  switch (sonuc.durum) {
    case 'hazir':
      return sonuc.saglayici === 'bunny'
        ? 'Bunny Stream videosu hazır.'
        : 'YouTube videosu hazır. (Bunny Stream hesabı geldiğinde kaynağı değiştirebilirsiniz.)'
    case 'yok':
      return 'Video girilmedi — sayfada video bölümü gösterilmiyor.'
    case 'bunny_yapilandirilmamis':
      return 'Bunny Stream yapılandırılmamış. YouTube linki de kullanabilirsiniz.'
    case 'gecersiz_bunny':
      return 'Bunny video kimliği okunamadı. Kimlik şu biçimde olmalı: 8-4-4-4-12 haneli harf/rakam dizisi.'
    case 'gecersiz_youtube':
      return 'Video adresi okunamadı. YouTube adresini olduğu gibi yapıştırın (youtube.com/watch?v=… veya youtu.be/…).'
    case 'desteklenmeyen_kaynak':
      return (
        `${sonuc.saglayici} linkleri video oynatıcıda çalışmaz — ${sonuc.neden}. ` +
        "YouTube'a yükleyip linkini verin veya Bunny Stream kullanın."
      )
  }
}

/** Panelde alan yardımı olarak gösterilen desteklenen kaynak listesi. */
export const DESTEKLENEN_KAYNAKLAR =
  'Desteklenen: YouTube (herkese açık veya liste dışı) ve Bunny Stream. ' +
  'ÇALIŞMAYAN: Google Drive, Dropbox, WeTransfer, OneDrive, iCloud, Vimeo — ' +
  'bu servislerin paylaşım adresleri video dosyası değil web sayfası döndürür.'
