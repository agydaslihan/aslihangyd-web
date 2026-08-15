import { IKON_BOYUTLARI, ikonUret, ikonYaniti } from '@/lib/marka/ikonlar'

/** Marka panelindeki simge kaynağından üretilir; yoksa monogram. */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const { veri, imza } = await ikonUret(IKON_BOYUTLARI.buyuk)
  return ikonYaniti(veri, 'image/png', imza)
}
