# Marka paneli renk sekmeleri boş geliyordu

**16 Ağustos 2026** · panel · içe aktarma haritası

Belirti: `/admin/globals/marka-gorunum` → "Renkler — açık tema" ve
"Renkler — koyu tema" sekmelerinde **yalnızca başlık** görünüyor. On renk
alanının hiçbiri çizilmiyor, kaydetme çalışmıyor.

### Sebep: içe aktarma haritası güncellenmemişti

"Marka ve Görünüm" globali dört özel bileşen tanımlıyor:

```
@/components/marka/RenkAlani#RenkAlani
@/components/marka/PaletPaneli#AcikPaletPaneli
@/components/marka/PaletPaneli#KoyuPaletPaneli
@/components/marka/MarkaOzeti#MarkaOzeti
```

Dördü de `src/app/(payload)/admin/importMap.js` içinde **yoktu**. O dosya
Payload'ın "bu yol hangi bileşen" sorusuna cevabı; kayıt eksikse Payload
bileşeni bulamıyor ve **sessizce hiçbir şey çizmiyor** — istisna bile
fırlatmıyor.

Ölçüm: yapılandırmalarda başvurulan 23 özel bileşenin 19'u haritada vardı,
**4'ü yoktu** — hepsi marka paketinden. Diğer PR'lar `generate:importmap`
çalıştırmıştı; marka PR'ında atlanmıştı.

### ⚠️ HİÇBİR KAPI BUNU YAKALAMADI

```
pnpm typecheck  ✅   bileşenler geçerli TypeScript
pnpm lint       ✅
pnpm test       ✅
pnpm build      ✅   Next.js dosyaları zaten derliyordu
CI (4 kontrol)  ✅
```

İçe aktarma haritası bir KOD dosyası değil, bir KAYIT dosyası. Kod doğru,
kayıt eksikti. Tarayıcı konsolundaki
`Failed to load module script: non-JavaScript MIME type text/html`
hatası da aynı ailedendi: var olmayan bir modül isteniyor, sunucu 404 HTML
döndürüyor.

### Düzeltme ve kalıcı koruma

`pnpm payload generate:importmap` → dört kayıt eklendi (8 satır).

Yeni test (`src/lib/panel/importMap.test.ts`) üç şeyi denetliyor:

1. Yapılandırmada başvurulan **her** özel bileşen haritada kayıtlı mı
2. Haritadaki her bileşen **dosyası gerçekten var mı** (404/MIME hatasının
   diğer yarısı)
3. Tarama gerçekten bileşen buluyor mu — testin kendi kendini boşa
   çıkarmasına karşı

⚠️ **Testin gerçekten yakaladığı doğrulandı:** düzeltme geri alınıp
koşturuldu, dört bileşeni adıyla sayıp `pnpm payload generate:importmap`
komutunu yazarak kırmızı verdi.

### ⚠️ Neden derleme adımı EKLENMEDİ

`generate:importmap`i derlemeye eklemek de bir seçenekti. Eklenmedi: o
zaman depodaki dosya ile üretilen dosya sessizce ayrışabilir ve
"yerelde çalışıyor, üretimde çalışmıyor" sınıfına yeni bir örnek eklerdi.
Harita depoda duruyor, gözle görülüyor ve test onu koddan sapmaya karşı
koruyor.

### Doğrulanan ve doğrulanamayan

Doğrulandı: harita kayıtları eklendi · bileşen metinleri derlenmiş çıktıda
(`.next`) bulunuyor · test kırılmayı yakalıyor.

⚠️ Panelin tarayıcıda çizildiği **görülmedi**: `/admin` oturum istiyor ve
bu ortamda tarayıcı yok. Kanıt dolaylı ama zincirin her halkası ölçüldü.

### ⚠️ İkinci katman: Payload'ın kendi talebini gezen denetim

İlk denetim kaynak dosyaları TARIYOR: `'@/components/…#Ad'` biçiminde
yazılmış her dizgeyi bulup haritada arıyor. Yaşanan arızayı yakalar ama bir
varsayıma dayanır — bileşen yolunun kaynakta düz bir dizge olarak
yazıldığına.

İkinci denetim varsayımı kaldırıyor: **sanitize edilmiş yapılandırmayı**
geziyor ve her `components` girdisini haritadaki anahtarlarla karşılaştırıyor.
Yol nasıl üretilmiş olursa olsun — `{ path }` nesnesi, yardımcıdan dönen
değer, döngüyle kurulan alan — kayıtsızsa görünür.

⚠️ Marka panelinde arıza tam olarak bu yüzden sessizdi: on renk alanı
`renkAlanlari()` yardımcısıyla ÜRETİLİYOR. Panel çözemediği bileşen için
hata atmıyor, hiçbir şey basmıyor — sekmenin başlığı duruyor, içeriği yok.

⚠️ Yakaladığı doğrulandı: dört satır haritadan çıkarıldı ve test hem
sayfayı hem **yerini** gösterdi:

```
@/components/marka/RenkAlani#RenkAlani
  ← config.globals[2].fields[0].tabs[1].fields[0].fields[0].admin.components.Field
  … (açık tema on alan, koyu tema on alan)
@/components/marka/PaletPaneli#AcikPaletPaneli
  ← config.globals[2].fields[0].tabs[1].fields[1].admin.components.Field
```

Yani bildirilen belirtinin tamamı: iki renk sekmesi de boş, yalnızca başlık.

⚠️ Harita DOSYA OLARAK okunuyor, içe aktarılmıyor. `importMap.js` bütün
panel bileşenlerini içe aktarıyor; testte yüklemek `.css` içe aktarımlarını
da sürüklüyor ve denetimi kütüphanelerin paketleme ayrıntılarına bağlıyordu.
Değerli olan taraf zaten TALEP tarafı.
