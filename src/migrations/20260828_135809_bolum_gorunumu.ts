import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_anasayfa_duzeni_sira_zemin" AS ENUM('varsayilan', 'kagit', 'bej', 'koyu');
  CREATE TYPE "public"."enum_anasayfa_duzeni_sira_bosluk" AS ENUM('dar', 'normal', 'genis');
  CREATE TYPE "public"."enum_anasayfa_duzeni_sira_hizalama" AS ENUM('sol', 'orta');
  ALTER TABLE "anasayfa_duzeni_sira" ALTER COLUMN "bolum" SET DATA TYPE text;
  DROP TYPE "public"."enum_anasayfa_duzeni_sira_bolum";
  CREATE TYPE "public"."enum_anasayfa_duzeni_sira_bolum" AS ENUM('guven_seridi', 'guven_kartlari', 'arama', 'one_cikan_portfoy', 'mahalleler', 'slayt', 'aslihan', 'corlu_deneyimi', 'anlati', 'endeks', 'gizli_portfoy', 'araclar', 'uc_yol', 'cagri');
  ALTER TABLE "anasayfa_duzeni_sira" ALTER COLUMN "bolum" SET DATA TYPE "public"."enum_anasayfa_duzeni_sira_bolum" USING "bolum"::"public"."enum_anasayfa_duzeni_sira_bolum";
  ALTER TABLE "anasayfa_duzeni_sira" ADD COLUMN "zemin" "enum_anasayfa_duzeni_sira_zemin" DEFAULT 'varsayilan';
  ALTER TABLE "anasayfa_duzeni_sira" ADD COLUMN "bosluk" "enum_anasayfa_duzeni_sira_bosluk" DEFAULT 'normal';
  ALTER TABLE "anasayfa_duzeni_sira" ADD COLUMN "hizalama" "enum_anasayfa_duzeni_sira_hizalama" DEFAULT 'sol';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "anasayfa_duzeni_sira" ALTER COLUMN "bolum" SET DATA TYPE text;
  DROP TYPE "public"."enum_anasayfa_duzeni_sira_bolum";
  CREATE TYPE "public"."enum_anasayfa_duzeni_sira_bolum" AS ENUM('guven_kartlari', 'arama', 'guven_seridi', 'aslihan', 'corlu_deneyimi', 'one_cikan_portfoy', 'gizli_portfoy', 'anlati', 'endeks', 'slayt', 'mahalleler', 'araclar', 'uc_yol', 'cagri');
  ALTER TABLE "anasayfa_duzeni_sira" ALTER COLUMN "bolum" SET DATA TYPE "public"."enum_anasayfa_duzeni_sira_bolum" USING "bolum"::"public"."enum_anasayfa_duzeni_sira_bolum";
  ALTER TABLE "anasayfa_duzeni_sira" DROP COLUMN "zemin";
  ALTER TABLE "anasayfa_duzeni_sira" DROP COLUMN "bosluk";
  ALTER TABLE "anasayfa_duzeni_sira" DROP COLUMN "hizalama";
  DROP TYPE "public"."enum_anasayfa_duzeni_sira_zemin";
  DROP TYPE "public"."enum_anasayfa_duzeni_sira_bosluk";
  DROP TYPE "public"."enum_anasayfa_duzeni_sira_hizalama";`)
}
