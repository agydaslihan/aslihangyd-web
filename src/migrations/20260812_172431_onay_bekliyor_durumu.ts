import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * İlan onay kuyruğu — `onay_bekliyor` durumu.
 *
 * Danışman ilanı hazırlayıp onaya gönderir, yönetici EİDS alanlarını
 * doğrulayıp yayınlar. Kurallar: `src/lib/onay/kurallar.ts`
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ÜRETİLEN GÖÇTEN BİR SATIR ÇIKARILDI — ELLE DÜZENLENDİ
 *
 * `payload migrate:create` şu satırı da üretti:
 *
 *     ALTER TABLE "kullanicilar" ALTER COLUMN "rol" DROP NOT NULL;
 *
 * Bu, rol tabanlı yetkilendirmede `rol` alanına eklenen **alan seviyesi
 * erişim kuralının** yan etkisi: Payload, erişim denetimli bir alanın
 * yazmadan çıkarılabileceğini varsayıp sütunu nullable işaretliyor.
 *
 * Satır bilinçli olarak SİLİNDİ. "Her kullanıcının bir rolü vardır" bir
 * veri bütünlüğü güvencesidir ve kaybetmenin karşılığı yok:
 *
 *  · Alan `required: true` ve varsayılanı var.
 *  · `Kullanicilar` kancası her oluşturmada rolü açıkça yazıyor.
 *  · Alan seviyesi erişim yalnızca GÜNCELLEMEDE alanı düşürür; güncellemede
 *    sütun eski değerini korur, NULL olmaz.
 *  · `rolAl`/`yoneticiMi` çözülemeyen rolü zaten yönetici saymıyor — yani
 *    NULL bir rol yetki açığı değil, ama sessiz bir bozuk kayıt olurdu.
 *
 * ⚠️ Sonraki `migrate:create` çağrıları bu satırı yeniden önerecek.
 * Yeniden silin; şema ile Payload'ın beklentisi arasındaki bu fark
 * bilinçlidir. (docs/ILERLEME.md — "İlan onay akışı")
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Enum'a yeni değer: taslaktan sonra, yayından önce — mantıksal akış sırası.
  await db.execute(sql`
   ALTER TYPE "public"."enum_ilanlar_durum" ADD VALUE 'onay_bekliyor' BEFORE 'yayinda';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  /**
   * ⚠️ ÖNCE VERİYİ TAŞI, SONRA TİPİ DARALT.
   *
   * Üretilen `down` doğrudan enum'u yeniden kuruyordu. Onay kuyruğunda tek
   * bir ilan varsa son `USING durum::enum` dönüşümü patlar ve göç yarıda
   * kalır — yarıda kalan bir geri alma, hiç geri alamamaktan kötüdür.
   *
   * Onay bekleyen ilanlar taslağa çekiliyor: ziyaretçiye zaten görünmüyorlar
   * ve taslak, veri kaybı olmayan en yakın durum.
   */
  await db.execute(sql`
   ALTER TABLE "ilanlar" ALTER COLUMN "durum" SET DATA TYPE text;
  UPDATE "ilanlar" SET "durum" = 'taslak' WHERE "durum" = 'onay_bekliyor';
  ALTER TABLE "ilanlar" ALTER COLUMN "durum" SET DEFAULT 'taslak'::text;
  DROP TYPE "public"."enum_ilanlar_durum";
  CREATE TYPE "public"."enum_ilanlar_durum" AS ENUM('taslak', 'yayinda', 'rezerve', 'satildi', 'yetki_bitti');
  ALTER TABLE "ilanlar" ALTER COLUMN "durum" SET DEFAULT 'taslak'::"public"."enum_ilanlar_durum";
  ALTER TABLE "ilanlar" ALTER COLUMN "durum" SET DATA TYPE "public"."enum_ilanlar_durum" USING "durum"::"public"."enum_ilanlar_durum";`)
}
