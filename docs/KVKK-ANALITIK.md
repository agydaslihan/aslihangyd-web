# Ziyaretçi ölçümü — KVKK notu (avukata verilecek)

**Hazırlayan:** teknik ekip · **Tarih:** 17 Ağustos 2026
**Amaç:** aydınlatma metnine girecek maddelerin dayanağını, teknik
gerçeğiyle birlikte vermek.

> ⚠️ **Bu belge hukuki metin DEĞİLDİR.** Aydınlatma metnini avukat yazacak
> (CLAUDE.md kural 3). Burada yalnızca "sistem gerçekte ne yapıyor" sorusu
> cevaplanıyor; hangi maddenin nasıl yazılacağı hukuk kararıdır.

---

## 1. Özet — bir cümleyle

Site iki ayrı ölçüm katmanı çalıştırıyor: biri **hiç kişisel veri
işlemeyen** sunucu sayaçları, diğeri **yalnızca açık rıza verilmişse**
çalışan etkileşim ölçümü. Hiçbir katmanda IP adresi saklanmıyor, oturum
kimliği üretilmiyor ve tek bir ziyaretçiye ait kayıt tutulmuyor.

---

## 2. Katman A — onay gerektirmeyen sunucu sayaçları

### Ne yapılıyor

Sunucu, kendisine gelen her isteği zaten görüyor. Yapılan tek şey bu
istekleri **saymak** ve gün sonunda toplulaştırılmış sayaçları kaydetmek.

| Sayılan | Örnek değer | Kaydedilen |
|---|---|---|
| Sayfa adresi | `/portfoy` | rota + sayaç |
| Yönlendiren | `instagram.com` | **yalnızca alan adı** + sayaç |
| Cihaz sınıfı | mobil / masaüstü | iki kova + sayaç |
| Ülke | `TR` | ülke kodu + sayaç |
| Yanıt süresi | 120 ms | rota başına toplam ve en yavaş |
| Hata | 500 | rota başına sayaç |
| Kampanya etiketi | `utm_source=instagram` | etiket + sayaç |

### Ne YAPILMIYOR — ve bu koda gömülü

- **IP adresi okunmuyor.** Kodda IP okuyan bir çağrı *yok*; testle
  denetleniyor (`src/lib/olcum/olcum.test.ts`).
- **Çerez yazılmıyor.** Bu katman hiçbir çerez oluşturmuyor.
- **Oturum/ziyaretçi kimliği üretilmiyor.** Rastgele değer, karma ya da
  sayaç yok.
- **Tarayıcı parmak izi alınmıyor.** `User-Agent` saklanmıyor; yalnızca
  "mobil mi masaüstü mü" sorusuna çevrilip atılıyor.
- **Yönlendirenin tam adresi saklanmıyor.** Yalnızca alan adı. Gerekçe:
  bir forum ya da özel mesajlaşma bağlantısındaki tam URL tek bir kişiyi
  gösterebilir; alan adı aynı kararı aldırır, kimseyi işaret etmez.
- **Aynı ziyaretçinin sayfa dizisi izlenmiyor.** Bu katmanda ziyaretçileri
  birbirinden ayırt edecek hiçbir bilgi yok.
- **Arama kutusuna yazılan metin kaydedilmiyor.**

### Neden onay gerekmediği kanaatindeyiz

İşlenen bir kişisel veri bulunmuyor: kaydedilen her satır bir güne ait
toplam sayıdır, bir kişiye ait değildir. Ülke kodu, cihaz sınıfı ve
yönlendiren alan adı tek başına ya da birlikte belirli bir kişiyi
belirlenebilir kılmıyor.

> ⚠️ **Avukata soru:** Bu değerlendirme teknik gerçeğe dayanıyor. Kurul
> uygulamasında "toplulaştırılmış sunucu sayacı" için ayrıca bir bilgilendirme
> yükümlülüğü doğuyorsa, aydınlatma metninde bunun nasıl anlatılacağını
> belirtmenizi rica ederiz.

---

## 3. Katman B — yalnızca açık rıza ile

### Koşul

Ziyaretçi çerez bandında **analitik** kategorisine onay vermedikçe:

1. Ölçüm bileşeni sayfada **hiç çalışmıyor** — sunucu onu render etmiyor;
   olay dinleyicisi takılmıyor, tek bir istek atılmıyor, ölçüm işlevi
   tarayıcıda tanımlı bile olmuyor.

   > ⚠️ **Dürüstlük notu:** modülün *baytları* paylaşılan bir JavaScript
   > parçası içinde yine de inebiliyor (ölçülen: 0,85 kB sıkıştırılmış).
   > Ölçüldü ve doğrulandı; kod **çalışmıyor**, veri **üretilmiyor**.
   > İnen bayt bir işlem değildir; belirleyici olan davranıştır.
2. Sunucudaki ölçüm ucu, onay çerezi olmayan isteklerden gelen olayları
   **saymıyor**.

İki kapı da bağımsız çalışıyor ve ikisi de testle denetleniyor. "Banner
göster ama betiği yine de yükle" yaklaşımı bilinçli olarak reddedildi.

### Ne ölçülüyor

- Etkileşim olayları: WhatsApp/telefon tıklaması, form gönderimi,
  değerleme sonucunun görüntülenmesi, filtre kullanımı, ilan kartına
  tıklama, sonuçsuz arama, harita katmanı, slider gezinmesi
- Kaydırma derinliği — **bant olarak** (%25 / %50 / %75 / %100)
- İlan sayfasında 60 saniyeden uzun kalma — **tek bir işaret**, süre değil
- Değerleme formunda hangi alana kadar doldurulduğu
- Aranan fiyat aralığı — **bant olarak** (0–1 mn, 1–2 mn, …), tam değer
  değil

### Bu katmanda da yapılmayanlar

- **Oturum kimliği sunucuya gönderilmiyor.** Bir olayın oturum başına bir
  kez sayılması gerektiğinde tekilleştirme **tarayıcıda** (`sessionStorage`)
  yapılıyor; sunucuya yalnızca "bu gerçekleşti" bilgisi gidiyor. Böylece
  veritabanında birleştirilebilecek bir kimlik hiç oluşmuyor.
- **Serbest metin gönderilmiyor.** Olayın "ayrıntı" alanı 40 karakterle ve
  bir karakter kümesiyle sınırlı; arama sorgusu ya da form içeriği
  yapısal olarak geçemiyor.
- **Isı haritası ve oturum kaydı (session replay) YOK.** Bilinçli karar:
  ağır ve bu ölçekte gereksiz.

### Core Web Vitals — sayfa hızı alan verisi

**Ne ölçülüyor:** ziyaretçinin tarayıcısında sayfanın ne kadar hızlı
boyandığı (LCP), düzenin ne kadar kaydığı (CLS) ve etkileşime ne kadar geç
yanıt verildiği (INP). Üç sayı, sayfa başına.

**Neden Katman B:** ölçüm bir tarayıcı betiği gerektiriyor. Ölçülen şeyin
teknik bir zamanlama olması kural 8'i gevşetmiyor — kural betiğin niteliğine
değil **varlığına** bakıyor. Onay yoksa `web-vitals` kütüphanesi hiç içe
aktarılmıyor.

**⚠️ HAM DEĞER SAKLANMIYOR.** "LCP = 2.431 ms" tek bir ziyarete ait bir
kayıttır ve cihaz + zamanla birleştiğinde tek bir ziyaretçiyi işaret
edebilir. Değer sunucuda bir **kovaya** düşürülüp atılıyor; veritabanına
giden şey "bugün mobilde LCP'si 2–2,5 sn arasında olan 14 ölçüm oldu" —
kimseye ait olmayan bir sayı.

**⚠️ ROTA GÖNDERİLMİYOR.** Metrik + rota + cihaz + zaman birleşimi, az
ziyaretçili bir sayfada tek bir kişiyi işaret edebilirdi. Yalnızca site
geneli dağılım tutuluyor, cihaz sınıfı kırılımıyla.

**⚠️ Örneklem onay verenlerle sınırlı ve bu panelde yazıyor.** Onay
vermeyen ziyaretçilerin cihazları sistematik olarak farklı olabilir;
sapmayı gizlemek ölçümün kendisinden zararlı olurdu.

> ⚠️ **Avukata not:** Bu ölçüm ziyaretçi hakkında bir şey söylemiyor,
> **site hakkında** bir şey söylüyor. Yine de tarayıcıda çalışan bir betik
> olduğu için analitik onayına bağlandı. Aydınlatma metninde "sayfa
> performansının ölçülmesi" ayrı bir madde olarak mı yazılmalı, yoksa
> analitik başlığı altında mı kalmalı — kararınızı rica ederiz.

---

## 4. Saklama süreleri

| Veri | Süre | Gerekçe |
|---|---|---|
| Olay ayrıntısı (hangi filtre, hangi alan, hangi bant) | **90 gün** | Sonrasında bakım göreviyle otomatik siliniyor |
| Toplulaştırılmış günlük sayaçlar (sayfa, kaynak, cihaz, ülke) | Süresiz | Kişisel veri değil; yıllar arası karşılaştırma için gerekli |
| Core Web Vitals kova sayaçları | Süresiz | Kişisel veri değil; ham değer hiç oluşmuyor, yalnızca histogram |

Silme işi otomatik: `olcum-ayrinti-sil` bakım görevi her gece çalışıyor.

> ⚠️ **Not:** Bu silme bir KVKK zorunluluğu değil, **verilen sözün
> tutulması**. Silinen kayıtlar da kişisel veri değil — gün bazında
> toplanmış sayaçlar. 90 gün, aydınlatma metninde taahhüt edildiği için
> uygulanıyor. Metinde farklı bir süre yazılacaksa koddaki değer de
> güncellenmeli (`OLCUM_AYRINTI_GUN`).

---

## 5. Veri nereye gidiyor

**Hiçbir yere.** Ölçüm tamamen kendi sunucumuzda, kendi veritabanımızda.

- Üçüncü taraf analitik servisi **yok** (Google Analytics vb. eklenmedi).
- Yurt dışına veri aktarımı **yok**.
- Mevcut Umami kurulumu ayrı ve zaten onaya bağlı çalışıyor; bu sistem onu
  değiştirmiyor.

> ⚠️ Karşılaştırma için: sitedeki **AI doğal dil arama** özelliği yurt
> dışına veri aktarımı içerdiği için kapalı tutuluyor
> (`docs/AI-ARAMA-KVKK-NOTU.md`). Ölçüm sisteminde böyle bir aktarım yok.

---

## 6. Dil hakkında — önemli

Bu sistem **profilleme yapmıyor**. "Potansiyel müşteri tespiti" gibi bir
ifade, tek tek kişilerin izlenip puanlandığı izlenimi verir ve yaptığımız
şey bu değildir.

Yapılan: **toplulaştırılmış davranış analizi.** "Bu hafta 3 kişi WhatsApp'a
bastı" biliniyor; *kimlerin* bastığı bilinmiyor ve bilinemez.

Panelin kendi dili de bu ayrımı koruyacak şekilde yazıldı.

> ⚠️ **Avukata not:** Aydınlatma metninde de bu ayrımın korunmasını rica
> ederiz. "Ziyaretçi davranışlarınız analiz edilir" ile "profiliniz
> çıkarılır" arasındaki fark, burada teknik olarak gerçek bir farktır.

---

## 7. Aydınlatma metnine girmesi gereken başlıklar (öneri)

Avukatın değerlendirmesine sunulan taslak başlıklar:

1. Sitede, ziyaret sayılarının **toplulaştırılmış** olarak ölçüldüğü;
   IP adresinin saklanmadığı, çerez kullanılmadığı
2. Analitik çerez onayı verilmesi hâlinde ek olarak **etkileşim
   ölçümü** yapıldığı ve tam olarak nelerin ölçüldüğü
3. Ölçümün **yalnızca kendi sunucumuzda** tutulduğu, üçüncü tarafa
   aktarılmadığı, yurt dışına çıkmadığı
4. Ayrıntı düzeyindeki kayıtların **90 gün** sonra silindiği
5. Onayın her zaman geri alınabileceği ve geri alındığında Katman B
   ölçümünün **tamamen** duracağı
6. Ölçümün amacı: hizmet kalitesini ve içeriğin faydasını değerlendirmek —
   kişiye özel profil çıkarmak değil

---

## 8. Teknik dayanak — nerede ne var

| Konu | Dosya |
|---|---|
| Katman A sayacı (IP/çerez/kimlik yok) | `src/proxy.ts` |
| Kimliksizleştirme kuralları | `src/lib/olcum/kimliksizlestirme.ts` |
| Bellek tamponu (istek başına yazma yok) | `src/lib/olcum/tampon.ts` |
| Katman B onay kapısı | `src/components/olcum/KatmanB.tsx` |
| Olay ucu (sunucu tarafı onay denetimi) | `src/app/api/olcum/olay/route.ts` |
| Veri şeması (kişisel alan içermiyor) | `src/collections/GozlemGunluk.ts` |
| 90 gün temizliği | `src/lib/bakim/gorevler.ts` |
| Kararların testi | `src/lib/olcum/olcum.test.ts` |

⚠️ Bu kararların çoğu **testle** korunuyor: biri IP eklemeye kalkarsa,
oturum kimliği üretmeye kalkarsa ya da onay kapısını kaldırırsa test
kırılır. Yani belge ile kod arasındaki tutarlılık iyi niyete değil, kapıya
bağlı.
