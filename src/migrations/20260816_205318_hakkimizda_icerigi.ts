import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * /hakkimizda içeriği globali.
 *
 * ⚠️ ÜRETİLEN SQL ELLE BUDANDI — `mahalle_yaklasik` sütunu çıkarıldı.
 *
 * `migrate:create` onu yeniden eklemişti: yeni göç bir öncekinin `.json`
 * şema fotoğrafına göre çıkarılıyor ve main'deki son fotoğraf
 * (`hero_slider`) #58 birleşmeden önce alınmıştı — o sütunu bilmiyor.
 *
 * Aynı tuzağa iki kez düşüldü; artık `src/migrations/migrations.test.ts`
 * bunu statik olarak yakalıyor.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "hakkimizda_ek_gorseller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gorsel_id" integer NOT NULL,
  	"aciklama" varchar
  );
  
  CREATE TABLE "hakkimizda" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"giris_metni" varchar,
  	"icerik" jsonb,
  	"portre_id" integer,
  	"portre_alt_metni" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  ALTER TABLE "hakkimizda_ek_gorseller" ADD CONSTRAINT "hakkimizda_ek_gorseller_gorsel_id_medya_id_fk" FOREIGN KEY ("gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hakkimizda_ek_gorseller" ADD CONSTRAINT "hakkimizda_ek_gorseller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."hakkimizda"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "hakkimizda" ADD CONSTRAINT "hakkimizda_portre_id_medya_id_fk" FOREIGN KEY ("portre_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "hakkimizda_ek_gorseller_order_idx" ON "hakkimizda_ek_gorseller" USING btree ("_order");
  CREATE INDEX "hakkimizda_ek_gorseller_parent_id_idx" ON "hakkimizda_ek_gorseller" USING btree ("_parent_id");
  CREATE INDEX "hakkimizda_ek_gorseller_gorsel_idx" ON "hakkimizda_ek_gorseller" USING btree ("gorsel_id");
  CREATE INDEX "hakkimizda_portre_idx" ON "hakkimizda" USING btree ("portre_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hakkimizda_ek_gorseller" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "hakkimizda" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "hakkimizda_ek_gorseller" CASCADE;
  DROP TABLE "hakkimizda" CASCADE;`)
}
