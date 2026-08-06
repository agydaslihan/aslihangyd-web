import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_portfoy_bolumleri_siralar_olcut" AS ENUM('yatirimGetirisi', 'yeniEklenenler', 'gizliPortfoy', 'ticariSanayi');
  CREATE TABLE "portfoy_bolumleri_siralar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"olcut" "enum_portfoy_bolumleri_siralar_olcut" NOT NULL,
  	"aktif" boolean DEFAULT true,
  	"baslik" varchar,
  	"alt_baslik" varchar,
  	"adet" numeric DEFAULT 8
  );
  
  CREATE TABLE "portfoy_bolumleri" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "portfoy_bolumleri_siralar" ADD CONSTRAINT "portfoy_bolumleri_siralar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portfoy_bolumleri"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "portfoy_bolumleri_siralar_order_idx" ON "portfoy_bolumleri_siralar" USING btree ("_order");
  CREATE INDEX "portfoy_bolumleri_siralar_parent_id_idx" ON "portfoy_bolumleri_siralar" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "portfoy_bolumleri_siralar" CASCADE;
  DROP TABLE "portfoy_bolumleri" CASCADE;
  DROP TYPE "public"."enum_portfoy_bolumleri_siralar_olcut";`)
}
