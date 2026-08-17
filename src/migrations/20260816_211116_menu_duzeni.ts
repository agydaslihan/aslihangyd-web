import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_menu_duzeni_sira_oge" AS ENUM('portfoy', 'mahalleler', 'harita', 'araclar', 'endeks', 'hakkimizda', 'danisman_ol', 'iletisim');
  CREATE TABLE "menu_duzeni_sira" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"oge" "enum_menu_duzeni_sira_oge" NOT NULL
  );
  
  CREATE TABLE "menu_duzeni" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "site_bolumleri" ADD COLUMN "harita" boolean DEFAULT true;
  ALTER TABLE "menu_duzeni_sira" ADD CONSTRAINT "menu_duzeni_sira_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_duzeni"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "menu_duzeni_sira_order_idx" ON "menu_duzeni_sira" USING btree ("_order");
  CREATE INDEX "menu_duzeni_sira_parent_id_idx" ON "menu_duzeni_sira" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "menu_duzeni_sira" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_duzeni" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "menu_duzeni_sira" CASCADE;
  DROP TABLE "menu_duzeni" CASCADE;
  ALTER TABLE "site_bolumleri" DROP COLUMN "harita";
  DROP TYPE "public"."enum_menu_duzeni_sira_oge";`)
}
