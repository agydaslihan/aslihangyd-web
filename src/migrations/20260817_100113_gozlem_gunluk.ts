import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "gozlem_gunluk_sayfalar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rota" varchar NOT NULL,
  	"goruntuleme" numeric DEFAULT 0,
  	"hata" numeric DEFAULT 0,
  	"toplam_ms" numeric DEFAULT 0,
  	"en_yavas_ms" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_kaynaklar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"alan" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_utm_kaynaklar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kaynak" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_ulkeler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kod" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_cihazlar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sinif" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_olaylar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ad" varchar NOT NULL,
  	"ayrinti" varchar,
  	"niyet" varchar,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"gun" varchar NOT NULL,
  	"toplam_istek" numeric DEFAULT 0,
  	"onayli_istek" numeric DEFAULT 0,
  	"ayrinti_temizlendi" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gozlem_gunluk_id" integer;
  ALTER TABLE "gozlem_gunluk_sayfalar" ADD CONSTRAINT "gozlem_gunluk_sayfalar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_kaynaklar" ADD CONSTRAINT "gozlem_gunluk_kaynaklar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_utm_kaynaklar" ADD CONSTRAINT "gozlem_gunluk_utm_kaynaklar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_ulkeler" ADD CONSTRAINT "gozlem_gunluk_ulkeler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_cihazlar" ADD CONSTRAINT "gozlem_gunluk_cihazlar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_olaylar" ADD CONSTRAINT "gozlem_gunluk_olaylar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gozlem_gunluk_sayfalar_order_idx" ON "gozlem_gunluk_sayfalar" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_sayfalar_parent_id_idx" ON "gozlem_gunluk_sayfalar" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_kaynaklar_order_idx" ON "gozlem_gunluk_kaynaklar" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_kaynaklar_parent_id_idx" ON "gozlem_gunluk_kaynaklar" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_utm_kaynaklar_order_idx" ON "gozlem_gunluk_utm_kaynaklar" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_utm_kaynaklar_parent_id_idx" ON "gozlem_gunluk_utm_kaynaklar" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_ulkeler_order_idx" ON "gozlem_gunluk_ulkeler" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_ulkeler_parent_id_idx" ON "gozlem_gunluk_ulkeler" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_cihazlar_order_idx" ON "gozlem_gunluk_cihazlar" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_cihazlar_parent_id_idx" ON "gozlem_gunluk_cihazlar" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_olaylar_order_idx" ON "gozlem_gunluk_olaylar" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_olaylar_parent_id_idx" ON "gozlem_gunluk_olaylar" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "gozlem_gunluk_gun_idx" ON "gozlem_gunluk" USING btree ("gun");
  CREATE INDEX "gozlem_gunluk_updated_at_idx" ON "gozlem_gunluk" USING btree ("updated_at");
  CREATE INDEX "gozlem_gunluk_created_at_idx" ON "gozlem_gunluk" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gozlem_gunluk_fk" FOREIGN KEY ("gozlem_gunluk_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_gozlem_gunluk_id_idx" ON "payload_locked_documents_rels" USING btree ("gozlem_gunluk_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "gozlem_gunluk_sayfalar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gozlem_gunluk_kaynaklar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gozlem_gunluk_utm_kaynaklar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gozlem_gunluk_ulkeler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gozlem_gunluk_cihazlar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gozlem_gunluk_olaylar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gozlem_gunluk" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "gozlem_gunluk_sayfalar" CASCADE;
  DROP TABLE "gozlem_gunluk_kaynaklar" CASCADE;
  DROP TABLE "gozlem_gunluk_utm_kaynaklar" CASCADE;
  DROP TABLE "gozlem_gunluk_ulkeler" CASCADE;
  DROP TABLE "gozlem_gunluk_cihazlar" CASCADE;
  DROP TABLE "gozlem_gunluk_olaylar" CASCADE;
  DROP TABLE "gozlem_gunluk" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_gozlem_gunluk_fk";
  
  DROP INDEX "payload_locked_documents_rels_gozlem_gunluk_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gozlem_gunluk_id";`)
}
