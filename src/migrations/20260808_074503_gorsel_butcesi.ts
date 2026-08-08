import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_medya_kullanim" AS ENUM('belirsiz', 'hero', 'kart');
  ALTER TABLE "medya" ADD COLUMN "kullanim" "enum_medya_kullanim" DEFAULT 'belirsiz';
  ALTER TABLE "medya" ADD COLUMN "tahmini_kart_bayt" numeric;
  ALTER TABLE "medya" ADD COLUMN "tahmini_mobil_bayt" numeric;
  ALTER TABLE "medya" ADD COLUMN "tahmini_masaustu_bayt" numeric;
  ALTER TABLE "medya" ADD COLUMN "bulanik_veri" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "medya" DROP COLUMN "kullanim";
  ALTER TABLE "medya" DROP COLUMN "tahmini_kart_bayt";
  ALTER TABLE "medya" DROP COLUMN "tahmini_mobil_bayt";
  ALTER TABLE "medya" DROP COLUMN "tahmini_masaustu_bayt";
  ALTER TABLE "medya" DROP COLUMN "bulanik_veri";
  DROP TYPE "public"."enum_medya_kullanim";`)
}
