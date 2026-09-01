import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_anasayfa_duzeni_hero_acilisi" AS ENUM('metin_once', 'slayt_once', 'yalnizca_metin');
  ALTER TABLE "anasayfa_duzeni" ADD COLUMN "hero_acilisi" "enum_anasayfa_duzeni_hero_acilisi" DEFAULT 'metin_once';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "anasayfa_duzeni" DROP COLUMN "hero_acilisi";
  DROP TYPE "public"."enum_anasayfa_duzeni_hero_acilisi";`)
}
