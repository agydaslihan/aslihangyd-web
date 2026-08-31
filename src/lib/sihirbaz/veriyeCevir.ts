import type { RequiredDataFromCollectionSlug } from 'payload'

import { VARSAYILAN_KATEGORI, VARSAYILAN_TIP, type SihirbazVerisi } from './sema'

/**
 * Sihirbaz formunu Payload alanlarına çeviren TEK eşleme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ AYRI DOSYA — VE SEBEBİ BİR TESTİN KENDİ İTİRAFI.
 *
 * Bu eşleme `eylemler.ts` içindeydi ve entegrasyon testi onu KOPYALAYARAK
 * taklit ediyordu. Testin kendi yorumu riski yazıyordu: "ayrışırsa test
 * yanlış şeyi doğrular hale gelir."
 *
 * `eylemler.ts` bir sunucu eylemi dosyası; oradan senkron bir fonksiyon
 * dışa aktarılamıyor (yönerge yalnızca asenkron dışa aktarıma izin
 * veriyor), bu yüzden test kopyalamak zorundaydı. Eşleme buraya taşınınca
 * hem eylem hem test aynı kodu çağırıyor ve ayrışma imkânsız hâle geliyor.
 *
 * ⚠️ Bu dosya bir sunucu eylemi DEĞİL: yönerge satırı yok, yalnızca saf
 * bir dönüştürücü. Hem sunucuda hem testte çalışabilmesi bundan.
 * ─────────────────────────────────────────────────────────────────────────
 */
/**
 * Şema çıktısını Payload alan adlarına çevirir.
 *
 * Boş dizeler `undefined`'a düşürülür: Payload'a boş dize yazmak, alanın
 * "girilmiş ama boş" görünmesine yol açar ve EİDS değerlendirmesinde
 * "girilmemiş" ile karışır.
 */
export function gorunumuVeriyeCevir(
  veri: SihirbazVerisi,
  mahalleId: number,
  baslik: string,
): RequiredDataFromCollectionSlug<'ilanlar'> {
  const bosDegilse = (deger: string): string | undefined =>
    deger.trim() === '' ? undefined : deger.trim()

  /**
   * ⚠️ Konum yalnızca İKİSİ DE varsa yazılıyor. Tek koordinatlı bir nokta
   * haritada Gine Körfezi'ne düşer — "yaklaşık" değil, yanlış.
   */
  const konum =
    veri.boylam !== undefined && veri.enlem !== undefined
      ? ([veri.boylam, veri.enlem] as [number, number])
      : undefined

  return {
    // ⚠️ Sabit. İstemciden gelen hiçbir değer bu alana yazılmaz.
    durum: 'taslak',

    // Boş bırakılıyor: `slugAlani` kancası başlıktan üretir ve çakışmayı
    // sayıyla çözer. Burada elle slug üretmek, o mantığın ikinci bir
    // kopyasını doğururdu.
    slug: '',

    baslik,
    /**
     * ⚠️ `tip` ve `kategori` gönderilmezse KOLEKSİYONUN KENDİ VARSAYILANI
     * geçerli oluyor (`satilik` / `konut`). Burada bir değer uydurmuyoruz;
     * sihirbaz da aynı varsayılanları ekranda seçili gösteriyor, yani
     * kullanıcı ne kaydedileceğini görüyor.
     */
    tip: veri.tip ?? VARSAYILAN_TIP,
    kategori: veri.kategori ?? VARSAYILAN_KATEGORI,
    ozet: bosDegilse(veri.ozet),
    aciklama: duzMetniZenginMetne(veri.aciklama),

    il: veri.il,
    ilce: veri.ilce,
    mahalle: mahalleId,
    adres: bosDegilse(veri.adres),
    konum,
    ada: bosDegilse(veri.ada),
    parsel: bosDegilse(veri.parsel),
    tapuDurumu: veri.tapuDurumu,

    fiyat: veri.fiyat,
    paraBirimi: veri.paraBirimi,
    tahminiKira: veri.tahminiKira,
    aidat: veri.aidat,
    pazarlikPayi: veri.pazarlikPayi,

    brutM2: veri.brutM2,
    netM2: veri.netM2,
    odaSayisi: veri.odaSayisi,
    banyoSayisi: veri.banyoSayisi,
    bulunduguKat: bosDegilse(veri.bulunduguKat),
    toplamKat: veri.toplamKat,
    binaYasi: veri.binaYasi,
    isinma: veri.isinma,
    kullanimDurumu: veri.kullanimDurumu,
    cepheYonu: veri.cepheYonu,
    esyali: veri.esyali,
    krediyeUygun: veri.krediyeUygun,
    asansor: veri.asansor,

    /**
     * ⚠️ Görsel SIRASI kapak seçimidir. Koleksiyon "ilk fotoğraf kapaktır"
     * diyor; sihirbazda sürükleyip başa alınan görsel kapak oluyor. Ayrı
     * bir "kapak" alanı eklemek, iki kaynağın çeliştiği bir gün üretirdi.
     */
    gorseller: (veri.gorseller ?? []).map((id) => ({ gorsel: id })),
    katPlani: veri.katPlani,

    videoKaynagi: veri.videoKaynagi,
    droneVideoYoutube: bosDegilse(veri.droneVideoYoutube),
    droneVideoId: bosDegilse(veri.droneVideoId),
    sanalTurUrl: bosDegilse(veri.sanalTurUrl),

    eidsDurum: veri.eidsDurum,
    tasinmazNo: bosDegilse(veri.tasinmazNo),
    eidsYetkiBaslangic: bosDegilse(veri.eidsYetkiBaslangic),
    eidsYetkiBitis: bosDegilse(veri.eidsYetkiBitis),

    gizliPortfoy: veri.gizliPortfoy,
    oneCikan: veri.oneCikan,
  }
}

/**
 * Düz metni Lexical'ın beklediği yapıya çevirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SİHİRBAZA ZENGİN METİN EDİTÖRÜ KONMADI — VE BU BİR EKSİKLİK DEĞİL.
 *
 * Lexical'ın tamamını sihirbaza indirmek, sahada telefondan kullanılacak
 * bir ekrana yüzlerce kB eklerdi; üstelik Payload admin'de zaten tam
 * editör var ve ilan metni orada rahatça biçimlendiriliyor.
 *
 * Buradaki iş "metni bir kere yaz, sonra biçimlendir": boş satırla
 * ayrılmış paragraflar Lexical paragraflarına çevriliyor. Panelde açınca
 * metin olduğu gibi duruyor ve düzenlenebiliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
function duzMetniZenginMetne(metin: string): RequiredDataFromCollectionSlug<'ilanlar'>['aciklama'] {
  const sade = metin.trim()
  if (sade === '') return undefined

  const paragraflar = sade
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== '')

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraflar.map((p) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: p,
            version: 1,
          },
        ],
      })),
    },
  } as RequiredDataFromCollectionSlug<'ilanlar'>['aciklama']
}
