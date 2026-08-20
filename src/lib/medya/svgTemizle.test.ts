import { describe, expect, it } from 'vitest'

import { svgMi, svgTemizle } from './svgTemizle'

/**
 * ⚠️ NEDEN VAR: SVG BİR GÖRSEL DEĞİL, BİR BELGEDİR.
 *
 * `<img>` içinde betik çalışmaz ama dosya kendi adresinden açıldığında
 * tarayıcı onu XML belgesi olarak açar ve içindeki `<script>` BİZİM
 * kaynağımızda çalışır. Yükleyenin yönetici olması riski küçültür,
 * kaldırmaz: indirilen bir "ücretsiz logo"nun içinde ne olduğu bilinmez.
 */
describe('SVG temizleyici', () => {
  it('script bloğunu kaldırıyor', () => {
    const { icerik, kaldirilanlar } = svgTemizle(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>',
    )
    expect(icerik).not.toContain('script')
    expect(icerik).toContain('<path')
    expect(kaldirilanlar).toContain('<script>')
  })

  it('kendi kendine kapanan script etiketini de kaldırıyor', () => {
    const { icerik } = svgTemizle('<svg><script src="x.js"/></svg>')
    expect(icerik).not.toContain('script')
  })

  it('foreignObject kaldırılıyor — HTML kaçağının kapısı', () => {
    const { icerik } = svgTemizle(
      '<svg><foreignObject><body onload="x()">merhaba</body></foreignObject></svg>',
    )
    expect(icerik).not.toContain('foreignObject')
    expect(icerik).not.toContain('onload')
  })

  it.each(['onload', 'onclick', 'onmouseover'])('%s özniteliği kaldırılıyor', (olay) => {
    const { icerik } = svgTemizle(`<svg ${olay}="kotu()"><circle r="4"/></svg>`)
    expect(icerik).not.toContain(olay)
    expect(icerik).toContain('<circle')
  })

  it('javascript: adresi kaldırılıyor', () => {
    const { icerik } = svgTemizle('<svg><a href="javascript:alert(1)"><rect/></a></svg>')
    expect(icerik).not.toContain('javascript:')
    expect(icerik).toContain('<rect')
  })

  /**
   * ⚠️ İÇ REFERANS KALMALI. `href="#gradyan"` SVG'nin kendi tanımına
   * işaret ediyor; kaldırmak logoyu bozar. Temizleyicinin işi güvenlik,
   * kırpma değil.
   */
  it('iç referanslara dokunmuyor', () => {
    const kaynak = '<svg><linearGradient id="g"/><rect fill="url(#g)"/><use href="#g"/></svg>'
    const { icerik, kaldirilanlar } = svgTemizle(kaynak)
    expect(icerik).toBe(kaynak)
    expect(kaldirilanlar).toEqual([])
  })

  it('dış referansı kaldırıyor — logo izleyiciye dönüşmesin', () => {
    const { icerik, kaldirilanlar } = svgTemizle(
      '<svg><image href="https://uzak.example/piksel.png"/></svg>',
    )
    expect(icerik).not.toContain('uzak.example')
    expect(kaldirilanlar).toContain('dış referanslar')
  })

  it('@import ve expression() kaldırılıyor', () => {
    const { icerik } = svgTemizle(
      '<svg><style>@import url(https://x/y.css); .a{width:expression(alert(1))}</style></svg>',
    )
    expect(icerik).not.toContain('@import')
    expect(icerik).not.toContain('expression(')
  })

  it('temiz dosyada hiçbir şey değişmiyor', () => {
    const kaynak =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1h22v22H1z"/></svg>'
    const { icerik, kaldirilanlar } = svgTemizle(kaynak)
    expect(icerik).toBe(kaynak)
    expect(kaldirilanlar).toEqual([])
  })

  describe('svgMi', () => {
    it('MIME tipinden tanıyor', () => {
      expect(svgMi('image/svg+xml')).toBe(true)
      expect(svgMi('image/png')).toBe(false)
    })

    /** ⚠️ MIME tipi eksik ya da yanlış gelebilir; dosya adı ikinci kapı. */
    it('dosya adından da tanıyor', () => {
      expect(svgMi(null, 'logo.SVG')).toBe(true)
      expect(svgMi('application/octet-stream', 'logo.svg')).toBe(true)
      expect(svgMi(null, 'logo.png')).toBe(false)
    })
  })
})
