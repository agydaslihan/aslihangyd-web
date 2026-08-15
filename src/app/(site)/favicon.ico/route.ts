import { icoSar, IKON_BOYUTLARI, ikonUret, ikonYaniti } from '@/lib/marka/ikonlar'

/**
 * ⚠️ Bu rota `/favicon.ico` 404'ünü kapatıyor.
 *
 * Projede hiç ikon dosyası yoktu; tarayıcı her sayfada istiyor, 404 alıyordu
 * ve Lighthouse Best Practices puanı 96'da takılıydı. Rota simge yüklenmemiş
 * olsa bile monogram üretiyor — yani ilk günden çalışıyor.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const { veri, imza } = await ikonUret(IKON_BOYUTLARI.favicon)
  return ikonYaniti(icoSar(veri, IKON_BOYUTLARI.favicon), 'image/x-icon', imza)
}
