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
| Giriş sayfası | `/portfoy` | rota + sayaç (bkz. aşağıdaki not) |
| Saat | 21 | 0–23 kovası + sayaç (yerel saat) |
| Tarayıcı ailesi | Chrome | **sürümsüz** altı kova + sayaç |
| Şehir | `Çorlu` | şehir adı + sayaç (**k-anonim**, 90 gün) |

> ⚠️ **Giriş sayfası oturum kimliği olmadan ölçülüyor.** Olağan yöntem bir
> oturum çerezi yazıp ilk isteği işaretlemektir; yapılmıyor. Kullanılan
> işaret isteğin kendi içinde zaten bulunan bilgi: **yönlendiren bizden mi
> geliyor?** Değilse o istek bir giriştir. Yaklaşıklığın bedeli panelde de
> yazılı: yönlendiren başlığını göndermeyen tarayıcı ayarları, site içi bir
> geçişi giriş gibi gösterebilir — yani sayı olduğundan büyük olabilir.

> ⚠️ **Şehir, ülkeden farklı bir risk taşıyor** ve iki ayrı korumaya tabi:
> 1. **Kaydetmede:** değer harf/boşluk dışındaki her şeyden arındırılıyor ve
>    40 karaktere kırpılıyor — sahte bir `CF-IPCity` başlığıyla veritabanına
>    serbest metin yazdırılamasın.
> 2. **Gösterimde:** k-anonimlik eşiği (k=5). Eşiğin altında kalan şehirler
>    tek tek gösterilmiyor, "Diğer" satırında toplanıyor. Toplam sayı doğru
>    kalıyor, ayrıntı kayboluyor.
> 3. **Saklamada:** şehir kırılımı 90 gün sonra siliniyor (ülke silinmiyor).
>
> Gerekçe: "Bu hafta Çerkezköy'den 1 ziyaretçi" cümlesi küçük bir yerleşimde
> "o kişi" demektir — özellikle işletme sahibi o kişiyi tanıyorsa.

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

#### Kitle ölçümleri (27 Ağustos 2026'da eklendi)

| Ölçülen | Nasıl kaydediliyor | Neden böyle |
|---|---|---|
| Çıkış sayfası | rota + sayaç | Sekme kapanırken bir kez bildiriliyor |
| Sayfa yolu | **en fazla üç adımlık dizi dizgesi** + sayaç | Aşağıdaki nota bakın |
| Oturum derinliği | **bant** (1 / 2-3 / 4-6 / 7+) | Ham sayı ayırt eder, bant etmez |
| Ekran genişliği | **bant** (5 kova) | Tam çözünürlük parmak izinin parçasıdır |

> ⚠️ **Sayfa yolu bir ziyaretçi izi DEĞİL, bir dizi sayacıdır.** Gezinme
> sırası ziyaretçinin kendi sekmesinde (`sessionStorage`) tutuluyor; sunucuya
> giden tek şey en fazla üç adımlık bir **dizge** (`"/ > /portfoy >
> /portfoy/ornek-ilan"`) ve karşılığında artan bir sayaç. Kim olduğu, ne
> zaman geldiği, kaç kez geldiği bilgisi yok.
>
> Üç adım sınırı keyfi değil: dizi uzadıkça olası kombinasyon sayısı çarpım
> hızıyla artar ve yeterince uzun bir dizi tek bir ziyarete ait olacak kadar
> seyrekleşir — o noktada "toplulaştırılmış" olmaktan çıkar. Ayrıca raporda
> **tek kez görülen diziler listelenmiyor** (k≥2); onlar "Seyrek diziler"
> satırında toplanıyor.

> ⚠️ **"Oturum" burada bir sekme demek.** Sunucuda hiçbir oturum kaydı
> tutulmuyor; sayfa sayısı ziyaretçinin kendi tarayıcısında sayılıyor ve
> sunucuya yalnızca bandı gönderiliyor. Hemen çıkma oranı da ayrı bir sayaç
> değil: "1" bandının payı.

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
| **Şehir kırılımı** | **90 gün** | Ülkeden farklı olarak tek kişiyi işaret edebilir; raporun k-anonimlik eşiği gösterimi kısıtlıyor, saklamayı değil |
| Toplulaştırılmış günlük sayaçlar (sayfa, kaynak, cihaz, ülke, giriş sayfası, saat, tarayıcı) | Süresiz | Kişisel veri değil; yıllar arası karşılaştırma için gerekli |
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

### Google Search Console — tek istisna ve neden istisna sayılmadığı

Panelde bir **arama kelimeleri** bölümü var ve verisi Google'dan geliyor.
Bu, yukarıdaki "hiçbir yere" ifadesinin istisnası **değil**, çünkü akış ters
yönde:

- Ziyaretçiden Google'a hiçbir şey **gönderilmiyor**. Bu bölüm bir izleme
  betiği değil; sitede hiçbir kod çalışmıyor, hiçbir çerez yazılmıyor.
- Google'ın **bize** verdiği, kendi mülkümüz hakkındaki toplu rapor
  okunuyor. Google o raporu zaten kendi k-anonimlik eşiğiyle veriyor:
  eşiğin altındaki sorguları hiç göstermiyor.
- Ziyaretçinin arama kutusuna ne yazdığını biz zaten göremiyoruz —
  yönlendiren başlığı yıllardır arama terimini taşımıyor.

Yani burada yeni bir kişisel veri işleme yok; kendi hesabımızdan kendi
raporumuzu okuyoruz. Bağlantı kurulmadığında bölüm **sayı uydurmuyor**,
"yapılandırılmadı" yazıyor.

---

## 5b. ⚠️ SINIR: ZİYARETÇİ BAZLI TAKİP — AYRI BİR KARAR

Bu bölüm bilinçli olarak eklendi. Yukarıda anlatılan sistemin tamamı
**toplulaştırılmış**; hiçbir yerde "bir ziyaretçi" diye bir kayıt yok. Bir
sonraki adım olarak sıkça istenen şeyler ise o çizginin **öteki tarafında**
duruyor ve **ayrı bir hukuki karar** gerektiriyor.

### Bu tarafta olan (bugün yapılan)

| Soru | Cevaplanıyor mu | Nasıl |
|---|---|---|
| Hangi sayfalar geziliyor? | ✔ | Gün başına sayaç |
| Ziyaretçiler nereden giriyor, nerede terk ediyor? | ✔ | Rota sayacı |
| Hangi sıra ile geziliyor? | ✔ | En sık görülen 3 adımlık **diziler** (k≥2) |
| Hangi sayfa lead getiriyor? | ✔ | Lead başına görüntüleme |
| Kaç sayfa geziliyor, hemen çıkma oranı ne? | ✔ | **Bant** dağılımı |

### Öteki tarafta olan (bugün YAPILMAYAN)

| İstenebilecek şey | Neden bugün yok |
|---|---|
| "Bu ziyaretçi önce X'e, sonra Y'ye baktı, sonra aradı" | Ziyaretçileri birbirinden ayırt eden bir kimlik gerektirir |
| Tekil ziyaretçi / yeni-dönen ayrımı | Kalıcı çerez ya da parmak izi gerektirir |
| IP saklama, IP'den şirket/kurum çözümleme | Doğrudan kişisel veri işleme |
| Oturum kaydı, ısı haritası, fare izi | Ekran içeriğiyle birlikte özel nitelikli veri bile taşıyabilir |
| Lead'i gezinme geçmişiyle eşleştirme | Kimliği bilinen kişiyle davranış verisini birleştirmek |

### ⚠️ Avukata sorulacaklar — bu maddeler karar bekliyor

1. **Ziyaretçi bazlı takip istenirse hukuki dayanak ne olmalı?** Açık rıza
   yeterli mi, yoksa meşru menfaat değerlendirmesi (LIA) de yazılmalı mı?
2. **Kalıcı bir ziyaretçi kimliği (çerez ya da yerel depolama) kişisel veri
   sayılır mı** — kendisi rastgele bir sayı olsa bile? Bizim kanaatimiz
   "sayılır"; teyit gerekiyor.
3. **IP adresi hiç saklanmadan** ziyaretçi ayrımı yapmanın kabul edilebilir
   bir yolu var mı (ör. günlük değişen, tuzlanmış ve geri döndürülemez bir
   türev)? Böyle bir türev kişisel veri sayılır mı?
4. **Lead formu ile gezinme verisini eşleştirmek** (kimliği bilinen kişinin
   hangi sayfalara baktığını görmek) hangi koşullarda mümkün? Aydınlatma
   metninde ayrıca belirtilmesi gerekir mi?
5. **Şehir seviyesi coğrafi kırılım** için uyguladığımız k=5 eşiği yeterli
   mi? Küçük yerleşimlerde daha yüksek bir eşik mi gerekir?
6. **Saklama süresi:** bugün olay ayrıntısı ve şehir kırılımı 90 gün. Bu
   süre aydınlatma metnine nasıl yazılmalı, uzatılabilir mi?
7. **Google Search Console** verisini panelde göstermek (yukarıdaki 5.
   bölüm) ayrı bir aydınlatma gerektirir mi? Kanaatimiz "gerektirmez",
   teyit gerekiyor.

> ⚠️ **Bu maddelerden herhangi biri "evet" cevabı alana kadar kodda
> karşılığı yazılmayacak.** Bugünkü şema ziyaretçi bazlı takibi
> *yapısal olarak* imkânsız kılıyor: `gozlem-gunluk` koleksiyonunda
> ziyaretçiye ait bir satır yok ve testler böyle bir alanın eklenmesini
> engelliyor (`src/lib/olcum/olcum.test.ts`). O çizgiyi geçmek bir ayar
> değişikliği değil, şema değişikliğidir — ve bilerek öyle tasarlandı.

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
