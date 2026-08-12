import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * İlgi noktası tiplerine `eczane` ve `oyun_alani` eklendi.
 *
 * Aslıhan'ın kararı (12 Ağustos 2026): eczane sağlık erişiminin günlük
 * ölçüsü, çocuk oyun alanı ise çocuklu aile için mahalle kalitesinin
 * doğrudan göstergesi. İkisi de yatırım skorunun sosyal donatı bileşenine
 * giriyor (`SOSYAL_DONATI_TIPLERI`).
 *
 * Karar, OSM içe aktarmasının **eşlenmeyen tür raporuna** bakılarak
 * verildi — o rapor tam olarak bunun için var.
 *
 * Restoran eklenmedi: sinyal değeri düşük, merkeziyeti başka kriterlerle
 * ölçüyoruz. Gerekçe `BILINCLI_DISARIDA` içinde yazılı ve
 * `/veri-kaynaklari` sayfasında yayınlanıyor.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Enum sırası arayüzdeki mantıksal gruplamayı izliyor: eczane sağlığın
  // yanında, oyun alanı parkın yanında.
  await db.execute(sql`
   ALTER TYPE "public"."enum_ilgi_noktalari_tip" ADD VALUE 'eczane' BEFORE 'market';
  ALTER TYPE "public"."enum_ilgi_noktalari_tip" ADD VALUE 'oyun_alani' BEFORE 'sanayi';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  /**
   * ⚠️ ÖNCE VERİYİ TAŞI, SONRA TİPİ DARALT.
   *
   * Üretilen `down` doğrudan enum'u yeniden kuruyordu. Tek bir eczane ya da
   * oyun alanı kaydı varsa son `USING tip::enum` dönüşümü patlar ve göç
   * yarıda kalır — yarıda kalan bir geri alma, hiç geri alamamaktan kötüdür.
   * (Aynı tuzağa `20260812_172431_onay_bekliyor_durumu` göçünde de düşülmüştü.)
   *
   * Kayıtlar en yakın anlamlı tipe çekiliyor, silinmiyor:
   *  · `eczane` → `hastane` — tipin etiketi zaten "Hastane / sağlık"
   *  · `oyun_alani` → `park` — ikisi de yeşil alan / rekreasyon
   *
   * Veri kaybı yok; yalnızca ayrım kabalaşıyor. Geri alma sonrası tekrar
   * içe aktarma yapılırsa ayrım kendiliğinden geri gelir.
   */
  await db.execute(sql`
   ALTER TABLE "ilgi_noktalari" ALTER COLUMN "tip" SET DATA TYPE text;
  UPDATE "ilgi_noktalari" SET "tip" = 'hastane' WHERE "tip" = 'eczane';
  UPDATE "ilgi_noktalari" SET "tip" = 'park' WHERE "tip" = 'oyun_alani';
  DROP TYPE "public"."enum_ilgi_noktalari_tip";
  CREATE TYPE "public"."enum_ilgi_noktalari_tip" AS ENUM('okul', 'universite', 'hastane', 'market', 'avm', 'park', 'sanayi', 'durak', 'istasyon', 'havalimani', 'resmi');
  ALTER TABLE "ilgi_noktalari" ALTER COLUMN "tip" SET DATA TYPE "public"."enum_ilgi_noktalari_tip" USING "tip"::"public"."enum_ilgi_noktalari_tip";`)
}
