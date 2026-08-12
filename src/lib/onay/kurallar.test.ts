import { describe, expect, it } from 'vitest'

import { ILAN_DURUMLARI, type IlanDurumu } from '@/lib/eids'

import { DANISMAN_DURUMLARI, durumDegisikligiGecerliMi, onayBekliyorMu } from './kurallar'

// ═══════════════════════════════════════════════════════════════════════════
describe('durumDegisikligiGecerliMi — danışman', () => {
  it('ilanı onaya gönderebilir', () => {
    expect(durumDegisikligiGecerliMi('danisman', 'taslak', 'onay_bekliyor').gecerli).toBe(true)
  })

  it('onay kuyruğundan GERİ ÇEKEBİLİR', () => {
    expect(durumDegisikligiGecerliMi('danisman', 'onay_bekliyor', 'taslak').gecerli).toBe(true)
  })

  it('doğrudan YAYINA ALAMAZ', () => {
    const karar = durumDegisikligiGecerliMi('danisman', 'onay_bekliyor', 'yayinda')
    expect(karar.gecerli).toBe(false)
    if (!karar.gecerli) {
      // Mesaj eyleme dönük olmalı: ne yapacağını söylemeli.
      expect(karar.mesaj).toContain('Onay bekliyor')
    }
  })

  it('rezerve, satıldı ve yetki_bitti durumlarına alamaz', () => {
    for (const hedef of ['rezerve', 'satildi', 'yetki_bitti'] as const) {
      expect(durumDegisikligiGecerliMi('danisman', 'taslak', hedef).gecerli, hedef).toBe(false)
    }
  })

  it('yayındaki ilanı TASLAĞA çekebilir — yayından kaldırmak serbest', () => {
    expect(durumDegisikligiGecerliMi('danisman', 'yayinda', 'taslak').gecerli).toBe(true)
  })

  it('⭐ durum DEĞİŞMİYORSA yayındaki ilanı düzenleyebilir', () => {
    // ⚠️ En kolay yapılan hata: kuralı değere bakarak yazmak. Öyle olsaydı
    // danışman yayındaki bir ilanın fiyatını bile güncelleyemezdi, çünkü
    // kısmi güncellemede hedef durum yine "yayinda" gelir.
    for (const durum of ILAN_DURUMLARI) {
      expect(durumDegisikligiGecerliMi('danisman', durum, durum).gecerli, durum).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('durumDegisikligiGecerliMi — yönetici', () => {
  it('her geçişi yapabilir', () => {
    for (const onceki of ILAN_DURUMLARI) {
      for (const hedef of ILAN_DURUMLARI) {
        expect(
          durumDegisikligiGecerliMi('yonetici', onceki, hedef).gecerli,
          `${onceki}→${hedef}`,
        ).toBe(true)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('durumDegisikligiGecerliMi — sunucu içi çağrı (rol null)', () => {
  it("bakım cron'u yetki_bitti yazabilir", () => {
    // ⚠️ Kısıtlansaydı yetkisi dolan ilanı yayından kaldıran görev
    // çalışamaz ve yasal engel kendi kendini kilitlerdi.
    expect(durumDegisikligiGecerliMi(null, 'yayinda', 'yetki_bitti').gecerli).toBe(true)
  })

  it('içe aktarma ve seed her duruma yazabilir', () => {
    for (const hedef of ILAN_DURUMLARI) {
      expect(durumDegisikligiGecerliMi(null, null, hedef).gecerli, hedef).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('yeni kayıt (önceki durum yok)', () => {
  it('danışman taslak veya onay bekliyor olarak oluşturabilir', () => {
    for (const hedef of DANISMAN_DURUMLARI) {
      expect(durumDegisikligiGecerliMi('danisman', null, hedef).gecerli, hedef).toBe(true)
    }
  })

  it('danışman doğrudan YAYINDA olarak oluşturamaz', () => {
    expect(durumDegisikligiGecerliMi('danisman', null, 'yayinda').gecerli).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('onayBekliyorMu', () => {
  it('yalnızca onay_bekliyor için doğru', () => {
    expect(onayBekliyorMu('onay_bekliyor')).toBe(true)
    for (const durum of ILAN_DURUMLARI.filter((d) => d !== 'onay_bekliyor')) {
      expect(onayBekliyorMu(durum), durum).toBe(false)
    }
    expect(onayBekliyorMu(null)).toBe(false)
    expect(onayBekliyorMu(undefined)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('onay kuyruğu ziyaretçiye kapalı', () => {
  it('onay_bekliyor herkese açık durumlar arasında DEĞİL', async () => {
    // ⚠️ Onay kuyruğundaki ilan, yönetici EİDS doğrulaması yapmamış
    // demektir; yayına açık sayılamaz.
    const { HERKESE_ACIK_DURUMLAR } = await import('@/lib/eids')
    expect((HERKESE_ACIK_DURUMLAR as readonly IlanDurumu[]).includes('onay_bekliyor')).toBe(false)
  })
})
