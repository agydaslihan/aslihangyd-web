import type { ServerProps } from 'payload'

import './bildirimSeridi.css'

import { yoneticiMi } from '@/lib/erisim'
import { bildirimleriGetir } from '@/lib/veri/bildirimler'

import type { Bildirim, Oncelik } from '@/lib/bildirim/motor'

/**
 * Panel ana ekranındaki kalıcı bildirim şeridi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ BU ŞERİT ŞU AN TEK UYARI KANALI.
 *
 * EİDS yetki bitişi ve bakım görevlerinin aksaması yasal sonuç doğuruyor.
 * SMTP bilgileri girilene kadar e-posta gönderilemiyor; geriye kalan tek
 * kanal `/srv/aslihangyd/logs/bakim.log` idi — yani kimsenin bakmadığı bir
 * dosya. Uyarı, işin yapıldığı yerde görünmezse yok sayılır.
 *
 * ⚠️ Şerit KAPATILAMAZ. "Anladım, gizle" düğmesi yok: gizlenen bir uyarı
 * kapatıldığı gün çözülmüş sayılır ve bir daha hatırlanmaz. Bildirim,
 * sebebi ortadan kalkınca kendiliğinden kaybolur — tek susturma yolu
 * sorunu çözmektir.
 * ─────────────────────────────────────────────────────────────────────────
 */

const ONCELIK_ETIKETI: Record<Oncelik, string> = {
  /**
   * ⚠️ "Erişim" yasalın da üstünde: site açılmıyorsa yasal uyarıyı
   * okuyacak panel de yok. 18 Ağustos 2026'da alan adı `clientHold`
   * yüzünden düştü ve hiçbir izleme görmedi.
   */
  erisim: 'Erişim',
  /**
   * ⚠️ Dağıtım yarım kaldığında diğer uyarılar da yanlış olabilir: eksik
   * bir tablodan okuyan EİDS sayımı "0 ilan" der ve sorun yokmuş gibi
   * görünür. Bu yüzden yasalın üstünde.
   */
  butunluk: 'Bütünlük',
  yasal: 'Yasal',
  onemli: 'Önemli',
  bilgi: 'Bilgi',
}

/**
 * ⚠️ Renk tek taşıyıcı DEĞİL (WCAG 1.4.1).
 *
 * Kırmızı bir şerit, renk körü bir kullanıcı için gri bir şerittir.
 * Her satırda ayrıca metin etiketi ("Yasal") ve simge var; üçü birden
 * kaybolmadıkça öncelik anlaşılır kalır.
 */
const ONCELIK_SIMGESI: Record<Oncelik, string> = {
  erisim: '!',
  butunluk: '!',
  yasal: '!',
  onemli: '!',
  bilgi: 'i',
}

export default async function BildirimSeridi({ payload, user }: ServerProps) {
  /**
   * ⚠️ Oturum kapısı — CLAUDE.md gereği zorunlu.
   *
   * Payload oturumsuz ziyaretçiye giriş ekranını gösterir, ama bileşenin
   * GÖVDESİ yine de çalışır (sihirbaz görünümünde duman testiyle
   * doğrulandı). Bu kapı olmadan aşağıdaki sorgular oturumsuz istekte de
   * koşar ve portföy sayıları sunucu bileşeni yükünde dışarı sızardı.
   */
  if (!user) return null

  // Onay kuyruğu bildirimi yalnızca yöneticiye — danışman kuyruğa bakıp
  // bir şey yapamaz.
  const bildirimler = await bildirimleriGetir(payload, new Date(), yoneticiMi(user))
  if (bildirimler.length === 0) return null

  const adminYolu = payload.config.routes.admin

  return (
    <section className="panel-bildirim" aria-labelledby="panel-bildirim-baslik">
      <h2 id="panel-bildirim-baslik" className="panel-bildirim-baslik">
        Dikkat gerektirenler
        {/* Sayı tabular: liste her yenilendiğinde başlık yatay olarak zıplamasın. */}
        <span className="panel-bildirim-sayi">{bildirimler.length}</span>
      </h2>

      <ul className="panel-bildirim-liste">
        {bildirimler.map((bildirim) => (
          <BildirimSatiri key={bildirim.anahtar} bildirim={bildirim} adminYolu={adminYolu} />
        ))}
      </ul>
    </section>
  )
}

function BildirimSatiri({ bildirim, adminYolu }: { bildirim: Bildirim; adminYolu: string }) {
  /**
   * Adres `/admin/...` biçiminde yazılıyor ama admin yolu
   * yapılandırılabilir; kök değiştiğinde bağlantıların sessizce kırılmaması
   * için önek burada çözülüyor.
   */
  const adres =
    bildirim.adres === undefined
      ? undefined
      : bildirim.adres.startsWith('/admin/')
        ? adminYolu + bildirim.adres.slice('/admin'.length)
        : bildirim.adres

  return (
    <li className={`panel-bildirim-satir oncelik-${bildirim.oncelik}`}>
      <span className="panel-bildirim-simge" aria-hidden="true">
        {ONCELIK_SIMGESI[bildirim.oncelik]}
      </span>

      <div className="panel-bildirim-govde">
        <p className="panel-bildirim-satir-baslik">
          <span className="panel-bildirim-etiket">{ONCELIK_ETIKETI[bildirim.oncelik]}</span>
          {bildirim.baslik}
        </p>
        {/* Ne yapılacağını söylemeyen uyarı yalnızca kaygı üretir. */}
        <p className="panel-bildirim-aciklama">{bildirim.aciklama}</p>
        {adres !== undefined && (
          <a className="panel-bildirim-baglanti" href={adres}>
            {bildirim.adresEtiketi ?? 'Aç'} →
          </a>
        )}
      </div>
    </li>
  )
}
