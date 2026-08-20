# Aurora Adım 6 · PR 1 — portföy listesi ve ilan detayı

**20 Ağustos 2026** · dal: `feature/aurora-portfoy`

Trafiğin çoğunun gittiği ve SEO motoru olan iki sayfa Aurora diline geçti.
Kütüphane eklenmedi.

---

## Liste sayfası

**Filtre paneli cam yüzeye geçti.** Panel liste boyunca ekranda kalıyor ve
altından kartlar geçiyor; opak bir kutu o hareketi kesip paneli sayfadan
koparıyordu. Cam, panelin sayfanın üstünde DURDUĞUNU söylüyor.

⚠️ `.cam` mobilde otomatik olarak düz renge düşüyor ve bu panel zaten
`lg:block` — bulanıklık yalnızca geniş ekranda, alt sheet'te değil.

**Sonuç şeridi yapışkan ve cam.** Uzun bir listede "kaç sonuç var" ve "neye
göre sıralı" ekranın dışına çıkıyordu; ziyaretçi sıralamayı değiştirmek
için başa dönmek zorundaydı.

⚠️ **Katman sırası teste bağlandı:** şerit `z-20` — kartların üstünde,
başlığın (`z-40`) ve mobil filtre sheet'inin (`z-50`) altında. Bir kez
karışırsa şerit mobilde menünün üstüne biner ve kimse fark etmez.

**Kartta altın kenarlık hover'da beliriyor.** Duran hâlde sınır
`border-kenar`; altın yalnızca sıcaklık ekliyor.

⚠️ Altın açık zeminde 2,28:1 ve WCAG 1.4.11'in eşiğini geçmiyor — kabul
edilebilir olmasının tek sebebi bu çizginin hiçbir bilgi taşımaması.
`focus-visible` karşılığı bilinçli olarak YOK: klavye odağını dekoratif bir
renkle göstermek, odak halkasının yerine geçmiş gibi okunurdu.

**Doğrulanmış rozeti cam yüzeye geçti** — fotoğrafın üstünde duran tek
öğe o; opak beyaz bir etiket fotoğrafı kesiyordu.

## İlan detayı — galeri büyütme (lightbox)

⚠️ **Native `<dialog>` ile, kütüphaneyle değil.** Tarayıcının kendi modal'ı
üç şeyi bedavaya veriyor: odak tuzağı, Escape ile kapanma ve arka planın
erişilebilirlik ağacından düşmesi. Hazır bir lightbox bunları yeniden yazıp
15–30 kB ekliyor.

Aynı disiplin framer-motion'ı düşürürken uygulanmıştı; burada da önce
"tarayıcı bunu yapıyor mu?" soruldu. Cevap evetti.

- Ok tuşlarıyla gezinme (dialog odağı içeride tutuyor ama gezinmeyi vermiyor)
- Arka plana tıklayınca kapanma
- Dairesel gezinme — uçta durup hiçbir şey yapmayan düğme bozuk sanılıyor
- Büyütülen görsel **ancak açılınca** render ediliyor; hepsini baştan
  basmak sayfaya görünmeyen tam boy görseller eklerdi

⚠️ **Izgara sunucuda basılıyor.** Görsellerin tamamı ilk HTML'de: arama
motoru ve JavaScript'siz ziyaretçi hiçbir şey kaybetmiyor. Büyütme bir ek —
çalışmazsa galeri yine galeri.

⚠️ **Erişilebilir ad sırayı taşıyor:** "Fotoğrafı büyüt — 3 / 8". Beş
düğmenin beşi de aynı adı taşısaydı ekran okuyucu kullanan biri listede
nerede olduğunu bilemezdi; görsel kullanan biri bunu bakışla çözüyor.

⚠️ **Payload kaydı istemciye gönderilmiyor.** `Medya` kaydı gönderilecek
veriden çok daha büyük (tüm boyut varyantları, tarihler, bütçe ölçümleri);
sunucu üç alan seçip geçiyor.

## Dokunulmazlar — hepsi yerinde

EİDS "Doğrulanmış" rozeti ve taşınmaz numarası · kira çarpanı satırı ve
altın üst çizgisi · yatırım kartının altın çerçevesi · gömülü hesaplayıcı ·
yatırım tavsiyesi feragati · mobil yapışkan eylem çubuğu.

## Ölçüm

| Rota | Önce | Sonra |
| --- | ---: | ---: |
| `/portfoy` | 210,7 kB | **210,7 kB** |
| `/portfoy/[slug]` | 213,9 kB | **214,9 kB** |

Artış 1,0 kB ve tamamı büyütme bileşeni. Bütçe 320 kB.

- `pnpm typecheck` · `lint` · `build` — temiz
- `pnpm test` — 96 dosya, **1977 test** yeşil
- Üretim derlemesiyle iki sayfa 200; cam yüzeyler, `<dialog>` ve büyütme
  düğmeleri üretilen HTML'de doğrulandı

⚠️ **Görsel doğrulama yapılamadı:** camın gerçekten bulanıklaştığı, yapışkan
şeridin kaydırmada nasıl durduğu ve büyütmenin akışı tarayıcıda görülmeli.
