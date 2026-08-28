import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_hakkimizda_portre_orani" AS ENUM('1:1', '3:4', '4:3', '16:9');
  CREATE TYPE "public"."enum_hakkimizda_portre_yaricapi" AS ENUM('yok', 'orta', 'buyuk');
  CREATE TYPE "public"."enum_hakkimizda_portre_hizalamasi" AS ENUM('sol', 'orta', 'sag');
  ALTER TABLE "hakkimizda" ADD COLUMN "portre_orani" "enum_hakkimizda_portre_orani" DEFAULT '3:4';
  ALTER TABLE "hakkimizda" ADD COLUMN "portre_yaricapi" "enum_hakkimizda_portre_yaricapi" DEFAULT 'buyuk';
  ALTER TABLE "hakkimizda" ADD COLUMN "portre_kenarligi" boolean DEFAULT false;
  ALTER TABLE "hakkimizda" ADD COLUMN "portre_hizalamasi" "enum_hakkimizda_portre_hizalamasi" DEFAULT 'sol';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hakkimizda" DROP COLUMN "portre_orani";
  ALTER TABLE "hakkimizda" DROP COLUMN "portre_yaricapi";
  ALTER TABLE "hakkimizda" DROP COLUMN "portre_kenarligi";
  ALTER TABLE "hakkimizda" DROP COLUMN "portre_hizalamasi";
  DROP TYPE "public"."enum_hakkimizda_portre_orani";
  DROP TYPE "public"."enum_hakkimizda_portre_yaricapi";
  DROP TYPE "public"."enum_hakkimizda_portre_hizalamasi";`)
}
