import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "medya" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "medya" ADD COLUMN "alt_otomatik" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "medya" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "medya" DROP COLUMN "alt_otomatik";`)
}
