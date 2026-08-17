# Ziyaretçi gözlemlenebilirliği — iki katmanlı ölçüm

**17 Ağustos 2026** · ölçüm · KVKK, panel, performans

Amaç sayaç göstermek değil karar aldırmak: hangi içerik lead getiriyor,
ziyaretçi nerede kayboluyor.

## Önce araştırma: Umami'den ne çekilebiliyor

Şartname "sıfırdan yazma, önce Umami'ye bak" dedi. Bakıldı, sonuç:

- Kurulumda yalnızca `UMAMI_URL` (betik adresi) ve `UMAMI_SITE_ID` var.
  **API kimlik bilgisi tanımlı değil** — panelin Umami'yi sorgulaması için
  yeni bir sır eklemek gerekirdi.
- Umami **yalnızca onaylı** ziyaretçiyi görüyor. Katman A'nın tamamı
  (her ziyaretçi, çerezsiz) onda hiç yok.
- Lead ilişkilendirmesi Umami'de **yapısal olarak yok**: `Talepler`
  koleksiyonunu bilmiyor. "Hangi sayfa lead getiriyor" sorusu orada
  cevaplanamaz.
- Sunucu yanıt süresi ve hata oranı da yok.

Karar: Umami olduğu gibi bırakıldı, ölçüm kendi tablomuzda kuruldu.
Umami'yi vekil sunucu üzerinden çağıran bir panel, hem yeni bir sır hem
eksik veri hem de ikinci bir doğruluk kaynağı demekti.

## ⚠️ Redis kullanılmadı — ölçülerek, tercihle değil

Şartname "Redis'te toplulaştır, gece veritabanına yaz" diyor ve
`compose.prod.yml` içinde Redis servisi var. O servis bu iş için elverişli
**değil**:

```
--save ''                        → disk kaydı yok
--appendonly no                  → günlük yok
--maxmemory-policy allkeys-lru   → bellek dolunca ANAHTAR SİLİNİR
```

Yani "gece yaz" deseni günün sayaçlarını sessizce kaybedebilirdi: panel
dolu görünür, sayılar eksiktir. Ayrıca uygulamada Redis istemcisi yok;
eklemek yığın değişikliği (CLAUDE.md: önce sor).

Yerine: süreç içi tampon + **dakikada bir** yazma. Kayıp penceresi geceye
kadar değil bir dakika — kalıcılığı olmayan bir Redis'ten güvenli, sıfır
yeni bağımlılık.

⚠️ Sınırı da yazalım: uygulama tek kapsayıcı. Yatay ölçeklenirse her kopya
kendi tamponunu tutar; o gün gelirse çözüm Redis'i **kalıcı** yapılandırmakla
başlar, `bosalt()` arayüzü aynen kalır.

## Ölçülerek öğrenilen dört şey

**1. Proxy Node çalışma zamanında koşuyor.** Next 16'da `src/proxy.ts`
`functions-config-manifest.json` içinde `"runtime":"nodejs"` olarak
kaydediliyor — yani modül durumu boşaltma zamanlayıcısıyla paylaşılıyor.
Edge olsaydı tampon iki ayrı bağlamda kalır ve hiçbir şey yazılmazdı.
Doğrulandı: 21 istek gönderildi, 21'i tek süreçte sayıldı.

**2. Kapanış boşaltması güvenilir DEĞİL.** `SIGTERM` geldiğinde Next kendi
kapatma kancasını çalıştırıyor ve süreç bizim asenkron yazmamız bitmeden
sonlanıyor: günlükte çağrı görünüyor, veritabanı değişmiyordu. Bu yüzden
aralık beş dakikadan **bir dakikaya** indirildi; gerçek güvence o.

**3. Aralıklı yazma ve birleştirme doğru çalışıyor.** 20 istek gönderildi,
gün satırı 8 → 29'a çıktı, rota kırılımı birebir tuttu (`/portfoy` +20,
`/iletisim` +1, diğerleri sabit).

**4. "Tek bayt inmiyor" iddiası YANLIŞTI.** `next/dynamic` ayrı parça
istiyor ama Turbopack izleyiciyi çerez bandıyla aynı parçaya koydu; o parça
her ziyaretçide yükleniyor. Onaylı/onaysız istek karşılaştırıldı, ikisinde
de aynı parça HTML'de. Ölçülen modül bedeli **0,85 kB gzip**.

⚠️ Yorum ve KVKK notu düzeltildi: garanti **baytta değil davranışta**.
Onay yokken bileşen render edilmiyor → dinleyici takılmıyor, istek
gitmiyor, `window.__gozlemOlay` tanımlanmıyor. Test de artık bunu
denetliyor; ölçmeden yazılmış bir garantiyi test etmek onu doğru yapmaz.

## ⚠️ Sözlük istemci paketinden çıkarıldı

Olay sözlüğü (on altı olayın Türkçe açıklamaları) `tipler.ts` içindeydi ve
`FiltrePaneli` yalnızca `fiyatBandi()` için o dosyayı içe aktarıyordu.
Sonuç: açıklamaların tamamı, **analitik onayı vermemiş** ziyaretçinin
portföy sayfası paketine giriyordu. `sozluk.ts` olarak ayrıldı.

## Şartnameden iki bilinçli sapma

**1. "Değerleme sihirbazı adım adım" ölçülemedi — çünkü sihirbaz yok.**
`DegerlemeSihirbazi` tek sayfada beş alanı olan, her tuşta canlı hesaplayan
bir form (bal küpü kuralı 6b). Ekranda "adım" diye bir şey yok. Aynı soru
alan bazında cevaplanıyor: hangi alana kadar doldurup vazgeçildiği. Var
olmayan adımları ölçmek paneli gerçekle ilgisiz bir grafikle doldururdu.

**2. Ham olay kaydı hiç tutulmuyor.** Şartname "ham kayıt, 90 gün sonra
sil" diyor. Ham kayıt bu üründe hiçbir soruyu cevaplamıyor — lead
ilişkilendirmesi `Talepler.gonderildigiSayfa` alanından geliyor. Olaylar da
gün/olay/ayrıntı kırılımında toplanıyor. 90 gün kuralı yine uygulanıyor:
en ayrıntılı katman bakım göreviyle temizleniyor, toplulaştırılmış sayaçlar
kalıcı.

⚠️ Bu sapma KVKK açısından daha güvenli: silinecek kişisel veri hiç
oluşmuyor.

## Panelin şekli

Her bölüm bir **soru**, metrik adı değil. "Ziyaretçi nerede kayboluyor?"
en değerli bölüm ve en büyük düşüş kırmızı işaretli.

⚠️ Sayfa sıralaması tıklamaya göre değil **lead başına görüntülemeye** göre.
⚠️ Örneklem 100'ün altındaysa yüzde **hiç hesaplanmıyor** — gösterilip
"dikkat" notu düşülmüyor, çünkü ekranda duran yüzde okunur, yanındaki not
okunmaz.
⚠️ Her metriğin yanında katmanı (A/B) ve üstte onay oranı yazılı: iki farklı
paydayı gizlemek yanlış karar aldırırdı.

## Yol boyunca kırılan kapılar — hepsi haklıydı

- `depo.test.ts`, `disiplin.test.ts`, `alfabe.test.ts`, `kaynakHijyeni.test.ts`,
  `ortam.test.ts`, `bakim/kayit.test.ts` sırayla kırmızı verdi.
- Ham hex yedekleri (`var(--x, #ddd)`) reddedildi — kural klasör bazında
  muaf tanımıyor ve tanımaması doğru. Yedekler zaten gereksizdi.
- Yıldız işareti font alt kümesinde yok; kaldırıldı.
- `yazici.ts` içine ham NUL baytı sızmıştı; kaçış dizisine çevrildi
  (aynı tuzağa `Harita3B.tsx`'te de düşülmüştü).
- `NEXT_RUNTIME` ortam testine takıldı: Next'in kendi verdiği değişken,
  gerekçesiyle muaf listesine yazıldı — compose ile geçirilmesi **zararlı**
  olurdu.

⚠️ Ve kendi testim de kırıldı: "IP okunmuyor" denetimi kırmızı verdi çünkü
`proxy.ts` açıklaması "`x-forwarded-for` okuması YOK" cümlesini içeriyor.
Testi kıran şey, testin doğruladığı kararın gerekçesiydi. Doğru cevap
gerekçeyi silmek değil, denetimi yorumsuz koda bakacak hâle getirmekti.

## İçe aktarma haritası denetimi genişletildi

Yeni panel görünümü haritaya girmediği hâlde test **yeşil** verdi: özel
görünümler `components` altında değil, `views.x.Component` altında duruyor.
Marka panelini kıran arızanın birebir aynısı, bir seviye yukarıda. Denetim
`Component` anahtarlarını da gezecek şekilde genişletildi ve yakaladığı
doğrulandı.
