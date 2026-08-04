import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ilgi_noktalari_tip" AS ENUM('okul', 'universite', 'hastane', 'market', 'avm', 'park', 'sanayi', 'durak', 'istasyon', 'havalimani', 'resmi');
  CREATE TYPE "public"."enum_vergi_parametreleri_anahtar" AS ENUM('tapu_harci_orani_alici', 'doner_sermaye_ucreti', 'dask_tahmini_prim', 'ekspertiz_ucreti', 'emlak_komisyon_orani', 'komisyon_kdv_orani', 'kira_geliri_istisna_tutari', 'goturu_gider_orani', 'gelir_vergisi_dilimleri', 'deger_artis_istisna_tutari', 'deger_artis_muafiyet_yili');
  CREATE TABLE "ilgi_noktalari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ad" varchar NOT NULL,
  	"tip" "enum_ilgi_noktalari_tip" NOT NULL,
  	"konum" geometry(Point) NOT NULL,
  	"mahalle_id" integer,
  	"onemli" boolean DEFAULT false,
  	"detay" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vergi_parametreleri_dilimler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ust_sinir" numeric,
  	"oran" numeric
  );
  
  CREATE TABLE "vergi_parametreleri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"anahtar" "enum_vergi_parametreleri_anahtar" NOT NULL,
  	"deger" numeric,
  	"gecerlilik_yili" numeric NOT NULL,
  	"guncelleme_tarihi" timestamp(3) with time zone NOT NULL,
  	"kaynak" varchar,
  	"aciklama" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ilgi_noktalari_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vergi_parametreleri_id" integer;
  ALTER TABLE "ilgi_noktalari" ADD CONSTRAINT "ilgi_noktalari_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vergi_parametreleri_dilimler" ADD CONSTRAINT "vergi_parametreleri_dilimler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vergi_parametreleri"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ilgi_noktalari_tip_idx" ON "ilgi_noktalari" USING btree ("tip");
  CREATE INDEX "ilgi_noktalari_mahalle_idx" ON "ilgi_noktalari" USING btree ("mahalle_id");
  CREATE INDEX "ilgi_noktalari_updated_at_idx" ON "ilgi_noktalari" USING btree ("updated_at");
  CREATE INDEX "ilgi_noktalari_created_at_idx" ON "ilgi_noktalari" USING btree ("created_at");
  CREATE INDEX "vergi_parametreleri_dilimler_order_idx" ON "vergi_parametreleri_dilimler" USING btree ("_order");
  CREATE INDEX "vergi_parametreleri_dilimler_parent_id_idx" ON "vergi_parametreleri_dilimler" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "vergi_parametreleri_anahtar_idx" ON "vergi_parametreleri" USING btree ("anahtar");
  CREATE INDEX "vergi_parametreleri_updated_at_idx" ON "vergi_parametreleri" USING btree ("updated_at");
  CREATE INDEX "vergi_parametreleri_created_at_idx" ON "vergi_parametreleri" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ilgi_noktalari_fk" FOREIGN KEY ("ilgi_noktalari_id") REFERENCES "public"."ilgi_noktalari"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vergi_parametreleri_fk" FOREIGN KEY ("vergi_parametreleri_id") REFERENCES "public"."vergi_parametreleri"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ilgi_noktalari_id_idx" ON "payload_locked_documents_rels" USING btree ("ilgi_noktalari_id");
  CREATE INDEX "payload_locked_documents_rels_vergi_parametreleri_id_idx" ON "payload_locked_documents_rels" USING btree ("vergi_parametreleri_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ilgi_noktalari" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vergi_parametreleri_dilimler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vergi_parametreleri" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ilgi_noktalari" CASCADE;
  DROP TABLE "vergi_parametreleri_dilimler" CASCADE;
  DROP TABLE "vergi_parametreleri" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ilgi_noktalari_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vergi_parametreleri_fk";
  
  DROP INDEX "payload_locked_documents_rels_ilgi_noktalari_id_idx";
  DROP INDEX "payload_locked_documents_rels_vergi_parametreleri_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ilgi_noktalari_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vergi_parametreleri_id";
  DROP TYPE "public"."enum_ilgi_noktalari_tip";
  DROP TYPE "public"."enum_vergi_parametreleri_anahtar";`)
}
