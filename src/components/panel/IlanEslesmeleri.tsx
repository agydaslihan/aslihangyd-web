import type { UIFieldServerProps } from 'payload'

import './talepEslesmeleri.css'

import { whatsappBaglantisi } from '@/lib/bicimlendirme'
import { mutlakAdres } from '@/lib/site'
import { TALEP_DURUMLARI } from '@/lib/secenekler'
import { ilanaEslestir } from '@/lib/veri/crmEslestirme'

/**
 * İlan kaydında "bu ilana uyan talepler" listesi — TERS YÖN.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ NEDEN VAR: YENİ İLAN GİRİLDİĞİNDE "KİME HABER VEREYİM?" SORUSU.
 *
 * Düz yön (talep kaydında "bu talebe uyan ilanlar") zaten vardı. Tersi
 * yoktu ve o eksiklik her yeni ilanda talep listesini elle taramak
 * demekti. Elle tarama bir alışkanlık hâline gelirse, veri biriktiğinde
 * de ekran açılmaz.
 *
 * ⚠️ AYNI MOTOR, TERS ÇAĞRI. İkinci bir puanlama yazılmadı: iki motor
 * aynı çiftte farklı puan verdiği gün hangisinin doğru olduğu sorulamaz
 * hâle gelir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ÖNERİ, EYLEM DEĞİL — düz yöndeki kuralın aynısı. Buradan otomatik
 * mesaj GİTMEZ. WhatsApp bağlantısı yalnızca konuşmayı önceden yazılmış
 * bir metinle AÇAR; göndermeye Aslıhan karar verir. Otomatik gönderim,
 * kişiye kendi rızası dışında ticari ileti göndermek olurdu.
 *
 * ⚠️ Kişisel alanlar (ad, telefon) burada GÖRÜNÜYOR çünkü ekranın işi tam
 * olarak "kimi arayacağım" sorusuna cevap vermek. Eşleştirme MOTORU yine
 * onları görmüyor; profil çıkarıcı yalnızca ölçüt alanlarını alıyor.
 */

const DURUM_ETIKETI = new Map<string, string>(TALEP_DURUMLARI.map((d) => [d.value, d.label]))

/**
 * Önceden doldurulmuş WhatsApp metni.
 *
 * ⚠️ METİN KISA VE İDDİASIZ. "Size özel", "kaçırmayın" gibi bir dil hem
 * marka sesine aykırı hem de ticari ileti sınırına yaklaşır. Cümle
 * yalnızca portföye yeni bir taşınmaz girdiğini söylüyor ve soruyu
 * karşıdakine bırakıyor.
 *
 * ⚠️ Fiyat metne KONMUYOR. Pazarlığa açık ilanlarda fiyat yazmak
 * bağlayıcı bir teklif gibi okunabilir; ilan sayfası zaten doğru yeri
 * gösteriyor.
 */
function mesajKur(ad: string | null, ilanBasligi: string, adres: string | null): string {
  const hitap = ad === null || ad.trim() === '' ? 'Merhaba' : `Merhaba ${ad.split(' ')[0]}`
  const govde = `${hitap}, aradığınız ölçütlere uyabilecek yeni bir taşınmaz portföyümüze girdi: ${ilanBasligi}.`
  return adres === null ? `${govde} Detayları paylaşabilirim.` : `${govde} ${adres}`
}

export default async function IlanEslesmeleri({ data, payload, user }: UIFieldServerProps) {
  /**
   * ⚠️ Oturum kapısı — CLAUDE.md gereği zorunlu. Payload oturumsuz
   * ziyaretçiye giriş ekranını gösterir ama bileşen gövdesi yine de
   * çalışır. Bu kapı olmadan müşteri adı ve telefonu sunucu bileşeni
   * yükünde dışarı sızardı.
   */
  if (!user) return null

  if (data?.id === undefined || data.id === null) {
    return (
      <div className="talep-eslesme">
        <p className="talep-eslesme-bos">Eşleşmeler kayıt oluşturulduktan sonra hesaplanır.</p>
      </div>
    )
  }

  /**
   * ⚠️ YAYINDA OLMAYAN İLAN İÇİN ÖNERİ GÖSTERİLMEZ.
   *
   * Taslak bir ilanı müşteriye anlatmak, EİDS kapısından geçmemiş bir
   * taşınmazı pazarlamak olur (CLAUDE.md kural 1). Liste kapalı değil —
   * sebebi yazılı, çünkü "neden boş?" sorusunun cevabı ekranda olmalı.
   */
  const durum = typeof data.durum === 'string' ? data.durum : null
  if (durum !== 'yayinda' && durum !== 'rezerve') {
    return (
      <div className="talep-eslesme">
        <p className="talep-eslesme-bos">
          Bu ilan yayında değil ({durum ?? 'durum yok'}). Yayına alınmadan müşteriye önerilmez —
          EİDS kapısından geçmemiş bir taşınmazı pazarlamak olurdu.
        </p>
      </div>
    )
  }

  const { eslesmeler, havuzBoyutu } = await ilanaEslestir(payload, data)
  const adminYolu = payload.config.routes.admin

  /**
   * ⚠️ MUTLAK ADRES ŞART, `serverURL` DEĞİL.
   *
   * `payload.config.serverURL` bu kurulumda boş ve mesaja `/portfoy/...`
   * gibi göreli bir yol giriyordu — WhatsApp'ta tıklanamayan, işe
   * yaramayan bir metin. Ölçümle yakalandı: üretilen bağlantı incelendi.
   *
   * `mutlakAdres` sitenin kendi adres kaynağını kullanıyor ve aynı
   * değeri site haritası, OG etiketleri ve kanonik adresler de okuyor.
   */
  const ilanAdresi =
    typeof data.slug === 'string' && data.slug !== '' ? mutlakAdres(`/portfoy/${data.slug}`) : null

  if (eslesmeler.length === 0) {
    /**
     * ⚠️ İki farklı boşluk, iki farklı iş — düz yöndeki ayrımın aynısı.
     * "Hiç açık talep yok" → yapılacak iş talep toplamak.
     * "Hiçbiri uymuyor" → yapılacak iş bu ilanı başka kanaldan duyurmak.
     */
    return (
      <div className="talep-eslesme">
        <p className="talep-eslesme-bos">
          {havuzBoyutu === 0
            ? 'Açık talep yok — eşleştirilecek bir şey bulunmuyor. (Kazanıldı ve kaybedildi ' +
              'durumundaki kayıtlar havuza girmez.)'
            : `${havuzBoyutu} açık talebin hiçbiri bu ilana uymadı. Taleplerdeki bütçe, mahalle ` +
              've talep tipi alanlarını doldurmak eşleştirmeyi keskinleştirir.'}
        </p>
      </div>
    )
  }

  return (
    <div className="talep-eslesme">
      <p className="talep-eslesme-not">
        {eslesmeler.length} öneri · {havuzBoyutu} açık talep tarandı. Bu bir sıralamadır, bir karar
        değil — buradan otomatik hiçbir mesaj gitmez.
      </p>

      <ul className="talep-eslesme-liste">
        {eslesmeler.map((eslesme) => {
          const wa = whatsappBaglantisi(
            eslesme.telefon,
            mesajKur(eslesme.adSoyad, String(data.baslik ?? 'yeni taşınmaz'), ilanAdresi),
          )

          return (
            <li key={eslesme.talepId} className="talep-eslesme-satir">
              {/* ⚠️ Yüzde işareti puanın ne olduğunu söylüyor: 72 tek başına
                  "72 ne?" sorusunu doğuruyordu. Ölçek zaten 0–100. */}
              <span className="talep-eslesme-puan" aria-label={`Uyum oranı yüzde ${eslesme.puan}`}>
                %{eslesme.puan}
              </span>

              <div className="talep-eslesme-govde">
                <a
                  className="talep-eslesme-baslik"
                  href={`${adminYolu}/collections/talepler/${eslesme.talepId}`}
                >
                  {eslesme.adSoyad ?? `Talep #${eslesme.talepId}`}
                </a>
                <p className="talep-eslesme-gerekce">
                  {eslesme.gerekce}
                  {eslesme.durum === null
                    ? null
                    : ` · ${DURUM_ETIKETI.get(eslesme.durum) ?? eslesme.durum}`}
                </p>

                {wa === null ? (
                  /* ⚠️ Telefon yoksa buton HİÇ ÇIKMIYOR — tıklanınca hiçbir
                     şey yapmayan bir düğme, olmayan düğmeden kötü. */
                  <p className="talep-eslesme-gerekce">Telefon kayıtlı değil.</p>
                ) : (
                  <a
                    className="talep-eslesme-wa"
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp&apos;ta aç (yeni sekmede)
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="talep-eslesme-not">
        ⚠️ WhatsApp bağlantısı konuşmayı önceden yazılmış bir metinle <strong>açar</strong>;
        göndermeye siz karar verirsiniz. Metinde fiyat yok — pazarlığa açık ilanlarda fiyat yazmak
        bağlayıcı bir teklif gibi okunabilir.
      </p>
    </div>
  )
}
