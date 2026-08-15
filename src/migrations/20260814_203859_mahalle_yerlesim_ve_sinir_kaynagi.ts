import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Mahallelere yerleşim türü ve sınırın kaynak izi.
 *
 * · `yerlesim_turu` — merkez / kırsal (eski köy). Boş bırakılabilir ve boş
 *   başlar: emin olunmayan bir mahalleyi işaretlemektense rozetsiz
 *   bırakmak doğru.
 * · `sinir_kaynagi`, `sinir_osm_kimlik`, `sinir_elle_duzenlendi` —
 *   OpenStreetMap sınır içe aktarmasının izleri. `sinir_elle_duzenlendi`
 *   elle düzeltilen sınırın bir daha ezilmesini engelliyor.
 *
 * ⚠️ Bu göç veri kaybı riski TAŞIMIYOR — yalnızca yeni sütun ekliyor,
 * mevcut hiçbir değeri değiştirmiyor. `down` sütunları düşürüyor; içindeki
 * kaynak izi de gidiyor ama o bilgi yalnızca bu sütunlarda yaşıyor ve geri
 * alma zaten "bu özelliği kaldır" demek. Mahalle sınırlarının kendisi
 * (`sinir` sütunu) etkilenmiyor.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_mahalleler_yerlesim_turu" AS ENUM('merkez', 'kirsal');
  CREATE TYPE "public"."enum_mahalleler_sinir_kaynagi" AS ENUM('elle', 'osm');
  ALTER TABLE "mahalleler" ADD COLUMN "yerlesim_turu" "enum_mahalleler_yerlesim_turu";
  ALTER TABLE "mahalleler" ADD COLUMN "sinir_kaynagi" "enum_mahalleler_sinir_kaynagi" DEFAULT 'elle';
  ALTER TABLE "mahalleler" ADD COLUMN "sinir_osm_kimlik" varchar;
  ALTER TABLE "mahalleler" ADD COLUMN "sinir_elle_duzenlendi" boolean DEFAULT false;
  CREATE INDEX "mahalleler_yerlesim_turu_idx" ON "mahalleler" USING btree ("yerlesim_turu");
  CREATE INDEX "mahalleler_sinir_kaynagi_idx" ON "mahalleler" USING btree ("sinir_kaynagi");
  CREATE INDEX "mahalleler_sinir_osm_kimlik_idx" ON "mahalleler" USING btree ("sinir_osm_kimlik");
  CREATE INDEX "mahalleler_sinir_elle_duzenlendi_idx" ON "mahalleler" USING btree ("sinir_elle_duzenlendi");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "mahalleler_yerlesim_turu_idx";
  DROP INDEX "mahalleler_sinir_kaynagi_idx";
  DROP INDEX "mahalleler_sinir_osm_kimlik_idx";
  DROP INDEX "mahalleler_sinir_elle_duzenlendi_idx";
  ALTER TABLE "mahalleler" DROP COLUMN "yerlesim_turu";
  ALTER TABLE "mahalleler" DROP COLUMN "sinir_kaynagi";
  ALTER TABLE "mahalleler" DROP COLUMN "sinir_osm_kimlik";
  ALTER TABLE "mahalleler" DROP COLUMN "sinir_elle_duzenlendi";
  DROP TYPE "public"."enum_mahalleler_yerlesim_turu";
  DROP TYPE "public"."enum_mahalleler_sinir_kaynagi";`)
}
