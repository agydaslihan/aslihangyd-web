import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_olcek_duzeltmeleri_satirlar_koleksiyon" AS ENUM('mahalleler', 'ilanlar');
  CREATE TABLE "olcek_duzeltmeleri_satirlar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"koleksiyon" "enum_olcek_duzeltmeleri_satirlar_koleksiyon" NOT NULL,
  	"kayit_id" numeric NOT NULL,
  	"alan" varchar NOT NULL,
  	"eski_deger" numeric NOT NULL,
  	"yeni_deger" numeric NOT NULL,
  	"kayit_adi" varchar
  );
  
  CREATE TABLE "olcek_duzeltmeleri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ozet" varchar,
  	"geri_alindi" boolean DEFAULT false,
  	"geri_alinma_tarihi" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "olcek_duzeltmeleri_id" integer;
  ALTER TABLE "olcek_duzeltmeleri_satirlar" ADD CONSTRAINT "olcek_duzeltmeleri_satirlar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."olcek_duzeltmeleri"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "olcek_duzeltmeleri_satirlar_order_idx" ON "olcek_duzeltmeleri_satirlar" USING btree ("_order");
  CREATE INDEX "olcek_duzeltmeleri_satirlar_parent_id_idx" ON "olcek_duzeltmeleri_satirlar" USING btree ("_parent_id");
  CREATE INDEX "olcek_duzeltmeleri_updated_at_idx" ON "olcek_duzeltmeleri" USING btree ("updated_at");
  CREATE INDEX "olcek_duzeltmeleri_created_at_idx" ON "olcek_duzeltmeleri" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_olcek_duzeltmeleri_fk" FOREIGN KEY ("olcek_duzeltmeleri_id") REFERENCES "public"."olcek_duzeltmeleri"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_olcek_duzeltmeleri_id_idx" ON "payload_locked_documents_rels" USING btree ("olcek_duzeltmeleri_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "olcek_duzeltmeleri_satirlar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "olcek_duzeltmeleri" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "olcek_duzeltmeleri_satirlar" CASCADE;
  DROP TABLE "olcek_duzeltmeleri" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_olcek_duzeltmeleri_fk";
  
  DROP INDEX "payload_locked_documents_rels_olcek_duzeltmeleri_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "olcek_duzeltmeleri_id";
  DROP TYPE "public"."enum_olcek_duzeltmeleri_satirlar_koleksiyon";`)
}
