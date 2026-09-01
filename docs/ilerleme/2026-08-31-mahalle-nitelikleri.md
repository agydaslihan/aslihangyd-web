# 31 Ağustos 2026 — Mahalle niteliksel profili: iskelet + Aslıhan

Bu bölüm **araştırmayla doldurulamaz.** "Hangi sokak sessiz", "kim
oturuyor", "son üç yılda ne değişti" — hiçbiri hiçbir kaynakta yok. Web
araştırması, PostGIS ya da OSM bu soruları cevaplayamaz. Cevabı yalnızca
mahalleyi gezen, müşteriyle konuşan, orada ev gösteren kişi biliyor.

Yapılan iş o bilgiyi **üretmek** değil, girilmesini **kolaylaştırmak** ve
girilmediğinde ortaya bir şey **uydurmamak**.

## Panelde yeni alanlar

| Alan | Tip | Not |
| --- | --- | --- |
| Kimler için uygun? | Çoktan seçmeli (aile / öğrenci / yatırımcı / sanayide çalışan / emekli) | "Emin olmadığınızı işaretlemeyin" |
| Kimler için — açıklama | Serbest metin | "Neden? Örn: iki ilkokul yürüme mesafesinde" |
| Sokak dokusu | sessiz / orta / işlek | Mahallenin geneli, tek sokak değil |
| Son 3 yılda ne değişti? | Serbest metin | Rakam verilirse kaynağı da |
| Neye dikkat etmeli? | Serbest metin | ⚠️ Mahallenin **zayıf** tarafı |
| Öne çıkan özellikler | Etiket listesi | Zaten vardı |

⚠️ **"Neye dikkat etmeli" alanının panel açıklaması bunu açıkça söylüyor:**
boş bırakılan bir "dikkat" alanı, mahallede hiçbir sorun olmadığı izlenimi
verir — ve o izlenim ilk ziyarette bozulur.

## Tamamlanma göstergesi

Alanların **üstünde**, canlı: "Niteliksel profil: %40 (2/5 alan) · Eksik:
Sokak dokusu, Neye dikkat etmeli."

⚠️ **Eksikler adıyla listeleniyor.** "%40 tamam" tek başına ne yapılacağını
söylemiyor; yirmi altı mahalleyi dolduran kişinin hangisine devam
edeceğini bilmesi için eksiğin adı gerekiyor.

⚠️ **Uzun analiz metni (`icerik`) yüzdeye girmiyor.** Tek paragraf yazan
kişiye "%60 tamam" demek, yüzdeyi işe yaramaz kılardı. Yüzde
yapılandırılmış alanları ölçüyor.

## Sitede

Yeni bölüm: **"[Mahalle] Mahallesi'nde yerinde gözlem"**, uzun analizden
önce. Yapılandırılmış gözlemler kısa ve taranabilir; uzun metnin arkasına
konsaydı onu okumayan ziyaretçi hiçbirini görmezdi.

Giriş cümlesi ayrımı açıkça yapıyor: *"Aşağıdakiler ölçümle değil,
mahallede bulunarak edinilmiş bilgilerdir. Hiçbir kaynakta bulunmadıkları
için burada yazılıdır."*

⚠️ **Boş alan blok üretmiyor; hepsi boşsa bölüm hiç çizilmiyor.** Yarım
doldurulmuş bir profilde "Neye dikkat etmeli: —" satırı bilgi değil,
eksiklik ilanıdır.

⚠️ **Mevcut boş durum metni korundu** — talimat açıkça "koru" dedi ve
haklı: *"Yüzeysel bir metin yayınlamak yerine, gerçekten işinize yarayacak
olanı yazmayı tercih ediyoruz."* Bir test bu cümlenin yerinde durduğunu
denetliyor.

## Neden ayrı bir bölüm

Bir üstteki "Ölçülebilir bilgiler" bölümü hesaplanan rakamları gösteriyor;
bu bölüm hesaplanamayanı. İkisini ayırmak bilinçli: okuyucu hangi cümlenin
ölçümden, hangisinin gözlemden geldiğini bilmeli. Aynı başlık altında
birleştirmek, gözlemi ölçüm gibi göstermek olurdu.

18 iddia: `src/lib/mahalle/nitelikler.test.ts`.
