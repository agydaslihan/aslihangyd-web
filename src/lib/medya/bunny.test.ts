import { afterEach, describe, expect, it, vi } from 'vitest'

import { bunnyGommeAdresi, bunnyKapakAdresi, gecerliVideoKimligi } from './bunny'

const KIMLIK = '1c9d4f2e-7a3b-4c8d-9e1f-2a3b4c5d6e7f'

function ayarla(kutuphane: string | undefined, alan: string | undefined) {
  vi.stubEnv('BUNNY_STREAM_LIBRARY_ID', kutuphane ?? '')
  vi.stubEnv('BUNNY_STREAM_CDN_HOSTNAME', alan ?? '')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('video kimliği doğrulaması', () => {
  /**
   * ⚠️ CMS'e tam adres ya da boşluklu metin yapıştırmak çok olası.
   * Doğrulama olmasaydı adres sessizce bozulur ve ziyaretçi boş bir
   * çerçeve görürdü — hata da vermezdi.
   */
  it('UUID biçimini kabul eder', () => {
    expect(gecerliVideoKimligi(KIMLIK)).toBe(true)
  })

  it('tam adresi ve serbest metni reddeder', () => {
    expect(gecerliVideoKimligi(`https://iframe.mediadelivery.net/embed/1/${KIMLIK}`)).toBe(false)
    expect(gecerliVideoKimligi('drone-video-1')).toBe(false)
    expect(gecerliVideoKimligi('')).toBe(false)
    expect(gecerliVideoKimligi(null)).toBe(false)
    expect(gecerliVideoKimligi(undefined)).toBe(false)
  })
})

describe('gömme adresi', () => {
  it('kütüphane kimliği ve video kimliğiyle kurulur', () => {
    ayarla('12345', 'vz-abc.b-cdn.net')
    const adres = new URL(bunnyGommeAdresi(KIMLIK) ?? '')

    expect(adres.hostname).toBe('iframe.mediadelivery.net')
    expect(adres.pathname).toBe(`/embed/12345/${KIMLIK}`)
  })

  /**
   * ⚠️ Otomatik oynatma ve ön yükleme KAPALI.
   *
   * Trafiğin ~%75'i mobil. Sayfa açılır açılmaz video indirmeye başlamak,
   * kullanıcının verisini izni olmadan harcamak ve LCP hedefini (< 2,5 sn)
   * doğrudan bozmak demek.
   */
  it('otomatik oynatma ve ön yükleme kapalı', () => {
    ayarla('12345', 'vz-abc.b-cdn.net')
    const adres = new URL(bunnyGommeAdresi(KIMLIK) ?? '')

    expect(adres.searchParams.get('autoplay')).toBe('false')
    expect(adres.searchParams.get('preload')).toBe('false')
  })

  /**
   * ⚠️ Ayar yoksa `null` — boş bir iframe DEĞİL.
   *
   * Yapılandırılmamış bir CDN, kırık bir oynatıcı olarak görünmemeli;
   * bileşen bu durumda dürüst bir boş durum gösteriyor.
   */
  it('ayarlar eksikse null döner', () => {
    ayarla(undefined, 'vz-abc.b-cdn.net')
    expect(bunnyGommeAdresi(KIMLIK)).toBeNull()

    ayarla('12345', undefined)
    expect(bunnyGommeAdresi(KIMLIK)).toBeNull()
  })

  it('geçersiz kimlikte null döner', () => {
    ayarla('12345', 'vz-abc.b-cdn.net')
    expect(bunnyGommeAdresi('drone-1')).toBeNull()
  })

  /**
   * ⚠️ Otomatik oynatma parametresi TEK YERDE belirlenmeli.
   *
   * Önceki hâlde bu fonksiyon `autoplay=false` yazıyor, `DroneVideo` adresin
   * sonuna `&autoplay=true` ekliyordu. Ortaya aynı parametreyi iki kez
   * taşıyan bir adres çıkıyordu ve hangisinin kazanacağı ayrıştırıcıya
   * kalmıştı — tanımsız davranışa yaslanan bir oynatıcı sessizce ters
   * çalışır.
   */
  it('otomatik oynatma istendiğinde autoplay tek kez ve true', () => {
    ayarla('12345', 'vz-abc.b-cdn.net')
    const adres = new URL(bunnyGommeAdresi(KIMLIK, true)!)
    expect(adres.searchParams.getAll('autoplay')).toEqual(['true'])
    // ⚠️ Ön yükleme yine kapalı: kullanıcı oynat dedi diye videoyu
    // baştan sona indirmeye başlamak mobil veriyi harcar.
    expect(adres.searchParams.get('preload')).toBe('false')
  })

  it('varsayılan çağrıda autoplay tek kez ve false', () => {
    ayarla('12345', 'vz-abc.b-cdn.net')
    const adres = new URL(bunnyGommeAdresi(KIMLIK)!)
    expect(adres.searchParams.getAll('autoplay')).toEqual(['false'])
  })
})

describe('kapak adresi', () => {
  it('CDN alan adından kurulur', () => {
    ayarla('12345', 'vz-abc.b-cdn.net')
    expect(bunnyKapakAdresi(KIMLIK)).toBe(`https://vz-abc.b-cdn.net/${KIMLIK}/thumbnail.jpg`)
  })

  it('alan adına yapıştırılan şema temizlenir', () => {
    // CMS'e "https://vz-abc.b-cdn.net" yazmak çok olası; çift şema
    // adresi bozardı.
    ayarla('12345', 'https://vz-abc.b-cdn.net')
    expect(bunnyKapakAdresi(KIMLIK)).toBe(`https://vz-abc.b-cdn.net/${KIMLIK}/thumbnail.jpg`)
  })
})
