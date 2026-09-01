# 1 Eylül 2026 — Sürüm uyumsuzluğu: panel artık "kaç commit geride" diyor

## Neden

Canlıdaki uygulama **35 commit geride** kaldı ve bu ancak elle bakılarak
fark edildi.

⚠️ Asıl zarar gecikme değildi. O sürede sitede yapılan bütün denemeler
eski sürüme bakıyordu: "düzeltildi" denen şeyler yayında yoktu, "hâlâ
bozuk" denenler ise aslında düzelmişti. Yani sistem yavaş değil, **yanlış
bilgi üretiyordu.**

Bu, projedeki beşinci sessiz arıza ve dördüyle aynı imzayı taşıyor: hata
yok, davranış yanlış.

## Ne eklendi

Bakım şeridine üç şey:

1. **Kalıcı sürüm satırı** — uyarı olmasa da görünüyor:
   `Yayındaki sürüm 02b914c · 1 Eylül 2026 12:36'ten beri çalışıyor ·
   imaj 1 Eylül 2026 03:30 · main'in 5 commit gerisinde.`
2. **Uyarı** — geride kalınca: `Yayında olmayan 5 commit var — deploy bekliyor`
3. **Son dağıtım bilgisi** — imajın derlenme anı ve kabın başlangıç anı.

## Nasıl ölçülüyor

| Soru | Kaynak |
| --- | --- |
| Ne çalışıyor? | İmaja gömülü `surum.json` (commit + derleme anı + depo) |
| En son ne var? | GitHub `compare/{çalışan}...main` → `ahead_by` |
| İmaj hazır mı? | GHCR'da `:latest` ile `:{commit}` etiketlerinin özeti aynı mı |
| Ne zamandır çalışıyor? | `process.uptime()` |

⚠️ **Sunucudaki git deposu OKUNMUYOR** — okunamıyor da: uygulama bir kapta
çalışıyor ve `/srv/aslihangyd/app` oraya bağlı değil. Zaten trafiği
karşılayan şey depo değil, **imaj**. Çalışan imajın kendi commit'ini
ölçmek, sorulan soruya daha doğrudan cevap veriyor: "şu an ziyaretçiye
giden kod hangisi?"

## Kararlar

⚠️ **Damga ortam değişkeni DEĞİL, imaja gömülü dosya.** İki sebep:
`compose.prod.yml` içindeki bir `KAYNAK_COMMIT: ${KAYNAK_COMMIT:-}` satırı
gömülü değeri boş dizeyle ezer ve sürümü söylemesi gereken alan sessizce
boşalırdı; ayrıca bu bir yapılandırma değil, imajın kimliği — çalışma
zamanında değiştirilebilir olması "hangi kod çalışıyor" sorusunun cevabını
yalanlanabilir yapardı.

⚠️ **`butunluk` seviyesinde, yasalın üstünde.** Şema eksikliğiyle aynı
aile: eksik tablo dağıtımın YARIM kaldığını, sürüm farkı HİÇ yapılmadığını
söylüyor. İkisi de şeritteki diğer uyarıların doğruluğunu belirliyor —
eski kodun hesapladığı bir EİDS sayısı yanlış olabilir.

⚠️ **İmaj hazır değilse ayrıca söyleniyor.** GHCR'daki `:latest` henüz en
son commit'i göstermiyorsa dağıtım **eski sürümü kurar**; bu cümle olmadan
kullanıcı komutu çalıştırır ve hiçbir şeyin değişmediğini görür.

⚠️ **"Bakılamadı" ile "geride değil" ayrı.** Denetim yapılamadığında
bildirim çıkıyor ve açıkça "sürümün güncel OLDUĞU anlamına gelmez" diyor.
Sessiz kalmak, tam da bu bildirimin var olma sebebi olan karışıklığı
üretirdi.

⚠️ **Geliştirme kabuğu ayrı işaretleniyor.** Damga yoksa `.git/HEAD`
okunuyor ama satır "Yerel çalışma ağacı" diyor — geliştiricinin dalını
"yayındaki sürüm" sanmak, çözmeye çalıştığımız hatanın aynısı olurdu.

## Ölçüm iki tasarımı düzeltti

**1. `setTimeout` zorunlu çıktı.** Next `fetch`i sarmalıyor ve isteği o
anki ÇİZİMİN ömrüne bağlıyor. Çizim bittikten sonra tamamlanacak bir istek
askıda kalıyor: tek başına 300 ms süren GitHub çağrısı panelin içinden
çağrıldığında **hiç dönmedi**. Denetimi yeni bir olay turuna atmak çözdü —
zaten mimari olarak da doğrusu bu, sürüm denetimi bir arka plan işi.

**2. Zaman aşımı 4 → 8 saniye.** Next'in sarmaladığı `fetch` üzerinden
dört çağrı toplamda ~3,7 saniye alıyor; 4 saniyelik sınır tam bu bandın
içine düşüyordu ve denetim **sağlıklı bir ağda bile** zaman aşımına
uğrardı. Ölçmeseydik uyarı, uyarması gereken şey yüzünden susardı.

## Panel bekletilmiyor

Şerit her panel açılışında çalışıyor; buraya senkron bir ağ çağrısı
koymak her sayfa görüntülemesine GitHub gecikmesi eklerdi. `semaDurumu`
ile aynı kalıp: sonuç `globalThis` üzerinde bir kutuda, panel senkron
okuyor, kutu bayatsa (10 dk) tazeleme **başlatılıyor ama beklenmiyor**.

İlk açılışta cevap "henüz denetlenmedi" oluyor ve bir sonraki açılışta
doluyor — ölçümle doğrulandı.

## Doğrulama

Gerçek tarayıcıda, gerçek API'lerle:

- İmaja 5 commit eski bir damga konup panel açıldı → satır
  `main'in 5 commit gerisinde`, uyarı `Yayında olmayan 5 commit var`
- Docker imajı damgalı ve damgasız derlendi; damgasızda dosya boş yazılıyor
  ve panel "sürüm damgası eklenmeden derlenmiş" diyor — uydurma SHA yok
- GHCR'da olmayan etiket 404 dönüyor ve hata değil, cevabın kendisi olarak
  işleniyor

31 iddia: `src/lib/surum/surum.test.ts`.

⚠️ Bir test diğerini kırdı: `ortam.test.ts`in tarayıcısı, bu testin
gövdesindeki düz `process.env.KAYNAK` metnini gerçek bir değişken okuması
sandı ve "belgelenmemiş değişken" dedi. Aranan metin artık parçalardan
kuruluyor.
