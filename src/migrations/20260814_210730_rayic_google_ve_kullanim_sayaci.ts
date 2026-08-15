import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Rayiç bedeller, Google Places bağlantısı ve çağrı sayacı.
 *
 * · `rayic_degerler` — emlak vergisine esas asgari değerler. ⚠️ Piyasa
 *   fiyatı DEĞİLDİR; koleksiyon ve arayüz bunu her gösterimde söylüyor.
 * · `ilgi_noktalari.google_place_id` — Google'dan sakladığımız TEK alan.
 *   Lisans, yer kimliği dışındaki içeriğin kalıcı saklanmasına izin
 *   vermiyor; ad, adres ve çalışma saati hiçbir zaman yazılmıyor.
 * · `site_bolumleri.google_places` — katmanın anahtarı, VARSAYILAN KAPALI
 *   (ücretli servis; kendiliğinden açılmamalı).
 * · `google_places_kullanimi` — aylık çağrı sayacı. Salt okunur; yalnızca
 *   gerçek bir API çağrısının ardından sunucu tarafında artar.
 *
 * ⚠️ `up` VERİ KAYBI RİSKİ TAŞIMIYOR: yeni tablo ve yeni sütun ekliyor,
 * mevcut hiçbir değeri değiştirmiyor. `ALTER TYPE ... ADD VALUE` yalnızca
 * enum'a değer EKLİYOR (PostgreSQL 12+ bunu işlem içinde destekler ve yeni
 * değer aynı işlemde kullanılmıyor).
 *
 * ⚠️ `down` ENUM DARALTIYOR. Geri alma sırasında `kaynak = 'google'` olan
 * bir ilgi noktası varsa dönüşüm HATA VERİR. Bu bilinçli: sessizce
 * 'elle'ye çevirmek, kaydın kökenini kaybetmek olurdu. Geri almadan önce
 * o kayıtları elle düzeltmek gerekir.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_rayic_degerler_kaynak" AS ENUM('belediye', 'tkgm', 'elle');
  ALTER TYPE "public"."enum_ilgi_noktalari_kaynak" ADD VALUE 'google';
  CREATE TABLE "rayic_degerler" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ozet" varchar,
  	"mahalle_id" integer NOT NULL,
  	"yil" numeric NOT NULL,
  	"sokak" varchar,
  	"metrekare_rayic_bedel" numeric,
  	"arsa_rayic_bedel" numeric,
  	"kaynak" "enum_rayic_degerler_kaynak" DEFAULT 'belediye' NOT NULL,
  	"guncelleme_tarihi" timestamp(3) with time zone,
  	"notlar" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "google_places_kullanimi_aylar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ay" varchar NOT NULL,
  	"arama_cagrisi" numeric DEFAULT 0,
  	"detay_cagrisi" numeric DEFAULT 0,
  	"son_cagri" timestamp(3) with time zone
  );
  
  CREATE TABLE "google_places_kullanimi" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "ilgi_noktalari" ADD COLUMN "google_place_id" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rayic_degerler_id" integer;
  ALTER TABLE "site_bolumleri" ADD COLUMN "google_places" boolean DEFAULT false;
  ALTER TABLE "rayic_degerler" ADD CONSTRAINT "rayic_degerler_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "google_places_kullanimi_aylar" ADD CONSTRAINT "google_places_kullanimi_aylar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."google_places_kullanimi"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "rayic_degerler_mahalle_idx" ON "rayic_degerler" USING btree ("mahalle_id");
  CREATE INDEX "rayic_degerler_yil_idx" ON "rayic_degerler" USING btree ("yil");
  CREATE INDEX "rayic_degerler_kaynak_idx" ON "rayic_degerler" USING btree ("kaynak");
  CREATE INDEX "rayic_degerler_updated_at_idx" ON "rayic_degerler" USING btree ("updated_at");
  CREATE INDEX "rayic_degerler_created_at_idx" ON "rayic_degerler" USING btree ("created_at");
  CREATE INDEX "google_places_kullanimi_aylar_order_idx" ON "google_places_kullanimi_aylar" USING btree ("_order");
  CREATE INDEX "google_places_kullanimi_aylar_parent_id_idx" ON "google_places_kullanimi_aylar" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rayic_degerler_fk" FOREIGN KEY ("rayic_degerler_id") REFERENCES "public"."rayic_degerler"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ilgi_noktalari_google_place_id_idx" ON "ilgi_noktalari" USING btree ("google_place_id");
  CREATE INDEX "payload_locked_documents_rels_rayic_degerler_id_idx" ON "payload_locked_documents_rels" USING btree ("rayic_degerler_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "rayic_degerler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "google_places_kullanimi_aylar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "google_places_kullanimi" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "rayic_degerler" CASCADE;
  DROP TABLE "google_places_kullanimi_aylar" CASCADE;
  DROP TABLE "google_places_kullanimi" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rayic_degerler_fk";
  
  ALTER TABLE "ilgi_noktalari" ALTER COLUMN "kaynak" SET DATA TYPE text;
  ALTER TABLE "ilgi_noktalari" ALTER COLUMN "kaynak" SET DEFAULT 'elle'::text;
  DROP TYPE "public"."enum_ilgi_noktalari_kaynak";
  CREATE TYPE "public"."enum_ilgi_noktalari_kaynak" AS ENUM('elle', 'osm');
  ALTER TABLE "ilgi_noktalari" ALTER COLUMN "kaynak" SET DEFAULT 'elle'::"public"."enum_ilgi_noktalari_kaynak";
  ALTER TABLE "ilgi_noktalari" ALTER COLUMN "kaynak" SET DATA TYPE "public"."enum_ilgi_noktalari_kaynak" USING "kaynak"::"public"."enum_ilgi_noktalari_kaynak";
  DROP INDEX "ilgi_noktalari_google_place_id_idx";
  DROP INDEX "payload_locked_documents_rels_rayic_degerler_id_idx";
  ALTER TABLE "ilgi_noktalari" DROP COLUMN "google_place_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rayic_degerler_id";
  ALTER TABLE "site_bolumleri" DROP COLUMN "google_places";
  DROP TYPE "public"."enum_rayic_degerler_kaynak";`)
}
