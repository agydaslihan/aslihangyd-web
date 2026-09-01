import { describe, expect, it } from 'vitest'

import { cumleDuzenineCevir, tamamiBuyukMu } from './baslik'

/**
 * İlan başlığı normalleştirme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CSS `text-transform` KULLANILMADI VE SEBEBİ SEO.
 *
 * `text-transform` yalnızca çizimi değiştirir; `<title>`, site haritası,
 * OG etiketi ve arama motoru dizini hâlâ "KERVANCI CİTY 3 HAVUZ CEPHE
 * SATILIK ARA KAT 3+1 DAİRE" görür. Tamamı büyük harf bir başlık arama
 * sonuçlarında bağırıyor gibi görünür.
 *
 * ⚠️ VERİ DEĞİŞTİRİLMİYOR — dönüşüm yalnızca gösterimde. Aslıhan'ın
 * yazdığını sessizce değiştirmek, bir gün "ben böyle yazmamıştım"
 * denecek bir durum üretirdi.
 * ─────────────────────────────────────────────────────────────────────────
 */

describe('tamamı büyük tespiti', () => {
  it('gerçek örnek yakalanıyor', () => {
    expect(tamamiBuyukMu('KERVANCI CİTY 3 HAVUZ CEPHE SATILIK ARA KAT 3+1 DAİRE')).toBe(true)
  })

  it('normal başlık yakalanmıyor', () => {
    expect(tamamiBuyukMu("Muhittin Mahallesi'nde 3+1, 135 m², asansörlü")).toBe(false)
  })

  it('kısa metin es geçiliyor', () => {
    // "3+1 DAİRE" zaten kısa; dönüşüm bir şey kazandırmıyor.
    expect(tamamiBuyukMu('3+1 DAİRE')).toBe(false)
  })
})

describe('cümle düzenine çevirme', () => {
  it('gerçek örnek düzeliyor', () => {
    expect(cumleDuzenineCevir('KERVANCI CİTY 3 HAVUZ CEPHE SATILIK ARA KAT 3+1 DAİRE')).toBe(
      'Kervancı City 3 Havuz Cephe Satılık Ara Kat 3+1 Daire',
    )
  })

  it('normal başlığa DOKUNMUYOR', () => {
    const baslik = "Muhittin Mahallesi'nde 3+1, 135 m², asansörlü"
    expect(cumleDuzenineCevir(baslik)).toBe(baslik)
  })

  it('kısaltmalar korunuyor — AÇIK LİSTEDEN', () => {
    /**
     * ⚠️ İlk sürüm "2–4 harfli tamamı büyük parça kısaltmadır" diyordu ve
     * bu test onu çürüttü: "ARA KAT" ve "CİTY" de o kalıba uyuyordu ve
     * büyük harf kalıyordu. Kısaltma bir uzunluk meselesi değil, bir
     * sözlük meselesi.
     */
    expect(cumleDuzenineCevir('SATILIK ARSA OSB YAKINI GENİŞ CEPHE')).toBe(
      'Satılık Arsa OSB Yakını Geniş Cephe',
    )
  })

  it('⚠️ Türkçe "I" doğru küçültülüyor', () => {
    /**
     * ⚠️ `toLowerCase()` "I" harfini "i" yapar — Türkçede yanlış.
     * Doğru yazılmış "ISITMALI" → "Isıtmalı".
     */
    expect(cumleDuzenineCevir('ISITMALI GENİŞ DAİRE SATILIK')).toBe('Isıtmalı Geniş Daire Satılık')
  })

  it('⚠️ yanlış yazılmış "I" DÜZELTİLMİYOR — belirsizlik tahmin edilmiyor', () => {
    /**
     * ⚠️ Biri "MERKEZİ" yerine "MERKEZI" yazdıysa sonuç "Merkezı" olur;
     * girdi zaten yanlıştı. Hangi "I"nın hangisi olduğunu bilmek sözlük
     * ister ve tahmin etmek, uydurmanın başka bir biçimi olurdu.
     *
     * Panel bu yüzden "cümle düzeninde yazın" diye uyarıyor: kaynağında
     * doğru yazılan bir başlık bu sorunu hiç yaşamıyor.
     */
    expect(cumleDuzenineCevir('MERKEZI KONUMDA GENİŞ DAİRE')).toBe('Merkezı Konumda Geniş Daire')
  })

  it('boşluk yapısı korunuyor', () => {
    expect(cumleDuzenineCevir('SATILIK  GENİŞ  DAİRE  MERKEZDE')).toBe(
      'Satılık  Geniş  Daire  Merkezde',
    )
  })

  it('boş metin sorun çıkarmıyor', () => {
    expect(cumleDuzenineCevir('')).toBe('')
  })
})
