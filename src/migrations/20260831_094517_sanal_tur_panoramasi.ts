import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ilanlar" ADD COLUMN "sanal_tur_panoramasi_id" integer;
  ALTER TABLE "mahalleler" ADD COLUMN "sanal_tur_panoramasi_id" integer;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_sanal_tur_panoramasi_id_medya_id_fk" FOREIGN KEY ("sanal_tur_panoramasi_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mahalleler" ADD CONSTRAINT "mahalleler_sanal_tur_panoramasi_id_medya_id_fk" FOREIGN KEY ("sanal_tur_panoramasi_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "ilanlar_sanal_tur_panoramasi_idx" ON "ilanlar" USING btree ("sanal_tur_panoramasi_id");
  CREATE INDEX "mahalleler_sanal_tur_panoramasi_idx" ON "mahalleler" USING btree ("sanal_tur_panoramasi_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ilanlar" DROP CONSTRAINT "ilanlar_sanal_tur_panoramasi_id_medya_id_fk";
  
  ALTER TABLE "mahalleler" DROP CONSTRAINT "mahalleler_sanal_tur_panoramasi_id_medya_id_fk";
  
  DROP INDEX "ilanlar_sanal_tur_panoramasi_idx";
  DROP INDEX "mahalleler_sanal_tur_panoramasi_idx";
  ALTER TABLE "ilanlar" DROP COLUMN "sanal_tur_panoramasi_id";
  ALTER TABLE "mahalleler" DROP COLUMN "sanal_tur_panoramasi_id";`)
}
