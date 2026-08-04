import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mahalleler" ADD COLUMN "eslestirme_profili_toplu_tasima" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "eslestirme_profili_okul_erisimi" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "eslestirme_profili_sessizlik" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "eslestirme_profili_merkeze_yakinlik" numeric;
  ALTER TABLE "mahalleler" ADD COLUMN "eslestirme_profili_profil_notu" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mahalleler" DROP COLUMN "eslestirme_profili_toplu_tasima";
  ALTER TABLE "mahalleler" DROP COLUMN "eslestirme_profili_okul_erisimi";
  ALTER TABLE "mahalleler" DROP COLUMN "eslestirme_profili_sessizlik";
  ALTER TABLE "mahalleler" DROP COLUMN "eslestirme_profili_merkeze_yakinlik";
  ALTER TABLE "mahalleler" DROP COLUMN "eslestirme_profili_profil_notu";`)
}
