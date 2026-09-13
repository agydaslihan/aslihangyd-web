/**
 * Koordinat doğrulama — saf katman.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: İLAN #4'ÜN NOKTASI SUUDİ ARABİSTAN'DAYDI.
 *
 * 13 Eylül 2026'da panelde girilen iki ilanın da koordinatı bozuktu:
 *
 *   #4 UYSAL PIAZZA  → POINT(41.150169137 27.828600915)   enlem/boylam TERS
 *   #2 KERVANCI CITY → POINT(1 1)                          Gine Körfezi
 *
 * Buna karşılık OSM'den içe aktarılan 26 mahallenin ve 544 ilgi noktasının
 * HEPSİ doğruydu. Desen açık: kırılan şey elle giriş.
 *
 * Sebebi de belli. Payload'ın `point` alanı GeoJSON sırasını (boylam,
 * enlem) izliyor ve panele önce "Boylam" kutusunu basıyor. İnsanın
 * bildiği sıra ise "enlem, boylam" — koordinat okurken, haritada, GPS'te,
 * her yerde. Form alışkanlığın tersini soruyor ve hatayı davet ediyor.
 *
 * Bu modül üç işi yapıyor: sırayı düzeltmek DEĞİL (o arayüzün işi), ama
 * hatayı YAKALAMAK, TERS OLANI TANIMAK ve düzeltmeyi ÖNERMEK.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Çorlu'nun geçerli koordinat penceresi.
 *
 * ⚠️ İlçe sınırı değil, KABA BİR KUTU — ve öyle olmalı. Gerçek sınır
 * çokgeniyle denetleseydik sınıra 50 m uzaktaki meşru bir ilan reddedilir,
 * üstelik kutu mahalle sınırları içe aktarılmadan hiç çalışmazdı.
 */
export const CORLU_KUTUSU = {
  enlemEnAz: 40.9,
  enlemEnCok: 41.4,
  boylamEnAz: 27.5,
  boylamEnCok: 28.1,
} as const

/** Dünya üzerinde geçerli aralık — kutunun dışında ama yine de koordinat. */
const DUNYA = { enlem: 90, boylam: 180 } as const

export type KonumDurumu =
  /** İkisi de Çorlu kutusunda. */
  | 'tamam'
  /** Enlem ve boylam yer değiştirmiş — takas edilirse Çorlu'ya düşüyor. */
  | 'ters'
  /** Geçerli koordinat ama Çorlu kutusunun dışında. */
  | 'disarida'
  /** Dünya üzerinde bile geçerli değil. */
  | 'gecersiz'
  /** Biri ya da ikisi girilmemiş. */
  | 'eksik'

export interface KonumDenetimi {
  durum: KonumDurumu
  /** Kullanıcıya gösterilecek Türkçe metin. `tamam` ve `eksik` için `null`. */
  mesaj: string | null
  /**
   * Takas edilmiş hâli — yalnızca `durum === 'ters'` iken dolu.
   *
   * ⚠️ Tek tıkla düzeltmeyi bu sağlıyor. "Yanlış" demek yetmez; hatayı
   * gösterip düzeltmeyi kullanıcıya bırakmak, aynı hatanın ikinci kez
   * yapılmasına açık kapı bırakır.
   */
  takas: { enlem: number; boylam: number } | null
}

const kutudaMi = (enlem: number, boylam: number): boolean =>
  enlem >= CORLU_KUTUSU.enlemEnAz &&
  enlem <= CORLU_KUTUSU.enlemEnCok &&
  boylam >= CORLU_KUTUSU.boylamEnAz &&
  boylam <= CORLU_KUTUSU.boylamEnCok

const dunyadaMi = (enlem: number, boylam: number): boolean =>
  Number.isFinite(enlem) &&
  Number.isFinite(boylam) &&
  Math.abs(enlem) <= DUNYA.enlem &&
  Math.abs(boylam) <= DUNYA.boylam

/** Bir koordinat çiftini denetler. */
export function konumuDenetle(
  enlem: number | null | undefined,
  boylam: number | null | undefined,
): KonumDenetimi {
  if (typeof enlem !== 'number' || typeof boylam !== 'number') {
    return { durum: 'eksik', mesaj: null, takas: null }
  }

  if (!dunyadaMi(enlem, boylam)) {
    return {
      durum: 'gecersiz',
      mesaj: `Geçerli bir koordinat değil. Enlem −90 ile 90, boylam −180 ile 180 arasında olur.`,
      takas: null,
    }
  }

  if (kutudaMi(enlem, boylam)) return { durum: 'tamam', mesaj: null, takas: null }

  /**
   * ⚠️ TAKAS DENETİMİ ÖNCE. Ters girilmiş bir koordinat "Çorlu dışında"
   * olarak da doğrudur, ama o mesaj kullanıcıya ne yapacağını söylemez.
   * Hatanın ADINI koymak, tarif etmekten iyidir.
   */
  if (kutudaMi(boylam, enlem)) {
    return {
      durum: 'ters',
      mesaj:
        'Bu koordinat Çorlu dışında görünüyor. Enlem ve boylamı karıştırmış olabilirsiniz — ' +
        `takas edilirse nokta Çorlu'ya düşüyor.`,
      takas: { enlem: boylam, boylam: enlem },
    }
  }

  return {
    durum: 'disarida',
    mesaj:
      'Bu koordinat Çorlu dışında görünüyor. Enlem ve boylamı karıştırmış olabilirsiniz. ' +
      `Çorlu için enlem ${CORLU_KUTUSU.enlemEnAz}–${CORLU_KUTUSU.enlemEnCok}, ` +
      `boylam ${CORLU_KUTUSU.boylamEnAz}–${CORLU_KUTUSU.boylamEnCok} aralığındadır.`,
    takas: null,
  }
}

/**
 * Koordinat metnini sayıya çevirir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ `lib/csv/ayristir.ts` İÇİNDEKİ `sayiyaCevir` BURADA KULLANILAMAZ.
 *
 * O ayrıştırıcı Türkçe para/nüfus rakamları için yazıldı ve son grubu tam
 * üç haneli olan noktayı BİNLİK ayırıcı sayıyor. Doğru kural — ama
 * koordinatta felaket:
 *
 *     sayiyaCevir('41.150')  →  41150      ✗
 *     koordinatCoz('41.150') →     41.15   ✓
 *
 * Koordinatta binlik ayırıcı YOKTUR: değer her zaman −180…180 arasında,
 * yani ayırıcıya yer olmayan bir aralıkta. Bu yüzden hem nokta hem virgül
 * koşulsuz ONDALIK sayılıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function koordinatCoz(ham: string): number | null {
  const metin = ham.trim().replace(/\s/g, '')
  if (metin === '') return null

  // Tek bir ondalık ayırıcı (nokta ya da virgül), isteğe bağlı işaret.
  if (!/^[-+]?\d*[.,]?\d+$/.test(metin)) return null

  const sayi = Number(metin.replace(',', '.'))
  return Number.isFinite(sayi) ? sayi : null
}

/**
 * Koordinatı ekranda yazar.
 *
 * ⚠️ Ondalık ayırıcı NOKTA — Türkçe yerelin virgülü değil. Koordinat
 * uluslararası bir gösterim: kullanıcı bu değeri Google Haritalar'a ya da
 * tapu sorgusuna yapıştırdığında noktayla çalışması gerekiyor. Altı
 * basamak ≈ 11 cm, bir bina için fazlasıyla yeterli.
 */
export function koordinatYaz(deger: number | null | undefined): string {
  if (typeof deger !== 'number' || !Number.isFinite(deger)) return ''
  return String(Number(deger.toFixed(6)))
}

/**
 * Payload `point` değeri → enlem/boylam.
 *
 * ⚠️ Payload dizide GeoJSON sırasını tutuyor: `[boylam, enlem]`. Arayüzün
 * gösterdiği sıra bunun TERSİ ve bu bilinçli — ama dönüşüm tek bir yerde
 * kalmalı, yoksa iki sıralama kodun içinde karışır.
 */
export function noktadanCoz(deger: unknown): { enlem: number | null; boylam: number | null } {
  if (!Array.isArray(deger) || deger.length < 2) return { enlem: null, boylam: null }
  const [boylam, enlem] = deger
  return {
    boylam: typeof boylam === 'number' && Number.isFinite(boylam) ? boylam : null,
    enlem: typeof enlem === 'number' && Number.isFinite(enlem) ? enlem : null,
  }
}

/** Enlem/boylam → Payload `point` değeri. Biri eksikse `null`. */
export function noktayaCevir(enlem: number | null, boylam: number | null): [number, number] | null {
  if (enlem === null || boylam === null) return null
  return [boylam, enlem]
}
