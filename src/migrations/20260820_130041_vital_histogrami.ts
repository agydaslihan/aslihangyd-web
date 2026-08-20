import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "gozlem_gunluk_vitaller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ad" varchar NOT NULL,
  	"cihaz" varchar,
  	"kova" numeric DEFAULT 0,
  	"adet" numeric DEFAULT 0
  );
  
  ALTER TABLE "gozlem_gunluk_vitaller" ADD CONSTRAINT "gozlem_gunluk_vitaller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gozlem_gunluk"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gozlem_gunluk_vitaller_order_idx" ON "gozlem_gunluk_vitaller" USING btree ("_order");
  CREATE INDEX "gozlem_gunluk_vitaller_parent_id_idx" ON "gozlem_gunluk_vitaller" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "gozlem_gunluk_vitaller" CASCADE;`)
}
