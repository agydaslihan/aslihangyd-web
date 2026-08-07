import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_danisman_basvurulari_durum" AS ENUM('yeni', 'gorusuldu', 'olumlu', 'olumsuz');
  CREATE TYPE "public"."enum_danisman_basvurulari_deneyim" AS ENUM('yok', '1_3', '3_arti');
  CREATE TYPE "public"."enum_altbilgi_baglantilari_sutun" AS ENUM('kurumsal', 'faydali', 'hukuksal', 'iletisim');
  CREATE TABLE "danisman_basvurulari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"durum" "enum_danisman_basvurulari_durum" DEFAULT 'yeni',
  	"ad" varchar NOT NULL,
  	"telefon" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"deneyim" "enum_danisman_basvurulari_deneyim" NOT NULL,
  	"myk_belgesi" boolean,
  	"mesaj" varchar,
  	"notlar" varchar,
  	"kvkk_onay" boolean DEFAULT false NOT NULL,
  	"kvkk_onay_tarihi" timestamp(3) with time zone,
  	"saklama_bitis" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "altbilgi_baglantilari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sutun" "enum_altbilgi_baglantilari_sutun" NOT NULL,
  	"sira_no" numeric DEFAULT 10,
  	"baslik" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"dahili_mi" boolean DEFAULT true,
  	"aktif" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_bolumleri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"danisman_ol" boolean DEFAULT false,
  	"ticari" boolean DEFAULT true,
  	"endeks" boolean DEFAULT true,
  	"raporlar" boolean DEFAULT true,
  	"gizli_portfoy" boolean DEFAULT true,
  	"mahalle_testi" boolean DEFAULT true,
  	"simulator" boolean DEFAULT true,
  	"bolge_radari" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "danisman_ol_nedenler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"baslik" varchar NOT NULL,
  	"metin" varchar
  );
  
  CREATE TABLE "danisman_ol" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"baslik" varchar,
  	"aciklama" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "danisman_basvurulari_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "altbilgi_baglantilari_id" integer;
  ALTER TABLE "danisman_ol_nedenler" ADD CONSTRAINT "danisman_ol_nedenler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."danisman_ol"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "danisman_basvurulari_updated_at_idx" ON "danisman_basvurulari" USING btree ("updated_at");
  CREATE INDEX "danisman_basvurulari_created_at_idx" ON "danisman_basvurulari" USING btree ("created_at");
  CREATE INDEX "altbilgi_baglantilari_updated_at_idx" ON "altbilgi_baglantilari" USING btree ("updated_at");
  CREATE INDEX "altbilgi_baglantilari_created_at_idx" ON "altbilgi_baglantilari" USING btree ("created_at");
  CREATE INDEX "danisman_ol_nedenler_order_idx" ON "danisman_ol_nedenler" USING btree ("_order");
  CREATE INDEX "danisman_ol_nedenler_parent_id_idx" ON "danisman_ol_nedenler" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_danisman_basvurulari_fk" FOREIGN KEY ("danisman_basvurulari_id") REFERENCES "public"."danisman_basvurulari"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_altbilgi_baglantilari_fk" FOREIGN KEY ("altbilgi_baglantilari_id") REFERENCES "public"."altbilgi_baglantilari"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_danisman_basvurulari_id_idx" ON "payload_locked_documents_rels" USING btree ("danisman_basvurulari_id");
  CREATE INDEX "payload_locked_documents_rels_altbilgi_baglantilari_id_idx" ON "payload_locked_documents_rels" USING btree ("altbilgi_baglantilari_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "danisman_basvurulari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "altbilgi_baglantilari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_bolumleri" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "danisman_ol_nedenler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "danisman_ol" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "danisman_basvurulari" CASCADE;
  DROP TABLE "altbilgi_baglantilari" CASCADE;
  DROP TABLE "site_bolumleri" CASCADE;
  DROP TABLE "danisman_ol_nedenler" CASCADE;
  DROP TABLE "danisman_ol" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_danisman_basvurulari_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_altbilgi_baglantilari_fk";
  
  DROP INDEX "payload_locked_documents_rels_danisman_basvurulari_id_idx";
  DROP INDEX "payload_locked_documents_rels_altbilgi_baglantilari_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "danisman_basvurulari_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "altbilgi_baglantilari_id";
  DROP TYPE "public"."enum_danisman_basvurulari_durum";
  DROP TYPE "public"."enum_danisman_basvurulari_deneyim";
  DROP TYPE "public"."enum_altbilgi_baglantilari_sutun";`)
}
