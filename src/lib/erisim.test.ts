import { describe, expect, it } from 'vitest'

import { yeniKullanicininRolu, yoneticiMi } from './erisim'

/**
 * ⚠️ Buradaki kural bir kilitlenme korumasıdır. Bozulursa sonucu üretimde,
 * ilk kurulum anında ortaya çıkar — Aslıhan kendi panelinin ayarlarına
 * giremez ve onu düzeltebilecek bir yönetici de yoktur. Entegrasyon testi
 * bunu göremez (test veritabanında zaten kullanıcı var), bu yüzden kural
 * saf fonksiyon olarak ayrı duruyor.
 */

// ═══════════════════════════════════════════════════════════════════════════
describe('yoneticiMi', () => {
  it('yalnızca yonetici rolüne evet der', () => {
    expect(yoneticiMi({ rol: 'yonetici' })).toBe(true)
    expect(yoneticiMi({ rol: 'danisman' })).toBe(false)
  })

  it('rolü çözülemeyen kullanıcıyı yönetici SAYMAZ', () => {
    // "Herhalde yöneticidir" varsayımı, yetkilendirmeyi sessizce kapatmanın
    // en yaygın yolu.
    expect(yoneticiMi(null)).toBe(false)
    expect(yoneticiMi(undefined)).toBe(false)
    expect(yoneticiMi({})).toBe(false)
    expect(yoneticiMi({ rol: 'admin' })).toBe(false)
    expect(yoneticiMi({ rol: '' })).toBe(false)
    expect(yoneticiMi('yonetici')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yeniKullanicininRolu', () => {
  it('İLK kullanıcı daima yönetici olur', () => {
    // Payload ilk kullanıcı formunu "danisman" varsayılanıyla açar.
    // Bu satır olmasaydı kurulumu yapan kişi kendi panelinden kilitlenirdi.
    expect(yeniKullanicininRolu(0, 'danisman')).toBe('yonetici')
    expect(yeniKullanicininRolu(0, undefined)).toBe('yonetici')
    expect(yeniKullanicininRolu(0, 'yonetici')).toBe('yonetici')
  })

  it('sonraki kullanıcılarda istenen rol korunur', () => {
    expect(yeniKullanicininRolu(1, 'yonetici')).toBe('yonetici')
    expect(yeniKullanicininRolu(5, 'danisman')).toBe('danisman')
  })

  it('sonraki kullanıcıda geçersiz rol danışmana düşer — yöneticiye DEĞİL', () => {
    expect(yeniKullanicininRolu(3, 'admin')).toBe('danisman')
    expect(yeniKullanicininRolu(3, undefined)).toBe('danisman')
    expect(yeniKullanicininRolu(3, null)).toBe('danisman')
  })
})
