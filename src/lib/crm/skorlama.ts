/**
 * Talep (lead) skorlama.
 *
 * Amaç: Aslıhan'ın gününü hangi talebe ayıracağına karar vermesine yardım
 * etmek. Skor bir *sıralama aracıdır*, bir yargı değil.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ TASARIM SINIRI
 *
 * Skor **asla düşük diye bir talebi gizlemez veya sessizce eler.** Yalnızca
 * sıralar. Bir insanın gerçek niyetini form alanlarından okumak mümkün
 * değildir; en kısa mesajı yazan kişi en hazır alıcı olabilir.
 *
 * Bu yüzden skorlama tamamen **gözlemlenebilir davranışa** dayanır:
 * ne kadar bilgi paylaştı, ulaşılabilir mi, ne kadar somut.
 * Demografik veya kişisel özelliklere dayalı hiçbir bileşen YOKTUR.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface SkorGirdisi {
  telefon?: string | null
  eposta?: string | null
  mesaj?: string | null
  tip?: string | null
  butceMin?: number | null
  butceMax?: number | null
  /** Belirli bir ilana mı yazdı, genel mi. */
  ilgiliIlanVar?: boolean
  ilgiliMahalleVar?: boolean
  /** Bülten onayı verdi mi — ilgi seviyesi göstergesi. */
  pazarlamaOnayi?: boolean
}

export interface SkorBileseni {
  ad: string
  puan: number
  azamiPuan: number
  aciklama: string
}

export interface SkorSonucu {
  toplam: number
  bilesenler: SkorBileseni[]
  /** Panelde renk/rozet için. */
  seviye: 'yuksek' | 'orta' | 'dusuk'
}

/**
 * Ağırlıklar.
 *
 * "Satıcı" tipine yüksek puan verilmesi bilinçli: emlak işinde kıt kaynak
 * alıcı değil portföydür (PROJE-PLANI.md §1.2). Bir satıcı talebi, bir
 * alıcı talebinden daha değerlidir.
 */
const AGIRLIKLAR = {
  telefon: 25,
  eposta: 10,
  mesajDetayi: 20,
  butce: 15,
  hedefBelirginligi: 15,
  talepTipi: 15,
} as const

/** Somut sayılabilecek en kısa mesaj uzunluğu. */
const ANLAMLI_MESAJ_UZUNLUGU = 40
const AYRINTILI_MESAJ_UZUNLUGU = 150

export function talepSkorla(girdi: SkorGirdisi): SkorSonucu {
  const bilesenler: SkorBileseni[] = []

  // ── Ulaşılabilirlik ──
  const telefonVar = doluMu(girdi.telefon)
  bilesenler.push({
    ad: 'Telefon bıraktı',
    puan: telefonVar ? AGIRLIKLAR.telefon : 0,
    azamiPuan: AGIRLIKLAR.telefon,
    aciklama: telefonVar
      ? 'Telefon numarası paylaşmak en güçlü niyet göstergesidir'
      : 'Telefon bırakılmamış',
  })

  const epostaVar = doluMu(girdi.eposta)
  bilesenler.push({
    ad: 'E-posta bıraktı',
    puan: epostaVar ? AGIRLIKLAR.eposta : 0,
    azamiPuan: AGIRLIKLAR.eposta,
    aciklama: epostaVar ? 'E-posta ile ulaşılabilir' : 'E-posta bırakılmamış',
  })

  // ── Mesajın somutluğu ──
  const mesajUzunlugu = (girdi.mesaj ?? '').trim().length
  const mesajPuani =
    mesajUzunlugu >= AYRINTILI_MESAJ_UZUNLUGU
      ? AGIRLIKLAR.mesajDetayi
      : mesajUzunlugu >= ANLAMLI_MESAJ_UZUNLUGU
        ? Math.round(AGIRLIKLAR.mesajDetayi * 0.6)
        : mesajUzunlugu > 0
          ? Math.round(AGIRLIKLAR.mesajDetayi * 0.25)
          : 0

  bilesenler.push({
    ad: 'Mesaj ayrıntısı',
    puan: mesajPuani,
    azamiPuan: AGIRLIKLAR.mesajDetayi,
    aciklama:
      mesajUzunlugu === 0
        ? 'Mesaj yazılmamış'
        : `${mesajUzunlugu} karakterlik mesaj — ne aradığını anlatma çabası`,
  })

  // ── Bütçe ──
  const butceVar = typeof girdi.butceMin === 'number' || typeof girdi.butceMax === 'number'
  bilesenler.push({
    ad: 'Bütçe belirtti',
    puan: butceVar ? AGIRLIKLAR.butce : 0,
    azamiPuan: AGIRLIKLAR.butce,
    aciklama: butceVar ? 'Bütçe paylaşmak ciddiyet göstergesidir' : 'Bütçe belirtilmemiş',
  })

  // ── Hedef belirginliği ──
  const hedefPuani = girdi.ilgiliIlanVar
    ? AGIRLIKLAR.hedefBelirginligi
    : girdi.ilgiliMahalleVar
      ? Math.round(AGIRLIKLAR.hedefBelirginligi * 0.6)
      : 0

  bilesenler.push({
    ad: 'Hedef belirginliği',
    puan: hedefPuani,
    azamiPuan: AGIRLIKLAR.hedefBelirginligi,
    aciklama: girdi.ilgiliIlanVar
      ? 'Belirli bir ilan için yazdı'
      : girdi.ilgiliMahalleVar
        ? 'Belirli bir mahalle için yazdı'
        : 'Genel talep',
  })

  // ── Talep tipi ──
  // Satıcı > değerleme > ticari > alıcı/kiracı sırası, portföyün kıt kaynak
  // olmasından geliyor.
  const tipPuanlari: Record<string, number> = {
    satici: AGIRLIKLAR.talepTipi,
    degerleme: Math.round(AGIRLIKLAR.talepTipi * 0.9),
    ticari: Math.round(AGIRLIKLAR.talepTipi * 0.8),
    alici: Math.round(AGIRLIKLAR.talepTipi * 0.6),
    kiraci: Math.round(AGIRLIKLAR.talepTipi * 0.4),
    genel: Math.round(AGIRLIKLAR.talepTipi * 0.3),
  }

  const tipPuani = tipPuanlari[girdi.tip ?? 'genel'] ?? tipPuanlari.genel!
  bilesenler.push({
    ad: 'Talep tipi',
    puan: tipPuani,
    azamiPuan: AGIRLIKLAR.talepTipi,
    aciklama:
      girdi.tip === 'satici' || girdi.tip === 'degerleme'
        ? 'Portföy getirme potansiyeli — en kıt kaynak'
        : 'Talep tipine göre',
  })

  const toplam = Math.min(
    bilesenler.reduce((toplam, bilesen) => toplam + bilesen.puan, 0),
    100,
  )

  return {
    toplam,
    bilesenler,
    seviye: toplam >= 70 ? 'yuksek' : toplam >= 40 ? 'orta' : 'dusuk',
  }
}

function doluMu(deger: string | null | undefined): boolean {
  return typeof deger === 'string' && deger.trim().length > 0
}
