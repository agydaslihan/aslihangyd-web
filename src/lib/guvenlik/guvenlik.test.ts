import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FORM_SINIRI, hizSinirindaMi, hizSinirlariniSifirla, istemciAnahtari } from './hizSiniri'
import { turnstileDogrula, turnstileEtkinMi } from './turnstile'

describe('hız sınırı', () => {
  beforeEach(() => hizSinirlariniSifirla())

  it('pencere içinde izin verilen sayıda geçer', () => {
    for (let deneme = 1; deneme <= FORM_SINIRI.adet; deneme += 1) {
      expect(hizSinirindaMi('a', FORM_SINIRI, 1000).gecebilir, `deneme ${deneme}`).toBe(true)
    }
  })

  it('sınır aşılınca reddeder', () => {
    for (let deneme = 0; deneme < FORM_SINIRI.adet; deneme += 1) {
      hizSinirindaMi('a', FORM_SINIRI, 1000)
    }
    const sonuc = hizSinirindaMi('a', FORM_SINIRI, 1000)

    expect(sonuc.gecebilir).toBe(false)
    expect(sonuc.kalan).toBe(0)
    expect(sonuc.yenidenDeneSaniye).toBeGreaterThan(0)
  })

  it('kalan hakkı doğru sayar', () => {
    expect(hizSinirindaMi('a', { adet: 3, pencereMs: 1000 }, 0).kalan).toBe(2)
    expect(hizSinirindaMi('a', { adet: 3, pencereMs: 1000 }, 0).kalan).toBe(1)
    expect(hizSinirindaMi('a', { adet: 3, pencereMs: 1000 }, 0).kalan).toBe(0)
  })

  it('pencere dolunca sıfırlanır', () => {
    const ayar = { adet: 1, pencereMs: 1000 }
    expect(hizSinirindaMi('a', ayar, 0).gecebilir).toBe(true)
    expect(hizSinirindaMi('a', ayar, 500).gecebilir).toBe(false)
    expect(hizSinirindaMi('a', ayar, 1001).gecebilir).toBe(true)
  })

  it('farklı anahtarlar birbirini etkilemez', () => {
    const ayar = { adet: 1, pencereMs: 1000 }
    expect(hizSinirindaMi('a', ayar, 0).gecebilir).toBe(true)
    expect(hizSinirindaMi('b', ayar, 0).gecebilir).toBe(true)
    expect(hizSinirindaMi('a', ayar, 0).gecebilir).toBe(false)
  })

  it('süresi dolan kayıtlar temizlenir', () => {
    const ayar = { adet: 1, pencereMs: 100 }
    hizSinirindaMi('eski', ayar, 0)
    // Yeni bir çağrı temizliği tetikler; eski kayıt artık yok.
    hizSinirindaMi('yeni', ayar, 1000)
    expect(hizSinirindaMi('eski', ayar, 1000).gecebilir).toBe(true)
  })
})

describe('istemci anahtarı', () => {
  it('x-forwarded-for içindeki ilk adresi alır', () => {
    const basliklar = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })
    expect(istemciAnahtari(basliklar, 'form')).toBe('form:203.0.113.5')
  })

  it('x-real-ip yedeğe düşer', () => {
    expect(istemciAnahtari(new Headers({ 'x-real-ip': '198.51.100.9' }), 'form')).toBe(
      'form:198.51.100.9',
    )
  })

  it('adres yoksa da bir anahtar üretir', () => {
    expect(istemciAnahtari(new Headers(), 'form')).toBe('form:bilinmeyen')
  })

  it('ön ek farklı formları ayırır', () => {
    const basliklar = new Headers({ 'x-real-ip': '1.2.3.4' })
    expect(istemciAnahtari(basliklar, 'talep')).not.toBe(istemciAnahtari(basliklar, 'danisman'))
  })
})

describe('turnstile', () => {
  const eskiOrtam = { ...process.env }

  afterEach(() => {
    process.env = { ...eskiOrtam }
    vi.restoreAllMocks()
  })

  it('anahtar yoksa etkin değil ve doğrulama atlanır', async () => {
    delete process.env.TURNSTILE_GIZLI_ANAHTAR
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI

    expect(turnstileEtkinMi()).toBe(false)
    await expect(turnstileDogrula(null)).resolves.toEqual({ gecerli: true, hata: null })
  })

  it('yalnızca site anahtarı varsa etkin sayılmaz', () => {
    delete process.env.TURNSTILE_GIZLI_ANAHTAR
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'
    expect(turnstileEtkinMi()).toBe(false)
  })

  it('etkinken jetonsuz gönderimi reddeder', async () => {
    process.env.TURNSTILE_GIZLI_ANAHTAR = 'gizli'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'

    const sonuc = await turnstileDogrula('')
    expect(sonuc.gecerli).toBe(false)
    expect(sonuc.hata).toBeTruthy()
  })

  it('Cloudflare başarılı derse geçirir', async () => {
    process.env.TURNSTILE_GIZLI_ANAHTAR = 'gizli'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })),
    )

    await expect(turnstileDogrula('jeton')).resolves.toEqual({ gecerli: true, hata: null })
  })

  it('Cloudflare başarısız derse reddeder', async () => {
    process.env.TURNSTILE_GIZLI_ANAHTAR = 'gizli'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })),
    )

    expect((await turnstileDogrula('jeton')).gecerli).toBe(false)
  })

  /**
   * ⚠️ Kapı KAPALI çalışır. "Servise ulaşamadım, geçir" davranışı,
   * korumayı kapatmanın en kolay yolunu saldırgana hediye ederdi.
   */
  it('Cloudflare erişilemezse gönderimi reddeder', async () => {
    process.env.TURNSTILE_GIZLI_ANAHTAR = 'gizli'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ağ hatası')
      }),
    )

    const sonuc = await turnstileDogrula('jeton')
    expect(sonuc.gecerli).toBe(false)
    expect(sonuc.hata).toBeTruthy()
  })

  it('HTTP hatasında da reddeder', async () => {
    process.env.TURNSTILE_GIZLI_ANAHTAR = 'gizli'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('hata', { status: 500 })),
    )

    expect((await turnstileDogrula('jeton')).gecerli).toBe(false)
  })

  it('hata mesajında teknik ayrıntı sızdırmaz', async () => {
    process.env.TURNSTILE_GIZLI_ANAHTAR = 'cok-gizli-anahtar'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_ANAHTARI = '0x4AAA'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('cok-gizli-anahtar ile bağlantı kurulamadı')
      }),
    )

    const sonuc = await turnstileDogrula('jeton')
    expect(sonuc.hata).not.toContain('cok-gizli-anahtar')
  })
})
