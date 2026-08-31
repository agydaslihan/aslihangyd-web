# 31 Ağustos 2026 — Toplu fotoğraf yükleme ve alt metin politikası

## Alt metin artık zorunlu değil — ama boş da kalmıyor

`medya.alt` alanı `required: true` idi ve gerekçesi doğruydu:
erişilebilirlik sonradan eklenen bir şey değil. Ama sonucu şuydu: sahada
bir dairede yirmi fotoğraf çeken kişi yirmi kez metin yazmak zorunda
kalıyor ve **yüklemeyi bırakıyor.** Yüklenmemiş bir fotoğrafın alt metni
de yoktur.

⚠️ **Bu bir erişilebilirlikten vazgeçiş değil, bir kademelendirme.** Yeni
kural üç parçalı ve üçü birden olmadan çalışmaz:

1. **Alan boş bırakılabilir.**
2. **Boş kalan dosya adından türetilir** — asla boş kaydedilmez.
   `salon-genis-aci.jpg` → *"salon genis aci (alt metin eklenmedi)"*.
3. **Türetilmiş olanlar sayılır** ve panel bildirim şeridinde durur:
   *"12 görselde alt metin eksik"* → tıklanınca filtreli liste.

Üçüncüsü olmadan bu, bir erişilebilirlik borcunu **görünmez** kılardı.
İnsan metni yazdığında işaret kendiliğinden kalkıyor.

⚠️ Türetme **koleksiyonun kancasında**, sihirbazda değil. Sihirbaz kendi
metnini üretseydi, panelden yüklenen görsellerle sihirbazdan yüklenenler
farklı kurallara tabi olurdu.

## Sihirbazda toplu yükleme

- **Sürükle-bırak alanı** — ama dosya seçici **yerinde duruyor**.
  ⚠️ Sürükleme dokunmatikte ve klavyeyle yok; tek yol yapmak masaüstü
  dışındaki herkesi dışarıda bırakırdı.
- **İlerleme göstergesi** dosya bazında: "7/20 fotoğraf yüklendi",
  `aria-live="polite"`.
- **Toplu silme**: her satırda seçim kutusu, üstte "Seçilenleri kaldır".
- **Boyut bütçesi uyarısı**: 15 fotoğraftan sonra uyarı çıkıyor.
  ⚠️ Engel değil, görünür bir sınır — kaç fotoğrafın gerektiğini bilen
  kişi Aslıhan. Görseller sunucuda küçültülüyor ama indirilecek dosya
  sayısı yine de artıyor ve mobil LCP hedefi bundan etkileniyor.
- **Kapak hâlâ sıranın başı**; sürükleyerek ya da yukarı/aşağı
  düğmeleriyle değiştiriliyor (klavye erişimi korundu).
- Alt metin alanı her satırda duruyor ve "isteğe bağlı" yazıyor.

13 iddia: `src/lib/medya/altMetni.test.ts`.
