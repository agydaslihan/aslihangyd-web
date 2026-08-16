import type { StyleSpecification } from 'maplibre-gl'

import { haritaRenkleri } from './jetonlar'

/**
 * Harita stilinin çözülmesi ve altlık arızalarının sınıflandırılması.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: ALTLIK DÜŞÜNCE BİZİM POLİGONLARIMIZ DA ÇİZİLMİYORDU.
 *
 * MapLibre `load` olayını yalnızca **stil başarıyla yüklendiğinde**
 * ateşliyor. Katmanlarımız o olayın içinde kuruluyordu; dolayısıyla
 * MapTiler 401/403 döndüğünde ya da anahtar hiç yokken harita tamamen boş
 * kalıyordu — mahalle sınırları, sütunlar, POI'ler, hepsi.
 *
 * Oysa **poligonlar bizim verimiz**; MapTiler yalnızca taban görüntü.
 * Altlık gelmese bile sınırların çizilmemesi için hiçbir teknik sebep yok,
 * yalnızca kurulum sırası öyleydi.
 *
 * Çözüm: stil ÖNCE burada çözülüyor. Uzak stil alınamazsa yerine
 * bağımlılıksız bir yerel stil konuyor ve harita yine kuruluyor. `load`
 * her hâlükârda ateşleniyor, katmanlar her hâlükârda ekleniyor.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ EK İSTEK YOK. Stil JSON'unu biz alıp MapLibre'ye NESNE olarak
 * veriyoruz; MapLibre aynı adresi ikinci kez istemiyor. Yani hata
 * sınıflandırması bedavaya geliyor.
 */

export type StilSonucu =
  /** Uzak altlık alındı. */
  | { durum: 'uzak'; stil: StyleSpecification }
  /** Anahtar hiç yapılandırılmamış. */
  | { durum: 'anahtar_yok'; stil: StyleSpecification }
  /** Anahtar var ama servis reddetti (401/403). */
  | { durum: 'reddedildi'; kod: number; stil: StyleSpecification }
  /** Ağ ya da beklenmeyen yanıt. */
  | { durum: 'ulasilamadi'; mesaj: string; stil: StyleSpecification }

/** Altlıksız durumda gösterilecek kullanıcı metni. */
export function stilMesaji(sonuc: StilSonucu): string | null {
  switch (sonuc.durum) {
    case 'uzak':
      return null
    case 'anahtar_yok':
      return (
        'Harita anahtarı girilmemiş. Mahalle sınırları çiziliyor ama sokak altlığı yok — ' +
        'MAPTILER_ANAHTARI yapılandırılmalı.'
      )
    case 'reddedildi':
      return (
        `Harita anahtarı reddedildi (${sonuc.kod}). Sınırlar çiziliyor ama sokak altlığı yok — ` +
        'MapTiler hesabındaki origin (alan adı) kısıtını kontrol edin.'
      )
    case 'ulasilamadi':
      return (
        'Harita servisine ulaşılamadı. Sınırlar çiziliyor ama sokak altlığı yok — ' +
        'bağlantınızı kontrol edip sayfayı yenileyin.'
      )
  }
}

/**
 * Bağımlılıksız yerel stil.
 *
 * ⚠️ `glyphs` YOK ve olamaz: yazı tipi kaynağını da MapTiler sağlıyor.
 * Bu yüzden yedek kipte metin katmanları hiç eklenmiyor (bkz.
 * `Harita3B`). Etiketsiz bir sınır haritası, hiç harita olmamasından
 * kat kat iyi; eksik yazı tipi yüzünden konsolu hata yağmuruna tutmak ise
 * gereksiz.
 */
export function yerelStil(): StyleSpecification {
  const renkler = haritaRenkleri()

  return {
    version: 8,
    // ⚠️ Boş kaynak listesi bilinçli: hiçbir dış istek yapılmıyor.
    sources: {},
    layers: [
      {
        id: 'yerel-zemin',
        type: 'background',
        paint: { 'background-color': renkler.zemin },
      },
    ],
  }
}

/** Yanıtın gerçekten bir MapLibre stili olup olmadığına bakar. */
function stilMi(veri: unknown): veri is StyleSpecification {
  const aday = veri as { version?: unknown; layers?: unknown } | null
  return (
    aday !== null && typeof aday === 'object' && aday.version === 8 && Array.isArray(aday.layers)
  )
}

/**
 * Stili çözer; başarısızlıkta yerel stile düşer ve SEBEBİNİ söyler.
 *
 * ⚠️ Üç arıza üç ayrı sonuç veriyor. "Harita yüklenemedi" tek mesajı,
 * anahtarı hiç girmemiş biriyle origin kısıtına takılan birini aynı yere
 * bakmaya gönderirdi — ikisinin yapması gereken bambaşka.
 */
export async function stiliCoz(adres: string | null): Promise<StilSonucu> {
  if (adres === null) return { durum: 'anahtar_yok', stil: yerelStil() }

  try {
    const cevap = await fetch(adres, { cache: 'no-store' })

    if (cevap.status === 401 || cevap.status === 403) {
      return { durum: 'reddedildi', kod: cevap.status, stil: yerelStil() }
    }

    if (!cevap.ok) {
      return { durum: 'ulasilamadi', mesaj: `HTTP ${cevap.status}`, stil: yerelStil() }
    }

    const veri: unknown = await cevap.json()
    if (!stilMi(veri)) {
      return { durum: 'ulasilamadi', mesaj: 'Beklenmeyen yanıt biçimi', stil: yerelStil() }
    }

    return { durum: 'uzak', stil: veri }
  } catch (hata) {
    return {
      durum: 'ulasilamadi',
      mesaj: hata instanceof Error ? hata.message : 'bilinmeyen hata',
      stil: yerelStil(),
    }
  }
}
