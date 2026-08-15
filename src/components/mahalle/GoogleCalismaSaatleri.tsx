'use client'

import { useState, useTransition } from 'react'

import { googleDetayiGetir } from '@/lib/google/detayEylemi'
import type { GoogleDetayi } from '@/lib/google/istemci'

/**
 * "Çalışma saatleri" — Google Places'ten, istek anında.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SAYFA AÇILIŞINDA DEĞİL, SORULDUĞUNDA ÇEKİLİYOR
 *
 * İki sebep, ikisi de bağlayıcı:
 *
 * 1. **Lisans.** Places verisi veritabanımıza yazılamıyor. Sayfa açılışında
 *    çekilseydi bile hiçbir yerde saklanamazdı; her ziyaretçi için yeniden
 *    çağrı demekti.
 * 2. **Maliyet.** Her çağrı ücretli. Mahalle sayfasını açan herkes için on
 *    üç POI'nin çalışma saatini çekmek, kimsenin bakmadığı bilgiye ay
 *    sonunda fatura ödemek olurdu.
 *
 * Sonuç: ziyaretçi soruncaya kadar hiçbir çağrı yapılmaz. Bu aynı zamanda
 * dürüst olan: gösterilen saat, gösterildiği andaki saattir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ GOOGLE ATFI ZORUNLU — Places kullanım koşulu. Veri gösterildiği her
 * yerde kaynağı yazılı; ibare kaldırılmaz.
 */
export function GoogleCalismaSaatleri({ poiId, poiAdi }: { poiId: number; poiAdi: string }) {
  const [detay, setDetay] = useState<GoogleDetayi | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [acildi, setAcildi] = useState(false)
  const [bekliyor, basla] = useTransition()

  function getir(): void {
    if (acildi) return
    setAcildi(true)
    setHata(null)

    basla(async () => {
      const cevap = await googleDetayiGetir(poiId)
      if (cevap.durum === 'tamam') setDetay(cevap.detay)
      else if (cevap.durum === 'hata') setHata(cevap.mesaj)
      else setHata('Bu nokta için güncel bilgi bulunmuyor.')
    })
  }

  return (
    <div className="mt-1">
      {!acildi ? (
        <button
          type="button"
          onClick={getir}
          className="text-metin-3 text-mikro underline underline-offset-2"
        >
          Çalışma saatleri
          <span className="sr-only"> — {poiAdi}</span>
        </button>
      ) : null}

      {bekliyor ? <p className="text-metin-3 text-mikro">Google&apos;dan alınıyor…</p> : null}

      {hata ? <p className="text-metin-3 text-mikro">{hata}</p> : null}

      {detay ? (
        <div className="text-metin-2 text-mikro mt-1 leading-relaxed">
          {detay.suAnAcik !== null ? (
            <p className="font-medium">{detay.suAnAcik ? 'Şu anda açık' : 'Şu anda kapalı'}</p>
          ) : null}

          {detay.isletmeDurumu === 'CLOSED_PERMANENTLY' ? (
            <p className="font-medium">Kalıcı olarak kapalı</p>
          ) : null}
          {detay.isletmeDurumu === 'CLOSED_TEMPORARILY' ? (
            <p className="font-medium">Geçici olarak kapalı</p>
          ) : null}

          {detay.calismaSaatleri.length > 0 ? (
            <ul className="mt-1">
              {detay.calismaSaatleri.map((satir) => (
                <li key={satir}>{satir}</li>
              ))}
            </ul>
          ) : (
            <p>Google bu nokta için çalışma saati bildirmiyor.</p>
          )}

          {/*
            ⚠️ GOOGLE ATFI — kaldırılamaz. Places kullanım koşulları,
            verinin gösterildiği yerde kaynağın belirtilmesini istiyor.
          */}
          <p className="text-metin-3 mt-1">
            Bilgi Google Places&apos;ten, gösterildiği anda alındı ve kaydedilmiyor.{' '}
            {detay.haritaAdresi ? (
              <a
                href={detay.haritaAdresi}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Google Haritalar&apos;da aç
              </a>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  )
}
