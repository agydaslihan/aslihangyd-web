import type { Payload } from 'payload'

import { LOGO_BUTCE_BAYT, logoDurumu, simgeDurumu } from '@/lib/marka/varliklar'
import { SITE_ADI } from '@/lib/site'

import './marka.css'

/**
 * Marka sekmesinin durum özeti.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU BİR KAPI DEĞİL, AYNA — görsel bütçe rozetiyle aynı ilke.
 *
 * 50 kB'ı aşan bir logo ENGELLENMİYOR: bazen büyük logo bilinçli bir
 * karardır ve içerik girişini bloke etmek Aslıhan'ı panelde durdururdu.
 * Ama sessiz de kalmıyor — sayı gözünün önünde.
 *
 * ⚠️ Renk kapısı bundan farklı ve farklı olmalı: kontrast erişilebilirlik,
 * dosya boyutu performans. Birincisi pazarlık konusu değil, ikincisi
 * duruma göre değişir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SUNUCU BİLEŞENİ — kaydedilmiş veriyi gösteriyor. Yeni yüklenen bir
 * dosya ancak kaydettikten sonra burada görünür; metin bunu söylüyor.
 */

interface Ozellikler {
  payload?: Payload
}

function Satir({ etiket, deger, uyari }: { etiket: string; deger: string; uyari?: string | null }) {
  return (
    <div className="marka-ozet__satir">
      <span className="marka-ozet__etiket">{etiket}</span>
      <span>{deger}</span>
      {uyari ? (
        <span className="marka-ozet__uyari">
          <span aria-hidden="true">!</span> {uyari}
        </span>
      ) : null}
    </div>
  )
}

export async function MarkaOzeti({ payload }: Ozellikler) {
  if (!payload) return null

  const marka = await payload.findGlobal({ slug: 'marka-gorunum', depth: 1 })
  const kayit = marka as unknown as Record<string, unknown>

  const logo = logoDurumu(kayit.logo)
  const logoKoyu = logoDurumu(kayit.logoKoyu)
  const simge = simgeDurumu(kayit.simgeKaynak)
  const siteAdi = typeof kayit.siteAdi === 'string' && kayit.siteAdi.trim() !== ''

  return (
    <div className="marka-ozet">
      <Satir
        etiket="Site adı"
        deger={siteAdi ? String(kayit.siteAdi) : `${SITE_ADI} (koddaki yedek)`}
      />

      <Satir
        etiket="Ana logo"
        deger={logo.var ? `${logo.ad} · ${logo.boyutMetni}` : 'Yüklenmedi — site adı yazıyla çıkar'}
        uyari={
          logo.var && logo.asildi
            ? `Logo ${logo.boyutMetni} — her sayfada yükleniyor, ${LOGO_BUTCE_BAYT / 1024} kB altı önerilir`
            : null
        }
      />

      <Satir
        etiket="Koyu tema logosu"
        deger={
          logoKoyu.var ? `${logoKoyu.ad} · ${logoKoyu.boyutMetni}` : 'Yok — ana logo kullanılır'
        }
        uyari={
          logoKoyu.var && logoKoyu.asildi
            ? `${logoKoyu.boyutMetni} — ${LOGO_BUTCE_BAYT / 1024} kB altı önerilir`
            : null
        }
      />

      <Satir
        etiket="Simge kaynağı"
        deger={
          simge.var
            ? `${simge.ad}${simge.olcu ? ` · ${simge.olcu}` : ''}`
            : 'Yüklenmedi — favicon üretilemiyor'
        }
        uyari={simge.uyari}
      />

      <Satir
        etiket="Üretilen ikonlar"
        deger={
          simge.var && !simge.uyari
            ? 'favicon.ico · 180×180 dokunma simgesi · 192/512 PNG · manifest'
            : 'Simge yüklenince otomatik üretilir'
        }
      />

      <p className="marka-renk__not">
        Bu özet <strong>kaydedilmiş</strong> durumu gösterir. Yeni yüklediğiniz bir dosya, kaydete
        bastıktan sonra burada görünür.
      </p>
    </div>
  )
}
