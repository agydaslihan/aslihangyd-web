'use client'

/**
 * Kökün kendisi çöktüğünde görünen son ekran.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: 24 AĞUSTOS 2026'DA EKRAN BOMBOŞ KALDI.
 *
 * ScrollTrigger'ın sabitlemesi React'in DOM ağacını arkasından
 * değiştirmişti; menüden bir bağlantıya basıldığında `removeChild`
 * `NotFoundError` fırlattı. Hata `commit` aşamasında, yani kök düzeyinde
 * düştüğü için `(site)/error.tsx` sınırı devreye giremedi — o sınır
 * `<main>`in İÇİNDE. Ziyaretçi beyaz bir sayfa gördü; ne bir mesaj, ne
 * "yenile" düğmesi, ne de siteye dönüş yolu.
 *
 * Asıl arıza düzeltildi (bkz. `components/anlati/YatayAnlati.tsx`) ama
 * boş ekran ihtimali kalmamalı: bu dosya kökün üstündeki ağı.
 *
 * ⚠️ Kendi `<html>` ve `<body>`sini basmak ZORUNDA — düzenin yerine
 * geçiyor, altına değil. Bu yüzden burada marka jetonları, fontlar ve
 * tema yok; yalnızca satır içi stil. Kök çöktüğünde CSS'in yüklendiğine
 * güvenilemez.
 *
 * ⚠️ Yenileme `location.reload()` ile, `reset()` ile değil: kök çökmüşse
 * aynı ağacı yeniden denemek çoğu zaman aynı hataya düşer. Tam yeniden
 * yükleme, ziyaretçinin gerçekten işine yarayan tek eylem — arızada da
 * F5 çalışıyordu.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function KokHatasi({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: '#fcfbf8',
          color: '#2a2622',
          fontFamily: 'system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
          lineHeight: 1.7,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 500 }}>Sayfa yüklenemedi</h1>

        <p style={{ margin: 0, maxWidth: '34rem' }}>
          Beklenmedik bir sorun oluştu ve sayfa açılamadı. Sayfayı yenilemek çoğu zaman yeterli
          oluyor.
        </p>

        {error.digest ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#696259' }}>
            Hata kodu: {error.digest}
          </p>
        ) : null}

        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}
        >
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              cursor: 'pointer',
              border: '1px solid #7a5e2e',
              background: '#7a5e2e',
              color: '#fcfbf8',
              borderRadius: '999px',
              padding: '0.75rem 1.5rem',
              font: 'inherit',
            }}
          >
            Sayfayı yenile
          </button>
          {/*
            ⚠️ Bilerek `<a>`, `<Link>` değil — ve lint kuralı bu yüzden
            susturuluyor. `<Link>` istemci yönlendiricisini kullanır; bu
            ekran zaten o yönlendirici çöktüğü için görünüyor. Tam sayfa
            yüklemesi burada tek güvenilir yol.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              border: '1px solid #cbc5bb',
              borderRadius: '999px',
              padding: '0.75rem 1.5rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Ana sayfaya dön
          </a>
        </div>
      </body>
    </html>
  )
}
