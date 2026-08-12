# FRONTEND YENİDEN TASARIM PROMPTU — aslihangyd.com

Aşağıdaki kod bloğunun tamamını agent'a **tek seferde** verin.

---

```
Frontend'i sıfırdan yeniden tasarlıyoruz. Mevcut tasarım sistemi (lacivert +
bakır) TAMAMEN DEĞİŞİYOR. Bu bir iyileştirme değil, yön değişikliği.

⚠️ NE DEĞİŞMEZ — bunlara dokunma
Tasarım değişiyor, iş mantığı DEĞİŞMİYOR. Aşağıdakiler yeni tasarıma
taşınacak, silinmeyecek, sadeleştirilmeyecek:
- EİDS "Doğrulanmış İlan" rozeti ve yayın engeli
- Kartlarda kira çarpanı ve m² fiyatı gösterimi
- Gizli portföy (kilitli kartlar, erişim talebi)
- Değerleme sihirbazı ve duvarsızlık kuralı
- Gözlem sayısı (n = 23) gösterimi
- Yatırım tavsiyesi feragat ibareleri
- KVKK çerez onay akışı
- Boş durum tasarımları
- Yetki belgesi numarası altbilgide
Bunlar bizim ayrıştırıcımız. Görünümleri değişecek, varlıkları değişmeyecek.

════════════════════════════════════════════════════════
1. YENİ RENK PALETİ
════════════════════════════════════════════════════════

Lacivert      #0F2747   ana renk, header, menü, başlıklar
Adaçayı       #4F7C6A   CTA, başarı, yatırım vurgusu
Kırık beyaz   #F7F6F2   ana arka plan
Açık gri      #E9ECEB   kartlar, bölüm ayrımları
Soft gold     #C9A96E   premium detaylar
Antrasit      #20252B   metinler

⚠️ KONTRAST — ölçüldü, pazarlığa kapalı

ADAÇAYI #4F7C6A
  ✅ Buton ZEMİNİ + beyaz metin  → 4.75:1, AA geçer
  ❌ Kırık beyaz üzerinde METİN → 4.41:1, AA GEÇMEZ
  → Metin olarak lazımsa koyulaştırılmış bir varyant üret (#3E6354 civarı)
    ve token'a "adacayi-metin" adıyla ekle. Ölç, 4.5'i geçtiğini doğrula.

SOFT GOLD #C9A96E
  ✅ Zemin + antrasit metin → 6.8:1, geçer
  ✅ İnce çizgi, ayraç, rozet kenarı, ikon
  ❌ Kırık beyaz üzerinde METİN → 2.23:1, ağır ihlal
  → Gold ASLA metin rengi olmayacak. Dekoratif rol.

Bu paletten türetilmiş tam skalayı sen üret (50-900), ama ana değerler
yukarıdakiler olsun. Mevcut kontrast testi tüm çiftleri denetlemeye
devam etsin.

⚠️ Karanlık tema: mevcut kurulumda var. Bu paletle yeniden türet —
lacivert zemin + kırık beyaz metin ekseni. Kontrast testi iki temada da
geçmeli.

════════════════════════════════════════════════════════
2. KARAKTER — "büyük şirket" hissi
════════════════════════════════════════════════════════

Hedef: ziyaretçi siteye girdiğinde köklü, kurumsal, güvenilir bir yapıyla
karşılaştığını hissetsin. Tek kişilik bir ofis değil, bir kurum.

Bunu şunlarla kuruyoruz:
- Tam genişlik bölümler, cömert dikey ritim (bölüm arası 96-128px masaüstü)
- Her bölümün üstünde küçük "eyebrow" etiketi (12px, harf aralığı geniş,
  büyük harf, adaçayı) + altında büyük başlık
- Güven şeridi: rakamlarla (portföy adedi, mahalle sayısı, işlem hacmi)
- Yapılandırılmış ızgaralar, serbest yerleşim yok
- Yayın hissi veren tipografi hiyerarşisi — uygulama değil, kurum sitesi
- Gold ince çizgiler bölüm ayraçlarında; nadir, dekoratif

Kaçınılacak: emlak sitelerinin kırmızı "ACİL" dili, yanıp sönen rozet,
ağır gradyan, stok fotoğraf estetiği, kalabalık kart.

════════════════════════════════════════════════════════
3. TİPOGRAFİ
════════════════════════════════════════════════════════

⚠️ Mevcut font altyapısını KORU. Inter + Source Serif 4, Türkçe alt küme,
kendi barındırma. 226 kB → 106 kB kazancı vardı, geri verme.

Değişecek: ölçek ve hiyerarşi.
- Sayfa başlığı: 40-48px (masaüstü) / 30px (mobil), Source Serif, 500
- Bölüm başlığı: 30-34px, Source Serif, 500
- Eyebrow: 12px, Inter, 500, letter-spacing 0.08em, BÜYÜK HARF, adaçayı
- Gövde: 16px, Inter, 400, satır yüksekliği 1.7
- Büyük rakam: 32-40px, Inter, 500, tabular-nums, letter-spacing -0.02em

⚠️ TÜM rakamlarda tabular-nums. İstisna yok.
⚠️ font-weight 600/700 kullanma. 400 ve 500 yeter.

════════════════════════════════════════════════════════
4. HEADER — kurumsal, yapışkan
════════════════════════════════════════════════════════

Üst şerit (opsiyonel, ince): telefon + e-posta + sosyal ikonlar, lacivert
zemin, 12px.

Ana header: kırık beyaz zemin, kaydırınca hafif gölge ile yapışkan.
  [Logo]    Portföy  Mahalleler  Araçlar  Endeks  Hakkımızda  İletişim
                                              [Evimi Değerlendir] ← adaçayı buton

- "Portföy" üzerine gelince mega menü: Satılık / Kiralık / Ticari /
  Gizli Portföy — her biri kısa açıklamayla
- "Araçlar" mega menü: 4 hesaplayıcı + mahalle testi + simülatör
- Mobilde: hamburger → tam ekran menü, büyük dokunma hedefleri
- Aktif sayfa alt çizgi ile işaretli (gold, 2px)

════════════════════════════════════════════════════════
5. ANA SAYFA — bölüm sırası
════════════════════════════════════════════════════════

1. HERO + ARAMA WIDGET'I ⭐ sayfanın merkezi
   Tam genişlik görsel (Çorlu havadan), üzerinde lacivert overlay (%55).
   Ortada beyaz metin: başlık + tek satır alt başlık.
   Altında yüzen arama kartı (kırık beyaz, gölgeli, -60px offset):

   [ Satılık ] [ Kiralık ] [ Ticari ]     ← sekmeler
   ┌──────────┬──────────┬───────────┬──────────┐
   │ Mahalle ▾│ Tür ▾    │ Fiyat ▾   │ [ARA] 🔍 │
   └──────────┴──────────┴───────────┴──────────┘
   Altında: "veya haritada keşfedin →"

   ⚠️ Hero görseli LCP ögesi olacak. AVIF, mobil ≤80 kB, priority,
   sabit en-boy oranı. CLS 0 korunacak.

2. GÜVEN ŞERİDİ
   4 sütun, gold ince çizgilerle ayrılmış, açık gri zemin:
   Aktif portföy · Mahalle sayısı · Ortalama işlem süresi · Yetki belgesi
   Rakamlar büyük ve tabular. Veri yoksa boş durum.

3. ÜÇ YOL AYRIMI
   "Yatırım yapmak istiyorum" / "Ev arıyorum" / "Evimi değerlendir"
   Üç büyük kart, ikonlu, hover'da hafif yükselme.
   Değerleme kartı adaçayı vurguyla biraz baskın.

4. ÖNE ÇIKAN PORTFÖY
   Yatay kaydırma DEĞİL — 3 sütunlu ızgara (mobilde 1).
   "Tümünü gör →" bağlantısı sağ üstte.
   ⚠️ Kart tasarımı bölüm 6'da.

5. GİZLİ PORTFÖY TEASER
   Lacivert zemin, beyaz metin. Kilitli kartlar (doku, bulanık değil).
   "Yayınlanmayan 14 taşınmaz" + "Erişim talep et" (adaçayı buton).

6. ÇORLU KONUT ENDEKSİ ŞERİDİ
   Tek satır: endeks değeri, aylık ve yıllık değişim, mini sparkline.
   Gold ince üst/alt çizgi. "Metodoloji →"
   Veri yoksa: boş durum, "hazırlanıyor" mesajı.

7. MAHALLELER
   6 mahalle kartı, 3x2 ızgara. Her kartta: görsel, ad, yatırım skoru,
   ort. m², kira çarpanı.

8. YATIRIMCI ARAÇLARI
   4 hesaplayıcı, ikonlu kartlar, açık gri zemin.

9. ASLIHAN
   İki sütun: fotoğraf | metin + yetki belgesi no + CTA.

10. SON YAZILAR / REHBER (blog varsa)

11. ALT CTA BANDI
    Lacivert zemin, "Çorlu'da doğru yatırımı birlikte bulalım" + iki buton.

════════════════════════════════════════════════════════
6. İLAN KARTI — yeniden tasarım
════════════════════════════════════════════════════════

┌────────────────────────────────┐
│ [görsel 4:3]                   │
│  ↖ Doğrulanmış rozeti (beyaz   │
│    zemin, adaçayı onay ikonu)  │
│  ↘ "12 fotoğraf" / "360° tur"  │
├────────────────────────────────┤
│ 4.300.000 ₺        ← 22px, tabular
│ 31.852 ₺/m²        ← 12px, gri
│                                │
│ Asansörlü, otoparklı ara kat   │ ← cümle düzeni, 2 satır
│ Muhittin · Çorlu               │
│                                │
│ 3+1 · 135 m² · 4. kat          │ ← etiketler
├────────────────────────────────┤
│ Kira çarpanı        14,8 yıl   │ ← gold ince üst çizgi
└────────────────────────────────┘

⚠️ Kira çarpanı satırı KALIYOR. Türkiye'de kimse yapmıyor, bizim
ayrıştırıcımız. Gold ince çizgiyle ayrılsın, öne çıksın.
⚠️ Başlık BÜYÜK HARF olmayacak. "SATILIK 4+1 DAİRE !!" değil.

Kilitli varyant: görsel yerine doku, fiyat bandı, "Erişim talep et →"

════════════════════════════════════════════════════════
7. İLAN LİSTELEME SAYFASI ⭐ en çok emek buraya
════════════════════════════════════════════════════════

DÜZEN (masaüstü)
┌─────────────┬──────────────────────────────────┐
│ FİLTRE      │ 47 sonuç      [Sırala ▾][Harita]│
│ (yapışkan)  │ ┌──────┬──────┬──────┐          │
│ 280px       │ │ kart │ kart │ kart │          │
│             │ ├──────┼──────┼──────┤          │
│             │ │ kart │ kart │ kart │          │
└─────────────┴──────────────────────────────────┘

FİLTRE PANELİ (sol, yapışkan, kendi içinde kaydırılır)
- Aktif filtreler en üstte, kaldırılabilir çipler olarak
- İşlem türü: Satılık / Kiralık (segment kontrol)
- Kategori: Konut / İşyeri / Arsa / Depo
- Mahalle: çoklu seçim, arama kutulu
- Fiyat aralığı: çift uçlu kaydırıcı + manuel giriş
- m² aralığı: aynı
- Oda sayısı: çoklu buton grubu (1+1, 2+1, 3+1, 4+1, 5+)
- Bina yaşı, kat, ısınma: açılır
- ⭐ YATIRIM FİLTRELERİ (bizim farkımız, ayrı bir grup):
    Kira çarpanı: en fazla [__] yıl
    Brüt getiri: en az [__] %
    Sanayiye mesafe: en fazla [__] dk
- "Filtreleri temizle"
- Mobilde: alt sheet olarak açılır, "Uygula (47)" butonu

SONUÇ ALANI
- Üstte sonuç sayısı + sıralama (fiyat, m² fiyatı, kira çarpanı, yenilik)
- Izgara / Liste / Harita görünüm anahtarı
- Harita görünümü: sol harita, sağ kart listesi, senkron
- Sayfalama DEĞİL, "Daha fazla göster" butonu (SEO için ilk 24 SSR)
- Boş durum: filtreleri gevşetme önerisi + benzer sonuçlar

⚠️ Filtre durumu URL'de tutulacak (paylaşılabilir link).
⚠️ İlk 24 sonuç sunucuda render edilecek — SEO motoru bu sayfa.

════════════════════════════════════════════════════════
8. İLAN DETAY SAYFASI
════════════════════════════════════════════════════════

- Tam genişlik galeri (büyük görsel + küçük şerit), lightbox
- Sol sütun (2/3): başlık, fiyat, nitelikler ızgarası, açıklama,
  konum haritası, yakınlıklar, benzer ilanlar
- Sağ sütun (1/3, yapışkan): ⭐ YATIRIM KARTI
    Tahmini kira · Kira çarpanı · Brüt getiri · Amortisman
    Gold çerçeve, açık gri zemin
    Altında: gömülü kira getirisi hesaplayıcı
    Altında: [WhatsApp] [Ara] [Randevu] butonları
    En altta: Doğrulanmış rozeti + EİDS numarası
- Mobilde: yapışkan alt çubuk (WhatsApp + Ara)

════════════════════════════════════════════════════════
9. ALTBİLGİ — kurumsal, geniş
════════════════════════════════════════════════════════

Lacivert zemin, kırık beyaz metin. Üstünde gold ince çizgi.

Üst bant: bülten aboneliği (tek satır, e-posta + buton, KVKK onayı)

Dört sütun: Kurumsal · Portföy · Faydalı Bağlantılar · Hukuksal
Beşinci blok: iletişim + sosyal + harita mini görsel

Alt bant: yetki belgesi no · telif · feragat metni (küçük punto)

════════════════════════════════════════════════════════
10. UYGULAMA SIRASI
════════════════════════════════════════════════════════

Aşama 1: Palet + tipografi token'ları, kontrast testleri, /stil-rehberi
Aşama 2: Header, altbilgi, bölüm bileşenleri (eyebrow, güven şeridi)
Aşama 3: İlan kartı + ana sayfa
Aşama 4: Listeleme sayfası + filtre paneli ⭐ en çok emek
Aşama 5: İlan detayı + yatırım kartı
Aşama 6: Kalan sayfaların uyarlanması (mahalle, araçlar, değerleme...)

Her aşama kendi branch'inde, PR aç, sonrakine geç.

════════════════════════════════════════════════════════
11. KAPI — her aşama sonunda
════════════════════════════════════════════════════════

pnpm typecheck && pnpm lint && pnpm test && pnpm build → dördü de temiz

Kontrast: tüm çiftler AA (4.5:1), iki temada da
Lighthouse: mobil ve masaüstü, 3 koşum medyanı
  Performans ≥90 · Erişilebilirlik 100 · SEO 100 · CLS 0
Bundle: ana sayfa JS ≤220 kB gzip

⚠️ Tasarım güzelliği performans hedefini bozamaz. Hero görseli, mega menü,
filtre paneli — hepsi bütçe içinde kalacak. Bozan öğeyi değiştir ve bildir.

⚠️ Mobilde manuel kontrol edemiyorsun, ben yapacağım. Dokunma hedefleri
44px, tek elle kullanılabilirlik, alt sheet davranışları — bunları
özellikle dikkatli kur.

Aşama 1'den başla. Palet skalasını üret, kontrast testlerini koştur,
sonuçları bana göster. Adaçayı ve gold için yukarıdaki kısıtlara
uyduğunu kanıtla.
```

---

## Notlar

**Neden yatay kaydırma yerine ızgara.** Daha önce yatay sıraların lazy
yüklemeyi etkisiz kıldığını ölçmüştük — `loading="lazy"` sadece dikey
yakınlığa bakıyor. Izgara düzeninde lazy gerçekten çalışır.

**Filtre paneline neden en çok emek.** "İlan listeleme deneyimi" istediniz
ve orası dönüşümün olduğu yer. Yatırım filtreleri (kira çarpanı, getiri,
sanayiye mesafe) Türkiye'de hiçbir emlak sitesinde yok — kurumsal görünüm
isterken bu farkı da büyütüyoruz.

**Gold'un rolü.** Metin olarak kullanılamıyor ama ince çizgi olarak
kullanıldığında "premium" hissini tek başına taşıyor. Bölüm ayraçları,
yatırım kartı çerçevesi, kira çarpanı satırının üst çizgisi — üç yerde.
Fazlası ucuzlatır.
