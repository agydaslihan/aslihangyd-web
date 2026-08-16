import { afterEach, describe, expect, it, vi } from 'vitest'

import { AYARLAR, ayar, ayarVarMi, eksikAyarlar, eskiAdlaOkunanlar } from './ayarlar'

/**
 * Çalışma zamanı ayarlarının geri düşüşü ve görünürlüğü.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: AD DEĞİŞİKLİĞİ ÜRETİMDE SESSİZCE HER ŞEYİ KAPATTI.
 *
 * 12 Ağustos'ta `NEXT_PUBLIC_*` değişkenleri ön eksiz adlara taşındı; kod
 * doğruydu ama sunucudaki `.env` eski adlarda kaldı. 13 Ağustos'ta canlıda
 * ölçülen sonuç: dokuz ayarın dokuzu da boş. Harita açılmadı, iletişim
 * bilgileri kayboldu, kanonik adres `:8443` ile yayınlandı ve en kötüsü —
 * Turnstile SİTE anahtarı boş kaldığı için **formlar bot korumasız
 * çalıştı.** Gizli anahtar doluydu, yani arıza "yarı yapılandırılmış"
 * göründüğü için hiçbir uyarı üretmedi.
 *
 * Bu testler iki güvenceyi koruyor: eski ad çalışmaya devam eder, ve
 * eksiklik görünür olur.
 * ─────────────────────────────────────────────────────────────────────────
 */

afterEach(() => {
  vi.unstubAllEnvs()
})

/** Tüm ayarları (yeni ve eski adlarıyla) boşaltır. */
function hepsiniBosalt() {
  for (const tanim of AYARLAR) {
    vi.stubEnv(tanim.ad, '')
    if (tanim.eskiAd) vi.stubEnv(tanim.eskiAd, '')
  }
}

describe('ayar okuma', () => {
  it('yeni ad varsa onu kullanır', () => {
    hepsiniBosalt()
    vi.stubEnv('MAPTILER_ANAHTARI', 'yeni-deger')
    expect(ayar('MAPTILER_ANAHTARI')).toBe('yeni-deger')
  })

  /**
   * ⚠️ ASIL GÜVENCE. Sunucudaki `.env` yalnızca eski adı taşıyorsa site
   * çalışmaya devam etmeli — kimse tek bir dağıtımda tüm ortamları elle
   * güncelleyemez ve güncelleyemediğinde özellikler kapanmamalı.
   */
  it('yeni ad yoksa eski NEXT_PUBLIC_ adına düşer', () => {
    hepsiniBosalt()
    vi.stubEnv('NEXT_PUBLIC_MAPTILER_API_KEY', 'eski-deger')
    expect(ayar('MAPTILER_ANAHTARI')).toBe('eski-deger')
  })

  it('yeni ad eskisini ezer', () => {
    hepsiniBosalt()
    vi.stubEnv('MAPTILER_ANAHTARI', 'yeni')
    vi.stubEnv('NEXT_PUBLIC_MAPTILER_API_KEY', 'eski')
    expect(ayar('MAPTILER_ANAHTARI')).toBe('yeni')
  })

  /**
   * ⚠️ BOŞ DİZE "TANIMSIZ" SAYILIR.
   *
   * `compose.prod.yml` ayarlanmamış değişkenleri `${VAR:-}` ile BOŞ DİZE
   * olarak geçiriyor. `??` kullansaydık boş dize "tanımlı" sayılır ve geri
   * düşüş hiç çalışmazdı — aynı tuzağa `OVERPASS_ADRESI`'nde bir kez
   * düşülmüştü.
   */
  it('boş dize tanımsız sayılır ve geri düşüş çalışır', () => {
    hepsiniBosalt()
    vi.stubEnv('MAPTILER_ANAHTARI', '')
    vi.stubEnv('NEXT_PUBLIC_MAPTILER_API_KEY', 'eski-deger')
    expect(ayar('MAPTILER_ANAHTARI')).toBe('eski-deger')
  })

  it('yalnızca boşluk içeren değer de tanımsız sayılır', () => {
    hepsiniBosalt()
    vi.stubEnv('MAPTILER_ANAHTARI', '   ')
    expect(ayarVarMi('MAPTILER_ANAHTARI')).toBe(false)
  })

  it('tanımsız ayar adı hata verir — sessizce boş dönmez', () => {
    expect(() => ayar('BOYLE_BIR_AYAR_YOK')).toThrow()
  })
})

describe('ayar görünürlüğü', () => {
  it('hiçbir adla tanımlı olmayan ayar eksik sayılır', () => {
    hepsiniBosalt()
    const eksikler = eksikAyarlar().map((durum) => durum.ad)
    expect(eksikler).toContain('TURNSTILE_SITE_ANAHTARI')
    expect(eksikler).toContain('MAPTILER_ANAHTARI')
  })

  it('eski adla okunan ayar eksik DEĞİL ama borç olarak işaretlenir', () => {
    hepsiniBosalt()
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMARA', '905000000000')

    expect(eksikAyarlar().map((d) => d.ad)).not.toContain('WHATSAPP_NUMARA')
    expect(eskiAdlaOkunanlar().map((d) => d.ad)).toContain('WHATSAPP_NUMARA')
  })

  /**
   * ⚠️ Tanı çıktısı DEĞERLERİ taşımaz, yalnızca kaynağı.
   *
   * Anahtar sızdıran bir tanı aracına kimse güvenmez ve kullanılmaz;
   * kullanılmayan bir tanı aracı da olmayan bir tanı aracıdır.
   */
  it('durum listesi hiçbir ayarın DEĞERİNİ taşımaz', () => {
    hepsiniBosalt()
    vi.stubEnv('TURNSTILE_SITE_ANAHTARI', 'GIZLI-OLMASA-DA-SIZMAMALI')

    const serilesmis = JSON.stringify(eksikAyarlar().concat(eskiAdlaOkunanlar()))
    expect(serilesmis).not.toContain('GIZLI-OLMASA-DA-SIZMAMALI')
  })
})

describe('ayar tanımları', () => {
  /**
   * ⚠️ "Eksikse ne olur" yazılamıyorsa o ayar gerçekten gerekli mi?
   * Bildirim metni bu alandan üretiliyor; boş bırakılırsa panel
   * "bir şey eksik" der ve ne yapılacağını söylemez.
   */
  it('her ayarın eksiklik sonucu yazılı', () => {
    for (const tanim of AYARLAR) {
      expect(tanim.eksikseNeOlur.length, tanim.ad).toBeGreaterThan(20)
      expect(tanim.aciklama.length, tanim.ad).toBeGreaterThan(3)
    }
  })

  it('her ayarın eski adı NEXT_PUBLIC_ ile başlar', () => {
    for (const tanim of AYARLAR) {
      if (tanim.eskiAd !== undefined) {
        expect(tanim.eskiAd.startsWith('NEXT_PUBLIC_'), tanim.ad).toBe(true)
      }
    }
  })

  /**
   * ⚠️ Turnstile site anahtarı KRİTİK işaretli olmalı.
   *
   * Eksikliği bir görsel kusur değil, güvenlik sonucu doğuruyor: formlar
   * bot korumasız çalışıyor. Kritik olmayan bir bildirim toplu listeye
   * düşer ve gözden kaçar.
   */
  it('güvenlik ve yasal sonucu olan ayarlar kritik işaretli', () => {
    const kritikler = AYARLAR.filter((tanim) => tanim.kritik).map((tanim) => tanim.ad)
    expect(kritikler).toContain('TURNSTILE_SITE_ANAHTARI')
    expect(kritikler).toContain('SITE_ADRESI')
  })
})

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ HİÇBİR AYAR GERİ DÜŞÜŞÜN "KAPSAM DIŞI"NDA DEĞİL.
 *
 * 16 Ağustos 2026'da şu soru soruldu: "MapTiler .env'de eski adla dolu,
 * yeni adla boş; geri düşüş diğerlerinde çalışıyor, MapTiler neden kapsam
 * dışı?"
 *
 * Ölçüldü: kapsam dışı DEĞİLDİ. Mekanizma MapTiler için de çalışıyordu —
 * hem birim düzeyinde hem gerçek üretim derlemesinde (anahtar sunucuda
 * render edilen HTML'e ulaşıyordu). Haritanın boş kalmasının sebebi
 * başkaydı: katmanlarımız MapLibre'nin `load` olayına bağlıydı ve o olay
 * altlık yüklenmezse hiç ateşlenmiyordu.
 *
 * Bu test soruyu bir daha sordurtmuyor: TANIMLI HER ayarın geri düşüşü tek
 * tek sınanıyor. Biri listeden düşerse ya da özel bir yol kazanırsa burada
 * kırmızı yanar.
 * ─────────────────────────────────────────────────────────────────────────
 */
describe('geri düşüş hiçbir ayarı atlamıyor', () => {
  it('eski adı tanımlı her ayar eski addan okunabiliyor', () => {
    const basarisiz: string[] = []

    for (const tanim of AYARLAR) {
      if (!tanim.eskiAd) continue

      vi.stubEnv(tanim.ad, '')
      vi.stubEnv(tanim.eskiAd, `ESKI_${tanim.ad}`)

      if (ayar(tanim.ad) !== `ESKI_${tanim.ad}`) {
        basarisiz.push(`${tanim.ad} ← ${tanim.eskiAd}`)
      }
    }

    expect(
      basarisiz,
      'Bu ayarlar eski addan okunamıyor; sunucudaki .env güncellenmemişse sessizce boş kalırlar.',
    ).toEqual([])
  })

  it('MapTiler geri düşüşü çalışıyor ve stil adresi üretiyor', async () => {
    vi.stubEnv('MAPTILER_ANAHTARI', '')
    vi.stubEnv('NEXT_PUBLIC_MAPTILER_API_KEY', 'ANAHTAR_123')

    const { haritaStilAdresi } = await import('@/lib/harita/sunucu')

    expect(ayar('MAPTILER_ANAHTARI')).toBe('ANAHTAR_123')
    expect(haritaStilAdresi()).toContain('key=ANAHTAR_123')
  })
})
