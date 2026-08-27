import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "gozlem_gunluk_giris_sayfalari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rota" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_saatler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"saat" numeric NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_tarayicilar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"aile" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_sehirler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ad" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  ALTER TABLE "gozlem_gunluk_giris_sayfalari" ADD CONSTRAINT "gozlem_gunluk_giris_sayfalari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_saatler" ADD CONSTRAINT "gozlem_gunluk_saatler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_tarayicilar" ADD CONSTRAINT "gozlem_gunluk_tarayicilar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_sehirler" ADD CONSTRAINT "gozlem_gunluk_sehirler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gozlem_gunluk_giris_sayfalari_order_idx" ON "gozlem_gunluk_giris_sayfalari" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_giris_sayfalari_parent_id_idx" ON "gozlem_gunluk_giris_sayfalari" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_saatler_order_idx" ON "gozlem_gunluk_saatler" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_saatler_parent_id_idx" ON "gozlem_gunluk_saatler" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_tarayicilar_order_idx" ON "gozlem_gunluk_tarayicilar" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_tarayicilar_parent_id_idx" ON "gozlem_gunluk_tarayicilar" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_sehirler_order_idx" ON "gozlem_gunluk_sehirler" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_sehirler_parent_id_idx" ON "gozlem_gunluk_sehirler" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "gozlem_gunluk_giris_sayfalari" CASCADE;
  DROP TABLE "gozlem_gunluk_saatler" CASCADE;
  DROP TABLE "gozlem_gunluk_tarayicilar" CASCADE;
  DROP TABLE "gozlem_gunluk_sehirler" CASCADE;`)
}
