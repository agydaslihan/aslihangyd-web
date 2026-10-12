import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "gozlem_gunluk_bot_istekleri" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tur" varchar NOT NULL,
  	"ad" varchar,
  	"adet" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_bot_sayfalari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rota" varchar NOT NULL,
  	"adet" numeric DEFAULT 0,
  	"ilk_ms" numeric DEFAULT 0,
  	"son_ms" numeric DEFAULT 0
  );
  
  CREATE TABLE "gozlem_gunluk_bot_durumlari" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kod" varchar NOT NULL,
  	"adet" numeric DEFAULT 0
  );
  
  ALTER TABLE "gozlem_gunluk" ADD COLUMN "bot_toplam_istek" numeric DEFAULT 0;
  ALTER TABLE "gozlem_gunluk" ADD COLUMN "bot_ayrimi" boolean DEFAULT false;
  ALTER TABLE "gozlem_gunluk" ADD COLUMN "bot_temizlendi" boolean DEFAULT false;
  ALTER TABLE "gozlem_gunluk_bot_istekleri" ADD CONSTRAINT "gozlem_gunluk_bot_istekleri_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_bot_sayfalari" ADD CONSTRAINT "gozlem_gunluk_bot_sayfalari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gozlem_gunluk_bot_durumlari" ADD CONSTRAINT "gozlem_gunluk_bot_durumlari_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gozlem_gunluk_bot_istekleri_order_idx" ON "gozlem_gunluk_bot_istekleri" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_bot_istekleri_parent_id_idx" ON "gozlem_gunluk_bot_istekleri" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_bot_sayfalari_order_idx" ON "gozlem_gunluk_bot_sayfalari" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_bot_sayfalari_parent_id_idx" ON "gozlem_gunluk_bot_sayfalari" USING btree ("_parent_id");
  CREATE INDEX "gozlem_gunluk_bot_durumlari_order_idx" ON "gozlem_gunluk_bot_durumlari" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_bot_durumlari_parent_id_idx" ON "gozlem_gunluk_bot_durumlari" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "gozlem_gunluk_bot_istekleri" CASCADE;
  DROP TABLE "gozlem_gunluk_bot_sayfalari" CASCADE;
  DROP TABLE "gozlem_gunluk_bot_durumlari" CASCADE;
  ALTER TABLE "gozlem_gunluk" DROP COLUMN "bot_toplam_istek";
  ALTER TABLE "gozlem_gunluk" DROP COLUMN "bot_ayrimi";
  ALTER TABLE "gozlem_gunluk" DROP COLUMN "bot_temizlendi";`)
}
