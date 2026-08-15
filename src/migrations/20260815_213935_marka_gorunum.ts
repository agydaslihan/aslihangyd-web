import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "marka_gorunum" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_adi" varchar,
  	"slogan" varchar,
  	"logo_id" integer,
  	"logo_koyu_id" integer,
  	"simge_kaynak_id" integer,
  	"og_gorseli_id" integer,
  	"acik_tema_zemin" varchar DEFAULT '#fbfaf7' NOT NULL,
  	"acik_tema_bolum_zemin" varchar DEFAULT '#f2ebe3' NOT NULL,
  	"acik_tema_metin" varchar DEFAULT '#3d2b2f' NOT NULL,
  	"acik_tema_vurgu" varchar DEFAULT '#844632' NOT NULL,
  	"acik_tema_buton_zemin" varchar DEFAULT '#4f7c6a' NOT NULL,
  	"acik_tema_buton_metin" varchar DEFAULT '#ffffff' NOT NULL,
  	"acik_tema_yumusak_zemin" varchar DEFAULT '#e8cfc8' NOT NULL,
  	"acik_tema_dekoratif_cizgi" varchar DEFAULT '#c9a96e' NOT NULL,
  	"acik_tema_koyu_bant_zemin" varchar DEFAULT '#3d2b2f' NOT NULL,
  	"acik_tema_koyu_bant_metin" varchar DEFAULT '#ffffff' NOT NULL,
  	"koyu_tema_zemin" varchar DEFAULT '#3d2b2f' NOT NULL,
  	"koyu_tema_bolum_zemin" varchar DEFAULT '#635356' NOT NULL,
  	"koyu_tema_metin" varchar DEFAULT '#fbfaf7' NOT NULL,
  	"koyu_tema_vurgu" varchar DEFAULT '#e8cfc8' NOT NULL,
  	"koyu_tema_buton_zemin" varchar DEFAULT '#86a597' NOT NULL,
  	"koyu_tema_buton_metin" varchar DEFAULT '#3d2b2f' NOT NULL,
  	"koyu_tema_yumusak_zemin" varchar DEFAULT '#814431' NOT NULL,
  	"koyu_tema_dekoratif_cizgi" varchar DEFAULT '#c9a96e' NOT NULL,
  	"koyu_tema_koyu_bant_zemin" varchar DEFAULT '#635356' NOT NULL,
  	"koyu_tema_koyu_bant_metin" varchar DEFAULT '#fbfaf7' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "marka_gorunum" ADD CONSTRAINT "marka_gorunum_logo_id_medya_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "marka_gorunum" ADD CONSTRAINT "marka_gorunum_logo_koyu_id_medya_id_fk" FOREIGN KEY ("logo_koyu_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "marka_gorunum" ADD CONSTRAINT "marka_gorunum_simge_kaynak_id_medya_id_fk" FOREIGN KEY ("simge_kaynak_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "marka_gorunum" ADD CONSTRAINT "marka_gorunum_og_gorseli_id_medya_id_fk" FOREIGN KEY ("og_gorseli_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "marka_gorunum_logo_idx" ON "marka_gorunum" USING btree ("logo_id");
  CREATE INDEX "marka_gorunum_logo_koyu_idx" ON "marka_gorunum" USING btree ("logo_koyu_id");
  CREATE INDEX "marka_gorunum_simge_kaynak_idx" ON "marka_gorunum" USING btree ("simge_kaynak_id");
  CREATE INDEX "marka_gorunum_og_gorseli_idx" ON "marka_gorunum" USING btree ("og_gorseli_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "marka_gorunum" CASCADE;`)
}
