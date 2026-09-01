# 31 Ağustos 2026 — Rayiç verisi girilmişti, görünmüyordu

## Teşhis: eşleştirme sağlamdı, okuma yolu dardı

Şüpheler tek tek elendi:

| Şüphe | Ölçüm | Sonuç |
| --- | --- | --- |
| Kayıtlar mahallelerle eşleşmemiş | 3.366 kaydın **3.366'sında** `mahalle_id` dolu | ✗ eşleşme sağlam |
| Mahalle adı eşleştirmesi tutmamış | 26 mahallenin **26'sında** kayıt var | ✗ sorun yok |
| Yıl alanı boş | Hepsi **2026** | ✗ sorun yok |
| Sayfa yanlış yılı arıyor | En yeni yılı arıyor, o da 2026 | ✗ sorun yok |

Asıl sebep başkaydı:

⚠️ **`mahalleRayiciGetir` yalnızca `sokak` alanı BOŞ olan kaydı arıyordu —
belediye tablosu ise sokak sokak geliyor. Mahalle geneli kayıt sayısı: 0.**

Eski davranışın gerekçesi doğruydu: tek bir sokağın rakamını "mahallenin
rayiç bedeli" diye göstermek yanıltıcı olur — o sokak mahallenin en pahalı
ya da en ucuz yeri olabilir. Ama sonuç, 3.366 kaydın hiç kullanılmamasıydı.

## Düzeltme: seçmek değil, toplulaştırmak

Öncelik sırası:
1. **Mahalle geneli kayıt varsa o kazanır** — elle girilmiş, kasıtlı bir
   rakamı yüzlerce sokak kaydının içinde eritmek insanın verdiği kararı
   yok saymak olurdu.
2. Yoksa **sokak kayıtlarının ortancası**.

⚠️ **Ortanca, ortalama değil.** Dağılım çok geniş:

```
n=3366   min=24   Q1=2000   ortanca=5000   Q3=9000   max=35000
```

24 ₺/m² tarla ile 35.000 ₺/m² cadde aynı veri kümesinde. Ortalama birkaç
ana cadde tarafından yukarı çekilir; ortanca çekilmez.

⚠️ **Yalnızca en son yılın kayıtları.** Farklı yılların rakamlarını aynı
ortancaya katmak, zamla gelen artışı mahalle içi fark sanmak olurdu.

## Ekranda ne yazıyor

Sitenin n kuralı burada da geçerli — rakam tek başına gösterilmiyor:

> **Rayiç bedel (2026)** · 17.000 ₺/m²
> Vergiye esas asgari değer · **9 sokak kaydının ortancası**
> Sokaklar arası: 12.000 ₺ – 22.000 ₺/m²

Açıklama paragrafına da eklendi: "buradaki rakam mahalledeki N sokak
kaydının **ortancasıdır** — ortalama değil, çünkü birkaç ana cadde
ortalamayı yukarı çeker."

⚠️ Mahalle içi aralık, ortancanın kendisi kadar bilgi: 12.000–22.000
arasında bir mahallede tek bir sayıya bakmak yanıltıcı olurdu.

Hesaplayıcının mahalle listesi de aynı mantığı kullanıyor — sayfa ile
hesaplayıcının aynı veriye farklı cevap vermesi kabul edilemez.

## Rayiç/piyasa oranı

Bileşen (`RayicPiyasaOrani`) zaten yazılmıştı ve doğruydu; **verisi yoktu**.
Artık rayiç tarafı doluyor. Oran, piyasa rakamı da girildiğinde görünüyor —
şu an yalnızca Alipaşa'da piyasa verisi var ve o da ölçek hatalı (bkz.
`2026-08-31-olcek-hatasi.md`). Rakam düzeltilince oran kendiliğinden
çıkacak.

## ⚠️ Ayrıca bulundu: bina = arsa, 3.366 kaydın hepsinde

```sql
select count(*) filter (where metrekare_rayic_bedel = arsa_rayic_bedel) → 3366 / 3366
```

Belediye tablosunda tek bir birim değer sütunu var ve içe aktarmada
**ikisine birden** bağlanmış. Sonuç: var olmayan bir "bina rayiç bedeli"
verisi.

Kanıt: `TABAN ARAZİ` satırı 32 ₺/m² — bu bir arsa birim değeri, bina
değeri değil. Belediyeler zaten "asgari ölçüde arsa metrekare birim
değeri" yayınlıyor.

⚠️ **Veriyi değiştirmedim.** Hangi alanın doğru olduğunu Aslıhan bilir;
sessizce bir alanı silmek ya da taşımak, uydurma veri yasağının başka bir
biçimi olurdu. Bunun yerine **tekrarı engellendi**: içe aktarma
önizlemesi artık aynı sütun iki alana bağlandığında uyarıyor.

Hata satır bazlı bakışla görünmüyordu — iki alan da doluydu, hiçbir satır
hatalı değildi. Yalnızca eşleme düzeyinde görülebilirdi.

13 iddia: `src/lib/veri/rayicOrtanca.test.ts`.
