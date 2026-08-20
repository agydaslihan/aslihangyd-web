import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Aurora Luxury paleti — marka panelinin varsayılanları ve KAYITLI SATIR.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ SÜTUN VARSAYILANINI DEĞİŞTİRMEK YETMEZ — SATIRIN KENDİSİ EZİLİYOR.
 *
 * Marka paneli, `globals.css`teki anlamsal jetonları ÇALIŞMA ZAMANINDA
 * eziyor (`lib/marka/sunucu.ts`): kayıtlı palet `<head>` içine bir
 * `<style>` olarak basılıyor. Yani veritabanında duran bohem palet, yeni
 * Aurora jetonlarını sessizce ezerdi ve site dağıtımdan sonra ESKİ
 * renklerde kalırdı — üstelik hiçbir hata vermeden.
 *
 * Sütun varsayılanı yalnızca YENİ satırlar için geçerli. Kurulumda bir
 * satır zaten var. Bu yüzden satır da güncelleniyor.
 *
 * ⚠️ ELLE SEÇİLMİŞ RENKLER DE EZİLİYOR ve bu bilinçli. Bu bir renk
 * düzeltmesi değil, paletin tamamının değişmesi: bohem palette seçilmiş
 * bir "terracotta başlık", Aurora'nın altın/mürekkep ekseninde hem
 * yabancı durur hem de kontrast çiftleri o eksene göre ölçüldü. Aslıhan
 * panelden yeniden özelleştirebilir; kapı aynı kapı.
 * ─────────────────────────────────────────────────────────────────────────
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_zemin" SET DEFAULT '#fcfbf8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_bolum_zemin" SET DEFAULT '#f5f0e8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_metin" SET DEFAULT '#1c1c1c';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_vurgu" SET DEFAULT '#7a5e2e';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_buton_zemin" SET DEFAULT '#c7a36b';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_buton_metin" SET DEFAULT '#1c1c1c';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_yumusak_zemin" SET DEFAULT '#f5f0e8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_dekoratif_cizgi" SET DEFAULT '#c7a36b';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_koyu_bant_zemin" SET DEFAULT '#1c1c1c';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_koyu_bant_metin" SET DEFAULT '#fcfbf8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_zemin" SET DEFAULT '#1c1c1c';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_bolum_zemin" SET DEFAULT '#48433d';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_metin" SET DEFAULT '#fcfbf8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_vurgu" SET DEFAULT '#d5b98d';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_buton_zemin" SET DEFAULT '#c7a36b';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_buton_metin" SET DEFAULT '#1c1c1c';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_yumusak_zemin" SET DEFAULT '#2a2622';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_dekoratif_cizgi" SET DEFAULT '#c7a36b';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_koyu_bant_zemin" SET DEFAULT '#2a2622';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_koyu_bant_metin" SET DEFAULT '#fcfbf8';`)

  // ⚠️ Kayıtlı satır da Aurora'ya alınıyor — gerekçe dosyanın başında.
  await db.execute(sql`
    UPDATE "marka_gorunum" SET
      "acik_tema_zemin" = '#fcfbf8',
      "acik_tema_bolum_zemin" = '#f5f0e8',
      "acik_tema_metin" = '#1c1c1c',
      "acik_tema_vurgu" = '#7a5e2e',
      "acik_tema_buton_zemin" = '#c7a36b',
      "acik_tema_buton_metin" = '#1c1c1c',
      "acik_tema_yumusak_zemin" = '#f5f0e8',
      "acik_tema_dekoratif_cizgi" = '#c7a36b',
      "acik_tema_koyu_bant_zemin" = '#1c1c1c',
      "acik_tema_koyu_bant_metin" = '#fcfbf8',
      "koyu_tema_zemin" = '#1c1c1c',
      "koyu_tema_bolum_zemin" = '#48433d',
      "koyu_tema_metin" = '#fcfbf8',
      "koyu_tema_vurgu" = '#d5b98d',
      "koyu_tema_buton_zemin" = '#c7a36b',
      "koyu_tema_buton_metin" = '#1c1c1c',
      "koyu_tema_yumusak_zemin" = '#2a2622',
      "koyu_tema_dekoratif_cizgi" = '#c7a36b',
      "koyu_tema_koyu_bant_zemin" = '#2a2622',
      "koyu_tema_koyu_bant_metin" = '#fcfbf8'`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_zemin" SET DEFAULT '#fbfaf7';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_bolum_zemin" SET DEFAULT '#f2ebe3';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_metin" SET DEFAULT '#3d2b2f';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_vurgu" SET DEFAULT '#844632';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_buton_zemin" SET DEFAULT '#4f7c6a';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_buton_metin" SET DEFAULT '#ffffff';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_yumusak_zemin" SET DEFAULT '#e8cfc8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_dekoratif_cizgi" SET DEFAULT '#c9a96e';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_koyu_bant_zemin" SET DEFAULT '#3d2b2f';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "acik_tema_koyu_bant_metin" SET DEFAULT '#ffffff';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_zemin" SET DEFAULT '#3d2b2f';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_bolum_zemin" SET DEFAULT '#635356';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_metin" SET DEFAULT '#fbfaf7';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_vurgu" SET DEFAULT '#e8cfc8';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_buton_zemin" SET DEFAULT '#86a597';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_buton_metin" SET DEFAULT '#3d2b2f';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_yumusak_zemin" SET DEFAULT '#814431';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_dekoratif_cizgi" SET DEFAULT '#c9a96e';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_koyu_bant_zemin" SET DEFAULT '#635356';
  ALTER TABLE "marka_gorunum" ALTER COLUMN "koyu_tema_koyu_bant_metin" SET DEFAULT '#fbfaf7';`)

  // Geri alma da satırı geri yazıyor: yalnızca varsayılanı geri almak,
  // veritabanında Aurora renkleriyle çalışan bir bohem site bırakırdı.
  await db.execute(sql`
    UPDATE "marka_gorunum" SET
      "acik_tema_zemin" = '#fbfaf7',
      "acik_tema_bolum_zemin" = '#f2ebe3',
      "acik_tema_metin" = '#3d2b2f',
      "acik_tema_vurgu" = '#844632',
      "acik_tema_buton_zemin" = '#4f7c6a',
      "acik_tema_buton_metin" = '#ffffff',
      "acik_tema_yumusak_zemin" = '#e8cfc8',
      "acik_tema_dekoratif_cizgi" = '#c9a96e',
      "acik_tema_koyu_bant_zemin" = '#3d2b2f',
      "acik_tema_koyu_bant_metin" = '#ffffff',
      "koyu_tema_zemin" = '#3d2b2f',
      "koyu_tema_bolum_zemin" = '#635356',
      "koyu_tema_metin" = '#fbfaf7',
      "koyu_tema_vurgu" = '#e8cfc8',
      "koyu_tema_buton_zemin" = '#86a597',
      "koyu_tema_buton_metin" = '#3d2b2f',
      "koyu_tema_yumusak_zemin" = '#814431',
      "koyu_tema_dekoratif_cizgi" = '#c9a96e',
      "koyu_tema_koyu_bant_zemin" = '#635356',
      "koyu_tema_koyu_bant_metin" = '#fbfaf7'`)
}
