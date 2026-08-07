import type { IlanKategorisi, IlanTipi, OdaSayisi, TalepTipi } from '@/lib/secenekler'

/**
 * CRM eşleştirme motoru — talep ↔ portföy.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NE YAPAR, NE YAPMAZ.
 *
 * Yapar: "Bu talebe bugün hangi ilanı göstermeliyim?" sorusunu bir
 * sıralamaya çevirir. Aslıhan'ın hafızasının yerine geçmez, onu hatırlatır.
 *
 * YAPMAZ:
 *  · Otomatik mesaj göndermez. Eşleşme bir öneri, bir eylem değil.
 *  · Talebi elemez. Düşük eşleşme puanı "bu kişiyle ilgilenme" demek
 *    değildir; yalnızca "bu ilan ona göre değil" demektir.
 *  · İlanı ziyaretçiye göstermez. Bu motor YALNIZCA panelde çalışır;
 *    talep verisi kişisel veridir ve dışarı sızmamalıdır.
 *
 * ⚠️ SERT ELEME İLE PUANLAMA AYRI.
 *
 * Bazı uyumsuzluklar derece meselesi değil, kesindir: kiralık arayan
 * birine satılık ilan göstermek eşleşmenin zayıf olması değil, YANLIŞ
 * olmasıdır. Bunlar puanı düşürmez, ilanı listeden çıkarır. Aksi halde
 * "%40 uyumlu" diye yanlış bir ilan listenin ortasında dururdu.
 *
 * ⚠️ BİLİNMEYEN BİLGİ CEZALANDIRILMAZ.
 *
 * Bütçesini yazmayan bir talep, bütçesi uymayan bir talep değildir.
 * Eksik alan o ölçütü devre dışı bırakır ve toplam ağırlık buna göre
 * yeniden ölçeklenir — yoksa hiç bilgi vermemiş bir talep her ilanla
 * düşük puan alır ve motor sessizce işe yaramaz hale gelirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

/* ══════════════════════════════════════════════════════════════════════════
   Girdi
   ══════════════════════════════════════════════════════════════════════════ */

export interface TalepProfili {
  tip: TalepTipi
  butceMin: number | null
  butceMax: number | null
  /** Talebin bağlandığı mahalle kimliği. */
  mahalleId: number | null
  /** Talebin bağlandığı ilan kimliği — varsa o ilan tekrar önerilmez. */
  ilanId: number | null
  /** Serbest metin; oda sayısı ve kategori ipuçları buradan okunur. */
  mesaj: string | null
}

export interface IlanOzeti {
  id: number
  baslik: string
  tip: IlanTipi
  kategori: IlanKategorisi
  fiyat: number | null
  mahalleId: number | null
  mahalleAdi: string | null
  odaSayisi: OdaSayisi | null
  brutM2: number | null
}

/* ══════════════════════════════════════════════════════════════════════════
   Çıktı
   ══════════════════════════════════════════════════════════════════════════ */

export interface EslesmeBileseni {
  ad: string
  /** 0–1 arası uyum. */
  uyum: number
  agirlik: number
  aciklama: string
}

export interface Eslesme {
  ilan: IlanOzeti
  /** 0–100. */
  puan: number
  bilesenler: EslesmeBileseni[]
  /** Panelde tek satırda gösterilecek gerekçe. */
  gerekce: string
}

/* ══════════════════════════════════════════════════════════════════════════
   Ölçütler
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Ağırlıklar — metodolojidir, veri değil.
 *
 * Bütçe en ağır: bir insanın ödeyemeyeceği ev, ne kadar uygun olursa olsun
 * uygun değildir. Mahalle ikinci: konum gayrimenkulde geri alınamayan tek
 * özellik. Oda ve büyüklük sonra gelir — onlar pazarlığa açık.
 */
const AGIRLIKLAR = {
  butce: 40,
  mahalle: 30,
  oda: 20,
  buyukluk: 10,
} as const

/** Talep tipinin aradığı ilan tipi. `null` → kısıt yok. */
export function aranilanIlanTipi(tip: TalepTipi): IlanTipi | null {
  switch (tip) {
    case 'alici':
      return 'satilik'
    case 'kiraci':
      return 'kiralik'
    // 'satici' portföye ilan verecek kişi; 'degerleme' ve 'genel' belirsiz.
    // 'ticari' hem satılık hem kiralık olabilir — kategori ile daraltılır.
    default:
      return null
  }
}

/**
 * Serbest metinden oda sayısı ipucu.
 *
 * ⚠️ Yalnızca AÇIK yazımlar okunuyor: "3+1", "3 + 1". "üç artı bir" gibi
 * yazımlar bilinçli olarak kapsanmıyor — yanlış okunan bir ipucu, hiç
 * okunmamış bir ipucundan kötüdür, çünkü sıralamayı sessizce bozar.
 */
export function mesajdanOda(mesaj: string | null): OdaSayisi | null {
  if (mesaj === null) return null
  const eslesme = /(\d)\s*\+\s*(\d)/.exec(mesaj)
  if (eslesme === null) return null

  const aday = `${eslesme[1]}+${eslesme[2]}`
  const gecerli: readonly string[] = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1']
  return gecerli.includes(aday) ? (aday as OdaSayisi) : null
}

/** Oda sayısını sıralanabilir bir sayıya çevirir ("3+1" → 4). */
function odaAgirligi(oda: OdaSayisi): number {
  const [ana, ek] = oda.split('+')
  return Number(ana ?? 0) + Number(ek ?? 0)
}

/* ══════════════════════════════════════════════════════════════════════════
   Sert eleme
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * İlan bu talep için kesinlikle yanlış mı.
 *
 * ⚠️ Buraya eklenen her kural bir ilanı GÖRÜNMEZ kılar. Yalnızca
 * "derece değil, yön" hataları girer: kiralık/satılık karışması gibi.
 * "Biraz pahalı" buraya girmez — o puanla ifade edilir.
 */
export function elenirMi(talep: TalepProfili, ilan: IlanOzeti): string | null {
  const aranan = aranilanIlanTipi(talep.tip)
  if (aranan !== null && ilan.tip !== aranan) {
    return `Talep ${aranan === 'satilik' ? 'satılık' : 'kiralık'} arıyor, ilan ${ilan.tip === 'satilik' ? 'satılık' : 'kiralık'}`
  }

  // Talebin geldiği ilan tekrar önerilmez: zaten onu görmüş.
  if (talep.ilanId !== null && ilan.id === talep.ilanId) {
    return 'Talebin geldiği ilan'
  }

  /**
   * ⚠️ Bütçenin İKİ KATINI aşan ilan elenir.
   *
   * Bu bir puan meselesi değil: bütçesi 2 milyon olan birine 5 milyonluk
   * ev göstermek yardım değil, zaman kaybı. Eşik geniş tutuldu (iki kat)
   * çünkü form bütçesi genellikle temkinli yazılır ve %20-30 esneme
   * gerçek bir davranış.
   */
  if (talep.butceMax !== null && ilan.fiyat !== null && ilan.fiyat > talep.butceMax * 2) {
    return 'Bütçenin iki katından pahalı'
  }

  return null
}

/* ══════════════════════════════════════════════════════════════════════════
   Puanlama
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Bütçe uyumu.
 *
 * Aralığın içinde tam puan. Dışında, uzaklıkla doğrusal azalır ve
 * bütçenin %50 üstünde sıfırlanır.
 *
 * ⚠️ UCUZ OLMAK BİR KUSUR DEĞİL. Alt sınırın altındaki ilan cezalandırılmaz
 * — insanlar alt sınırı "bundan ucuzu kötüdür" diye değil, arama aralığını
 * daraltmak için yazar. Bütçesinin altında iyi bir ev, iyi bir evdir.
 */
export function butceUyumu(talep: TalepProfili, fiyat: number): number {
  const { butceMin, butceMax } = talep
  if (butceMax === null && butceMin === null) return 1

  if (butceMax !== null && fiyat > butceMax) {
    const asim = (fiyat - butceMax) / butceMax
    return Math.max(0, 1 - asim / 0.5)
  }

  // Alt sınırın altı: bilinçli olarak tam puan (yukarıdaki nota bakın).
  return 1
}

/** Mahalle uyumu — aynı mahalle tam puan, farklı mahalle kısmi. */
function mahalleUyumu(talep: TalepProfili, ilan: IlanOzeti): number {
  if (talep.mahalleId === null || ilan.mahalleId === null) return 1
  if (talep.mahalleId === ilan.mahalleId) return 1

  /**
   * ⚠️ Farklı mahalle sıfır değil 0,35.
   *
   * Sıfır verilseydi, ilgilendiği mahallede uygun ilan olmayan bir talebe
   * hiçbir şey önerilemezdi. Oysa Çorlu'da mahalleler birbirine yakın ve
   * "şu mahalleye baktım ama yandakini de görürüm" çok yaygın. Yine de
   * belirgin biçimde düşük: aynı mahalle her zaman öne çıksın.
   */
  return 0.35
}

/** Oda uyumu — tam eşleşme 1, bir oda fark 0,6, iki fark 0,25. */
function odaUyumu(istenen: OdaSayisi, ilanOda: OdaSayisi): number {
  const fark = Math.abs(odaAgirligi(istenen) - odaAgirligi(ilanOda))
  if (fark === 0) return 1
  if (fark === 1) return 0.6
  if (fark === 2) return 0.25
  return 0
}

/**
 * Bir talep için bir ilanın eşleşme puanı.
 *
 * ⚠️ Ağırlıklar YENİDEN ÖLÇEKLENİR: yalnızca değerlendirilebilen ölçütler
 * paydaya girer. Bütçesini yazmayan bir talep, bütçe ölçütünden sıfır
 * almaz — o ölçüt hiç hesaba katılmaz.
 */
export function ilaniPuanla(talep: TalepProfili, ilan: IlanOzeti): Eslesme | null {
  if (elenirMi(talep, ilan) !== null) return null

  const bilesenler: EslesmeBileseni[] = []

  const butceVerildi = talep.butceMin !== null || talep.butceMax !== null

  if (butceVerildi && ilan.fiyat !== null) {
    const uyum = butceUyumu(talep, ilan.fiyat)
    bilesenler.push({
      ad: 'Bütçe',
      uyum,
      agirlik: AGIRLIKLAR.butce,
      aciklama:
        uyum === 1
          ? 'Bütçe aralığında'
          : uyum > 0.5
            ? 'Bütçenin biraz üstünde'
            : 'Bütçenin belirgin üstünde',
    })
  } else if (butceVerildi) {
    /**
     * ⚠️ FİYATI OLMAYAN İLAN EN AĞIR ÖLÇÜTTEN BEDAVA GEÇMEZ.
     *
     * Ölçüt tamamen atlansaydı, fiyatı girilmemiş bir ilan yalnızca
     * mahalle ve odadan puan alır ve bütçeye tam oturan bir ilanı GEÇERDİ.
     * Duman testinde tam olarak bu oldu: "Fiyatı görüşmeye açık" bir ilan
     * 84 puanla, bütçeye tam uyan bir ilanın (69) üstünde çıktı.
     *
     * Eksik bilgi cezalandırılmaz kuralı TALEBİN eksiklerini korumak için
     * var: kişi bütçesini yazmak zorunda değil. Ama ilanın fiyatının
     * girilmemiş olması bizim veri boşluğumuz, talebin tercihi değil.
     *
     * 0,5 veriliyor: ne ödüllendiriyor ne mahkûm ediyor. Açıklama da
     * boşluğu görünür kılıyor — Aslıhan'ın yapacağı iş fiyatı girmek.
     */
    bilesenler.push({
      ad: 'Bütçe',
      uyum: 0.5,
      agirlik: AGIRLIKLAR.butce,
      aciklama: 'İlanda fiyat yok — bütçeyle karşılaştırılamadı',
    })
  }

  if (talep.mahalleId !== null && ilan.mahalleId !== null) {
    const uyum = mahalleUyumu(talep, ilan)
    bilesenler.push({
      ad: 'Mahalle',
      uyum,
      agirlik: AGIRLIKLAR.mahalle,
      aciklama: uyum === 1 ? 'İlgilendiği mahalle' : `Farklı mahalle (${ilan.mahalleAdi ?? '—'})`,
    })
  }

  const istenenOda = mesajdanOda(talep.mesaj)
  if (istenenOda !== null && ilan.odaSayisi !== null) {
    const uyum = odaUyumu(istenenOda, ilan.odaSayisi)
    bilesenler.push({
      ad: 'Oda',
      uyum,
      agirlik: AGIRLIKLAR.oda,
      /**
       * ⚠️ Uyumsuz halde İKİ sayı da yazılır.
       *
       * İlk yazımda `${ilan.odaSayisi} istendi` deniyordu ve panelde
       * "4+1 istendi" görünüyordu — oysa istenen 3+1, ilan 4+1 idi.
       * Cümle, gerçeğin tersini söylüyordu. Gerekçe metni yanlışsa
       * gerekçe olmaktan çıkar.
       */
      aciklama:
        uyum === 1
          ? `${ilan.odaSayisi} — mesajda istediği`
          : `${ilan.odaSayisi} (${istenenOda} istenmişti)`,
    })
  }

  /**
   * ⚠️ Hiç ölçüt değerlendirilemediyse `null` dönülür.
   *
   * Alternatif, "0 ölçütten 100 puan" gibi anlamsız bir sonuç üretmekti.
   * Hiçbir şey bilinmiyorsa eşleştirme yapılmaz ve panel bunu açıkça
   * söyler — sahte bir kesinlik üretmez.
   */
  if (bilesenler.length === 0) return null

  const toplamAgirlik = bilesenler.reduce((t, b) => t + b.agirlik, 0)
  const kazanilan = bilesenler.reduce((t, b) => t + b.uyum * b.agirlik, 0)
  const puan = Math.round((kazanilan / toplamAgirlik) * 100)

  // Gerekçe: en ağırlıklı iki bileşen. Uzun liste okunmaz.
  const gerekce = [...bilesenler]
    .sort((a, b) => b.agirlik * b.uyum - a.agirlik * a.uyum)
    .slice(0, 2)
    .map((b) => b.aciklama)
    .join(' · ')

  return { ilan, puan, bilesenler, gerekce }
}

/** Puanın altında eşleşme gösterilmez. */
export const ASGARI_PUAN = 45

/**
 * Bir talep için portföyü sıralar.
 *
 * ⚠️ Eşit puanda ilan kimliğine göre kararlı sıralama: aynı listenin her
 * açılışta yer değiştirmesi, gözün listeyi tanımasını engeller.
 */
export function talebeUygunIlanlar(
  talep: TalepProfili,
  ilanlar: readonly IlanOzeti[],
  adet = 5,
): Eslesme[] {
  return ilanlar
    .map((ilan) => ilaniPuanla(talep, ilan))
    .filter((e): e is Eslesme => e !== null && e.puan >= ASGARI_PUAN)
    .sort((a, b) => b.puan - a.puan || a.ilan.id - b.ilan.id)
    .slice(0, adet)
}
