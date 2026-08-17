# İlerleme kayıtları

Her PR kendi kaydını **ayrı bir dosyaya** yazar:

```
docs/ilerleme/YYYY-AA-GG-kisa-ad.md
```

Örnek: `docs/ilerleme/2026-08-17-harita-worker.md`

17 Ağustos 2026 öncesinin tarihçesi `docs/ILERLEME.md` içinde; o dosya
arşivdir, **yazılmaz**.

## ⚠️ Neden ayrı dosya

`docs/ILERLEME.md` her PR'da çakışıyordu. Sebep içerik değil ŞEKİLDİ: her
dal aynı yere ekliyordu. Aynı satır aralığına iki farklı ekleme yapan iki
dal git'in üç yollu birleştirmesinde **daima** çakışır.

⚠️ Kaydı dosyanın başına almak bunu çözmez, yalnızca çakışmanın yerini
değiştirir: git satır aralığına bakar, dosyadaki konuma değil.

⚠️ Elle tutulan bir dizin de yok — her PR'da bir satır alacağı için
çakışmayı geri getirirdi. Dizin, dosya adlarının kendisi.

## Dosya nasıl yazılır

```markdown
# Kısa ve açıklayıcı başlık

**17 Ağustos 2026** · alan · konu

Gövde. Alt başlıklar `##` ile.
```

Kural aynı kalıyor: **kararın gerekçesi yazılır, yapılan iş değil.** Kod
ne yaptığını zaten söylüyor; söylemediği şey neden öyle yapıldığı ve
hangi alternatifin neden elendiği.
