import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_hero_slider_slaytlar_metin_hizasi" AS ENUM('sol', 'orta');
  CREATE TABLE "hero_slider_slaytlar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gorsel_id" integer NOT NULL,
  	"baslik" varchar NOT NULL,
  	"alt_baslik" varchar,
  	"buton_metni" varchar,
  	"buton_link" varchar,
  	"metin_hizasi" "enum_hero_slider_slaytlar_metin_hizasi" DEFAULT 'sol',
  	"overlay_koyulugu" numeric DEFAULT 45,
  	"aktif" boolean DEFAULT true
  );
  
  CREATE TABLE "hero_slider" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"otomatik_gecis" boolean DEFAULT false,
  	"gecis_suresi" numeric DEFAULT 7,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "hero_slider_slaytlar" ADD CONSTRAINT "hero_slider_slaytlar_gorsel_id_medya_id_fk" FOREIGN KEY ("gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hero_slider_slaytlar" ADD CONSTRAINT "hero_slider_slaytlar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."hero_slider"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "hero_slider_slaytlar_order_idx" ON "hero_slider_slaytlar" USING btree ("_order");
  CREATE INDEX "hero_slider_slaytlar_parent_id_idx" ON "hero_slider_slaytlar" USING btree ("_parent_id");
  CREATE INDEX "hero_slider_slaytlar_gorsel_idx" ON "hero_slider_slaytlar" USING btree ("gorsel_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "hero_slider_slaytlar" CASCADE;
  DROP TABLE "hero_slider" CASCADE;
  DROP TYPE "public"."enum_hero_slider_slaytlar_metin_hizasi";`)
}
