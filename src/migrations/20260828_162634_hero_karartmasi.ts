import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_danisman_ol_hero_karartmasi" AS ENUM('65', '75', '85');
  ALTER TABLE "danisman_ol" ADD COLUMN "hero_karartmasi" "enum_danisman_ol_hero_karartmasi" DEFAULT '75';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "danisman_ol" DROP COLUMN "hero_karartmasi";
  DROP TYPE "public"."enum_danisman_ol_hero_karartmasi";`)
}
