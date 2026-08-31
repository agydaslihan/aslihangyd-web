/**
 * Pannellum tip bildirimi.
 *
 * ⚠️ Kütüphanenin kendi tipi yok ve `@types/pannellum` da yok. Bildirim
 * BOŞ bırakıldı çünkü modülün dönen değeri kullanılmıyor: Pannellum bir
 * ESM modülü değil, `window.pannellum` üzerine yazan bir betik. `import()`
 * yalnızca yan etkisi için çağrılıyor.
 *
 * ⚠️ `any` yerine `unknown` yazmak da yanlış olurdu: burada bir DEĞER yok,
 * bir modül bildirimi var. Kullanılan yüzey `PanoramaTuru.tsx` içinde
 * `PannellumApi` olarak tiplenmiş durumda.
 */
declare module 'pannellum/build/pannellum.js'
declare module 'pannellum/build/pannellum.css'
