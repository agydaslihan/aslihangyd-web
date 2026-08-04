import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mahalleler" ADD COLUMN "yatirim_skoru_fiyat_trendi" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "yatirim_skoru_kira_carpani_puani" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "yatirim_skoru_sanayi_yakinligi" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "yatirim_skoru_ulasim" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "yatirim_skoru_sosyal_donati" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "yatirim_skoru_arz_baskisi" numeric;
  CREATE INDEX "mahalleler_yatirim_skoru_yatirim_skoru_toplam_idx" ON "mahalleler" USING btree ("yatirim_skoru_toplam");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "mahalleler_yatirim_skoru_yatirim_skoru_toplam_idx";
  ALTER TABLE "mahalleler" DROP COLUMN "yatirim_skoru_fiyat_trendi";
  ALTER TABLE "mahalleler" DROP COLUMN "yatirim_skoru_kira_carpani_puani";
  ALTER TABLE "mahalleler" DROP COLUMN "yatirim_skoru_sanayi_yakinligi";
  ALTER TABLE "mahalleler" DROP COLUMN "yatirim_skoru_ulasim";
  ALTER TABLE "mahalleler" DROP COLUMN "yatirim_skoru_sosyal_donati";
  ALTER TABLE "mahalleler" DROP COLUMN "yatirim_skoru_arz_baskisi";`)
}
