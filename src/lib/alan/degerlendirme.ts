/**
 * Alan adı sağlığı — değerlendirme kuralları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: SİTE SAATLERCE ERİŞİLEMEZ KALDI VE HİÇBİR İZLEME GÖRMEDİ.
 *
 * Sunucu sağlıklıydı, Cloudflare sağlıklıydı, `/api/saglik` 200 dönüyordu.
 * Sorun kayıt kuruluşundaydı: alan adına `clientHold` konmuştu. O durumda
 * alan adı DNS'ten tamamen düşüyor — sunucuya hiç istek gelmiyor,
 * dolayısıyla sunucuyu izleyen hiçbir kontrol bunu göremiyor.
 *
 * İzlemenin kör noktası buydu: her şey "kendi tarafımızdan" ölçülüyordu.
 * Bu modül dışarıdan bakıyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ BU DOSYA SAF: ağ çağrısı yok. Sorgu sonuçları dışarıdan veriliyor,
 * karar burada üretiliyor. Böylece bütün eşik ve durum tablosu testte
 * kurulabiliyor — kayıt kuruluşuna bağlanmadan.
 */

/** Alan adının erişilebilirliğini doğrudan engelleyen EPP durumları. */
export const ENGELLEYICI_DURUMLAR = [
  'clienthold',
  'serverhold',
  'redemptionperiod',
  'pendingdelete',
  'inactive',
] as const

/** Sorun değil ama bilinmesi gereken durumlar. */
export const DIKKAT_DURUMLARI = ['pendingtransfer', 'pendingrenew', 'pendingrestore'] as const

export const DURUM_ACIKLAMASI: Record<string, string> = {
  clienthold:
    'Kayıt kuruluşu alan adını DNS’ten düşürmüş. Site hiç kimseye açılmaz — sunucu çalışıyor olsa bile.',
  serverhold:
    'Kayıt otoritesi (registry) alan adını DNS’ten düşürmüş. Genellikle ödeme, hukuki talep veya doğrulama eksikliği.',
  redemptionperiod:
    'Alan adının süresi dolmuş ve kurtarma penceresindesiniz. Bu pencere kapanırsa alan adı serbest bırakılır.',
  pendingdelete: 'Alan adı silinme sırasında. Bu aşamadan sonra üçüncü kişiler kaydedebilir.',
  inactive: 'Alan adına ad sunucusu (nameserver) tanımlı değil; hiçbir yere çözülmez.',
  pendingtransfer: 'Devir talebi işleniyor. Beklenmiyorsa hemen kayıt kuruluşuna başvurun.',
  pendingrenew: 'Yenileme işleniyor.',
  pendingrestore: 'Kurtarma talebi işleniyor.',
}

/** Bitişe kalan gün eşikleri. */
export const UYARI_GUN = 60
export const KRITIK_GUN = 30

export type Saglik = 'saglikli' | 'uyari' | 'kritik' | 'bilinmiyor'

export interface AlanSorgusu {
  /** RDAP/WHOIS durum listesi (ham hâliyle). */
  durumlar: string[] | null
  /** Bitiş tarihi (ISO) — okunamadıysa null. */
  bitisTarihi: string | null
  /**
   * Dış çözümleyicilerin sonucu: çözümleyici adı → adres bulundu mu.
   * Sorgu yapılamadıysa `null`.
   */
  cozumleme: Record<string, boolean> | null
  /** Sorgu sırasında oluşan hata — varsa değerlendirme "bilinmiyor". */
  hata?: string | null
}

export interface AlanDegerlendirmesi {
  saglik: Saglik
  /** Panelde görünecek tek cümlelik özet. */
  ozet: string
  /** Ne yapılması gerektiği. */
  eylem: string
  /** Bulunan engelleyici durumlar (normalize edilmiş). */
  engelleyiciler: string[]
  /** Bitişe kalan gün — hesaplanamadıysa null. */
  kalanGun: number | null
  /** Çözümleyemeyen dış DNS sunucuları. */
  cozumleyemeyenler: string[]
}

/**
 * Durum dizgesini karşılaştırılabilir hâle getirir.
 *
 * ⚠️ İKİ BİÇİM DE GELİYOR VE İKİSİ DE DOĞRU.
 *
 * Klasik WHOIS `clientHold` yazıyor; RDAP ise aynı durumu `client hold`
 * olarak veriyor (RFC 8056 eşlemesi). Yalnızca birini tanıyan bir kontrol,
 * kaynağı değiştiğinde sessizce "sorun yok" derdi — ve tam da bu kontrolün
 * var olma sebebi o sessizlik.
 */
export function durumuNormalize(deger: string): string {
  return deger.toLowerCase().replace(/[\s_-]/g, '')
}

export function gunFarkiHesapla(bitis: string | null, simdi: Date): number | null {
  if (bitis === null) return null
  const tarih = Date.parse(bitis)
  if (Number.isNaN(tarih)) return null
  return Math.floor((tarih - simdi.getTime()) / 86_400_000)
}

/**
 * Sorgu sonuçlarını tek bir karara çevirir.
 *
 * ⚠️ SIRA ÖNEMLİ: önce erişimi engelleyen durum, sonra çözümleme, sonra
 * bitiş tarihi. Alan adı `clientHold` altındayken "bitişe 45 gün var"
 * demek doğru ama tamamen alakasız bir uyarı olurdu.
 */
export function alaniDegerlendir(
  sorgu: AlanSorgusu,
  simdi: Date = new Date(),
): AlanDegerlendirmesi {
  const kalanGun = gunFarkiHesapla(sorgu.bitisTarihi, simdi)

  const normalize = (sorgu.durumlar ?? []).map(durumuNormalize)
  const engelleyiciler = normalize.filter((durum) =>
    (ENGELLEYICI_DURUMLAR as readonly string[]).includes(durum),
  )
  const dikkat = normalize.filter((durum) =>
    (DIKKAT_DURUMLARI as readonly string[]).includes(durum),
  )

  const cozumleyemeyenler =
    sorgu.cozumleme === null
      ? []
      : Object.entries(sorgu.cozumleme)
          .filter(([, bulundu]) => !bulundu)
          .map(([ad]) => ad)

  /* ── 1. Erişimi engelleyen durum ── */
  if (engelleyiciler.length > 0) {
    const ilk = engelleyiciler[0] ?? ''
    return {
      saglik: 'kritik',
      ozet: `Alan adı "${ilk}" durumunda — site erişilemez olabilir.`,
      eylem:
        (DURUM_ACIKLAMASI[ilk] ?? 'Alan adı erişimi engelleyen bir durumda.') +
        ' Hemen kayıt kuruluşunuzla (domain sağlayıcınız) iletişime geçin.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  /* ── 2. Dış çözümleme ── */
  if (sorgu.cozumleme !== null && cozumleyemeyenler.length > 0) {
    const hepsi = cozumleyemeyenler.length === Object.keys(sorgu.cozumleme).length

    return {
      saglik: hepsi ? 'kritik' : 'uyari',
      ozet: hepsi
        ? 'Alan adı hiçbir dış DNS sunucusundan çözülmüyor — site erişilemez.'
        : `Alan adı ${cozumleyemeyenler.join(', ')} üzerinden çözülmüyor.`,
      eylem: hepsi
        ? 'Ad sunucusu (nameserver) kaydını ve alan adının aktif olduğunu kayıt kuruluşunda kontrol edin.'
        : 'Kısmi bir DNS sorunu olabilir; yayılma sürüyorsa birkaç saat içinde düzelir. Sürüyorsa DNS sağlayıcınıza sorun.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  /* ── 3. Sorgu hiç yapılamadıysa ── */
  if (sorgu.hata != null && sorgu.durumlar === null && sorgu.cozumleme === null) {
    return {
      saglik: 'bilinmiyor',
      ozet: 'Alan adı durumu sorgulanamadı.',
      eylem:
        'Sunucudan dışarı bağlantı engelli olabilir. Sorun sürerse alan adını elle kontrol edin: ' +
        'whois ve dig komutları için işletme rehberine bakın.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  /* ── 4. Bitiş tarihi ── */
  if (kalanGun !== null && kalanGun < 0) {
    return {
      saglik: 'kritik',
      ozet: `Alan adının süresi ${Math.abs(kalanGun)} gün önce doldu.`,
      eylem: 'Derhal yenileyin. Süre dolduktan sonraki kurtarma penceresi kısadır ve ücretlidir.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  if (kalanGun !== null && kalanGun <= KRITIK_GUN) {
    return {
      saglik: 'kritik',
      ozet: `Alan adının süresi ${kalanGun} gün sonra doluyor.`,
      eylem:
        'Şimdi yenileyin. Otomatik yenileme açıksa ödeme yönteminin geçerli olduğunu doğrulayın.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  if (kalanGun !== null && kalanGun <= UYARI_GUN) {
    return {
      saglik: 'uyari',
      ozet: `Alan adının süresi ${kalanGun} gün sonra doluyor.`,
      eylem: 'Yenileme planlayın ya da otomatik yenilemenin açık olduğunu doğrulayın.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  /* ── 5. Dikkat durumları ── */
  if (dikkat.length > 0) {
    const ilk = dikkat[0] ?? ''
    return {
      saglik: 'uyari',
      ozet: `Alan adı "${ilk}" durumunda.`,
      eylem: DURUM_ACIKLAMASI[ilk] ?? 'Kayıt kuruluşundan durumu doğrulayın.',
      engelleyiciler,
      kalanGun,
      cozumleyemeyenler,
    }
  }

  return {
    saglik: 'saglikli',
    ozet:
      kalanGun === null ? 'Alan adı sağlıklı.' : `Alan adı sağlıklı; bitişe ${kalanGun} gün var.`,
    eylem: 'Bir işlem gerekmiyor.',
    engelleyiciler,
    kalanGun,
    cozumleyemeyenler,
  }
}
