import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

import { ILAN_KATEGORILERI, ILAN_TIPLERI, ODA_SAYILARI } from '@/lib/secenekler'

import {
  aramaFiltresiSemasi,
  filtreyiParametrelereCevir,
  sorguSemasi,
  type AramaFiltresi,
} from './sema'

/**
 * AI doğal dil arama motoru.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ MODEL CEVAP ÜRETMEZ, FİLTRE ÜRETİR
 *
 * Bu modül Claude API'yi **yalnızca çeviri** için kullanır: ziyaretçinin
 * cümlesi → filtre nesnesi. Model hiçbir fiyat, mahalle bilgisi, öneri ya
 * da açıklama üretmez ve ürettiği hiçbir metin ziyaretçiye gösterilmez.
 *
 * Sonuçların tamamı veritabanından, mevcut filtre yolundan gelir. Model
 * halüsinasyon görse bile üretebileceği en kötü şey **yanlış bir filtre**
 * olur — ve o filtre ziyaretçiye görünür, düzeltilebilir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ KVKK — YURT DIŞINA VERİ AKTARIMI
 *
 * Ziyaretçinin yazdığı arama metni Anthropic'in sunucularına gider. Bu bir
 * **yurt dışına veri aktarımıdır** ve sitenin geri kalanının Türkiye'de
 * barındırılıyor olması bunu değiştirmez.
 *
 * Bu yüzden:
 *  · Metin dışında hiçbir şey gönderilmez — IP, oturum, çerez, kimlik yok.
 *  · Arayüzde, kutunun yanında açıkça yazar.
 *  · Anahtar tanımlı değilse özellik hiç görünmez (varsayılan: KAPALI).
 *
 * ⚠️ Aydınlatma metnine bu aktarımın eklenmesi AVUKAT işidir; bkz.
 * docs/SENDEN-BEKLENENLER.md. Metin hazır olmadan özelliği yayına almayın.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * Kullanılacak model.
 *
 * Varsayılan `claude-opus-5`. Bu iş (kısa metinden yapılandırılmış çıktı)
 * daha küçük bir modelle de yapılabilir ve arama başına maliyet doğrudan
 * buraya bağlı; bu yüzden ortam değişkeniyle değiştirilebilir bırakıldı.
 * Model seçimi bir maliyet kararıdır ve Aslıhan'ındır — bkz.
 * docs/SENDEN-BEKLENENLER.md.
 */
const MODEL = process.env.ANTHROPIC_ARAMA_MODELI ?? 'claude-opus-5'

/**
 * Yapılandırılmış çıktı zaten kısa; büyük bir tavan gereksiz.
 * Yine de kesilme olmasın diye rahat bırakıldı.
 */
const AZAMI_JETON = 2_048

/** Ağ gecikmesi tavanı — arama kutusu bekletmemeli. */
const ZAMAN_ASIMI_MS = 15_000

export type AramaSonucu =
  | { durum: 'kapali' }
  | { durum: 'gecersiz_sorgu'; mesaj: string }
  | { durum: 'hata'; mesaj: string }
  | {
      durum: 'cozuldu'
      /** `/portfoy` adresine eklenecek sorgu dizesi. */
      parametreler: string
      /** Anlaşılan filtrenin ham hali — arayüzde özetlenir. */
      filtre: AramaFiltresi
    }

/**
 * Özellik açık mı?
 *
 * ⚠️ Varsayılan KAPALI. Anahtar yoksa arama kutusu hiç basılmaz — "çalışmayan
 * bir kutu" göstermek, olmayan bir özelliği varmış gibi sunmaktır.
 */
export function aiAramaAcikMi(): boolean {
  const anahtar = process.env.ANTHROPIC_API_KEY
  return typeof anahtar === 'string' && anahtar.trim() !== ''
}

/**
 * Sistem istemi.
 *
 * Geçerli değerler istemin içine **veriyle birlikte** yazılıyor: mahalle
 * listesi CMS'ten gelir ve değişir. Sabit yazılsaydı, yeni bir mahalle
 * eklendiğinde model onu asla bulamazdı.
 */
function sistemIstemi(mahalleler: readonly { slug: string; ad: string }[]): string {
  const mahalleSatirlari =
    mahalleler.length > 0
      ? mahalleler.map((m) => `- ${m.slug} → "${m.ad}"`).join('\n')
      : '(sistemde tanımlı mahalle yok — mahalle alanını daima null bırak)'

  return `Sen bir gayrimenkul sitesinin arama çeviricisisin. Görevin TEK: ziyaretçinin Türkçe cümlesini, sitenin sahip olduğu filtre alanlarına çevirmek.

Cevap yazmıyorsun. Öneri vermiyorsun. Taşınmaz tarif etmiyorsun. Yalnızca filtre alanlarını dolduruyorsun.

Geçerli değerler — bunların DIŞINA çıkma:

tip: ${ILAN_TIPLERI.map((t) => `${t.value} (${t.label})`).join(', ')}
kategori: ${ILAN_KATEGORILERI.map((k) => `${k.value} (${k.label})`).join(', ')}
odaSayisi: ${ODA_SAYILARI.map((o) => o.value).join(', ')}
siralama: yeni, fiyat_artan, fiyat_azalan, carpan_artan

mahalle (yalnızca bu slug'lar):
${mahalleSatirlari}

Kurallar:
- Cümlede geçmeyen alanı null bırak. Tahmin etme.
- Fiyat sayı olarak, Türk lirası: "5 milyon" → 5000000, "3,5 milyon" → 3500000.
- "en fazla / altında / -e kadar" → enCokFiyat. "en az / üstünde / -den başlayan" → enAzFiyat.
- "ucuzdan pahalıya" → fiyat_artan. "yeni ilanlar" → yeni. "en iyi getiri / en hızlı amorti / kira çarpanı düşük" → carpan_artan.
- Kiralık aranıyorsa tip=kiralik; fiyat aralığı aylık kiraya işaret eder, yine de aynı alanlara yazılır.
- Mahalle adını yalnızca yukarıdaki listeden eşleştir. Listede olmayan bir yer adı geçiyorsa mahalleyi null bırak ve o ifadeyi anlasilmayan listesine ekle.

anlasilmayan alanı:
Sorgunun filtreye çevrilemeyen her parçasını buraya, ziyaretçinin kendi ifadesiyle kısa kısa yaz. Örnek: "OSB'ye 10 dakika", "güney cephe", "asansörlü", "krediye uygun", "eşyalı".
Bu alanı doldurmak zorunlu bir dürüstlük adımıdır: anlamadığın bir isteği sessizce yok sayarsan, ziyaretçi isteğinin tamamının uygulandığını sanır. Her şeyi anladıysan boş dizi bırak.`
}

/**
 * Doğal dil sorgusunu filtreye çevirir.
 *
 * @param sorgu     Ziyaretçinin yazdığı metin
 * @param mahalleler Geçerli mahalle listesi (slug + ad)
 */
export async function sorguyuFiltreyeCevir(
  sorgu: unknown,
  mahalleler: readonly { slug: string; ad: string }[],
): Promise<AramaSonucu> {
  if (!aiAramaAcikMi()) return { durum: 'kapali' }

  const dogrulama = sorguSemasi.safeParse(sorgu)
  if (!dogrulama.success) {
    return {
      durum: 'gecersiz_sorgu',
      mesaj: dogrulama.error.issues[0]?.message ?? 'Aramanız anlaşılamadı.',
    }
  }

  const istemci = new Anthropic({ timeout: ZAMAN_ASIMI_MS, maxRetries: 1 })

  try {
    const yanit = await istemci.messages.parse({
      model: MODEL,
      max_tokens: AZAMI_JETON,
      system: sistemIstemi(mahalleler),
      // Kısa bir çeviri işi; düşük çaba hem yeterli hem hızlı. Arama
      // kutusunda gecikme, doğruluktan daha çok hissedilir.
      output_config: {
        effort: 'low',
        format: zodOutputFormat(aramaFiltresiSemasi),
      },
      messages: [{ role: 'user', content: dogrulama.data }],
    })

    // ⚠️ Güvenlik sınıflandırıcısı isteği reddedebilir; içeriği okumadan
    // önce bakılır. Aksi hâlde boş `content` dizisi okunmaya çalışılır.
    if (yanit.stop_reason === 'refusal') {
      return {
        durum: 'hata',
        mesaj: 'Bu arama işlenemedi. Filtreleri elle kullanabilirsiniz.',
      }
    }

    const filtre = yanit.parsed_output
    if (!filtre) {
      return {
        durum: 'hata',
        mesaj: 'Arama anlaşılamadı. Filtreleri elle kullanabilirsiniz.',
      }
    }

    const parametreler = filtreyiParametrelereCevir(
      filtre,
      mahalleler.map((m) => m.slug),
    )

    return { durum: 'cozuldu', parametreler: parametreler.toString(), filtre }
  } catch (hata) {
    // ⚠️ Hata ayrıntısı ziyaretçiye SIZDIRILMAZ: API anahtarı durumu,
    // model adı ve kota bilgisi dışarıya çıkmamalı.
    return { durum: 'hata', mesaj: hataMesaji(hata) }
  }
}

function hataMesaji(hata: unknown): string {
  /**
   * ⚠️ Yapılandırma hatası ziyaretçiye değil GÜNLÜĞE söylenir.
   *
   * Geçersiz ya da kotası dolmuş bir anahtarda ziyaretçi yalnızca "arama
   * çalışmıyor" görür — anahtar durumunu dışarıya sızdırmak bilgi verir.
   * Ama sessiz kalırsak özellik haftalarca bozuk kalabilir; işleten kişinin
   * bakacağı yere yazıyoruz.
   */
  if (hata instanceof Anthropic.AuthenticationError) {
    console.error(
      '[ai-arama] ANTHROPIC_API_KEY reddedildi. Anahtarı kontrol edin — ' +
        'arama kutusu görünüyor ama hiçbir sorgu çözülemiyor.',
    )
    return 'Arama şu an çalışmıyor. Filtreleri elle kullanabilirsiniz.'
  }

  if (hata instanceof Anthropic.PermissionDeniedError) {
    console.error('[ai-arama] Anahtarın bu modele erişim izni yok: ' + MODEL)
    return 'Arama şu an çalışmıyor. Filtreleri elle kullanabilirsiniz.'
  }

  if (hata instanceof Anthropic.RateLimitError) {
    return 'Arama servisi şu an yoğun. Birkaç saniye sonra tekrar deneyin.'
  }

  if (hata instanceof Anthropic.APIConnectionError) {
    return 'Arama servisine ulaşılamadı. Filtreleri elle kullanabilirsiniz.'
  }

  return 'Arama şu an çalışmıyor. Filtreleri elle kullanabilirsiniz.'
}
