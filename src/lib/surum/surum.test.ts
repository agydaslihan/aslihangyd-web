import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { bildirimleriUret, type BildirimGirdisi } from '@/lib/bildirim/motor'

import { imajHazirMi, kisaCommit, surumOzeti, tarihYaz, type SurumDurumu } from './durum'
import { calisanSurum, SURUM_DOSYASI } from './kimlik'

const gecici: string[] = []

function kok(): string {
  const yol = mkdtempSync(join(tmpdir(), 'surum-'))
  gecici.push(yol)
  return yol
}

afterEach(() => {
  while (gecici.length > 0) rmSync(gecici.pop() as string, { recursive: true, force: true })
})

const COMMIT = 'ede5cf2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e'

const DURUM = (ek: Partial<SurumDurumu> = {}): SurumDurumu => ({
  calisanCommit: COMMIT,
  calisanKaynak: 'imaj',
  enSonCommit: COMMIT,
  gerideCommit: 0,
  imajCommit: COMMIT,
  derlemeAni: '2026-09-01T00:30:00.000Z',
  baslangicAni: '2026-09-01T00:40:00.000Z',
  hata: null,
  kontrolZamani: '2026-09-01T01:00:00.000Z',
  ...ek,
})

describe('çalışan sürüm kimliği', () => {
  it('imaja gömülü damgayı okur', () => {
    const dizin = kok()
    writeFileSync(
      join(dizin, SURUM_DOSYASI),
      JSON.stringify({ commit: COMMIT, derlemeAni: '2026-09-01T00:30:00Z', depo: 'a/b' }),
    )

    expect(calisanSurum(dizin)).toEqual({
      commit: COMMIT,
      derlemeAni: '2026-09-01T00:30:00Z',
      depo: 'a/b',
      kaynak: 'imaj',
    })
  })

  /**
   * ⚠️ Damga BOŞ da derlenebiliyor (elle `docker build`). Boş dizeyi
   * commit sanmak, panelde uydurma bir SHA göstermek olurdu.
   */
  it('boş commit damgası yok sayılır', () => {
    const dizin = kok()
    writeFileSync(join(dizin, SURUM_DOSYASI), JSON.stringify({ commit: '', depo: '' }))
    expect(calisanSurum(dizin).kaynak).toBe('bilinmiyor')
  })

  it('bozuk JSON çökertmez', () => {
    const dizin = kok()
    writeFileSync(join(dizin, SURUM_DOSYASI), '{ bu json değil')
    expect(calisanSurum(dizin).kaynak).toBe('bilinmiyor')
  })

  /**
   * ⚠️ Geliştirmede `.git` okunuyor ama AYRI işaretleniyor: geliştiricinin
   * dalını "yayındaki sürüm" sanmak, çözmeye çalıştığımız hatanın aynısı.
   */
  it('damga yoksa çalışma ağacına düşer ve bunu işaretler', () => {
    const dizin = kok()
    mkdirSync(join(dizin, '.git', 'refs', 'heads'), { recursive: true })
    writeFileSync(join(dizin, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    writeFileSync(join(dizin, '.git', 'refs', 'heads', 'main'), `${COMMIT}\n`)

    const sonuc = calisanSurum(dizin)
    expect(sonuc.commit).toBe(COMMIT)
    expect(sonuc.kaynak).toBe('depo')
  })

  it('ayrık HEAD de okunur', () => {
    const dizin = kok()
    mkdirSync(join(dizin, '.git'), { recursive: true })
    writeFileSync(join(dizin, '.git', 'HEAD'), `${COMMIT}\n`)
    expect(calisanSurum(dizin).commit).toBe(COMMIT)
  })

  it('hiçbir kaynak yoksa bilinmiyor', () => {
    expect(calisanSurum(kok())).toEqual({
      commit: null,
      derlemeAni: null,
      depo: null,
      kaynak: 'bilinmiyor',
    })
  })
})

describe('sürüm özeti', () => {
  it('güncelken de sürüm ve tarih yazıyor', () => {
    const metin = surumOzeti(DURUM())
    expect(metin).toContain('ede5cf2')
    expect(metin).toContain('main ile aynı')
    expect(metin).toContain('2026')
  })

  it('gerideyken commit sayısını yazıyor', () => {
    expect(surumOzeti(DURUM({ gerideCommit: 35 }))).toContain("main'in 35 commit gerisinde")
  })

  /** ⚠️ "Bakılamadı" ile "geride değil" aynı cümleye çıkmamalı. */
  it('hesaplanamadıysa "aynı" DEMİYOR', () => {
    const metin = surumOzeti(DURUM({ gerideCommit: null }))
    expect(metin).toContain('karşılaştırılamadı')
    expect(metin).not.toContain('main ile aynı')
  })

  it('hiç denetlenmediğinde bunu söylüyor', () => {
    expect(surumOzeti(null)).toContain('henüz denetlenmedi')
  })

  /** ⚠️ Geliştirici dalı "yayındaki sürüm" diye gösterilmemeli. */
  it('çalışma ağacı ayrı yazılıyor', () => {
    const metin = surumOzeti(DURUM({ calisanKaynak: 'depo' }))
    expect(metin).toContain('Yerel çalışma ağacı')
    expect(metin).not.toContain('Yayındaki sürüm')
  })
})

describe('yardımcılar', () => {
  it('kısa commit yedi hane', () => {
    expect(kisaCommit(COMMIT)).toBe('ede5cf2')
    expect(kisaCommit(null)).toBeNull()
    expect(kisaCommit('  ')).toBeNull()
  })

  it('imaj hazırlığı bilinmiyorsa null — "hayır" değil', () => {
    expect(imajHazirMi(DURUM())).toBe(true)
    expect(imajHazirMi(DURUM({ imajCommit: 'baska' }))).toBe(false)
    expect(imajHazirMi(DURUM({ imajCommit: null }))).toBeNull()
  })

  it('geçersiz tarih null', () => {
    expect(tarihYaz('olmayan-tarih')).toBeNull()
    expect(tarihYaz(null)).toBeNull()
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   Bildirim
   ══════════════════════════════════════════════════════════════════════════ */

const TEMEL: BildirimGirdisi = {
  yetkisiBitecekIlan: 0,
  yetkisiDolmusYayindaIlan: 0,
  bakimGorevleri: [],
  ilgisizPortfoy: 0,
  gozlemsizMahalle: 0,
  yetkiBelgesiVar: true,
  onayBekleyenIlan: 0,
  altMetniEksikGorsel: 0,
  eksikAyarlar: [],
  eskiAdliAyarlar: [],
  siteAdresindePortVar: false,
  alanSagligi: null,
  semaDurumu: { eksikTablolar: [], beklenenSayi: 63, hata: null },
  surumDurumu: null,
}

describe('sürüm uyumsuzluğu bildirimi', () => {
  it('güncelken uyarı YOK', () => {
    const bildirimler = bildirimleriUret({ ...TEMEL, surumDurumu: DURUM() })
    expect(bildirimler.find((b) => b.anahtar === 'surum-geride')).toBeUndefined()
  })

  it('gerideyken commit sayısıyla uyarıyor', () => {
    const bildirimler = bildirimleriUret({ ...TEMEL, surumDurumu: DURUM({ gerideCommit: 35 }) })
    const uyari = bildirimler.find((b) => b.anahtar === 'surum-geride')

    expect(uyari?.baslik).toBe('Yayında olmayan 35 commit var — deploy bekliyor')
    expect(uyari?.aciklama).toContain('dagit.sh')
  })

  /**
   * ⚠️ Şema eksikliğiyle AYNI SEVİYEDE: ikisi de diğer uyarıların
   * doğruluğunu belirliyor. Eski kodun hesapladığı bir EİDS sayısı
   * yanlış olabilir ve bu, yasal uyarıdan önce bilinmeli.
   */
  it('bütünlük seviyesinde — yasalın üstünde', () => {
    const bildirimler = bildirimleriUret({
      ...TEMEL,
      surumDurumu: DURUM({ gerideCommit: 3 }),
      yetkisiDolmusYayindaIlan: 2,
    })

    const surumSira = bildirimler.findIndex((b) => b.anahtar === 'surum-geride')
    const yasalSira = bildirimler.findIndex((b) => b.oncelik === 'yasal')

    expect(bildirimler[surumSira]?.oncelik).toBe('butunluk')
    expect(surumSira).toBeLessThan(yasalSira)
  })

  /**
   * ⚠️ İmaj yayımlanmamışsa dağıtım ESKİ sürümü kurar. Bu cümle olmadan
   * kullanıcı komutu çalıştırır ve hiçbir şeyin değişmediğini görür.
   */
  it('imaj hazır değilse bunu söylüyor', () => {
    const bildirimler = bildirimleriUret({
      ...TEMEL,
      surumDurumu: DURUM({ gerideCommit: 4, imajCommit: 'baska' }),
    })
    expect(bildirimler.find((b) => b.anahtar === 'surum-geride')?.aciklama).toContain(
      'imaj yayımlanmadan',
    )
  })

  it('denetim yapılamadıysa sessiz kalmıyor', () => {
    const bildirimler = bildirimleriUret({
      ...TEMEL,
      surumDurumu: DURUM({ gerideCommit: null, hata: 'GitHub 403' }),
    })
    const uyari = bildirimler.find((b) => b.anahtar === 'surum-denetlenemedi')

    expect(uyari?.aciklama).toContain('GitHub 403')
    expect(uyari?.aciklama).toContain('güncel OLDUĞU anlamına gelmez')
  })

  /** ⚠️ Hiç denetlenmediyse gürültü yapılmıyor; satır zaten şeritte yazıyor. */
  it('durum null iken bildirim üretmiyor', () => {
    const bildirimler = bildirimleriUret(TEMEL)
    expect(bildirimler.some((b) => b.anahtar.startsWith('surum-'))).toBe(false)
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   Damga sözleşmesi
   ══════════════════════════════════════════════════════════════════════════ */

describe('sürüm damgası uçtan uca bağlı', () => {
  const oku = (goreli: string) => readFileSync(join(process.cwd(), goreli), 'utf-8')

  /**
   * ⚠️ ÜÇ YER AYNI ADI KULLANMAK ZORUNDA: Dockerfile dosyayı yazıyor,
   * `kimlik.ts` okuyor, iş akışı değeri geçiriyor. Biri değişip diğeri
   * kalırsa panel sessizce "sürüm bilinmiyor" der — yani uyarı, uyarması
   * gereken şeyin aynısı yüzünden susar.
   */
  it('Dockerfile damgayı okunan adla yazıyor', () => {
    const dockerfile = oku('docker/Dockerfile')
    expect(dockerfile).toContain(`/uygulama/${SURUM_DOSYASI}`)
    expect(dockerfile).toContain('ARG KAYNAK_COMMIT')
    expect(dockerfile).toContain('ARG DERLEME_ANI')
    expect(dockerfile).toContain('ARG KAYNAK_DEPO')
  })

  it('iş akışı üç argümanı da geçiriyor', () => {
    const akis = oku('.github/workflows/imaj.yml')
    expect(akis).toContain('KAYNAK_COMMIT=${{ github.sha }}')
    expect(akis).toContain('KAYNAK_DEPO=${{ github.repository }}')
    expect(akis).toMatch(/DERLEME_ANI=\$\{\{ steps\./)
  })

  /**
   * ⚠️ Derleme anı, deponun `updated_at` alanından ALINMAMALI: bir yıldız
   * bile onu ileri alır ve panel "imaj az önce derlendi" der.
   */
  it('derleme anı deponun güncellenme anından alınmıyor', () => {
    expect(oku('.github/workflows/imaj.yml')).not.toContain(
      'DERLEME_ANI=${{ github.event.repository.updated_at }}',
    )
  })

  /**
   * ⚠️ Ortam değişkeni OLMAMALI. compose'daki bir `KAYNAK_COMMIT: ${...}`
   * satırı imaja gömülü değeri boş dizeyle ezerdi ve sürümü söylemesi
   * gereken alan sessizce boşalırdı.
   */
  it('çalışan sürüm ortam değişkeninden okunmuyor', () => {
    /**
     * ⚠️ Aranan metin PARÇALARDAN kuruluyor. Düz yazılsaydı
     * `ortam.test.ts`in tarayıcısı bu testi bir ortam değişkeni okuması
     * sanır ve belgelenmemiş bir `KAYNAK` değişkeni olduğunu iddia
     * ederdi — yani bir testin gövdesi başka bir testi kırardı.
     */
    const aranan = ['process', 'env', 'KAYNAK'].join('.')
    expect(oku('src/lib/surum/kimlik.ts')).not.toContain(aranan)
  })

  /** Şeritteki satır uyarı olmasa da çiziliyor. */
  it('şerit, bildirim yokken de sürüm satırını çiziyor', () => {
    const serit = oku('src/components/panel/BildirimSeridi.tsx')
    const bos = serit.indexOf('bildirimler.length === 0')
    expect(bos).toBeGreaterThan(-1)
    expect(serit.slice(bos, bos + 300)).toContain('surumSatiri')
  })
})
