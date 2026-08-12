import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ilgi_noktalari_kaynak" AS ENUM('elle', 'osm');
  ALTER TABLE "ilgi_noktalari" ADD COLUMN "kaynak" "enum_ilgi_noktalari_kaynak" DEFAULT 'elle' NOT NULL;
  ALTER TABLE "ilgi_noktalari" ADD COLUMN "osm_kimlik" varchar;
  ALTER TABLE "ilgi_noktalari" ADD COLUMN "elle_duzenlendi" boolean DEFAULT false;
  CREATE INDEX "ilgi_noktalari_kaynak_idx" ON "ilgi_noktalari" USING btree ("kaynak");
  CREATE INDEX "ilgi_noktalari_osm_kimlik_idx" ON "ilgi_noktalari" USING btree ("osm_kimlik");
  CREATE INDEX "ilgi_noktalari_elle_duzenlendi_idx" ON "ilgi_noktalari" USING btree ("elle_duzenlendi");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "ilgi_noktalari_kaynak_idx";
  DROP INDEX "ilgi_noktalari_osm_kimlik_idx";
  DROP INDEX "ilgi_noktalari_elle_duzenlendi_idx";
  ALTER TABLE "ilgi_noktalari" DROP COLUMN "kaynak";
  ALTER TABLE "ilgi_noktalari" DROP COLUMN "osm_kimlik";
  ALTER TABLE "ilgi_noktalari" DROP COLUMN "elle_duzenlendi";
  DROP TYPE "public"."enum_ilgi_noktalari_kaynak";`)
}
