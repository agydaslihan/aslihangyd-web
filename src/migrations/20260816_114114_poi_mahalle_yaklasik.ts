import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ilgi_noktalari" ADD COLUMN "mahalle_yaklasik" boolean DEFAULT false;
  CREATE INDEX "ilgi_noktalari_mahalle_yaklasik_idx" ON "ilgi_noktalari" USING btree ("mahalle_yaklasik");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "ilgi_noktalari_mahalle_yaklasik_idx";
  ALTER TABLE "ilgi_noktalari" DROP COLUMN "mahalle_yaklasik";`)
}
