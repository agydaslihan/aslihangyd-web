import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "corlu_anlatisi_bloklar_kaynaklar" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ad" varchar NOT NULL,
  	"adres" varchar NOT NULL,
  	"erisim" varchar
  );
  
  CREATE TABLE "corlu_anlatisi_bloklar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"baslik" varchar NOT NULL,
  	"metin" varchar NOT NULL
  );
  
  CREATE TABLE "corlu_anlatisi" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"acik" boolean DEFAULT true,
  	"baslik" varchar DEFAULT 'Çorlu neden değerli?',
  	"giris" varchar DEFAULT 'Aşağıdaki bilgiler Çorlu’nun tamamı için geçerlidir ve resmî kaynaklara dayanır. Her başlığın altında kullandığımız kaynaklar listelenmiştir.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "corlu_anlatisi_bloklar_kaynaklar" ADD CONSTRAINT "corlu_anlatisi_bloklar_kaynaklar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corlu_anlatisi_bloklar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corlu_anlatisi_bloklar" ADD CONSTRAINT "corlu_anlatisi_bloklar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corlu_anlatisi"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "corlu_anlatisi_bloklar_kaynaklar_order_idx" ON "corlu_anlatisi_bloklar_kaynaklar" USING btree ("_order");
  CREATE INDEX "corlu_anlatisi_bloklar_kaynaklar_parent_id_idx" ON "corlu_anlatisi_bloklar_kaynaklar" USING btree ("_parent_id");
  CREATE INDEX "corlu_anlatisi_bloklar_order_idx" ON "corlu_anlatisi_bloklar" USING btree ("_order");
  CREATE INDEX "corlu_anlatisi_bloklar_parent_id_idx" ON "corlu_anlatisi_bloklar" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "corlu_anlatisi_bloklar_kaynaklar" CASCADE;
  DROP TABLE "corlu_anlatisi_bloklar" CASCADE;
  DROP TABLE "corlu_anlatisi" CASCADE;`)
}
