/**
 * Harita nokta katmanları — TEK KAYNAK, SIFIR BAĞIMLILIK.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU DOSYA, `katmanAnahtarlari.ts` İLE AYNI SEBEPTEN VAR.
 *
 * Tanımlar `/harita` sayfasının içindeydi. Mahalle sayfasına mini harita
 * gelince kopyalanacaklardı — ve bu projenin kendi notu kopyalanan bir
 * eşleme için ne diyorsa o olurdu: POI tipi eklendiğinde bir tarafta
 * sessizce `undefined` döner, o tip haritadan düşer, hiçbir hata çıkmaz.
 *
 * ⚠️ MapLibre'ye DOKUNMUYOR. `Harita3B`den sabit almak, yalnızca iki dizgi
 * uğruna 443 kB'lık kütüphaneyi sayfa paketine sokuyordu. Burada yalnızca
 * dizgiler ve düz nesneler var.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const KATMAN_OKUL_SAGLIK = 'okul-saglik'
export const KATMAN_SANAYI = 'sanayi'
export const KATMAN_PORTFOY = 'portfoyum'
export const KATMAN_PROJELER = 'projeler'

/**
 * POI tipi → katman grubu.
 *
 * ⚠️ Listede olmayan tip haritada GÖSTERİLMEZ. Bu bilinçli: her yeni POI
 * tipinin haritada bir rengi ve bir etiketi olmak zorunda; otomatik
 * eklemek, adı ve rengi olmayan gri noktalar üretirdi.
 */
export const POI_GRUPLARI: Record<string, string> = {
  okul: KATMAN_OKUL_SAGLIK,
  universite: KATMAN_OKUL_SAGLIK,
  hastane: KATMAN_OKUL_SAGLIK,
  sanayi: KATMAN_SANAYI,
}

export interface NoktaKatmani {
  anahtar: string
  etiket: string
  renk: string
  /** Bu katmanda kaç öğe var. 0 ise katman pasif ve sebebi yazılı. */
  adet: number
}

/**
 * Katman listesi — sayaç dışarıdan geliyor.
 *
 * ⚠️ Verisi olmayan katman GİZLENMİYOR, PASİF gösteriliyor. Gizlemek
 * "böyle bir katman yok" der; pasif göstermek "var ama verisi girilmedi"
 * der. İkincisi doğru olan.
 *
 * ⚠️ "Projeler" için henüz koleksiyon yok (Faz 3). Sıfır öğeyle, sebebi
 * yazılı duruyor.
 */
export function noktaKatmanTanimlari(say: (katman: string) => number): NoktaKatmani[] {
  return [
    {
      anahtar: KATMAN_PORTFOY,
      etiket: 'Portföyüm',
      renk: 'var(--color-gold-guclu)',
      adet: say(KATMAN_PORTFOY),
    },
    {
      anahtar: KATMAN_OKUL_SAGLIK,
      etiket: 'Okul / sağlık',
      renk: 'var(--color-notr-500)',
      adet: say(KATMAN_OKUL_SAGLIK),
    },
    {
      anahtar: KATMAN_SANAYI,
      etiket: 'Sanayi',
      renk: 'var(--color-uyari)',
      adet: say(KATMAN_SANAYI),
    },
    { anahtar: KATMAN_PROJELER, etiket: 'Projeler', renk: 'var(--color-basari)', adet: 0 },
  ]
}
