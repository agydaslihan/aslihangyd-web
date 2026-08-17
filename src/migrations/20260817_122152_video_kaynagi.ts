import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ilanlar_video_kaynagi" AS ENUM('yok', 'youtube', 'bunny');
  CREATE TYPE "public"."enum_mahalleler_video_kaynagi" AS ENUM('yok', 'youtube', 'bunny');
  ALTER TABLE "ilanlar" ADD COLUMN "video_kaynagi" "enum_ilanlar_video_kaynagi" DEFAULT 'yok';
  ALTER TABLE "ilanlar" ADD COLUMN "drone_video_youtube" varchar;
  ALTER TABLE "ilanlar" ADD COLUMN "drone_video_posteri_id" integer;
  ALTER TABLE "mahalleler" ADD COLUMN "video_kaynagi" "enum_mahalleler_video_kaynagi" DEFAULT 'yok';
  ALTER TABLE "mahalleler" ADD COLUMN "drone_video_youtube" varchar;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_drone_video_posteri_id_medya_id_fk" FOREIGN KEY ("drone_video_posteri_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "ilanlar_drone_video_posteri_idx" ON "ilanlar" USING btree ("drone_video_posteri_id");

  /*
   * ⚠️ VERİ GÖÇÜ — BU OLMADAN YAYINDAKİ VİDEOLAR KAYBOLUR.
   *
   * video_kaynagi sütunu DEFAULT 'yok' ile eklendiği için MEVCUT
   * satırların hepsi "video yok" oluyor. Bunny kimliği girilmiş bir
   * mahallenin videosu, şema göçünden hemen sonra sessizce görünmez hâle
   * gelirdi — hata da vermeden, çünkü teknik olarak her şey doğru.
   *
   * Kimliği dolu olan kayıtlar 'bunny' işaretleniyor: göçten önceki
   * davranış korunuyor.
   *
   * NOT: bu yorum SQL yorumu ve içinde ters tik (backtick) YOK — şablon
   * dizgesini sonlandırıp göç dosyasını derlenemez hâle getiriyordu.
   */
  UPDATE "mahalleler" SET "video_kaynagi" = 'bunny'
    WHERE "drone_video_id" IS NOT NULL AND btrim("drone_video_id") <> '';
  UPDATE "ilanlar" SET "video_kaynagi" = 'bunny'
    WHERE "drone_video_id" IS NOT NULL AND btrim("drone_video_id") <> ''`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ilanlar" DROP CONSTRAINT "ilanlar_drone_video_posteri_id_medya_id_fk";
  
  DROP INDEX "ilanlar_drone_video_posteri_idx";
  ALTER TABLE "ilanlar" DROP COLUMN "video_kaynagi";
  ALTER TABLE "ilanlar" DROP COLUMN "drone_video_youtube";
  ALTER TABLE "ilanlar" DROP COLUMN "drone_video_posteri_id";
  ALTER TABLE "mahalleler" DROP COLUMN "video_kaynagi";
  ALTER TABLE "mahalleler" DROP COLUMN "drone_video_youtube";
  DROP TYPE "public"."enum_ilanlar_video_kaynagi";
  DROP TYPE "public"."enum_mahalleler_video_kaynagi";`)
}
