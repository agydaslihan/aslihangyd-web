import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "ilce_olgulari" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nufus" numeric DEFAULT 306939,
  	"nufus_yili" numeric DEFAULT 2025,
  	"nufus_kaynagi" varchar DEFAULT 'TÜİK ADNKS 2025',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ilce_olgulari" CASCADE;`)
}
