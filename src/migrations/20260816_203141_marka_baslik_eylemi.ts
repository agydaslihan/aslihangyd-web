import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Marka panelindeki başlık eylemi alanları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜRETİLEN SQL ELLE BUDANDI — DAĞITIMI KIRACAKTI.
 *
 * `payload migrate:create` bu göçe şunları da eklemişti:
 *
 *   ALTER TABLE "ilgi_noktalari" ADD COLUMN "mahalle_yaklasik" …
 *   CREATE INDEX "ilgi_noktalari_mahalle_yaklasik_idx" …
 *
 * O sütun `20260816_114114_poi_mahalle_yaklasik` göçünde ZATEN ekleniyor.
 * İkinci kez eklemek `column … already exists` hatası verir ve üretim
 * dağıtımında göç adımı komple durur.
 *
 * SEBEBİ: iki göç PARALEL DALLARDA üretildi. `migrate:create` yeni göçü
 * bir öncekinin `.json` şema fotoğrafına göre çıkarıyor; `hero_slider`
 * fotoğrafı ise #58 birleşmeden önce alınmıştı ve `mahalle_yaklasik`i
 * bilmiyor. Diff onu "eksik" sanıp yeniden ekledi.
 *
 * Yerelde yakalandı: `pnpm payload migrate` kırmızı verdi. Üretimde
 * yakalansaydı §5.3'ün 3. adımı yarıda kalır ve site yeni şemayla
 * eşleşmeyen bir kodla açılırdı.
 *
 * ⚠️ Bu göçün `.json` fotoğrafı DOĞRU (gerçek güncel şemanın tamamı).
 * Yani zincir buradan itibaren onarılmış oluyor; bundan sonraki göçler
 * doğru tabana göre çıkarılacak.
 * ─────────────────────────────────────────────────────────────────────────
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "marka_gorunum" ADD COLUMN "baslik_eylem_metni" varchar;
  ALTER TABLE "marka_gorunum" ADD COLUMN "baslik_eylem_adresi" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "marka_gorunum" DROP COLUMN "baslik_eylem_metni";
  ALTER TABLE "marka_gorunum" DROP COLUMN "baslik_eylem_adresi";`)
}
