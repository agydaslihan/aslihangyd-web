# 31 Ağustos 2026 — Mahalle rakamları: içe aktarma ve güven kuralları

Aslıhan 26 mahalle için m², kira, çarpan, değişim ve nüfus verisi gönderdi.
Tabloda tutarsızlıklar vardı:

| Mahalle | Ne var | Sorun |
| --- | --- | --- |
| Silahtarağa | +%115 değişim | 4 gözlem |
| Seymen | 20 yıl çarpan | gözlem "—" |
| Türkgücü | 63.064 ₺/m² | 2 gözlem |
| Önerler | kira ≈ m² satışın %92'si | birim karışıklığı? |

Beş mahalle metodolojimizin 8 gözlem eşiğinin altında.

⚠️ **Veriyi girmedim.** Talimat açıktı: araç hazır olsun, Aslıhan girsin.
Rakamları koda ya da seed'e yazmak CLAUDE.md kural 2'nin ihlali olurdu ve
bu veri zaten her ay değişecek.

## 1 — Güven kuralları tek modülde

`src/lib/mahalle/guven.ts`. Dört uyarı üretiyor, hiçbiri engellemiyor:

| Kod | Koşul |
| --- | --- |
| `gozlem_yok` | rakam var, n girilmemiş |
| `az_gozlem` | n < 8 |
| `kira_orani` | aylık kira / m² satış, 0,27–0,67 bandının dışında |
| `degisim_asiri` | \|12 aylık değişim\| > %60 |
| `carpan_disi` | kira çarpanı 5–50 yıl aralığının dışında |

⚠️ **Eşik ENDEKSTEN geliyor**, burada yeniden yazılmıyor:
`GUVEN_ESIGI = KATMAN_MINIMUM_GOZLEM`. 8 sayısını buraya kopyalasaydık,
endeksin eşiği değiştiği gün mahalle sayfası eski eşikle "güvenilir" demeye
devam ederdi. Aynı projede iki farklı "yeterli veri" tanımı, hangisinin
geçerli olduğu sorulamayan bir durumdur.

⚠️ **Kira/satış bandı bir tahmin değil, türetilmiş bir aralık.** Tanım
gereği `kira / m²Satış = daire m²'si / (12 × çarpan)`. Çorlu ölçeğinde
daire 80–120 m², çarpan 15–25 yıl alındığında bant 0,27–0,67 çıkıyor.
Asıl yakaladığı şey birim karışıklığı: kira aylık yerine m² başına
girildiğinde oran ~0,01'e, satış m² yerine toplam girildiğinde ~0,0005'e
düşüyor — ikisi de bandın kilometrelerce dışında.

⚠️ **Uyarılar engellemiyor.** Bir rakamı "aykırı" diye reddetmek, veriyi
kendi beklentimize göre budamaktır — endeksin bozulmasının en sinsi yolu.
Gerçekten hızlı değer kazanan bir mahalle gerçekten +%70 yapabilir. Sistem
soruyu sorar, kararı Aslıhan verir.

## 2 — Sitede "tahmini"

`IstatistikKarti` zaten her rakamın altında `n = …` yazıyordu. Artık n
eşiğin altındaysa (ya da hiç yoksa) yanına **tahmini** ekleniyor.

Üç seçenek vardı ve ikisi yanlıştı:

- **Gizle** → mahalle sayfası boşalır, 26 mahallenin çoğu sessizleşir.
- **Olduğu gibi göster** → 2 gözlem, 24 gözlemle aynı görünürlükte sunulur.
- **Göster ve neye dayandığını yaz** → "n = 2 · tahmini".

Üçüncüsü rakamı zayıflatmıyor; okuyanın ona ne kadar güveneceğini
söylüyor.

Endeks tarafında ek bir şey gerekmedi: `/endeks` zaten
`KATMAN_MINIMUM_GOZLEM` eşiğini kod seviyesinde uyguluyor ve eşiği
tutturmayan katman endekse girmiyor.

## 3 — Toplu içe aktarma

`/admin/mahalle-rakamlari` — rayiç ve gözlem içe aktarmalarıyla aynı
desen: dosya → sütun eşlemesi → önizleme → yaz.

- Sütun adları tahmin ediliyor ve gösteriliyor; yanlışsa düzeltiliyor.
- **Örnek CSV indirilebilir.** Sütun adlarını doğru bilen bir dosyayı
  kullanıcının eline vermek, "sütunlar eşleşmedi" hatasının en ucuz
  çözümü. Bir test, örnek dosyanın başlıklarının ayrıştırıcının tanıdığı
  adlarla eşleştiğini denetliyor — ayrıştıkları gün hatayı örnek dosya
  üretmiş olurdu.
- Sayılar hem `1.234,56` hem `1,234.56` biçiminde okunuyor (ayrıştırıcı
  bunu zaten yapıyordu; test edildi ve belgelendi).

⚠️ **Yalnızca günceller, yeni mahalle AÇMAZ.** Eşleşmeyen bir ad,
mahallenin olmadığını değil adın farklı yazıldığını gösteriyor olabilir
("Şeyhsinan" / "Seyhsinan" / "Şeyh Sinan"). Kayıt açsaydık ikinci bir
mahalle sayfası, ikinci bir slug ve bölünmüş bir portföy elde ederdik.
Mahalle açmanın kendi aracı zaten var (`listeIceAktarma`).

⚠️ **Boş hücre SİLMEZ.** Dosyada olmayan alan `undefined` geçiliyor,
Payload dokunmuyor. Aksi hâlde yalnızca nüfusu güncellemek için hazırlanan
bir dosya m² ve kira rakamlarının hepsini silerdi.

⚠️ Yazma Local API + `overrideAccess: false` ile: erişim kuralları ve
kancalar aynen çalışıyor. Toplu yazma, kancaları atlamak için bahane
değil.

## Uçtan uca doğrulama

Dev veritabanında dört satırlık bir dosya çalıştırıldı:

```
satır 2: [DEMO] Muhittin — hazır
satır 3: YAZILMAZ — "Şeyhsinan" eşleşmedi | n=2 eşiğin altında |
         kira/satış oranı 0,92 | değişim %115 | çarpan 2 yıl
satır 4: YAZILMAZ — "Bilinmeyen Mahalle" eşleşmedi
satır 5: YAZILMAZ — yazılacak hiçbir rakam yok
YAZMA: {"guncellenen":1,"atlanan":0,"hatali":3}
```

Dört uyarı kuralı da tetikledi; hatalı satırlar yazılmadı; yazılan satır
kayda işlendi (m² null → 32.500, n null → 24). Test verisi geri alındı.

26 iddia: `src/lib/mahalle/guven.test.ts`.
