# aslihangyd.com — Bal Küpü Modülleri, Portföy Yönetimi ve Sosyal Medya

Bu doküman `ASLIHANGYD-PROJE-PLANI.md` ve `MASTER-PROMPT.md` dosyalarının ekidir.
Faz 2 ve Faz 4 arasına yerleşir.

---

## BÖLÜM A — Bal Küpü Stratejisinin Mantığı

### A.1 Temel kural: değer önce, iletişim sonra

Türkiye'deki emlak sitelerinin ortak hatası: ziyaretçi bir şey görmeden telefon
ister. Dönüşüm oranı %1'in altında kalır.

Doğru sıra — **kademeli bağlılık (progressive commitment):**

```
1. Ziyaretçi sıfır bilgi verir  →  gerçek bir sonuç alır       (güven)
2. Sonucu derinleştirmek ister  →  e-posta verir               (mikro-taahhüt)
3. Kişiselleştirme ister        →  telefon/WhatsApp verir      (lead)
4. Randevu                      →  yetkilendirme sözleşmesi    (portföy/işlem)
```

Her araç bu dört kademeyi ayrı ayrı destekler. Hiçbir araç 1. adımda
form duvarı koymaz.

### A.2 Bal küpünün yakıtı: sizde olan, rakipte olmayan

Bal küpü ancak **taklit edilemeyen bir değer** sunduğunda çalışır. Sizin
elinizde üç şey olacak:

| Varlık | Kullanıldığı araç |
|---|---|
| Kendi topladığınız zaman serisi fiyat verisi | Değerleme, endeks, simülatör |
| Yayınlamadığınız (off-market) portföy | Gizli Portföy modülü |
| Yerel bağlam bilgisi (hangi sokak, hangi bina) | Mahalle eşleştirme, rapor |

⚠️ **Uyarı:** Araçların çıktısı uydurma olursa bal küpü zehir küpüne döner.
Bir kez yanlış değerleme veren site, o müşteriyi kalıcı kaybeder. Bu yüzden
tüm modüllerde: **dar tahmin yerine geniş aralık**, ve **yöntemin açıklanması.**

### A.3 İlan detayı paylaşmama avantajı

Portföy detaylarını yayınlamak istememeniz bir zayıflık değil — doğru
kurgulanırsa en güçlü kancadır. Rakip emlakçılar portföyünüzü çalamaz,
ziyaretçide merak oluşur, ve iletişim kurmak için gerçek bir sebep doğar.

---

## BÖLÜM B — Bal Küpü Modülleri (öncelik sırasına göre)

### B1. "Evim Ne Eder?" — Anlık Değerleme ⭐ En yüksek öncelik

**Neden:** Hem en çok aranan sorgu, hem portföy edinme motoru. Alıcı değil
**satıcı** getirir — emlak işinde asıl kıt kaynak budur.

**Akış:**
```
Adım 1  Mahalle seç (harita veya liste)
Adım 2  m² gir                     → ekranda canlı bir aralık belirmeye başlar
Adım 3  Oda sayısı, kat, bina yaşı → aralık daralır
Adım 4  Durum (sıfır/iyi/tadilat)  → aralık son halini alır
        ┌──────────────────────────────────────┐
        │  Tahmini değer aralığı               │
        │  4.150.000 – 4.780.000 TL            │
        │  Bu mahallede son 90 günde 23 gözlem │
        │  Güven düzeyi: Orta                  │
        └──────────────────────────────────────┘
        [Detaylı PDF raporu al] → e-posta
        [Aslıhan'dan gerçek değerleme iste] → telefon/WhatsApp
```

**Kritik tasarım kararları:**
- Sonuç **iletişim bilgisi vermeden** görünür. Duvar yok.
- Nokta değer değil **aralık** verilir (±%7–8)
- Veri az olan mahallede "Güven düzeyi: Düşük" yazar ve aralık genişler.
  Dürüstlük burada satıştır.
- Her ekranda: *"Bu tahmin bilgilendirme amaçlıdır; SPK lisanslı
  gayrimenkul değerleme raporu yerine geçmez."*
- Sonuç ekranında mahalle sayfasına, benzer portföye ve kira getirisi
  hesaplayıcısına köprü

**Arka plan:** Basit ve şeffaf bir model kullanın —
`mahalle medyan m² fiyatı × m² × kat katsayısı × yaş katsayısı × durum katsayısı`.
Katsayılar CMS'ten düzenlenebilir olmalı. Makine öğrenmesi gerekmez ve
başlangıçta zararlıdır (açıklanamaz sonuç = güven kaybı).

---

### B2. Gizli Portföy (Off-Market) ⭐ İlan paylaşmama stratejisinin merkezi

**Ekran:**
```
┌─────────────────────────────────────────────────┐
│  YAYINLANMAYAN PORTFÖY                          │
│  Şu anda 14 taşınmaz — hiçbir ilan sitesinde yok│
├─────────────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓  Muhittin Mah. · 3+1 · 135 m²          │
│           4,2 – 4,6 M TL · Kira çarpanı ~17     │
│           🔒 Adres, fotoğraf ve detay kilitli    │
│           [Erişim talep et]                     │
├─────────────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓  Çorlu OSB · Depo · 2.400 m² kapalı    │
│           Fiyat: Görüşmeye açık                 │
│           🔒 [Erişim talep et]                   │
└─────────────────────────────────────────────────┘
```

**Kurallar:**
- Görünen: mahalle, kategori, m² aralığı, fiyat bandı, kira çarpanı
- Kilitli: tam adres, fotoğraflar, kat planı, malik bilgisi
- "Erişim talep et" → kısa form (bütçe, amaç, zaman ufku) → Aslıhan onaylar
  → geçici erişim linki (7 gün geçerli, tek kişiye özel)
- Onay adımı **manuel kalmalı.** Otomatik erişim, portföyü rakibe açar.
- Sayaç ("14 taşınmaz") CMS'ten otomatik gelir, elle güncellenmez

**Neden çalışır:** Kıtlık + merak + ayrıcalık. Ayrıca ciddi olmayan
ziyaretçiyi filtreler; gelen lead kalitesi yüksek olur.

---

### B3. Mahalle Eşleştirme Testi (Quiz)

Form türleri arasında **en yüksek tamamlanma oranına** sahip olan yapı budur.

**7 soru, her biri tek ekran, ilerleme çubuğu:**
1. Amacınız? (oturmak / yatırım / ikisi)
2. Bütçe aralığı?
3. İş yeriniz/gideceğiniz nokta nerede? (harita üzerinde pin)
4. Hanede çocuk var mı? (okul ağırlığı)
5. Öncelik: sessizlik mi, merkeze yakınlık mı?
6. Araç kullanıyor musunuz? (toplu taşıma ağırlığı)
7. Zaman ufku: 0-6 ay / 6-18 ay / araştırıyorum

**Sonuç:**
```
Size en uygun 3 mahalle
1. Şeyhsinan   — %89 uyum   [neden? ▾]
2. Muhittin    — %81 uyum
3. Önerler     — %74 uyum
[Sonucu WhatsApp'a gönder]   [E-postama gönder]
```

"Neden?" açılınca kriter bazlı kırılım gösterilir — kara kutu olmaz.
Sonucu WhatsApp'a gönderme butonu, telefon numarasını **doğal yolla** alır.

