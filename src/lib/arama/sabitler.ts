/**
 * AI aramanın zod'suz sabitleri.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN AYRI DOSYA: TEK SABİT 63 kB TAŞIYORDU.
 *
 * `AkilliArama` istemci bileşeni `AZAMI_SORGU_UZUNLUGU` sabitini
 * `sema.ts`ten alıyordu. O dosya en üstte `zod` import ediyor ve
 * paketleyici bir modülü parça parça alamıyor: tek bir sayı için **zod'un
 * tamamı** istemci paketine giriyordu.
 *
 * Ölçüm: `/portfoy` ilk yükünde en büyük ikinci parça 63,2 kB gzip ile
 * zod'du. Üstelik AI arama varsayılan KAPALI (KVKK — aydınlatma metni
 * bekliyor), yani bugün hiçbir ziyaretçi o kodu çalıştırmıyor ama herkes
 * indiriyordu.
 *
 * ⚠️ Buraya zod (ya da başka bir ağır bağımlılık) import ETMEYİN. Bu
 * dosyanın tek işi, istemcinin güvenle alabileceği düz değerleri tutmak.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Ziyaretçinin yazabileceği en uzun arama metni. */
export const AZAMI_SORGU_UZUNLUGU = 300
