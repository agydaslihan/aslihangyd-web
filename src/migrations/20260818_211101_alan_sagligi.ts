import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "alan_sagligi" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alan" varchar,
  	"saglik" varchar,
  	"ozet" varchar,
  	"eylem" varchar,
  	"bitis_tarihi" varchar,
  	"kalan_gun" numeric,
  	"durumlar" varchar,
  	"cozumleme" varchar,
  	"sorgu_zamani" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "alan_sagligi" CASCADE;`)
}
