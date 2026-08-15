import 'server-only'

/**
 * Parçalı içe aktarmanın ara durumu — kullanıcı başına, süreç belleğinde.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: GEOMETRİ İSTEMCİYE İNMEMELİ
 *
 * Parçalı sorguda döngüyü istemci sürüyor. En kolay yol her parçanın
 * sonucunu istemciye yollayıp yazma anında geri almak olurdu — ve bu,
 * ağ isteğini düzenleyen birinin panelde gördüğünden bambaşka bir poligon
 * yazdırmasına kapı açardı.
 *
 * Onun yerine parça sonuçları BURADA birikiyor. İstemci yalnızca "kaçıncı
 * parça" ve "kaç kayıt geldi" bilgisini görüyor; poligonlar sunucudan hiç
 * çıkmıyor. Yazma da buradan okuyor.
 *
 * İkinci faydası nezaket: önizleme ile yazma arasında Overpass'a ikinci kez
 * sorulmuyor. Eski akış yazarken bütün sorguyu baştan çalıştırıyordu — yani
 * paylaşımlı kaynağa iki kat yük.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ SÜREÇ BELLEĞİ — KALICI DEĞİL, OLMAMALI DA.
 *
 * Kap yeniden başlarsa hazırlık kaybolur ve panel "baştan başlayın" der.
 * Bu kabul edilebilir: hazırlık birkaç dakikalık bir iş ve verinin kendisi
 * OSM'de duruyor. Kalıcılaştırmak (Redis, tablo) yarım kalmış bir içe
 * aktarmayı günlerce taşımak demekti — bayat geometriyle yazmak, hiç
 * yazmamaktan kötü.
 */

/** Hazırlığın geçerlilik süresi. */
export const YASAM_SURESI_MS = 30 * 60_000

/** Aynı anda tutulacak azami hazırlık — bellek kaza koruması. */
const AZAMI_KAYIT = 8

interface Kayit<T> {
  veri: T
  zaman: number
}

/**
 * Kullanıcı başına tek hazırlık tutan depo.
 *
 * Anahtar kullanıcı kimliği: iki yönetici aynı anda içe aktarma yaparsa
 * birbirinin parçalarını görmemeli.
 */
export class HazirlikDeposu<T> {
  private readonly kayitlar = new Map<string | number, Kayit<T>>()

  yaz(kullaniciId: string | number, veri: T): void {
    this.temizle()

    // Kaza koruması: sınıra dayanınca en eskiyi düşür.
    if (!this.kayitlar.has(kullaniciId) && this.kayitlar.size >= AZAMI_KAYIT) {
      const enEski = [...this.kayitlar.entries()].sort((a, b) => a[1].zaman - b[1].zaman)[0]
      if (enEski) this.kayitlar.delete(enEski[0])
    }

    this.kayitlar.set(kullaniciId, { veri, zaman: Date.now() })
  }

  oku(kullaniciId: string | number): T | null {
    this.temizle()
    return this.kayitlar.get(kullaniciId)?.veri ?? null
  }

  sil(kullaniciId: string | number): void {
    this.kayitlar.delete(kullaniciId)
  }

  private temizle(): void {
    const simdi = Date.now()
    for (const [anahtar, kayit] of this.kayitlar) {
      if (simdi - kayit.zaman > YASAM_SURESI_MS) this.kayitlar.delete(anahtar)
    }
  }
}
