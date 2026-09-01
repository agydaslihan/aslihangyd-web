/**
 * Panel bildirim motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ GÜNLÜK DOSYASINA YAZILAN UYARIYI KİMSE OKUMAZ.
 *
 * EİDS yetki bitişi ve bakım görevlerinin aksaması yasal sonuç doğuruyor.
 * Bugüne kadar tek kanal `/srv/aslihangyd/logs/bakim.log` idi — yani
 * kimsenin bakmadığı bir dosya. SMTP gelene kadar panelin ana ekranı tek
 * gerçek uyarı kanalı.
 *
 * Bu dosya SAF: veritabanına dokunmaz, yalnızca verilen sayılardan
 * bildirim listesi üretir. Sorgulama `src/lib/veri/bildirimler.ts` içinde.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { gunFarki, gunAnahtari, type GunAnahtari } from '@/lib/tarih'

/**
 * Öncelik — sıralamayı bu belirler.
 *
 * ⚠️ `yasal` her zaman en üstte. Bir portföyün 60 gündür ilgi görmemesi
 * ticari bir sorun; yetkisi dolmuş bir ilanın yayında kalması idari
 * yaptırım. İkisini aynı görsel ağırlıkta göstermek, ikincisini
 * görünmez kılar.
 */
export type Oncelik = 'erisim' | 'butunluk' | 'yasal' | 'onemli' | 'bilgi'

/**
 * ⚠️ `erisim` YASALIN DA ÜSTÜNDE — 18 Ağustos 2026'da öğrenildi.
 *
 * Alan adı `clientHold` yüzünden düştü ve site saatlerce kimseye açılmadı.
 * O durumda EİDS uyarısını okuyacak bir panel de yok: erişilebilirlik
 * diğer her şeyin ÖN KOŞULU. Yasal uyarıyla aynı seviyeye konsaydı,
 * sıralaması tesadüfe kalırdı.
 */
/**
 * ⚠️ `butunluk` YASALIN ÜSTÜNDE — ve gerekçesi ince.
 *
 * Eksik bir tablo, dağıtımın yarım kaldığı anlamına geliyor. O durumda
 * şeritteki DİĞER uyarıların dayandığı varsayımlar da geçersiz: EİDS
 * sayımı eksik bir tablodan okuyorsa "0 ilan" der ve sorun yokmuş gibi
 * görünür. Yani bütünlük sorunu, yasal uyarıyı YANLIŞ gösterebilir.
 *
 * Erişimin altında çünkü site hâlâ açık; yasalın üstünde çünkü yasal
 * uyarının doğruluğunu belirliyor.
 */
export const ONCELIK_SIRASI: Record<Oncelik, number> = {
  erisim: 0,
  butunluk: 1,
  yasal: 2,
  onemli: 3,
  bilgi: 4,
}

export interface Bildirim {
  anahtar: string
  oncelik: Oncelik
  baslik: string
  /** Ne yapılması gerektiği. Boş bırakılmaz. */
  aciklama: string
  /** Panelde gidilecek adres. Yoksa bildirim sadece bilgilendirir. */
  adres?: string
  adresEtiketi?: string
}

/* ══════════════════════════════════════════════════════════════════════════
   Eşikler
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Bakım görevi kaç saat çalışmazsa uyarı verilir.
 *
 * 26 saat, 24 değil: cron günde bir kez çalışıyor ve saat kayması,
 * yeniden başlatma ya da uzun süren bir görev yüzünden 24 saati birkaç
 * dakika aşabilir. 24'e sabitlemek her gün yanlış alarm üretirdi ve
 * yanlış alarm veren bir uyarı kısa sürede görmezden gelinir.
 */
export const BAKIM_ESIK_SAAT = 26

/** Portföy kaç gün ilgisiz kalırsa hatırlatılır. */
export const ILGISIZ_PORTFOY_GUN = 60

/** Mahalle kaç gün gözlemsiz kalırsa hatırlatılır. */
export const GOZLEMSIZ_MAHALLE_GUN = 45

/* ══════════════════════════════════════════════════════════════════════════
   Girdi
   ══════════════════════════════════════════════════════════════════════════ */

export interface BakimGorevDurumu {
  anahtar: string
  ad: string
  yasal: boolean
  /** Son başarılı çalışma anı (ISO). Hiç çalışmadıysa `null`. */
  sonBasariliCalisma: string | null
  /** Son çalışmada hata alındıysa mesajı. */
  sonHata: string | null
}

export interface AlanSagligiGirdisi {
  saglik: 'saglikli' | 'uyari' | 'kritik' | 'bilinmiyor'
  ozet: string
  eylem: string
  /** Son sorgu zamanı (ISO) — bayat kayıt sessizce güven vermemeli. */
  sorguZamani: string | null
}

export interface BildirimGirdisi {
  /** 15 gün içinde yetkisi bitecek yayındaki ilan sayısı. */
  yetkisiBitecekIlan: number
  /** Yetkisi çoktan dolmuş ama hâlâ yayında görünen ilan sayısı. */
  yetkisiDolmusYayindaIlan: number
  /** Bakım görevlerinin son durumu. */
  bakimGorevleri: readonly BakimGorevDurumu[]
  /** 60 gündür hiç talep almamış yayındaki ilan sayısı. */
  ilgisizPortfoy: number
  /** 45 gündür gözlem girilmemiş yayındaki mahalle sayısı. */
  gozlemsizMahalle: number
  /** Yetki belgesi numarası girilmiş mi. */
  yetkiBelgesiVar: boolean
  /**
   * Danışmanın yayına gönderdiği, yönetici onayı bekleyen ilan sayısı.
   *
   * ⚠️ Yalnızca YÖNETİCİYE gösterilir. Danışman bu kuyruğa bakıp bir şey
   * yapamaz; ona göstermek, üzerinde işlem yapamayacağı bir uyarı biriktirir
   * ve şeridin tamamını görmezden gelmeyi öğretir.
   */
  onayBekleyenIlan: number

  /**
   * Alt metni otomatik üretilmiş görsel sayısı.
   *
   * ⚠️ BU BİR ERİŞİLEBİLİRLİK BORCU SAYACI. Sahada yirmi fotoğraf yükleyen
   * kişi yirmi kez metin yazamıyor; alan zorunlu olmaktan çıkarıldı ve boş
   * kalanlar dosya adından türetiliyor. Türetilmiş metin ekran okuyucu için
   * yeterli değil — kaç tanesinin insan eliyle yazılması gerektiği GÖRÜNÜR
   * kalmalı, yoksa borç sessizce büyür.
   */
  altMetniEksikGorsel: number

  /**
   * Hiçbir adla tanımlanmamış çalışma zamanı ayarları.
   *
   * ⚠️ Bu alan `lib/ayarlar.ts` üzerinden geliyor ve bir arıza listesidir:
   * boş bir ayar sessizce çalışmayan bir özellik demek. 13 Ağustos 2026'da
   * canlıda dokuz ayarın dokuzu da boştu ve bunu ancak siteye bakınca
   * fark ettik — Turnstile site anahtarı boş olduğu için formlar bot
   * korumasız çalışıyordu.
   */
  eksikAyarlar: readonly { ad: string; aciklama: string; eksikseNeOlur: string; kritik: boolean }[]

  /** Eski `NEXT_PUBLIC_` adıyla okunan ayarlar — çalışıyor ama borç. */
  eskiAdliAyarlar: readonly { ad: string; aciklama: string }[]

  /** Site adresi port içeriyor mu (`:8443` gibi) — kanonik adresleri bozar. */
  siteAdresindePortVar: boolean

  /**
   * Alan adı sağlığı — son bakım sorgusunun sonucu.
   *
   * ⚠️ Hiç sorgulanmadıysa `null`. "Sorun yok" ile "hiç bakılmadı" farklı
   * şeyler ve ikincisi de bir uyarıdır.
   */
  alanSagligi: AlanSagligiGirdisi | null

  /**
   * Şema bütünlüğü — kodun beklediği ama veritabanında olmayan tablolar.
   *
   * ⚠️ `null` = hiç denetlenmedi. "Sorun yok" DEĞİL: denetimin çalışmamış
   * olması da bir bilgi, çünkü tam olarak bu sessizlik yüzünden buradayız.
   */
  semaDurumu: { eksikTablolar: string[]; beklenenSayi: number; hata: string | null } | null
}

/* ══════════════════════════════════════════════════════════════════════════
   Üretim
   ══════════════════════════════════════════════════════════════════════════ */

/** İki ISO anı arasındaki saat farkı. Geçersiz girdide `null`. */
export function saatFarki(bas: string | null, simdi: Date): number | null {
  if (bas === null) return null
  const an = Date.parse(bas)
  if (Number.isNaN(an)) return null
  return (simdi.getTime() - an) / 3_600_000
}

/**
 * Alan adı sağlığı kaç saat sonra bayat sayılır.
 *
 * ⚠️ Bakım eşiğiyle aynı gerekçe (26 saat, 24 değil): cron günde bir kez
 * koşuyor ve saat kayması yüzünden 24'ü birkaç dakika aşabilir. 24'e
 * sabitlemek her gün yanlış alarm üretirdi.
 */
export const ALAN_BAYAT_SAAT = 26

export function bildirimleriUret(girdi: BildirimGirdisi, simdi: Date = new Date()): Bildirim[] {
  const bildirimler: Bildirim[] = []

  /* ── Şema bütünlüğü ───────────────────────────────────────────────────
   *
   * ⚠️ 18–20 Ağustos 2026: göç atlandı, site hiç bozulmadı ve ölü bir
   * özellik iki gün canlı göründü. İçerik okuyucularındaki `try/catch`
   * eksik tabloyu yakalayıp varsayılana düşüyordu — geri düşüş doğruydu
   * ama arızayı sessizleştirdi.
   * ─────────────────────────────────────────────────────────────────── */
  const sema = girdi.semaDurumu

  if (sema !== null && sema.eksikTablolar.length > 0) {
    const adet = sema.eksikTablolar.length
    // Uzun listeyi başlığa sığdırmak yerine ilk birkaçı gösteriliyor.
    const ornekler = sema.eksikTablolar.slice(0, 3).join(', ')
    const kalan = adet > 3 ? ` (+${adet - 3} tablo daha)` : ''

    bildirimler.push({
      anahtar: 'sema-eksik',
      oncelik: 'butunluk',
      baslik: `${adet} tablo eksik — göç uygulanmamış olabilir`,
      aciklama:
        `Kodun beklediği ${sema.beklenenSayi} tablodan ${adet} tanesi veritabanında yok: ` +
        `${ornekler}${kalan}. ⚠️ Site açık görünüyor ama o tablolara bağlı özellikler ` +
        'sessizce çalışmıyor. Sunucuda göç adımını çalıştırın: ' +
        'docker compose --profile gocmen run --rm gocmen',
      adres: '/globals/bakim-durumu',
      adresEtiketi: 'Bakım durumu',
    })
  } else if (sema !== null && sema.hata !== null) {
    bildirimler.push({
      anahtar: 'sema-denetlenemedi',
      oncelik: 'butunluk',
      baslik: 'Şema bütünlüğü denetlenemedi',
      aciklama:
        `Denetim çalıştı ama sonuç alınamadı: ${sema.hata}. Eksik tablo olup olmadığı ` +
        'bilinmiyor.',
      adres: '/globals/bakim-durumu',
      adresEtiketi: 'Bakım durumu',
    })
  }

  /* ── Alan adı sağlığı ─────────────────────────────────────────────────
   *
   * ⚠️ EN ÜSTTE VE YASALIN DA ÖNÜNDE.
   *
   * Site erişilemezse yasal uyarıyı okuyacak panel de yok. 18 Ağustos
   * 2026'da alan adı `clientHold` yüzünden düştü; sunucu ve Cloudflare
   * sağlıklıydı, hiçbir izleme görmedi.
   * ─────────────────────────────────────────────────────────────────── */
  const alan = girdi.alanSagligi

  if (alan === null) {
    bildirimler.push({
      anahtar: 'alan-hic-bakilmadi',
      oncelik: 'erisim',
      baslik: 'Alan adı sağlığı hiç kontrol edilmedi',
      aciklama:
        'Alan adının kayıt kuruluşundaki durumu ve dışarıdan çözülüp çözülmediği henüz ' +
        'sorgulanmadı. Bakım görevinin (alan-sagligi) cron’a eklendiğini doğrulayın.',
      adres: '/globals/bakim-durumu',
      adresEtiketi: 'Bakım durumu',
    })
  } else {
    const saatler = saatFarki(alan.sorguZamani, simdi)
    const bayat = saatler === null || saatler > ALAN_BAYAT_SAAT

    if (alan.saglik === 'kritik') {
      bildirimler.push({
        anahtar: 'alan-kritik',
        oncelik: 'erisim',
        baslik: alan.ozet,
        aciklama: alan.eylem,
        adres: '/globals/alan-sagligi',
        adresEtiketi: 'Ayrıntı',
      })
    } else if (alan.saglik === 'uyari') {
      bildirimler.push({
        anahtar: 'alan-uyari',
        oncelik: 'erisim',
        baslik: alan.ozet,
        aciklama: alan.eylem,
        adres: '/globals/alan-sagligi',
        adresEtiketi: 'Ayrıntı',
      })
    } else if (alan.saglik === 'bilinmiyor') {
      bildirimler.push({
        anahtar: 'alan-bilinmiyor',
        oncelik: 'erisim',
        baslik: 'Alan adı durumu sorgulanamadı',
        aciklama: alan.eylem,
        adres: '/globals/alan-sagligi',
        adresEtiketi: 'Ayrıntı',
      })
    }

    /**
     * ⚠️ BAYAT KAYIT SESSİZCE GÜVEN VERMEMELİ.
     *
     * "Sağlıklı" yazan üç gün önceki bir satır, bugün alan adı düşmüş olsa
     * bile panelde yeşil görünür. Kontrolün kendisi durduğunda bunu
     * söylemek, kontrolün bir parçası.
     */
    if (bayat && alan.saglik !== 'kritik') {
      bildirimler.push({
        anahtar: 'alan-bayat',
        oncelik: 'erisim',
        baslik: 'Alan adı kontrolü güncel değil',
        aciklama:
          'Son sorgunun üzerinden 26 saatten fazla geçti; ekrandaki sonuç bugünü ' +
          'yansıtmıyor olabilir. Bakım görevinin çalıştığını doğrulayın.',
        adres: '/globals/bakim-durumu',
        adresEtiketi: 'Bakım durumu',
      })
    }
  }

  /* ── YASAL ─────────────────────────────────────────────────────────── */

  /**
   * ⚠️ En ağır durum: yetkisi dolmuş ilan hâlâ yayında.
   *
   * Normalde imkânsız — kayıt kancası engelliyor ve bakım görevi geceleri
   * temizliyor. Görünüyorsa bakım görevi çalışmıyor demektir ve her geçen
   * gün ihlal süresi.
   */
  if (girdi.yetkisiDolmusYayindaIlan > 0) {
    bildirimler.push({
      anahtar: 'eids-dolmus-yayinda',
      oncelik: 'yasal',
      baslik: `${girdi.yetkisiDolmusYayindaIlan} ilanın yetki süresi DOLMUŞ ama hâlâ yayında`,
      aciklama:
        'Yetkisiz ilan yayını idari yaptırım doğurur. Bakım görevi bu ilanları geceleri ' +
        'yayından almalıydı; çalışmamış olabilir. Hemen elle yayından alın.',
      adres: '/admin/collections/ilanlar?where[durum][in]=yayinda,rezerve',
      adresEtiketi: 'Yayındaki ilanlar',
    })
  }

  if (girdi.onayBekleyenIlan > 0) {
    /**
     * Yasal DEĞİL, önemli: kuyrukta bekleyen ilan yayına girmiyor demektir.
     * Yetkisiz yayın (yasal) ile karıştırılmamalı — burada henüz bir ihlal
     * yok, duran bir iş var.
     */
    bildirimler.push({
      anahtar: 'onay-bekleyen-ilan',
      oncelik: 'onemli',
      baslik:
        girdi.onayBekleyenIlan === 1
          ? '1 ilan yayın onayı bekliyor'
          : `${girdi.onayBekleyenIlan} ilan yayın onayı bekliyor`,
      aciklama:
        'Danışman hazırlayıp yayına gönderdi. EİDS bilgilerini (taşınmaz numarası, ada, ' +
        'parsel, yetki tarihleri) doğrulayıp yayınlayın. Yetki belgesi sizin adınıza; ' +
        'yayın kararı bu yüzden sizde.',
      adres: '/admin/collections/ilanlar?where[durum][equals]=onay_bekliyor',
      adresEtiketi: 'Onay kuyruğunu aç',
    })
  }

  if (girdi.yetkisiBitecekIlan > 0) {
    bildirimler.push({
      anahtar: 'eids-bitiyor',
      oncelik: 'yasal',
      baslik: `${girdi.yetkisiBitecekIlan} ilanın EİDS yetkisi 15 gün içinde bitiyor`,
      aciklama:
        'Yetki yenilenmezse ilan otomatik olarak yayından kalkar. Mülk sahibinden ' +
        'e-Devlet üzerinden yetki yenilemesini isteyin.',
      adres: '/admin/collections/ilanlar?where[durum][in]=yayinda,rezerve&sort=eidsYetkiBitis',
      adresEtiketi: 'Yetki bitişine göre sırala',
    })
  }

  // Bakım görevleri — yasal olanlar burada, diğerleri aşağıda.
  for (const gorev of girdi.bakimGorevleri) {
    const gecenSaat = saatFarki(gorev.sonBasariliCalisma, simdi)
    const hicCalismadi = gecenSaat === null
    const gecikti = gecenSaat !== null && gecenSaat > BAKIM_ESIK_SAAT

    if (!hicCalismadi && !gecikti && gorev.sonHata === null) continue

    const oncelik: Oncelik = gorev.yasal ? 'yasal' : 'onemli'

    if (hicCalismadi) {
      bildirimler.push({
        anahtar: `bakim-hic-${gorev.anahtar}`,
        oncelik,
        baslik: `Bakım görevi hiç çalışmadı: ${gorev.ad}`,
        aciklama: gorev.yasal
          ? 'Bu görev yasal yükümlülük. Cron kurulumu yapılmamış olabilir — ' +
            'docs/ISLETME-REHBERI.md §6.5.'
          : 'Cron kurulumu yapılmamış olabilir — docs/ISLETME-REHBERI.md §6.5.',
      })
      continue
    }

    if (gecikti) {
      /**
       * 48 saatin altı "dün çalışmadı".
       *
       * 27 saat geçmişse matematiksel olarak "1 gün" ama insan diliyle
       * "dün gece çalışmadı" demek. `Math.floor(27/24) = 1` diyip
       * "1 gündür çalışmıyor" yazmak, tek bir kaçırılmış koşuyu süregelen
       * bir arıza gibi gösterirdi.
       */
      const gun = Math.floor((gecenSaat ?? 0) / 24)
      bildirimler.push({
        anahtar: `bakim-gecikti-${gorev.anahtar}`,
        oncelik,
        baslik:
          gun >= 2
            ? `Bakım görevi ${gun} gündür çalışmıyor: ${gorev.ad}`
            : `Bakım görevi dün çalışmadı: ${gorev.ad}`,
        aciklama: gorev.yasal
          ? 'Yasal yükümlülük aksıyor. Sunucuda elle çalıştırın: scripts/bakim.sh ' + gorev.anahtar
          : 'Sunucuda elle çalıştırılabilir: scripts/bakim.sh ' + gorev.anahtar,
      })
      continue
    }

    // Zamanında çalışmış ama hata döndürmüş.
    bildirimler.push({
      anahtar: `bakim-hata-${gorev.anahtar}`,
      oncelik,
      baslik: `Bakım görevi hata verdi: ${gorev.ad}`,
      aciklama: `Son hata: ${gorev.sonHata}`,
    })
  }

  if (!girdi.yetkiBelgesiVar) {
    bildirimler.push({
      anahtar: 'yetki-belgesi-yok',
      oncelik: 'yasal',
      baslik: 'Taşınmaz Ticareti Yetki Belgesi numarası girilmedi',
      aciklama:
        'Numara mevzuat gereği sitede görünmek zorunda. Girilene kadar altbilgide ' +
        'her sayfada uyarı görünüyor.',
      adres: '/admin/globals/kurumsal-bilgiler',
      adresEtiketi: 'Kurumsal bilgiler',
    })
  }

  /* ── ÇALIŞMA ZAMANI YAPILANDIRMASI ─────────────────────────────────
     ⚠️ Bu blok 13 Ağustos 2026'daki arızadan sonra eklendi: ayarlar
     sessizce boş kalıyordu ve hiçbir yerde görünmüyordu. Artık eksik
     yapılandırma panelin ilk ekranında duruyor. */

  const kritikEksikler = girdi.eksikAyarlar.filter((eksik) => eksik.kritik)
  const digerEksikler = girdi.eksikAyarlar.filter((eksik) => !eksik.kritik)

  for (const eksik of kritikEksikler) {
    bildirimler.push({
      anahtar: `ayar-eksik-${eksik.ad.toLowerCase()}`,
      oncelik: 'yasal',
      baslik: `${eksik.aciklama} tanımlı değil`,
      aciklama: `${eksik.eksikseNeOlur} Sunucudaki .env dosyasına ${eksik.ad} ekleyin.`,
    })
  }

  if (digerEksikler.length > 0) {
    bildirimler.push({
      anahtar: 'ayar-eksik',
      oncelik: 'onemli',
      baslik: `${digerEksikler.length} çalışma zamanı ayarı tanımlı değil`,
      aciklama:
        digerEksikler.map((eksik) => `${eksik.ad}: ${eksik.eksikseNeOlur}`).join(' ') +
        ' Hepsi sunucudaki .env dosyasına yazılır.',
    })
  }

  if (girdi.siteAdresindePortVar) {
    bildirimler.push({
      anahtar: 'site-adresinde-port',
      oncelik: 'yasal',
      baslik: 'Site adresi port içeriyor',
      aciklama:
        'SITE_ADRESI değerinde port var (örn. :8443). Kanonik adresler, site haritası ve ' +
        'OG etiketleri bu değerden üretiliyor; porta takılı bir adres arama motoruna ' +
        'ULAŞILAMAYAN sayfalar bildirir. Sunucudaki .env dosyasından portu silin.',
    })
  }

  if (girdi.eskiAdliAyarlar.length > 0) {
    bildirimler.push({
      anahtar: 'ayar-eski-ad',
      oncelik: 'bilgi',
      baslik: `${girdi.eskiAdliAyarlar.length} ayar hâlâ eski adıyla okunuyor`,
      aciklama:
        girdi.eskiAdliAyarlar.map((a) => a.ad).join(', ') +
        ' — şu an çalışıyorlar çünkü uygulama eski NEXT_PUBLIC_ adlarına geri düşüyor. ' +
        'Bu destek geçici; .env dosyasını yeni adlara taşıyın.',
    })
  }

  /* ── TİCARİ ────────────────────────────────────────────────────────── */

  if (girdi.ilgisizPortfoy > 0) {
    bildirimler.push({
      anahtar: 'ilgisiz-portfoy',
      oncelik: 'bilgi',
      baslik: `${girdi.ilgisizPortfoy} portföy ${ILGISIZ_PORTFOY_GUN} gündür ilgi görmedi`,
      aciklama:
        'Hiç talep gelmemiş. Fiyat, fotoğraf ya da başlık gözden geçirilebilir; ' +
        'ya da mülk sahibiyle konuşma zamanı gelmiş olabilir.',
      adres: '/admin/collections/ilanlar?where[durum][in]=yayinda,rezerve',
      adresEtiketi: 'Portföyü aç',
    })
  }

  if (girdi.gozlemsizMahalle > 0) {
    bildirimler.push({
      anahtar: 'gozlemsiz-mahalle',
      oncelik: 'bilgi',
      baslik: `${girdi.gozlemsizMahalle} mahallede ${GOZLEMSIZ_MAHALLE_GUN} gündür gözlem yok`,
      aciklama:
        'Endeks ve mahalle rakamları gözleme dayanıyor. Veri eskidikçe endeksin ' +
        'yayına girme tarihi uzuyor.',
      adres: '/admin/collections/gozlemler',
      adresEtiketi: 'Gözlemler',
    })
  }

  /**
   * ⚠️ ÖNCELİK "BİLGİ": yasal bir sonucu yok ve acil değil. Ama şeritte
   * durması şart — otomatik alt metin, kimsenin bakmadığı bir borç olarak
   * birikirse erişilebilirlik sessizce düşer.
   */
  if (girdi.altMetniEksikGorsel > 0) {
    bildirimler.push({
      anahtar: 'alt-metni-eksik',
      oncelik: 'bilgi',
      baslik: `${girdi.altMetniEksikGorsel} görselde alt metin eksik`,
      aciklama:
        'Bu görsellerin alt metni dosya adından otomatik üretildi; ekran okuyucu için ' +
        'yeterli değil. Fırsat buldukça görselde ne olduğunu bir cümleyle yazın.',
      adres: '/admin/collections/medya?where[altOtomatik][equals]=true',
      adresEtiketi: 'Eksik olanları listele',
    })
  }

  return siralaBildirimler(bildirimler)
}

/**
 * Öncelik sırası — yasal olan her zaman üstte.
 *
 * Eşit öncelikte tanım sırası korunur (kararlı sıralama): aynı ağırlıktaki
 * bildirimlerin her yenilemede yer değiştirmesi, gözün listeyi tanımasını
 * engeller.
 */
export function siralaBildirimler(bildirimler: readonly Bildirim[]): Bildirim[] {
  return [...bildirimler].sort((a, b) => ONCELIK_SIRASI[a.oncelik] - ONCELIK_SIRASI[b.oncelik])
}

/**
 * Gün sayısından "kaç gün önce" metni.
 *
 * ⚠️ Europe/Istanbul gün anahtarı kullanılıyor: sunucu UTC çalışıyor ve
 * doğrudan `Date` farkı, gece yarısından sonraki ilk üç saatte bir gün
 * kayıyor.
 */
export function gecenGun(tarih: string | null, simdi: Date = new Date()): number | null {
  const bas = gunAnahtari(tarih)
  const son = gunAnahtari(simdi)
  if (bas === null || son === null) return null
  return gunFarki(bas as GunAnahtari, son as GunAnahtari)
}
