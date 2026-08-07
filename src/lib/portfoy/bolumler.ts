/**
 * Portföy bölümleri — tema sıralarının ölçütleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BÖLÜM BAŞLIĞI ÖLÇÜT SÖYLER, MERAK UYANDIRMAZ.
 *
 * YANLIŞ: "🔥 Dikkat Çeken İlanlar"
 * DOĞRU:  "Yatırım getirisi öne çıkanlar"
 *         alt satır: "Kira çarpanı portföy ortalamasının altında kalanlar"
 *
 * Belirsiz başlık merak uyandırmaz, güvensizlik uyandırır: ziyaretçi
 * "neye göre dikkat çekiyor?" diye sorar ve cevabı olmadığını anlar.
 * Ölçütü yazmak sizi uzman gösterir ve listeyi denetlenebilir kılar.
 * Emoji kullanılmaz.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Bu dosya saf: veritabanına dokunmaz, yalnızca elindeki ilan dizisinden
 * hangilerinin bölüme girdiğini seçer. Sorgulama `src/lib/veri/portfoy.ts`
 * içinde.
 */

import { TICARI_KATEGORILER } from '@/lib/secenekler'

export type BolumOlcutu = 'yatirimGetirisi' | 'yeniEklenenler' | 'gizliPortfoy' | 'ticariSanayi'

export interface OlcutTanimi {
  anahtar: BolumOlcutu
  /** CMS'te seçenek etiketi. */
  etiket: string
  /** Bölüm başlığının varsayılanı — CMS'ten değiştirilebilir. */
  varsayilanBaslik: string
  /** ⚠️ Ölçütün kendisini anlatan alt satır. Boş bırakılmaz. */
  varsayilanAltBaslik: string
  /** Kartlar kilitli mi gösterilecek. */
  kilitli: boolean
}

export const OLCUTLER: readonly OlcutTanimi[] = [
  {
    anahtar: 'yatirimGetirisi',
    etiket: 'Yatırım getirisi öne çıkanlar',
    varsayilanBaslik: 'Yatırım getirisi öne çıkanlar',
    /**
     * ⚠️ "İlçe ortalaması" DENMİYOR, "portföy ortalaması" deniyor.
     *
     * İlçe ortalaması piyasa verisi gerektirir; bizde yok. Elimizdeki
     * ortalamayı ilçe ortalamasıymış gibi sunmak, doğrulanamayan bir iddia
     * olurdu (CLAUDE.md kural 2). Çorlu Konut Endeksi yayına girdiğinde
     * ölçüt gerçek ilçe medyanına bağlanabilir.
     */
    varsayilanAltBaslik: 'Kira çarpanı portföy ortalamasının altında kalan taşınmazlar',
    kilitli: false,
  },
  {
    anahtar: 'yeniEklenenler',
    etiket: 'Yeni eklenenler',
    varsayilanBaslik: 'Yeni eklenenler',
    varsayilanAltBaslik: 'Portföye en son giren taşınmazlar',
    kilitli: false,
  },
  {
    anahtar: 'gizliPortfoy',
    etiket: 'Yayınlanmayan portföy',
    varsayilanBaslik: 'Yayınlanmayan portföy',
    varsayilanAltBaslik: 'İlan verilmeyen, yalnızca doğrudan paylaştığımız taşınmazlar',
    kilitli: true,
  },
  {
    anahtar: 'ticariSanayi',
    etiket: 'Ticari ve sanayi',
    varsayilanBaslik: 'Ticari ve sanayi',
    varsayilanAltBaslik: 'İş yeri, depo, fabrika ve arsa',
    kilitli: false,
  },
]

export function olcutTanimi(olcut: BolumOlcutu): OlcutTanimi {
  const tanim = OLCUTLER.find((aday) => aday.anahtar === olcut)
  if (tanim === undefined) throw new Error(`Bilinmeyen bölüm ölçütü: ${olcut}`)
  return tanim
}

/* ══════════════════════════════════════════════════════════════════════════
   Ölçüt uygulaması
   ══════════════════════════════════════════════════════════════════════════ */

/** Ölçütlerin çalışması için ilandan gereken en az bilgi. */
export interface OlcutGirdisi {
  id: number
  kategori: string
  kiraCarpani?: number | null
  createdAt: string
}

/**
 * Yatırım getirisi ölçütü için asgari gözlem sayısı.
 *
 * ⚠️ İki ilanın ortalaması bir "portföy ortalaması" değildir. Eşik altında
 * bölüm gösterilmez ve sebebi yazılır — dolu görünsün diye üç ilanı
 * "öne çıkanlar" diye sunmak, ölçütü süse çevirirdi.
 */
export const ASGARI_CARPAN_GOZLEMI = 4

/** Kira çarpanı olan ilanların ortalaması. Yetersiz gözlemde `null`. */
export function ortalamaCarpan(ilanlar: readonly OlcutGirdisi[]): number | null {
  const carpanlar = ilanlar
    .map((ilan) => ilan.kiraCarpani)
    .filter(
      (deger): deger is number => typeof deger === 'number' && Number.isFinite(deger) && deger > 0,
    )

  if (carpanlar.length < ASGARI_CARPAN_GOZLEMI) return null

  return carpanlar.reduce((toplam, deger) => toplam + deger, 0) / carpanlar.length
}

export interface OlcutSonucu<T> {
  ilanlar: T[]
  /**
   * Bölüm gösterilemiyorsa sebebi. Boş sıra göstermek yerine sebebi
   * yazmak, ziyaretçiye sitenin bozuk olmadığını anlatır.
   */
  bosSebebi: string | null
}

/**
 * Ölçütü uygular.
 *
 * `havuz` bölümün çekebileceği ilanlar; `tumIlanlar` ortalama gibi
 * toplu hesaplar için tüm yayındaki portföy.
 */
export function olcutUygula<T extends OlcutGirdisi>(
  olcut: BolumOlcutu,
  havuz: readonly T[],
  tumIlanlar: readonly OlcutGirdisi[],
  adet: number,
): OlcutSonucu<T> {
  switch (olcut) {
    case 'yatirimGetirisi': {
      const ortalama = ortalamaCarpan(tumIlanlar)
      if (ortalama === null) {
        return {
          ilanlar: [],
          bosSebebi: `Ortalama hesaplamak için kira çarpanı bilinen en az ${ASGARI_CARPAN_GOZLEMI} taşınmaz gerekiyor.`,
        }
      }

      const secilenler = havuz
        .filter(
          (ilan) =>
            typeof ilan.kiraCarpani === 'number' &&
            Number.isFinite(ilan.kiraCarpani) &&
            ilan.kiraCarpani > 0 &&
            ilan.kiraCarpani < ortalama,
        )
        // Düşük çarpan yatırımcı lehinedir; en iyisi başa gelir.
        .sort((a, b) => (a.kiraCarpani ?? 0) - (b.kiraCarpani ?? 0))
        .slice(0, adet)

      return {
        ilanlar: secilenler,
        bosSebebi:
          secilenler.length === 0
            ? 'Şu an portföy ortalamasının altında kira çarpanına sahip taşınmaz yok.'
            : null,
      }
    }

    case 'yeniEklenenler': {
      const secilenler = [...havuz]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, adet)

      return {
        ilanlar: secilenler,
        bosSebebi: secilenler.length === 0 ? 'Portföyde henüz taşınmaz yok.' : null,
      }
    }

    case 'ticariSanayi': {
      const ticari: readonly string[] = TICARI_KATEGORILER
      const secilenler = havuz.filter((ilan) => ticari.includes(ilan.kategori)).slice(0, adet)

      return {
        ilanlar: secilenler,
        bosSebebi:
          secilenler.length === 0
            ? 'Portföyde şu an ticari ya da sanayi taşınmazı bulunmuyor.'
            : null,
      }
    }

    case 'gizliPortfoy': {
      // Gizli portföy ayrı bir sorgudan gelir; havuz zaten maskelenmiştir.
      const secilenler = havuz.slice(0, adet)
      return {
        ilanlar: secilenler,
        bosSebebi: secilenler.length === 0 ? 'Şu an yayınlanmayan portföyde taşınmaz yok.' : null,
      }
    }
  }
}

/**
 * Aynı ilanın birden fazla sırada tekrarlanmasını engeller.
 *
 * ⚠️ Tekrar sayfayı ucuzlatır: aynı daireyi üç sırada gören ziyaretçi
 * portföyün göründüğünden küçük olduğunu anlar ve bölüm başlıklarının
 * gerçek bir ölçüt taşımadığını düşünür.
 *
 * Sıralar tanımlandıkları düzende işlenir: önce gelen sıra ilanı "kapar".
 * Bu yüzden CMS'teki sıra numarası sadece görsel düzen değil, öncelik.
 */
export function tekrarlariAyikla<T extends { id: number }>(
  siralar: readonly { ilanlar: T[] }[],
): void {
  const gorulen = new Set<number>()

  for (const sira of siralar) {
    sira.ilanlar = sira.ilanlar.filter((ilan) => {
      if (gorulen.has(ilan.id)) return false
      gorulen.add(ilan.id)
      return true
    })
  }
}
