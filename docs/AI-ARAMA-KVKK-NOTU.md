# AI Doğal Dil Arama — Veri Akışı Notu (avukat için)

**Amaç:** Aydınlatma metnine eklenecek maddenin yazılabilmesi için, bu
özelliğin hangi veriyi nereye, ne amaçla gönderdiğini teknik olarak tarif
etmek.

⚠️ **Bu bir hukuki metin DEĞİLDİR.** Aydınlatma metnini, açık rıza metnini
ve çerez politikasını avukat yazacak. Bu belge yalnızca girdi sağlar.

⚠️ **Özellik şu anda KAPALI.** İki koşul birden sağlanmadıkça hiçbir veri
hiçbir yere gitmez:
1. `ANTHROPIC_API_KEY` ortam değişkeni tanımlı olmalı — **şu an tanımlı değil**
2. Payload admin → Ayarlar → Site Bölümleri → "AI doğal dil arama" açık
   olmalı — **varsayılanı kapalı**

Bu belge onaylanıp aydınlatma metni güncellenene kadar özellik açılmamalıdır.

---

## 1. Özellik ne yapıyor?

`/portfoy` sayfasında bir arama kutusu. Ziyaretçi aradığını kendi cümlesiyle
yazıyor:

> "Muhittin'de 5 milyon altı 3+1, getirisi iyi olsun"

Sistem bu cümleyi **filtreye** çeviriyor ve ziyaretçiyi normal filtre
adresine yönlendiriyor:

```
/portfoy?mahalle=muhittin&odaSayisi=3+1&enCokFiyat=5000000&siralama=carpan_artan
```

Sonuçlar **kendi veritabanımızdan** geliyor. Yapay zekâ taşınmaz önermiyor,
fiyat üretmiyor, metin yazmıyor — yalnızca filtre alanlarını dolduruyor.

---

## 2. Hangi veri, nereye gidiyor?

| | |
| --- | --- |
| **Gönderilen veri** | Yalnızca ziyaretçinin arama kutusuna yazdığı metin (en fazla 300 karakter) |
| **Alıcı** | Anthropic, PBC — Claude API |
| **Alıcının bulunduğu ülke** | Amerika Birleşik Devletleri |
| **Aktarım amacı** | Serbest metni, sitenin sahip olduğu filtre alanlarına çevirmek |
| **Hukuki nitelik** | **Yurt dışına veri aktarımı** |
| **Sıklık** | Ziyaretçi "Ara" düğmesine her bastığında bir istek |

### Gönderilmeyenler

Bunların hiçbiri isteğe eklenmiyor:

- IP adresi
- Çerez, oturum kimliği, ziyaretçi kimliği
- Ad, e-posta, telefon
- Konum bilgisi
- Tarayıcı/cihaz bilgisi
- Site içindeki gezinme geçmişi

İstek gövdesinde **yalnızca** ziyaretçinin yazdığı metin ve sistemin kendi
sabit yönergesi (hangi filtre alanlarının bulunduğu, geçerli mahalle
listesi) yer alıyor.

⚠️ Teknik not: aktarım sunucudan sunucuya yapılıyor. Ziyaretçinin tarayıcısı
Anthropic'e doğrudan bağlanmıyor; dolayısıyla Anthropic ziyaretçinin IP
adresini bizden almıyor. Anthropic'in kendi altyapısında bizim sunucumuzun
IP'sini görmesi kaçınılmaz.

---

## 3. Ne saklanıyor?

**Bizim tarafımızda hiçbir şey saklanmıyor.**

- Arama metni veritabanına yazılmıyor.
- Arama metni günlük (log) dosyalarına yazılmıyor.
- Çevrilen filtre de saklanmıyor — yalnızca ziyaretçinin adres çubuğunda
  görünüyor ve o oturumla sınırlı.

Günlüğe yalnızca yapılandırma hataları yazılıyor (örn. "API anahtarı
reddedildi") ve bu kayıtlar ziyaretçinin arama metnini **içermiyor**.

⚠️ Anthropic'in kendi tarafındaki saklama süresi ve politikası bizim
denetimimizde değil; Anthropic'in ticari şartlarına tabidir. Avukatın bu
noktayı ayrıca değerlendirmesi gerekebilir.

---

## 4. Ziyaretçi neyi görüyor?

Arama kutusunun hemen altında, gizlenmeden ve küçültülmeden şu metin
duruyor:

> Yazdığınız cümle, filtreye çevrilmek üzere Anthropic'in sunucularına
> gönderilir. Yalnızca bu metin gider; kimlik, iletişim veya konum bilgisi
> gönderilmez. Sonuçlar bizim veritabanımızdan gelir — yapay zekâ taşınmaz
> önermez, yalnızca filtre kurar.

Avukat bu metnin yeterli olup olmadığını, değiştirilmesi gerekip
gerekmediğini değerlendirmeli.

---

## 5. Avukata sorular

1. Bu aktarım için aydınlatma metnine hangi madde eklenmeli?
2. **Açık rıza gerekiyor mu?** Gerekiyorsa arama kutusu, rıza alınmadan
   çalışmamalı — teknik olarak yapılabilir (çerez onayındaki aynı
   mekanizma kullanılabilir), söylemeniz yeterli.
3. Kutunun altındaki mevcut bilgilendirme metni yeterli mi?
4. Anthropic ile ayrıca bir veri aktarım sözleşmesi / taahhütname gerekir
   mi?
5. VERBİS kaydında bu aktarımın ayrıca beyan edilmesi gerekiyor mu?

---

## 6. Teknik referanslar

| Ne | Nerede |
| --- | --- |
| İstek kuran ve gönderen kod | `src/lib/arama/motor.ts` |
| Modelin üretebileceği tek yapı (şema) | `src/lib/arama/sema.ts` |
| Arama kutusu ve bilgilendirme metni | `src/components/ilan/AkilliArama.tsx` |
| Açma/kapama anahtarı | Payload admin → Ayarlar → Site Bölümleri |

**Karar geldiğinde yapılacaklar:**

1. Avukatın metni Payload admin → Sayfalar → ilgili hukuki sayfaya girilir
2. `.env` → `ANTHROPIC_API_KEY` tanımlanır
3. Site Bölümleri → "AI doğal dil arama" açılır
4. `docs/ILERLEME.md` içindeki duman testi tarifi çalıştırılır

Üçü birden yapılmadan özellik ziyaretçiye görünmez.
