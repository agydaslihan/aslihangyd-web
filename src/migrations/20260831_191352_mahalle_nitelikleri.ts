import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_mahalleler_kimler_icin" AS ENUM('aile', 'ogrenci', 'yatirimci', 'isci', 'emekli');
  CREATE TYPE "public"."enum_mahalleler_sokak_dokusu" AS ENUM('sessiz', 'orta', 'islek');
  CREATE TABLE "mahalleler_kimler_icin" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_mahalleler_kimler_icin",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "mahalleler" ADD COLUMN "kimler_icin_notu" varchar;
  ALTER TABLE "mahalleler" ADD COLUMN "sokak_dokusu" "enum_mahalleler_sokak_dokusu";
  ALTER TABLE "mahalleler" ADD COLUMN "son_uc_yil" varchar;
  ALTER TABLE "mahalleler" ADD COLUMN "dikkat_edilmeli" varchar;
  ALTER TABLE "mahalleler_kimler_icin" ADD CONSTRAINT "mahalleler_kimler_icin_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."mahalleler"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "mahalleler_kimler_icin_order_idx" ON "mahalleler_kimler_icin" USING btree ("order");
  CREATE INDEX "mahalleler_kimler_icin_parent_idx" ON "mahalleler_kimler_icin" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "mahalleler_kimler_icin" CASCADE;
  ALTER TABLE "mahalleler" DROP COLUMN "kimler_icin_notu";
  ALTER TABLE "mahalleler" DROP COLUMN "sokak_dokusu";
  ALTER TABLE "mahalleler" DROP COLUMN "son_uc_yil";
  ALTER TABLE "mahalleler" DROP COLUMN "dikkat_edilmeli";
  DROP TYPE "public"."enum_mahalleler_kimler_icin";
  DROP TYPE "public"."enum_mahalleler_sokak_dokusu";`)
}
