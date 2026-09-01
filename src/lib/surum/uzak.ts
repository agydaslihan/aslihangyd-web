import 'server-only'

import { baslangicAni, calisanSurum } from './kimlik'

import type { SurumDurumu } from './durum'

/**
 * Uzak sürüm sorguları — GitHub ve GHCR.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ŞERİT HER PANEL AÇILIŞINDA ÇALIŞIYOR; BURADA AĞ BEKLENMEZ.
 *
 * `semaDurumu` ile aynı kalıp: sonuç `globalThis` üzerinde bir kutuda
 * duruyor, panel onu SENKRON okuyor. Kutu bayatlamışsa tazeleme
 * BAŞLATILIR ama beklenmez — bir GitHub yavaşlaması panelin açılışını
 * geciktirmemeli.
 *
 * ⚠️ Bu yüzden ilk açılışta cevap `null` olur ve arayüz "henüz
 * denetlenmedi" der. Bu bir kusur değil: "bilmiyorum" ile "sorun yok"u
 * ayırmak bu projedeki sessiz arızaların ortak dersi.
 *
 * ⚠️ Kimlik doğrulamasız çağrı. Depo ve paket herkese açık; jeton
 * eklemek bir ortam değişkeni daha demekti ve boş kaldığında sessizce
 * çalışmayan bir denetim üretirdi. Saatlik 60 istek sınırı, 10 dakikalık
 * önbellekle en fazla 6 çağrıya denk geliyor.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Depo kimliği — imajda gömülü değer yoksa kullanılan yedek.
 *
 * ⚠️ Bu bir SIR DEĞİL ve ortama göre değişmiyor: kod tabanının kendi
 * kimliği, tıpkı `.github/workflows/imaj.yml` içinde yazdığı gibi.
 */
export const VARSAYILAN_DEPO = 'agydaslihan/aslihangyd-web'

/** Karşılaştırma yapılan dal. Üretim daima buradan dağıtılıyor. */
export const YAYIN_DALI = 'main'

/** Kutunun bayat sayıldığı süre. */
export const TAZELEME_ARALIGI_DK = 10

/**
 * Tek bir uzak çağrının azami süresi.
 *
 * ⚠️ 8 saniye, 4 DEĞİL — ölçülerek seçildi. GitHub çağrısı tek başına
 * ~300 ms sürüyor ama Next'in sarmaladığı `fetch` üzerinden dört çağrı
 * toplamda ~3,7 saniye alıyor. 4 saniyelik sınır tam bu bandın içine
 * düşüyordu ve denetim sağlıklı bir ağda bile zaman aşımına uğrardı.
 *
 * Uzun sınırın maliyeti yok: çağrı arka planda, çizim bağlamının
 * dışında koşuyor ve kimseyi bekletmiyor.
 */
const ZAMAN_ASIMI_MS = 8000

const KUTU = globalThis as typeof globalThis & {
  __surumDurumu?: SurumDurumu
  __surumTazeleniyor?: boolean
}

/** Panelin okuduğu son sonuç. Hiç denetlenmediyse `null`. */
export function surumDurumu(): SurumDurumu | null {
  return KUTU.__surumDurumu ?? null
}

/** Yalnızca test için. */
export function surumDurumunuAyarla(durum: SurumDurumu | undefined): void {
  KUTU.__surumDurumu = durum
  KUTU.__surumTazeleniyor = false
}

function bayatMi(durum: SurumDurumu | undefined, simdi: Date): boolean {
  if (durum === undefined) return true
  const an = Date.parse(durum.kontrolZamani)
  if (Number.isNaN(an)) return true
  return simdi.getTime() - an > TAZELEME_ARALIGI_DK * 60_000
}

/**
 * Gerekiyorsa tazelemeyi başlatır. **Beklenmez.**
 *
 * ⚠️ Söz (promise) bilinçli olarak `void`leniyor; bu fonksiyon hiçbir
 * koşulda hata fırlatmıyor. Sürüm denetiminin paneli çökertmesi,
 * korumaya çalıştığı şeyden büyük zarar olurdu.
 */
export function surumTazelemeyiTetikle(simdi: Date = new Date()): void {
  if (KUTU.__surumTazeleniyor === true) return
  if (!bayatMi(KUTU.__surumDurumu, simdi)) return

  KUTU.__surumTazeleniyor = true

  /**
   * ⚠️ `setTimeout` ZORUNLU — SÜS DEĞİL.
   *
   * Next `fetch`i sarmalıyor ve isteği o anki ÇİZİMİN ömrüne bağlıyor.
   * Çizim bittikten sonra tamamlanacak bir istek askıda kalıyor: ölçtük,
   * tek başına 300 ms süren GitHub çağrısı panelin içinden çağrıldığında
   * hiç dönmedi ve 4 saniyede zaman aşımına uğradı.
   *
   * Yeni bir olay turuna atmak isteği çizim bağlamından çıkarıyor. Bu
   * zaten mimari olarak da doğru: sürüm denetimi bir arka plan işi,
   * sayfanın parçası değil.
   *
   * ⚠️ `unref` yok. Bu bir sunucu süreci; zamanlayıcı zaten milisaniyeler
   * içinde çalışıyor ve `unref` edilseydi kısa ömürlü bir betikte
   * (göç, seed) sessizce hiç koşmazdı.
   */
  setTimeout(() => {
    void surumuHesapla()
      .then((durum) => {
        KUTU.__surumDurumu = durum
      })
      .finally(() => {
        KUTU.__surumTazeleniyor = false
      })
  }, 0)
}

async function jsonGetir(adres: string): Promise<unknown> {
  const yanit = await fetch(adres, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'aslihangyd-panel' },
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    cache: 'no-store',
  })
  if (!yanit.ok) throw new Error(`GitHub ${yanit.status}`)
  return yanit.json()
}

/**
 * GHCR'da bir etiketin özeti (digest).
 *
 * ⚠️ `HEAD` yeterli: gövde değil başlıktaki `docker-content-digest`
 * okunuyor. Katman listesini indirmek, tek soruya cevap için megabaytlar
 * taşımak olurdu.
 */
async function ghcrOzeti(depo: string, etiket: string): Promise<string | null> {
  const jetonYaniti = await fetch(
    `https://ghcr.io/token?scope=repository:${depo}:pull&service=ghcr.io`,
    { signal: AbortSignal.timeout(ZAMAN_ASIMI_MS), cache: 'no-store' },
  )
  if (!jetonYaniti.ok) throw new Error(`GHCR jetonu ${jetonYaniti.status}`)
  const { token } = (await jetonYaniti.json()) as { token?: string }
  if (typeof token !== 'string') throw new Error('GHCR jetonu okunamadı')

  const yanit = await fetch(`https://ghcr.io/v2/${depo}/manifests/${etiket}`, {
    method: 'HEAD',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: [
        'application/vnd.oci.image.index.v1+json',
        'application/vnd.oci.image.manifest.v1+json',
        'application/vnd.docker.distribution.manifest.list.v2+json',
        'application/vnd.docker.distribution.manifest.v2+json',
      ].join(', '),
    },
    signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
    cache: 'no-store',
  })

  // Etiket hiç yayımlanmamışsa 404 — hata değil, cevabın kendisi.
  if (yanit.status === 404) return null
  if (!yanit.ok) throw new Error(`GHCR ${yanit.status}`)
  return yanit.headers.get('docker-content-digest')
}

/** Tek denetim turu. Hiçbir koşulda fırlatmaz. */
export async function surumuHesapla(simdi: Date = new Date()): Promise<SurumDurumu> {
  const calisan = calisanSurum()
  const depo = calisan.depo ?? VARSAYILAN_DEPO

  const temel: SurumDurumu = {
    calisanCommit: calisan.commit,
    calisanKaynak: calisan.kaynak,
    enSonCommit: null,
    gerideCommit: null,
    imajCommit: null,
    derlemeAni: calisan.derlemeAni,
    baslangicAni: baslangicAni(simdi),
    hata: null,
    kontrolZamani: simdi.toISOString(),
  }

  if (calisan.commit === null) {
    return {
      ...temel,
      hata:
        'Çalışan sürümün commit bilgisi yok. Bu imaj sürüm damgası eklenmeden ' +
        'derlenmiş; bir sonraki dağıtımdan sonra karşılaştırma çalışacak.',
    }
  }

  try {
    const kiyas = (await jsonGetir(
      `https://api.github.com/repos/${depo}/compare/${calisan.commit}...${YAYIN_DALI}`,
    )) as { ahead_by?: unknown; commits?: { sha?: unknown }[] }

    const geride = typeof kiyas.ahead_by === 'number' ? kiyas.ahead_by : null
    const sonuncu = kiyas.commits?.[kiyas.commits.length - 1]?.sha
    const enSon = typeof sonuncu === 'string' ? sonuncu : geride === 0 ? calisan.commit : null

    let imajCommit: string | null = null
    let imajHatasi: string | null = null

    if (enSon !== null) {
      try {
        const [latest, enSonEtiket] = await Promise.all([
          ghcrOzeti(depo, 'latest'),
          ghcrOzeti(depo, enSon),
        ])
        // ⚠️ Aynı özet = `:latest` o commit'i gösteriyor demek. Etiketin
        //    adına değil, işaret ettiği içeriğe bakılıyor.
        if (latest !== null && enSonEtiket !== null && latest === enSonEtiket) imajCommit = enSon
      } catch (hata) {
        imajHatasi = hata instanceof Error ? hata.message : 'GHCR okunamadı'
      }
    }

    return {
      ...temel,
      enSonCommit: enSon,
      gerideCommit: geride,
      imajCommit,
      hata: imajHatasi === null ? null : `İmaj kaydı okunamadı: ${imajHatasi}`,
    }
  } catch (hata) {
    return {
      ...temel,
      hata: `Sürüm karşılaştırılamadı: ${hata instanceof Error ? hata.message : 'bilinmeyen hata'}`,
    }
  }
}
