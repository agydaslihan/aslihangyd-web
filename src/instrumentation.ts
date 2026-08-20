/**
 * Sunucu başlangıç kancaları.
 *
 * ⚠️ Yalnızca Node.js çalışma zamanında iş yapıyor. Next bu dosyayı hem
 * Node hem Edge derlemesi için çağırıyor; ayrım yapılmasaydı zamanlayıcı
 * iki kez kurulur ve tampon iki ayrı bağlamdan boşaltılmaya çalışılırdı.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  /**
   * ⚠️ Şema denetimi AYRI BİR MODÜLDEN dinamik olarak çağrılıyor.
   *
   * `@payload-config` doğrudan buradan içe aktarılınca Turbopack onu Edge
   * paketine çözmeye çalışıyor ve derleme kırılıyor ("A Node.js module is
   * loaded ('node:path')..."). Çalışma zamanı kontrolü yetmiyor: hata
   * derleme anında veriliyor. Ara modül bu yüzden var.
   */
  const { semayiAcilistaDenetle } = await import('@/lib/sema/acilis')
  void semayiAcilistaDenetle()

  const { BOSALTMA_ARALIGI_MS } = await import('@/lib/olcum/tampon')
  const { tamponuYaz } = await import('@/lib/olcum/yazici')

  /**
   * ⚠️ `unref()` ZORUNLU. Aksi hâlde zamanlayıcı olay döngüsünü canlı
   * tutar ve süreç `SIGTERM` sonrası kapanmaz: dağıtımda kapsayıcı
   * durdurulamaz, orkestratör onu zorla öldürür ve o an tamponda ne varsa
   * gider.
   */
  const zamanlayici = setInterval(() => {
    void tamponuYaz()
  }, BOSALTMA_ARALIGI_MS)
  zamanlayici.unref()

  /**
   * ⚠️ Kapanışta son bir boşaltma. Beş dakikalık pencerenin tamamını
   * kaybetmemek için; düzenli bir dağıtımda bu, ölçümün hiç kesilmemesi
   * demek.
   */
  /**
   * ⚠️ KAPANIŞ BOŞALTMASI EN İYİ ÇABADIR, GÜVENCE DEĞİL — ölçüldü.
   *
   * `SIGTERM` geldiğinde Next kendi kapatma kancasını da çalıştırıyor ve
   * süreç bizim asenkron yazmamız bitmeden sonlanabiliyor: günlükte çağrı
   * göründüğü hâlde veritabanı değişmiyordu. Yine de duruyor — bazen
   * yetişiyor ve yetiştiğinde son pencereyi kurtarıyor.
   *
   * Gerçek güvence `BOSALTMA_ARALIGI_MS`; kayıp penceresi bu yüzden bir
   * dakikaya indirildi.
   */
  const kapat = () => {
    void tamponuYaz()
  }

  /**
   * ⚠️ `process.once(...)` DOĞRUDAN YAZILAMIYOR.
   *
   * Next bu dosyayı Edge derlemesi için de derliyor ve Turbopack `process`
   * üzerindeki Node API'sini orada statik olarak reddediyor:
   *
   *     Ecmascript file had an error
   *       > process.once('SIGTERM', kapat)
   *
   * Çalışma zamanı kontrolü (`NEXT_RUNTIME !== 'nodejs'`) buna yetmiyor:
   * hata derleme anında, dal hiç çalışmadan veriliyor. Erişim
   * `globalThis` üzerinden yapılınca statik çözümleme devreye girmiyor.
   */
  const surec = (globalThis as { process?: NodeJS.Process }).process
  surec?.once?.('SIGTERM', kapat)
  surec?.once?.('SIGINT', kapat)
}

/**
 * Hata sayacı — teknik sağlık bölümünün "hata oranı" satırı.
 *
 * ⚠️ Hata NESNESİ kaydedilmiyor, yalnızca rota sayacı artıyor. Yığın izi
 * ya da mesaj saklamak, kullanıcı girdisi içeren bir hatayı sessizce
 * veritabanına taşıyabilirdi.
 */
export async function onRequestError(_hata: unknown, istek: { path?: string }): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { hataSay } = await import('@/lib/olcum/tampon')
    const { rotaAnahtari, sayilirMi } = await import('@/lib/olcum/kimliksizlestirme')

    const yol = typeof istek.path === 'string' ? istek.path : ''
    if (yol === '' || !sayilirMi(yol)) return
    hataSay(rotaAnahtari(yol))
  } catch {
    // Hata sayacı, hatanın kendisini gölgelemesin.
  }
}
