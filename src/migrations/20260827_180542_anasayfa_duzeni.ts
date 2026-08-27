import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_anasayfa_duzeni_sira_bolum" AS ENUM('guven_kartlari', 'arama', 'guven_seridi', 'aslihan', 'corlu_deneyimi', 'one_cikan_portfoy', 'gizli_portfoy', 'anlati', 'endeks', 'slayt', 'mahalleler', 'araclar', 'uc_yol', 'cagri');
  CREATE TABLE "anasayfa_duzeni_sira" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"bolum" "enum_anasayfa_duzeni_sira_bolum" NOT NULL,
  	"acik" boolean DEFAULT true
  );
  
  CREATE TABLE "anasayfa_duzeni" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "anasayfa_duzeni_sira" ADD CONSTRAINT "anasayfa_duzeni_sira_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."anasayfa_duzeni"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "anasayfa_duzeni_sira_order_idx" ON "anasayfa_duzeni_sira" USING btree ("_order");
  CREATE INDEX "anasayfa_duzeni_sira_parent_id_idx" ON "anasayfa_duzeni_sira" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "anasayfa_duzeni_sira" CASCADE;
  DROP TABLE "anasayfa_duzeni" CASCADE;
  DROP TYPE "public"."enum_anasayfa_duzeni_sira_bolum";`)
}
