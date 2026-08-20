import { describe, expect, it } from 'vitest'

import {
  alaniDegerlendir,
  durumuNormalize,
  gunFarkiHesapla,
  KRITIK_GUN,
  UYARI_GUN,
} from './degerlendirme'

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: SİTE SAATLERCE ERİŞİLEMEZ KALDI VE HİÇBİR İZLEME GÖRMEDİ.
 *
 * Alan adına `clientHold` konmuştu. Sunucu sağlıklıydı, Cloudflare
 * sağlıklıydı, `/api/saglik` 200 dönüyordu — çünkü alan adı DNS'ten
 * düştüğünde sunucuya hiç istek gelmiyor. Sunucuyu izleyen hiçbir kontrol
 * bunu göremez.
 *
 * Bu dosya karar tablosunun tamamını kilitliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

const SIMDI = new Date('2026-08-18T12:00:00Z')
const gunSonra = (gun: number) => new Date(SIMDI.getTime() + gun * 86_400_000).toISOString()

/** Sağlıklı bir temel — testler yalnızca değiştirdikleri alanı yazsın. */
const TEMEL = {
  durumlar: ['client transfer prohibited'],
  bitisTarihi: gunSonra(200),
  cozumleme: { 'Cloudflare (1.1.1.1)': true, 'Google (8.8.8.8)': true },
}

describe('durum normalizasyonu', () => {
  /**
   * ⚠️ İKİ BİÇİM DE GELİYOR VE İKİSİ DE DOĞRU.
   *
   * Klasik WHOIS `clientHold`, RDAP ise `client hold` yazıyor. Yalnızca
   * birini tanıyan bir kontrol, kaynağı değiştiğinde sessizce "sorun yok"
   * derdi — ve tam da bu kontrolün var olma sebebi o sessizlik.
   */
  it.each([
    ['clientHold', 'clienthold'],
    ['client hold', 'clienthold'],
    ['CLIENT_HOLD', 'clienthold'],
    ['client-hold', 'clienthold'],
    ['redemption period', 'redemptionperiod'],
    ['pendingDelete', 'pendingdelete'],
  ])('%s → %s', (girdi, beklenen) => {
    expect(durumuNormalize(girdi)).toBe(beklenen)
  })
})

describe('engelleyici durumlar', () => {
  /** ⚠️ Yaşanan arıza tam olarak bu satır. */
  it.each([
    ['client hold'],
    ['clientHold'],
    ['serverHold'],
    ['redemption period'],
    ['pendingDelete'],
    ['inactive'],
  ])('%s → kritik', (durum) => {
    const sonuc = alaniDegerlendir({ ...TEMEL, durumlar: [durum] }, SIMDI)
    expect(sonuc.saglik).toBe('kritik')
    expect(sonuc.engelleyiciler.length).toBeGreaterThan(0)
  })

  /** Mesaj ne yapılacağını söylemek zorunda. */
  it('kritik mesajı kayıt kuruluşuna yönlendiriyor', () => {
    const sonuc = alaniDegerlendir({ ...TEMEL, durumlar: ['clientHold'] }, SIMDI)
    expect(sonuc.eylem).toContain('kayıt kuruluşu')
    expect(sonuc.ozet).toContain('clienthold')
  })

  /**
   * ⚠️ SIRA ÖNEMLİ: engelleyici durum, bitiş tarihinden ÖNCE.
   *
   * Alan adı `clientHold` altındayken "bitişe 45 gün var" demek doğru ama
   * tamamen alakasız bir uyarı olurdu.
   */
  it('engelleyici durum bitiş uyarısını bastırıyor', () => {
    const sonuc = alaniDegerlendir(
      { ...TEMEL, durumlar: ['clientHold'], bitisTarihi: gunSonra(45) },
      SIMDI,
    )
    expect(sonuc.ozet).toContain('clienthold')
    expect(sonuc.ozet).not.toContain('45')
  })

  it('olağan koruma durumları sorun sayılmıyor', () => {
    const sonuc = alaniDegerlendir(
      { ...TEMEL, durumlar: ['client transfer prohibited', 'client delete prohibited'] },
      SIMDI,
    )
    expect(sonuc.saglik).toBe('saglikli')
  })
})

describe('dış DNS çözümlemesi', () => {
  /** Hiçbiri çözemiyorsa site erişilemez. */
  it('hiçbiri çözemiyorsa kritik', () => {
    const sonuc = alaniDegerlendir(
      {
        ...TEMEL,
        cozumleme: { 'Cloudflare (1.1.1.1)': false, 'Google (8.8.8.8)': false },
      },
      SIMDI,
    )
    expect(sonuc.saglik).toBe('kritik')
    expect(sonuc.ozet).toContain('hiçbir dış DNS')
  })

  /** Biri çözüyorsa yayılma sürüyor olabilir — uyarı, kritik değil. */
  it('biri çözemiyorsa uyarı', () => {
    const sonuc = alaniDegerlendir(
      {
        ...TEMEL,
        cozumleme: { 'Cloudflare (1.1.1.1)': true, 'Google (8.8.8.8)': false },
      },
      SIMDI,
    )
    expect(sonuc.saglik).toBe('uyari')
    expect(sonuc.cozumleyemeyenler).toEqual(['Google (8.8.8.8)'])
  })

  /**
   * ⚠️ HİÇBİR ÇÖZÜMLEYİCİYE ULAŞILAMADIYSA "ÇÖZÜLMÜYOR" DENMİYOR.
   *
   * Sorgu tarafı bu durumda `null` veriyor. Ağ arızasını alan adı arızası
   * gibi göstermek her gün yanlış alarm üretirdi — ve yanlış alarm veren
   * bir uyarı kısa sürede görmezden gelinir.
   */
  it('çözümleme yapılamadıysa kritik denmiyor', () => {
    const sonuc = alaniDegerlendir(
      { durumlar: null, bitisTarihi: null, cozumleme: null, hata: 'ağ hatası' },
      SIMDI,
    )
    expect(sonuc.saglik).toBe('bilinmiyor')
  })
})

describe('bitiş tarihi eşikleri', () => {
  it('60 günden fazla → sağlıklı', () => {
    expect(alaniDegerlendir({ ...TEMEL, bitisTarihi: gunSonra(90) }, SIMDI).saglik).toBe('saglikli')
  })

  it('60 gün ve altı → uyarı', () => {
    expect(alaniDegerlendir({ ...TEMEL, bitisTarihi: gunSonra(UYARI_GUN) }, SIMDI).saglik).toBe(
      'uyari',
    )
    expect(alaniDegerlendir({ ...TEMEL, bitisTarihi: gunSonra(45) }, SIMDI).saglik).toBe('uyari')
  })

  it('30 gün ve altı → kritik', () => {
    expect(alaniDegerlendir({ ...TEMEL, bitisTarihi: gunSonra(KRITIK_GUN) }, SIMDI).saglik).toBe(
      'kritik',
    )
    expect(alaniDegerlendir({ ...TEMEL, bitisTarihi: gunSonra(5) }, SIMDI).saglik).toBe('kritik')
  })

  /** ⚠️ Süresi dolmuş alan adı ayrı bir cümle hak ediyor. */
  it('süresi dolmuşsa kritik ve geçen gün söyleniyor', () => {
    const sonuc = alaniDegerlendir({ ...TEMEL, bitisTarihi: gunSonra(-3) }, SIMDI)
    expect(sonuc.saglik).toBe('kritik')
    expect(sonuc.ozet).toContain('3 gün önce')
    expect(sonuc.kalanGun).toBe(-3)
  })

  it('bitiş tarihi okunamazsa eşikler devreye girmiyor', () => {
    const sonuc = alaniDegerlendir({ ...TEMEL, bitisTarihi: null }, SIMDI)
    expect(sonuc.saglik).toBe('saglikli')
    expect(sonuc.kalanGun).toBeNull()
    expect(gunFarkiHesapla('bozuk tarih', SIMDI)).toBeNull()
  })
})

describe('sorgu tarafı sözleşmesi', () => {
  /**
   * ⚠️ KENDİ DNS'İMİZ KULLANILMIYOR — arızanın kör noktası tam olarak buydu.
   * Sunucunun kendi çözümleyicisi önbellekten cevap verip düşmüş bir alan
   * adını "çalışıyor" gösterebilir.
   */
  it('dış çözümleyiciler 1.1.1.1 ve 8.8.8.8', async () => {
    const { DIS_COZUMLEYICILER } = await import('./sorgu')
    expect(DIS_COZUMLEYICILER.map((c) => c.adres)).toEqual(['1.1.1.1', '8.8.8.8'])
  })
})
