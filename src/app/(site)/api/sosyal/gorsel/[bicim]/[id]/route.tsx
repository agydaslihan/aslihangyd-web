import { ImageResponse } from 'next/og'

import { GORSEL_BICIMLERI, gecerliBicimMi } from '@/lib/sosyal/metin'
import { payloadGetir } from '@/lib/veri/istemci'

/**
 * Sosyal medya görseli üretimi (1080×1080 ve 1080×1920).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ROTA DİNAMİK — statik ön render EDİLMEZ.
 *
 * İlan fiyatı ve başlığı değiştiğinde görselin de değişmesi gerekiyor.
 * Derleme anında dondurulsaydı, üç ay önceki fiyatı gösteren bir gönderi
 * görseli üretilirdi — ve kimse fark etmezdi.
 *
 * ⚠️ TÜRKÇE KARAKTER RİSKİ BİLİNEREK ALINDI VE SINANDI.
 *
 * PDF üretiminde tam bu yüzden kütüphane yolundan vazgeçilmişti:
 * pdf-lib'in standart fontları ğ, ş, ı, ç karakterlerini kodlayamıyordu.
 * `next/og` farklı bir yol (Satori + Noto Sans) kullanıyor;
 * `src/lib/sosyal/gorsel.test.ts` görselin gerçekten üretildiğini ve
 * boyutunun doğru olduğunu Türkçe karakterli başlıkla sınıyor.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const dynamic = 'force-dynamic'

const TL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/**
 * Renkler burada SABİT yazılı — bilinçli istisna.
 *
 * `ImageResponse` bir tarayıcı değil; CSS değişkenlerini (`var(--...)`)
 * çözemez, `globals.css` yüklenmez. Değerler onaylanmış palete birebir
 * eşit ve `disiplin.test.ts` bunu denetliyor: muafiyet "istediğini yaz"
 * demek değil.
 *
 * ⚠️ 15 Ağustos 2026'da bohem palete taşındı. Eski değerler (`#0F1E33`,
 * `#A3BFD9`) bir önceki palet DEĞİŞTİĞİNDE de geride kalmıştı — yani
 * paylaşılan görsel aylarca sitenin kullanmadığı bir laciverti taşıdı.
 * Test artık bunu yakalıyor.
 *
 * ⚠️ Dolu adaçayı kuralı burada da geçerli: adaçayı yalnızca "Evimi
 * değerlendir" ve "Erişim talep et" eylemlerinde kullanılır. Bir ilan
 * görseli bunların hiçbiri değil.
 */
const RENK = {
  zemin: '#1C1C1C', // notr-900 — mürekkep
  metin: '#FCFBF8', // notr-50 — sıcak beyaz
  metinSolgun: '#CBC5BB', // notr-300
  cizgi: '#48433D', // notr-700
} as const

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ bicim: string; id: string }> },
) {
  const { bicim, id } = await params

  if (!gecerliBicimMi(bicim)) {
    return new Response('Bilinmeyen görsel biçimi', { status: 404 })
  }

  const kimlik = Number(id)
  if (!Number.isInteger(kimlik) || kimlik <= 0) {
    return new Response('Geçersiz ilan kimliği', { status: 400 })
  }

  const payload = await payloadGetir()

  /**
   * ⚠️ `overrideAccess: false` — erişim kuralları aynen çalışır.
   *
   * Bu uç kimlik doğrulaması istemiyor (görsel paylaşılacak, herkese açık
   * olmalı). Kapı erişim kuralında: yayında olmayan bir ilanın kimliğini
   * tahmin eden biri, taslak ilanın fiyatını görselden okuyamaz.
   */
  const sonuc = await payload.find({
    collection: 'ilanlar',
    where: { id: { equals: kimlik } },
    overrideAccess: false,
    depth: 1,
    limit: 1,
  })

  const ilan = sonuc.docs[0]
  if (ilan === undefined) {
    return new Response('İlan bulunamadı', { status: 404 })
  }

  const olcu = GORSEL_BICIMLERI[bicim]
  const hikaye = bicim === 'hikaye'

  const mahalle =
    typeof ilan.mahalle === 'object' && ilan.mahalle !== null && 'ad' in ilan.mahalle
      ? String(ilan.mahalle.ad)
      : null

  const nitelikler = [
    ilan.odaSayisi,
    ilan.brutM2 === null || ilan.brutM2 === undefined ? null : `${TL.format(ilan.brutM2)} m²`,
  ].filter((n): n is string => n !== null && n !== undefined)

  return new ImageResponse(
    <div
      style={{
        width: olcu.genislik,
        height: olcu.yukseklik,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: RENK.zemin,
        color: RENK.metin,
        padding: hikaye ? '110px 80px' : '80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 30, color: RENK.metinSolgun, letterSpacing: 2 }}>
          {`${ilan.tip === 'kiralik' ? 'KİRALIK' : 'SATILIK'}${
            mahalle === null ? ' · ÇORLU' : ` · ${mahalle.toLocaleUpperCase('tr-TR')}`
          }`}
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: hikaye ? 78 : 68,
            // Satori: birden fazla çocuğu olan her kutuda display açık olmalı.
            lineHeight: 1.15,
            // Uzun başlıklar taşmasın: görselde okunmayan metin, olmayan metindir.
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ilan.baslik}
        </div>

        {nitelikler.length > 0 && (
          <div style={{ display: 'flex', marginTop: 32, fontSize: 38, color: RENK.metinSolgun }}>
            {nitelikler.join('  ·  ')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* ⚠️ Fiyat yalnızca GERÇEKTEN varsa. Uydurma rakam yasak. */}
        {ilan.fiyat !== null && ilan.fiyat !== undefined && (
          <div style={{ display: 'flex', fontSize: hikaye ? 92 : 80 }}>
            {/*
                ⚠️ "TL" yazıyor, "₺" DEĞİL — ve bu bilinçli.

                Satori, gömülü fontta bulunmayan bir glif görünce ÇALIŞMA
                ANINDA Google Fonts'tan font indirmeye çalışıyor. ₺ (U+20BA)
                Geist'te yok; istek 400 dönüyor ve görsel üretimi 500 ile
                düşüyordu (yerelde yakalandı).

                Daha kötüsü: bu bir AĞ BAĞIMLILIĞI. Üretim kabının dışarı
                çıkışı olmayabilir; olsa bile her görsel isteğinde Google'a
                gitmek kabul edilemez. Site arayüzünde ₺ kullanılmaya devam
                ediyor — orada tarayıcının fontu var.
              */}
            {TL.format(ilan.fiyat)} TL{ilan.tip === 'kiralik' ? ' / ay' : ''}
          </div>
        )}

        <div
          style={{
            marginTop: 36,
            paddingTop: 28,
            borderTop: `2px solid ${RENK.cizgi}`,
            display: 'flex',
            flexDirection: 'column',
            fontSize: 26,
            color: RENK.metinSolgun,
          }}
        >
          <div style={{ display: 'flex' }}>aslihangyd.com</div>
          {/* Doğrulanmış ilan rozeti — CLAUDE.md kural 1: taşınmaz numarası görünür. */}
          {typeof ilan.tasinmazNo === 'string' && ilan.tasinmazNo !== '' && (
            <div style={{ display: 'flex', marginTop: 10 }}>
              {`Doğrulanmış ilan · Taşınmaz no: ${ilan.tasinmazNo}`}
            </div>
          )}
        </div>
      </div>
    </div>,
    { width: olcu.genislik, height: olcu.yukseklik },
  )
}
