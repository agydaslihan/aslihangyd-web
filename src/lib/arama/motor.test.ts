import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { aramaFiltresiSemasi } from './sema'
import { aiAramaAcikMi, sorguyuFiltreyeCevir } from './motor'

/**
 * ⚠️ Bu dosya AĞA ÇIKMAZ.
 *
 * Canlı API çağrısı ne birim ne entegrasyon testinde yapılır: para harcar,
 * ağ olmadan çalışmaz ve modelin çıktısı deterministik değildir. Burada
 * sınanan şey, çağrı YAPILMADAN ÖNCEKİ ve YAPILDIKTAN SONRAKİ güvencelerdir
 * — kapı, doğrulama ve şema. Çağrının kendi doğruluğu, anahtar geldiğinde
 * elle duman testiyle doğrulanacak (bkz. docs/ILERLEME.md).
 */

const ONCEKI_ANAHTAR = process.env.ANTHROPIC_API_KEY

const MAHALLELER = [
  { slug: 'muhittin', ad: 'Muhittin' },
  { slug: 'seyhsinan', ad: 'Şeyhsinan' },
]

beforeEach(() => {
  delete process.env.ANTHROPIC_API_KEY
})

afterEach(() => {
  if (ONCEKI_ANAHTAR === undefined) delete process.env.ANTHROPIC_API_KEY
  else process.env.ANTHROPIC_API_KEY = ONCEKI_ANAHTAR
})

// ═══════════════════════════════════════════════════════════════════════════
describe('aiAramaAcikMi', () => {
  it('anahtar yoksa KAPALI — varsayılan bu', () => {
    expect(aiAramaAcikMi()).toBe(false)
  })

  it('boş anahtar da kapalı sayılır', () => {
    process.env.ANTHROPIC_API_KEY = '   '
    expect(aiAramaAcikMi()).toBe(false)
  })

  it('anahtar varsa açık', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-deneme'
    expect(aiAramaAcikMi()).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('sorguyuFiltreyeCevir — ağa çıkmadan önceki kapılar', () => {
  it('anahtar yoksa API çağrısı YAPMADAN kapalı döner', async () => {
    const sonuc = await sorguyuFiltreyeCevir('3+1 daire arıyorum', MAHALLELER)
    expect(sonuc.durum).toBe('kapali')
  })

  it('geçersiz sorguda API çağrısı yapılmaz', async () => {
    // Anahtar var ama sorgu kısa: doğrulama ağdan ÖNCE çalışmalı, yoksa
    // her saçma girdi için para ödenir.
    process.env.ANTHROPIC_API_KEY = 'sk-ant-deneme'

    const sonuc = await sorguyuFiltreyeCevir('ev', MAHALLELER)
    expect(sonuc.durum).toBe('gecersiz_sorgu')
  })

  it('dize olmayan girdide de çağrı yapılmaz', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-deneme'

    for (const girdi of [null, undefined, 42, { a: 1 }, []]) {
      const sonuc = await sorguyuFiltreyeCevir(girdi, MAHALLELER)
      expect(sonuc.durum, JSON.stringify(girdi)).toBe('gecersiz_sorgu')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('SDK sözleşmesi', () => {
  /**
   * Bu iki test canlı çağrıyı doğrulamaz ama onun ön koşullarını doğrular:
   * kullandığımız SDK yüzeyi gerçekten var mı. Paket sürümü yükseltildiğinde
   * `messages.parse` ya da `zodOutputFormat` kaybolursa burada patlar —
   * üretimde ilk aramada değil.
   */
  it('messages.parse yüzeyi mevcut', () => {
    const istemci = new Anthropic({ apiKey: 'sk-ant-deneme' })
    expect(typeof istemci.messages.parse).toBe('function')
  })

  it('zodOutputFormat şemamızı kabul eder', () => {
    const bicim = zodOutputFormat(aramaFiltresiSemasi)
    expect(bicim.type).toBe('json_schema')
    expect(bicim.schema).toBeDefined()
  })
})
