import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `bakim-durumu` global'i — bakım görevlerinin son çalışma kaydı.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ELLE DÜZENLENDİ. SEBEBİ KAYITTA KALSIN.
 *
 * `payload migrate:create` bu dosyaya `portfoy_bolumleri` ve
 * `portfoy_bolumleri_siralar` tablolarını da yazdı — oysa onlar
 * `20260806_093100_portfoy_bolumleri` göçünde zaten oluşturuluyor.
 *
 * Sebep: Payload göç farkını canlı veritabanına değil, bir ÖNCEKİ göçün
 * yanındaki `.json` şema fotoğrafına bakarak hesaplıyor. C aşaması
 * (portföy bölümleri) ve D aşaması (site bölümleri) ayrı dallarda
 * geliştirildi; D dalı C'den önce ayrıldığı için D'nin fotoğrafında
 * `portfoy_bolumleri` yok. Dallar birleşince fotoğraf zinciri koptu ve
 * fark her seferinde o iki tabloyu "eksik" saymaya başladı.
 *
 * Bırakılsaydı: TEMİZ bir veritabanında 8 numaralı göç tabloyu oluşturur,
 * bu göç aynı tabloyu ikinci kez oluşturmaya çalışır ve
 * `relation already exists` hatasıyla düşerdi — yani üretim ilk kurulumu
 * kırılırdı. Mevcut geliştirme veritabanında ise tablolar zaten var
 * olduğu için hata daha ilk `migrate` çağrısında çıkardı.
 *
 * Bu göçün yanındaki `.json` fotoğrafı DOĞRU (her iki tabloyu da
 * içeriyor); zincir buradan itibaren kendini onarıyor. Bir sonraki
 * `migrate:create` temiz çıktı verecek.
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "bakim_durumu_gorevler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anahtar" varchar NOT NULL,
  	"son_calisma" timestamp(3) with time zone,
  	"son_basarili_calisma" timestamp(3) with time zone,
  	"son_hata" varchar,
  	"son_islenen" numeric
  );

  CREATE TABLE "bakim_durumu" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  ALTER TABLE "bakim_durumu_gorevler" ADD CONSTRAINT "bakim_durumu_gorevler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bakim_durumu"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "bakim_durumu_gorevler_order_idx" ON "bakim_durumu_gorevler" USING btree ("_order");
  CREATE INDEX "bakim_durumu_gorevler_parent_id_idx" ON "bakim_durumu_gorevler" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE "bakim_durumu_gorevler" CASCADE;
  DROP TABLE "bakim_durumu" CASCADE;`)
}
