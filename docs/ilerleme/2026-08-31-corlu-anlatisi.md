# 31 Ağustos 2026 — Çorlu Değer Anlatısı: araştırma ve kaynak disiplini

Tüm mahalle sayfalarında görünen ortak bölüm. **Yazılan her cümlenin
kaynağı var; kaynağı bulunamayan hiçbir cümle yazılmadı.**

## Ne bulundu

### Sanayi ve istihdam

| Bilgi | Kaynak |
| --- | --- |
| Çorlu 1 OSB: ~382 ha (net 255 ha), 41 firma, 4.800 istihdam | [corlu1osb.org.tr](https://www.corlu1osb.org.tr/tr/kurumsal/bolgemiz/) |
| Çorlu Deri OSB (kendi sitesi): 130 ha, **118 fabrika**, ~**10.000** istihdam, Türkiye deri üretiminin %37'si | [corluderiosb.org.tr](https://www.corluderiosb.org.tr/hakkimizda) |
| Çorlu Deri OSB (belediye): 130 ha, **106 fabrika**, 45'i aktif, **1.750** istihdam, 3 arıtma tesisi | [corlu.bel.tr](https://www.corlu.bel.tr/idet/72/261/sanayi) |
| Sanayi koridorları: Çorlu–Çerkezköy (tekstil, boyama, kablo, meşrubat, kazan) · Çorlu–Tekirdağ/Karatepe (taş ocağı, ayçiçek yağı) · Türkgücü yolu (tekstil) | [corlu.bel.tr](https://www.corlu.bel.tr/idet/72/261/sanayi) |
| TSO'ya kayıtlı 5.030 üye | [corlu.bel.tr](https://www.corlu.bel.tr/idet/72/261/sanayi) |
| Velimeşe, Ergene 1 ve Ergene 2 OSB → **Ergene ilçesinde** | [corlutso.org.tr](https://www.corlutso.org.tr/content-345-organize_sanayi_bolgeleri.html) |

⚠️ **İki resmî kaynak Deri OSB'de çelişiyor ve ikisi de yazıldı.** Birini
seçip diğerini gizlemek, okuyana olmayan bir kesinlik satmak olurdu.

### Nüfus

Çorlu 306.939 (TÜİK ADNKS 2025; 2024'te 300.296). Tekirdağ 1.208.441 —
Çorlu il nüfusunun yaklaşık dörtte biri ve ilin en kalabalık ilçesi.

### Eğitim

Tekirdağ NKÜ Çorlu Mühendislik Fakültesi, dokuz bölüm (bilgisayar,
biyomedikal, çevre, elektrik-elektronik, elektronik ve haberleşme,
endüstri, inşaat, makine, tekstil).

## ⚠️ Yazılmayanlar — ve neden

Talimat açıktı: kaynağı bulunamayan cümleyi yazma. Aşağıdakiler
**bilerek dışarıda bırakıldı**:

| Konu | Neden yazılmadı |
| --- | --- |
| **Çorlu hızlı tren istasyonu** | İncelenen resmî açıklamada (AA, 31 Ocak 2025) hattın istasyonları arasında **Çorlu geçmiyor**. Çorlu'da YHT istasyonu olacağına dair kaynak bulunamadı. Metin bunu **açıkça söylüyor**. |
| **Güncel tren sefer sıklığı** | Elimizdeki kaynak (Çorlu Kaymakamlığı) 2016 tarihli; bugünkü sefer sayısı için TCDD tarifesi gerekiyor. |
| **Havalimanı sefer durumu** | DHMİ'nin havalimanı sayfasında tarifeli sefer bilgisi yayınlanmıyor. "Aktif seferler var" demek kaynaksız olurdu. |
| **Hastane yatak kapasitesi** | Çorlu Devlet Hastanesi'nin kendi sayfasında rakam yok. Haber ve toplayıcı sitelerden alıp resmîymiş gibi yazmak, tam da yasaklanan şey. |
| **D-100 / TEM mesafe ve süreleri** | Resmî bir kaynağa bağlanamadı; D maddesindeki PostGIS hesabı bunu ölçülebilir biçimde verecek. |
| **NKÜ ana kampüsünün konumu** | Fakültenin kendi sitesinde adres yazmıyor. Çorlu'da **Mühendislik Fakültesi** olduğu söyleniyor; Çorlu'da üniversite hastanesi olduğu iddia **edilmiyor**. |

⚠️ CLAUDE.md'nin Çorlu bağlamı bölümü "Halkalı–Kapıkule hızlı tren ve
Çorlu istasyonu"nu değer sürücüsü olarak sayıyordu. **Bu araştırma o
maddeyi doğrulayamadı** ve madde Aslıhan'ın kararıyla **güncellendi**:
hızlı tren artık değer sürücüsü sayılmıyor, yerine kaynağın
bulunamadığını yazan bir not kondu.

## ⚠️ Mevcut tren istasyonu AYRI BİR ŞEY — ve gerçek

Hızlı tren istasyonu doğrulanamadı; ama Çorlu'nun **konvansiyonel hat
üzerindeki istasyonu** belgeli:

> Çorlu Kaymakamlığı, 27 Temmuz 2016: İstanbul (Halkalı) – Edirne
> (Kapıkule) günlük tren seferleri 25 Temmuz 2016'da başladı; duyuru
> ilçeden geçiş saatlerini gösteren bir tabloya yer veriyor.

İkisini karıştırmamak şart: biri doğrulanmamış bir varsayım, diğeri
belgeli bir ulaşım bağlantısı.

⚠️ **Güncel sefer sıklığı iddia edilmiyor.** Elimizdeki kaynak 2016
tarihli; bugünkü tarife TCDD Taşımacılık'tan doğrulanmalı. Metin bunu
açıkça söylüyor ve bir test kilitliyor.

## Nasıl kuruldu

- **CMS global** (`Çorlu Değer Anlatısı`): açık/kapalı anahtarı, başlık,
  giriş metni ve bloklar. Her blokta başlık, metin ve **en az bir kaynak**
  (`minRows: 1`).
- ⚠️ **Kaynaksız blok siteye çıkmıyor — kod seviyesinde.** Panelde
  `minRows` var ama okuma yolu da eliyor: bir gün alan yapılandırması
  gevşerse ya da veri başka bir yoldan girerse, kaynaksız bir iddia siteye
  çıkmasın.
- ⚠️ Yalnızca `https://` kaynaklar kabul ediliyor.
- **Gösterim**: her başlığın kaynakları hemen altında, bölümün sonunda
  tekilleştirilmiş tam liste. İkisi birden, çünkü okuyucu iki farklı şey
  yapıyor: bir iddiayı doğrulamak ve "bu bilgi nereden geliyor" sorusunu
  sormak.
- Bölüm mahalle anlatısından **önce**: ziyaretçi önce "Çorlu neden
  değerli", sonra "bu mahalle neden" sorusunu okuyor.

## Kural testle bağlı

15 iddia (`src/lib/veri/corluAnlatisi.test.ts`), aralarında:

- her bloğun en az bir kaynağı var
- kaynaklar yalnızca resmî alan adlarından (OSB'ler, belediye, TSO, DHMİ,
  NKÜ, Sağlık Bakanlığı, AA, TÜİK)
- **yasak ifadeler**: "muhtemelen", "genelde", "bilinir", "tahminen",
  "sanılıyor" hiçbir metinde geçmiyor
- rakamlar yılıyla veriliyor (nüfus 2025, tren ilerlemesi 31 Ocak 2025)
- Ergene'deki OSB'ler Çorlu'da sayılmıyor
- Çorlu hızlı tren istasyonu iddia edilmiyor
- çelişen iki kaynak da yazılıyor
- kaynaklanamayan rakam verilmiyor
