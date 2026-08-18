import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "sayfa_icerikleri_iletisim_gorseller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gorsel_id" integer NOT NULL,
  	"aciklama" varchar
  );
  
  CREATE TABLE "sayfa_icerikleri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"iletisim_baslik" varchar,
  	"iletisim_alt_baslik" varchar,
  	"iletisim_icerik" jsonb,
  	"degerleme_baslik" varchar,
  	"degerleme_alt_baslik" varchar,
  	"degerleme_icerik" jsonb,
  	"araclar_baslik" varchar,
  	"araclar_alt_baslik" varchar,
  	"araclar_icerik" jsonb,
  	"portfoy_baslik" varchar,
  	"portfoy_alt_baslik" varchar,
  	"mahalleler_baslik" varchar,
  	"mahalleler_alt_baslik" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "altbilgi_ayarlari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tanitim_metni" varchar,
  	"kurumsal_basligi" varchar,
  	"portfoy_basligi" varchar,
  	"faydali_basligi" varchar,
  	"hukuksal_basligi" varchar,
  	"iletisim_basligi" varchar,
  	"sosyal_basligi" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "danisman_ol_ek_gorseller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gorsel_id" integer NOT NULL,
  	"aciklama" varchar
  );
  
  ALTER TABLE "hero_slider_slaytlar" ALTER COLUMN "baslik" DROP NOT NULL;
  ALTER TABLE "danisman_ol_nedenler" ADD COLUMN "gorsel_id" integer;
  ALTER TABLE "danisman_ol" ADD COLUMN "hero_gorseli_id" integer;
  ALTER TABLE "danisman_ol" ADD COLUMN "form_ustu_metin" jsonb;
  ALTER TABLE "sayfa_icerikleri_iletisim_gorseller" ADD CONSTRAINT "sayfa_icerikleri_iletisim_gorseller_gorsel_id_medya_id_fk" FOREIGN KEY ("gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sayfa_icerikleri_iletisim_gorseller" ADD CONSTRAINT "sayfa_icerikleri_iletisim_gorseller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sayfa_icerikleri"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "danisman_ol_ek_gorseller" ADD CONSTRAINT "danisman_ol_ek_gorseller_gorsel_id_medya_id_fk" FOREIGN KEY ("gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "danisman_ol_ek_gorseller" ADD CONSTRAINT "danisman_ol_ek_gorseller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."danisman_ol"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "sayfa_icerikleri_iletisim_gorseller_order_idx" ON "sayfa_icerikleri_iletisim_gorseller" USING btree ("_order");
  CREATE INDEX "sayfa_icerikleri_iletisim_gorseller_parent_id_idx" ON "sayfa_icerikleri_iletisim_gorseller" USING btree ("_parent_id");
  CREATE INDEX "sayfa_icerikleri_iletisim_gorseller_gorsel_idx" ON "sayfa_icerikleri_iletisim_gorseller" USING btree ("gorsel_id");
  CREATE INDEX "danisman_ol_ek_gorseller_order_idx" ON "danisman_ol_ek_gorseller" USING btree ("_order");
  CREATE INDEX "danisman_ol_ek_gorseller_parent_id_idx" ON "danisman_ol_ek_gorseller" USING btree ("_parent_id");
  CREATE INDEX "danisman_ol_ek_gorseller_gorsel_idx" ON "danisman_ol_ek_gorseller" USING btree ("gorsel_id");
  ALTER TABLE "danisman_ol_nedenler" ADD CONSTRAINT "danisman_ol_nedenler_gorsel_id_medya_id_fk" FOREIGN KEY ("gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "danisman_ol" ADD CONSTRAINT "danisman_ol_hero_gorseli_id_medya_id_fk" FOREIGN KEY ("hero_gorseli_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "danisman_ol_nedenler_gorsel_idx" ON "danisman_ol_nedenler" USING btree ("gorsel_id");
  CREATE INDEX "danisman_ol_hero_gorseli_idx" ON "danisman_ol" USING btree ("hero_gorseli_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sayfa_icerikleri_iletisim_gorseller" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sayfa_icerikleri" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "altbilgi_ayarlari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "danisman_ol_ek_gorseller" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "sayfa_icerikleri_iletisim_gorseller" CASCADE;
  DROP TABLE "sayfa_icerikleri" CASCADE;
  DROP TABLE "altbilgi_ayarlari" CASCADE;
  DROP TABLE "danisman_ol_ek_gorseller" CASCADE;
  ALTER TABLE "danisman_ol_nedenler" DROP CONSTRAINT "danisman_ol_nedenler_gorsel_id_medya_id_fk";
  
  ALTER TABLE "danisman_ol" DROP CONSTRAINT "danisman_ol_hero_gorseli_id_medya_id_fk";
  
  DROP INDEX "danisman_ol_nedenler_gorsel_idx";
  DROP INDEX "danisman_ol_hero_gorseli_idx";
  ALTER TABLE "hero_slider_slaytlar" ALTER COLUMN "baslik" SET NOT NULL;
  ALTER TABLE "danisman_ol_nedenler" DROP COLUMN "gorsel_id";
  ALTER TABLE "danisman_ol" DROP COLUMN "hero_gorseli_id";
  ALTER TABLE "danisman_ol" DROP COLUMN "form_ustu_metin";`)
}
