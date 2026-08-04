/**
 * `server-only` paketinin test ortamı karşılığı.
 *
 * `server-only`, istemci paketine sızmayı derleme zamanında hata vererek
 * engeller — ama bunu "react-server" koşulu dışındaki her ortamda yapar,
 * vitest dahil. Testlerde bu koruma anlamsız (istemci paketi yok) ve
 * modülleri hiç import edilemez hale getiriyor.
 *
 * Bu boş modül yalnızca vitest için devreye girer (bkz. vitest.config.ts);
 * Next.js derlemesinde gerçek paket kullanılmaya devam eder.
 */
export {}
