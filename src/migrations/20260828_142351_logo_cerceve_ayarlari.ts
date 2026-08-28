import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_marka_gorunum_logo_hizalamasi" AS ENUM('sol', 'orta');
  ALTER TABLE "marka_gorunum" ADD COLUMN "baslik_logo_yuksekligi" numeric DEFAULT 48;
  ALTER TABLE "marka_gorunum" ADD COLUMN "altbilgi_logo_yuksekligi" numeric DEFAULT 56;
  ALTER TABLE "marka_gorunum" ADD COLUMN "logo_boslugu" numeric DEFAULT 0;
  ALTER TABLE "marka_gorunum" ADD COLUMN "logo_hizalamasi" "enum_marka_gorunum_logo_hizalamasi" DEFAULT 'sol';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "marka_gorunum" DROP COLUMN "baslik_logo_yuksekligi";
  ALTER TABLE "marka_gorunum" DROP COLUMN "altbilgi_logo_yuksekligi";
  ALTER TABLE "marka_gorunum" DROP COLUMN "logo_boslugu";
  ALTER TABLE "marka_gorunum" DROP COLUMN "logo_hizalamasi";
  DROP TYPE "public"."enum_marka_gorunum_logo_hizalamasi";`)
}
