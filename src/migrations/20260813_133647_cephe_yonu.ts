import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * İlanlara cephe yönü — Güneş Haritası'nın girdisi.
 *
 * Çoklu seçim olduğu için Payload ayrı bir tablo açıyor; alan boş
 * bırakılabiliyor ve boş bırakılması BEKLENEN bir durum: cephe yönü
 * koordinattan çıkarılamaz, bilinmiyorsa tahmin edilmiyor.
 *
 * ⚠️ Bu göç veri kaybı riski TAŞIMIYOR — enum daraltma değil, yeni tablo.
 * `down` tabloyu ve tipi düşürüyor; içindeki cephe bilgisi de gidiyor ama
 * o bilgi yalnızca bu alanda yaşıyor ve geri alma zaten "bu özelliği
 * kaldır" demek. `CASCADE` yalnızca bu tablonun kendi kısıtını düşürüyor.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ilanlar_cephe_yonu" AS ENUM('kuzey', 'kuzeydogu', 'dogu', 'guneydogu', 'guney', 'guneybati', 'bati', 'kuzeybati');
  CREATE TABLE "ilanlar_cephe_yonu" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_ilanlar_cephe_yonu",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "ilanlar_cephe_yonu" ADD CONSTRAINT "ilanlar_cephe_yonu_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ilanlar"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ilanlar_cephe_yonu_order_idx" ON "ilanlar_cephe_yonu" USING btree ("order");
  CREATE INDEX "ilanlar_cephe_yonu_parent_idx" ON "ilanlar_cephe_yonu" USING btree ("parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ilanlar_cephe_yonu" CASCADE;
  DROP TYPE "public"."enum_ilanlar_cephe_yonu";`)
}
