import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_degerlemeler_durum" AS ENUM('yeni', 'incelendi', 'arandi', 'randevu', 'portfoye_alindi', 'kapandi');
  CREATE TYPE "public"."enum_degerlemeler_kat" AS ENUM('bodrum', 'zemin', 'ara', 'yuksek', 'en_ust');
  CREATE TYPE "public"."enum_degerlemeler_yapi_durumu" AS ENUM('sifir', 'iyi', 'ortalama', 'tadilat');
  CREATE TYPE "public"."enum_degerleme_ayarlari_kat_katsayilari_kat" AS ENUM('bodrum', 'zemin', 'ara', 'yuksek', 'en_ust');
  CREATE TYPE "public"."enum_degerleme_ayarlari_durum_katsayilari_durum" AS ENUM('sifir', 'iyi', 'ortalama', 'tadilat');
  CREATE TABLE "degerlemeler" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"durum" "enum_degerlemeler_durum" DEFAULT 'yeni',
  	"iletisim_var" boolean DEFAULT false,
  	"ozet" varchar,
  	"mahalle_id" integer,
  	"brut_m2" numeric,
  	"oda_sayisi" varchar,
  	"kat" "enum_degerlemeler_kat",
  	"bina_yasi" numeric,
  	"yapi_durumu" "enum_degerlemeler_yapi_durumu",
  	"adres_notu" varchar,
  	"tahmini_alt" numeric,
  	"tahmini_ust" numeric,
  	"guven_duzeyi" varchar,
  	"gerceklesen_deger" numeric,
  	"notlar" varchar,
  	"ad_soyad" varchar,
  	"telefon" varchar,
  	"eposta" varchar,
  	"kvkk_onay" boolean DEFAULT false,
  	"kvkk_onay_tarihi" timestamp(3) with time zone,
  	"saklama_bitis" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "degerleme_ayarlari_kat_katsayilari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kat" "enum_degerleme_ayarlari_kat_katsayilari_kat" NOT NULL,
  	"katsayi" numeric NOT NULL
  );
  
  CREATE TABLE "degerleme_ayarlari_durum_katsayilari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"durum" "enum_degerleme_ayarlari_durum_katsayilari_durum" NOT NULL,
  	"katsayi" numeric NOT NULL
  );
  
  CREATE TABLE "degerleme_ayarlari_yas_katsayilari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ust_yas" numeric,
  	"katsayi" numeric NOT NULL
  );
  
  CREATE TABLE "degerleme_ayarlari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"notlar" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "degerlemeler_id" integer;
  ALTER TABLE "degerlemeler" ADD CONSTRAINT "degerlemeler_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "degerleme_ayarlari_kat_katsayilari" ADD CONSTRAINT "degerleme_ayarlari_kat_katsayilari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."degerleme_ayarlari"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "degerleme_ayarlari_durum_katsayilari" ADD CONSTRAINT "degerleme_ayarlari_durum_katsayilari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."degerleme_ayarlari"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "degerleme_ayarlari_yas_katsayilari" ADD CONSTRAINT "degerleme_ayarlari_yas_katsayilari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."degerleme_ayarlari"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "degerlemeler_durum_idx" ON "degerlemeler" USING btree ("durum");
  CREATE INDEX "degerlemeler_iletisim_var_idx" ON "degerlemeler" USING btree ("iletisim_var");
  CREATE INDEX "degerlemeler_mahalle_idx" ON "degerlemeler" USING btree ("mahalle_id");
  CREATE INDEX "degerlemeler_saklama_bitis_idx" ON "degerlemeler" USING btree ("saklama_bitis");
  CREATE INDEX "degerlemeler_updated_at_idx" ON "degerlemeler" USING btree ("updated_at");
  CREATE INDEX "degerlemeler_created_at_idx" ON "degerlemeler" USING btree ("created_at");
  CREATE INDEX "degerleme_ayarlari_kat_katsayilari_order_idx" ON "degerleme_ayarlari_kat_katsayilari" USING btree ("_order");
  CREATE INDEX "degerleme_ayarlari_kat_katsayilari_parent_id_idx" ON "degerleme_ayarlari_kat_katsayilari" USING btree ("_parent_id");
  CREATE INDEX "degerleme_ayarlari_durum_katsayilari_order_idx" ON "degerleme_ayarlari_durum_katsayilari" USING btree ("_order");
  CREATE INDEX "degerleme_ayarlari_durum_katsayilari_parent_id_idx" ON "degerleme_ayarlari_durum_katsayilari" USING btree ("_parent_id");
  CREATE INDEX "degerleme_ayarlari_yas_katsayilari_order_idx" ON "degerleme_ayarlari_yas_katsayilari" USING btree ("_order");
  CREATE INDEX "degerleme_ayarlari_yas_katsayilari_parent_id_idx" ON "degerleme_ayarlari_yas_katsayilari" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_degerlemeler_fk" FOREIGN KEY ("degerlemeler_id") REFERENCES "public"."degerlemeler"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_degerlemeler_id_idx" ON "payload_locked_documents_rels" USING btree ("degerlemeler_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "degerlemeler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "degerleme_ayarlari_kat_katsayilari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "degerleme_ayarlari_durum_katsayilari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "degerleme_ayarlari_yas_katsayilari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "degerleme_ayarlari" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "degerlemeler" CASCADE;
  DROP TABLE "degerleme_ayarlari_kat_katsayilari" CASCADE;
  DROP TABLE "degerleme_ayarlari_durum_katsayilari" CASCADE;
  DROP TABLE "degerleme_ayarlari_yas_katsayilari" CASCADE;
  DROP TABLE "degerleme_ayarlari" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_degerlemeler_fk";
  
  DROP INDEX "payload_locked_documents_rels_degerlemeler_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "degerlemeler_id";
  DROP TYPE "public"."enum_degerlemeler_durum";
  DROP TYPE "public"."enum_degerlemeler_kat";
  DROP TYPE "public"."enum_degerlemeler_yapi_durumu";
  DROP TYPE "public"."enum_degerleme_ayarlari_kat_katsayilari_kat";
  DROP TYPE "public"."enum_degerleme_ayarlari_durum_katsayilari_durum";`)
}
