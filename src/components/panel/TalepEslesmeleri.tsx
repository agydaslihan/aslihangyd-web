import type { UIFieldServerProps } from 'payload'

import './talepEslesmeleri.css'

import { talebeEslestir } from '@/lib/veri/crmEslestirme'

/**
 * Talep kaydında "bu talebe uyan portföy" listesi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÖNERİ, EYLEM DEĞİL.
 *
 * Buradan otomatik mesaj gitmez, ilan rezerve edilmez, talep etiketlenmez.
 * Liste yalnızca "bu kişiyi ararken şunlara bakabilirsin" der. Aslıhan'ın
 * hafızasının yerine geçmez, onu hatırlatır.
 *
 * ⚠️ Puan bir yargı değil sıralamadır. Düşük puan "bu talep önemsiz"
 * demek değil, "bu ilan ona göre değil" demektir — talep listeden
 * kaybolmaz, yalnızca farklı ilanlar önerilir.
 * ─────────────────────────────────────────────────────────────────────────
 */
export default async function TalepEslesmeleri({ data, payload, user }: UIFieldServerProps) {
  /**
   * ⚠️ Oturum kapısı — CLAUDE.md gereği zorunlu.
   *
   * Payload oturumsuz ziyaretçiye giriş ekranını gösterir ama bileşen
   * gövdesi yine de çalışır. Bu kapı olmadan portföy fiyatları ve talep
   * bütçeleri sunucu bileşeni yükünde dışarı sızardı.
   */
  if (!user) return null

  // Kayıt henüz oluşturulmamışsa eşleştirilecek bir şey yok.
  if (data?.id === undefined || data.id === null) {
    return (
      <div className="talep-eslesme">
        <p className="talep-eslesme-bos">Eşleşmeler kayıt oluşturulduktan sonra hesaplanır.</p>
      </div>
    )
  }

  const { eslesmeler, havuzBoyutu } = await talebeEslestir(payload, data)
  const adminYolu = payload.config.routes.admin

  if (eslesmeler.length === 0) {
    /**
     * ⚠️ İki farklı boşluk, iki farklı iş.
     *
     * "Portföyde hiç yayındaki ilan yok" → yapılacak iş ilan girmek.
     * "Hiçbiri uymuyor" → yapılacak iş talebi başka türlü değerlendirmek.
     * Tek bir "sonuç yok" mesajı ikisini karıştırır ve yanlış işe
     * yönlendirir.
     */
    return (
      <div className="talep-eslesme">
        <p className="talep-eslesme-bos">
          {havuzBoyutu === 0
            ? 'Portföyde yayında ilan yok — eşleştirilecek bir şey bulunmuyor.'
            : `${havuzBoyutu} yayındaki ilanın hiçbiri bu talebe uymadı. ` +
              'Bütçe, mahalle ve talep tipi alanlarını doldurmak eşleştirmeyi keskinleştirir.'}
        </p>
      </div>
    )
  }

  return (
    <div className="talep-eslesme">
      <p className="talep-eslesme-not">
        {eslesmeler.length} öneri · {havuzBoyutu} yayındaki ilan tarandı. Bu bir sıralamadır, bir
        karar değil.
      </p>

      <ul className="talep-eslesme-liste">
        {eslesmeler.map((eslesme) => (
          <li key={eslesme.ilan.id} className="talep-eslesme-satir">
            {/* Puan tabular: liste her yenilendiğinde sütun kaymasın. */}
            <span className="talep-eslesme-puan" aria-label={`Uyum puanı ${eslesme.puan}`}>
              {eslesme.puan}
            </span>

            <div className="talep-eslesme-govde">
              <a
                className="talep-eslesme-baslik"
                href={`${adminYolu}/collections/ilanlar/${eslesme.ilan.id}`}
              >
                {eslesme.ilan.baslik}
              </a>
              <p className="talep-eslesme-gerekce">{eslesme.gerekce}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
