import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_gozlemler_tip" AS ENUM('satilik', 'kiralik');
  CREATE TYPE "public"."enum_gozlemler_oda_tipi" AS ENUM('1+1', '2+1', '3+1', '4+1');
  CREATE TYPE "public"."enum_gozlemler_kaynak" AS ENUM('portal_ilan', 'kendi_islem', 'meslektas', 'resmi');
  CREATE TYPE "public"."enum_gozlemler_guven_seviyesi" AS ENUM('yuksek', 'orta', 'dusuk');
  CREATE TYPE "public"."enum_endeks_ayarlari_sepet_agirliklari_oda_tipi" AS ENUM('1+1', '2+1', '3+1', '4+1');
  CREATE TABLE "gozlemler" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mahalle_id" integer NOT NULL,
  	"tip" "enum_gozlemler_tip" DEFAULT 'satilik' NOT NULL,
  	"oda_tipi" "enum_gozlemler_oda_tipi" NOT NULL,
  	"m2" numeric NOT NULL,
  	"fiyat" numeric NOT NULL,
  	"m2_fiyati" numeric,
  	"gozlem_tarihi" timestamp(3) with time zone NOT NULL,
  	"kaynak" "enum_gozlemler_kaynak" DEFAULT 'portal_ilan' NOT NULL,
  	"bina_yasi" numeric,
  	"kat" varchar,
  	"guven_seviyesi" "enum_gozlemler_guven_seviyesi" DEFAULT 'orta',
  	"notlar" varchar,
  	"ay" varchar,
  	"ozet" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "endeks_ayarlari_sepet_agirliklari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mahalle_id" integer NOT NULL,
  	"oda_tipi" "enum_endeks_ayarlari_sepet_agirliklari_oda_tipi" NOT NULL,
  	"agirlik" numeric NOT NULL
  );
  
  CREATE TABLE "endeks_ayarlari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"yayinda" boolean DEFAULT false,
  	"metodoloji_yayinda" boolean DEFAULT false,
  	"agirlik_guncelleme_yili" numeric,
  	"tcmb_karsilastirma_notu" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gozlemler_id" integer;
  ALTER TABLE "gozlemler" ADD CONSTRAINT "gozlemler_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "endeks_ayarlari_sepet_agirliklari" ADD CONSTRAINT "endeks_ayarlari_sepet_agirliklari_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "endeks_ayarlari_sepet_agirliklari" ADD CONSTRAINT "endeks_ayarlari_sepet_agirliklari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."endeks_ayarlari"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gozlemler_mahalle_idx" ON "gozlemler" USING btree ("mahalle_id");
  CREATE INDEX "gozlemler_tip_idx" ON "gozlemler" USING btree ("tip");
  CREATE INDEX "gozlemler_oda_tipi_idx" ON "gozlemler" USING btree ("oda_tipi");
  CREATE INDEX "gozlemler_gozlem_tarihi_idx" ON "gozlemler" USING btree ("gozlem_tarihi");
  CREATE INDEX "gozlemler_kaynak_idx" ON "gozlemler" USING btree ("kaynak");
  CREATE INDEX "gozlemler_ay_idx" ON "gozlemler" USING btree ("ay");
  CREATE INDEX "gozlemler_updated_at_idx" ON "gozlemler" USING btree ("updated_at");
  CREATE INDEX "gozlemler_created_at_idx" ON "gozlemler" USING btree ("created_at");
  CREATE INDEX "endeks_ayarlari_sepet_agirliklari_order_idx" ON "endeks_ayarlari_sepet_agirliklari" USING btree ("_order");
  CREATE INDEX "endeks_ayarlari_sepet_agirliklari_parent_id_idx" ON "endeks_ayarlari_sepet_agirliklari" USING btree ("_parent_id");
  CREATE INDEX "endeks_ayarlari_sepet_agirliklari_mahalle_idx" ON "endeks_ayarlari_sepet_agirliklari" USING btree ("mahalle_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_gozlemler_fk" FOREIGN KEY ("gozlemler_id") REFERENCES "public"."gozlemler"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_gozlemler_id_idx" ON "payload_locked_documents_rels" USING btree ("gozlemler_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "gozlemler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "endeks_ayarlari_sepet_agirliklari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "endeks_ayarlari" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "gozlemler" CASCADE;
  DROP TABLE "endeks_ayarlari_sepet_agirliklari" CASCADE;
  DROP TABLE "endeks_ayarlari" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_gozlemler_fk";
  
  DROP INDEX "payload_locked_documents_rels_gozlemler_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gozlemler_id";
  DROP TYPE "public"."enum_gozlemler_tip";
  DROP TYPE "public"."enum_gozlemler_oda_tipi";
  DROP TYPE "public"."enum_gozlemler_kaynak";
  DROP TYPE "public"."enum_gozlemler_guven_seviyesi";
  DROP TYPE "public"."enum_endeks_ayarlari_sepet_agirliklari_oda_tipi";`)
}
