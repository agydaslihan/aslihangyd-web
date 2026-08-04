import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ilanlar_durum" AS ENUM('taslak', 'yayinda', 'rezerve', 'satildi', 'yetki_bitti');
  CREATE TYPE "public"."enum_ilanlar_tip" AS ENUM('satilik', 'kiralik');
  CREATE TYPE "public"."enum_ilanlar_kategori" AS ENUM('konut', 'isyeri', 'arsa', 'depo', 'fabrika');
  CREATE TYPE "public"."enum_ilanlar_tapu_durumu" AS ENUM('kat_mulkiyeti', 'kat_irtifaki', 'arsa_tapulu', 'hisseli', 'mustakil');
  CREATE TYPE "public"."enum_ilanlar_eids_durum" AS ENUM('yetkili', 'suresi_doldu', 'yetkisiz', 'tapusuz', 'yabanci_malik');
  CREATE TYPE "public"."enum_ilanlar_para_birimi" AS ENUM('TRY', 'USD', 'EUR');
  CREATE TYPE "public"."enum_ilanlar_oda_sayisi" AS ENUM('1+0', '1+1', '2+1', '3+1', '4+1', '5+1');
  CREATE TYPE "public"."enum_ilanlar_isinma" AS ENUM('dogalgaz_kombi', 'merkezi', 'merkezi_pay_olcer', 'yerden_isitma', 'klima', 'soba', 'yok');
  CREATE TYPE "public"."enum_ilanlar_kullanim_durumu" AS ENUM('bos', 'kiracili', 'mulk_sahibi');
  CREATE TYPE "public"."enum_talepler_durum" AS ENUM('yeni', 'arandi', 'randevu', 'teklif', 'kazanildi', 'kaybedildi');
  CREATE TYPE "public"."enum_talepler_tip" AS ENUM('alici', 'satici', 'kiraci', 'ticari', 'degerleme', 'genel');
  CREATE TYPE "public"."enum_talepler_kaynak" AS ENUM('organik', 'dogrudan', 'whatsapp', 'instagram', 'google_ads', 'tavsiye', 'diger');
  CREATE TYPE "public"."enum_kullanicilar_rol" AS ENUM('yonetici', 'danisman');
  CREATE TYPE "public"."enum_kurumsal_bilgiler_sosyal_medya_platform" AS ENUM('instagram', 'youtube', 'facebook', 'linkedin', 'x');
  CREATE TABLE "ilanlar_ozellikler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"metin" varchar NOT NULL
  );
  
  CREATE TABLE "ilanlar_gorseller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"gorsel_id" integer NOT NULL
  );
  
  CREATE TABLE "ilanlar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"durum" "enum_ilanlar_durum" DEFAULT 'taslak' NOT NULL,
  	"slug" varchar NOT NULL,
  	"danisman_id" integer,
  	"one_cikan" boolean DEFAULT false,
  	"gizli_portfoy" boolean DEFAULT false,
  	"baslik" varchar NOT NULL,
  	"tip" "enum_ilanlar_tip" DEFAULT 'satilik' NOT NULL,
  	"kategori" "enum_ilanlar_kategori" DEFAULT 'konut' NOT NULL,
  	"ozet" varchar,
  	"aciklama" jsonb,
  	"seo_baslik" varchar,
  	"seo_aciklama" varchar,
  	"seo_gorsel_id" integer,
  	"il" varchar DEFAULT 'Tekirdağ' NOT NULL,
  	"ilce" varchar DEFAULT 'Çorlu' NOT NULL,
  	"mahalle_id" integer NOT NULL,
  	"adres" varchar,
  	"konum" geometry(Point),
  	"ada" varchar,
  	"parsel" varchar,
  	"tapu_durumu" "enum_ilanlar_tapu_durumu",
  	"eids_durum" "enum_ilanlar_eids_durum",
  	"tasinmaz_no" varchar,
  	"eids_yetki_baslangic" timestamp(3) with time zone,
  	"eids_yetki_bitis" timestamp(3) with time zone,
  	"fiyat" numeric,
  	"para_birimi" "enum_ilanlar_para_birimi" DEFAULT 'TRY',
  	"tahmini_kira" numeric,
  	"aidat" numeric,
  	"pazarlik_payi" boolean DEFAULT false,
  	"kira_carpani" numeric,
  	"brut_getiri" numeric,
  	"amortisman_yili" numeric,
  	"brut_m2" numeric,
  	"net_m2" numeric,
  	"oda_sayisi" "enum_ilanlar_oda_sayisi",
  	"banyo_sayisi" numeric,
  	"bulundugu_kat" varchar,
  	"toplam_kat" numeric,
  	"bina_yasi" numeric,
  	"isinma" "enum_ilanlar_isinma",
  	"kullanim_durumu" "enum_ilanlar_kullanim_durumu",
  	"esyali" boolean DEFAULT false,
  	"krediye_uygun" boolean DEFAULT false,
  	"asansor" boolean DEFAULT false,
  	"kat_plani_id" integer,
  	"drone_video_id" varchar,
  	"sanal_tur_url" varchar,
  	"yetkilendirme_sozlesmesi_id" integer,
  	"gosterme_belgesi_id" integer,
  	"belge_notu" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mahalleler_one_cikan_ozellikler" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"metin" varchar NOT NULL
  );
  
  CREATE TABLE "mahalleler_sik_sorulanlar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"soru" varchar NOT NULL,
  	"cevap" varchar NOT NULL
  );
  
  CREATE TABLE "mahalleler" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"yayinda" boolean DEFAULT false,
  	"slug" varchar NOT NULL,
  	"veri_eksik" boolean DEFAULT false,
  	"sira_no" numeric DEFAULT 100,
  	"ad" varchar NOT NULL,
  	"ozet" varchar,
  	"kapak_gorseli_id" integer,
  	"seo_baslik" varchar,
  	"seo_aciklama" varchar,
  	"seo_gorsel_id" integer,
  	"icerik" jsonb,
  	"ortalama_m2_satis" numeric,
  	"ortalama_kira" numeric,
  	"kira_carpani" numeric,
  	"degisim12_ay" numeric,
  	"nufus" numeric,
  	"gozlem_sayisi" numeric,
  	"verilerin_tarihi" timestamp(3) with time zone,
  	"veri_kaynagi" varchar,
  	"merkez" geometry(Point),
  	"sinir" jsonb,
  	"drone_video_id" varchar,
  	"drone_video_posteri_id" integer,
  	"sanal_tur_url" varchar,
  	"yatirim_skoru_toplam" numeric,
  	"yatirim_skoru_hesaplanma_tarihi" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "talepler_notlar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tarih" timestamp(3) with time zone,
  	"metin" varchar NOT NULL
  );
  
  CREATE TABLE "talepler" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"durum" "enum_talepler_durum" DEFAULT 'yeni' NOT NULL,
  	"skor" numeric,
  	"son_temas" timestamp(3) with time zone,
  	"ad_soyad" varchar NOT NULL,
  	"tip" "enum_talepler_tip" DEFAULT 'genel' NOT NULL,
  	"telefon" varchar,
  	"eposta" varchar,
  	"mesaj" varchar,
  	"ilgili_ilan_id" integer,
  	"ilgili_mahalle_id" integer,
  	"butce_min" numeric,
  	"butce_max" numeric,
  	"kaynak" "enum_talepler_kaynak" DEFAULT 'dogrudan',
  	"gonderildigi_sayfa" varchar,
  	"kvkk_onay" boolean DEFAULT false NOT NULL,
  	"kvkk_onay_tarihi" timestamp(3) with time zone,
  	"saklama_bitis" timestamp(3) with time zone,
  	"pazarlama_onayi" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sayfalar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"yayinda" boolean DEFAULT false,
  	"slug" varchar NOT NULL,
  	"hukuki_metin" boolean DEFAULT false,
  	"baslik" varchar NOT NULL,
  	"ozet" varchar,
  	"icerik" jsonb,
  	"seo_baslik" varchar,
  	"seo_aciklama" varchar,
  	"seo_gorsel_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "medya" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"kaynak" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_kucuk_url" varchar,
  	"sizes_kucuk_width" numeric,
  	"sizes_kucuk_height" numeric,
  	"sizes_kucuk_mime_type" varchar,
  	"sizes_kucuk_filesize" numeric,
  	"sizes_kucuk_filename" varchar,
  	"sizes_orta_url" varchar,
  	"sizes_orta_width" numeric,
  	"sizes_orta_height" numeric,
  	"sizes_orta_mime_type" varchar,
  	"sizes_orta_filesize" numeric,
  	"sizes_orta_filename" varchar,
  	"sizes_buyuk_url" varchar,
  	"sizes_buyuk_width" numeric,
  	"sizes_buyuk_height" numeric,
  	"sizes_buyuk_mime_type" varchar,
  	"sizes_buyuk_filesize" numeric,
  	"sizes_buyuk_filename" varchar,
  	"sizes_paylasim_url" varchar,
  	"sizes_paylasim_width" numeric,
  	"sizes_paylasim_height" numeric,
  	"sizes_paylasim_mime_type" varchar,
  	"sizes_paylasim_filesize" numeric,
  	"sizes_paylasim_filename" varchar
  );
  
  CREATE TABLE "kurumsal_bilgiler_sosyal_medya" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_kurumsal_bilgiler_sosyal_medya_platform" NOT NULL,
  	"adres" varchar NOT NULL
  );
  
  CREATE TABLE "kurumsal_bilgiler" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ticaret_unvani" varchar,
  	"yetki_belgesi_no" varchar,
  	"mersis_no" varchar,
  	"vergi_dairesi" varchar,
  	"vergi_no" varchar,
  	"sorumlu_danisman_belge_no" varchar,
  	"adres" varchar,
  	"telefon" varchar,
  	"eposta" varchar,
  	"whatsapp" varchar,
  	"calisma_saatleri" varchar,
  	"veri_sorumlusu" varchar,
  	"verbis_kayit_no" varchar,
  	"kvkk_basvuru_epostasi" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "kullanicilar" ADD COLUMN "rol" "enum_kullanicilar_rol" DEFAULT 'danisman' NOT NULL;
  ALTER TABLE "kullanicilar" ADD COLUMN "telefon" varchar;
  ALTER TABLE "kullanicilar" ADD COLUMN "fotograf_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ilanlar_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "mahalleler_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "talepler_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sayfalar_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "medya_id" integer;
  ALTER TABLE "ilanlar_ozellikler" ADD CONSTRAINT "ilanlar_ozellikler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ilanlar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ilanlar_gorseller" ADD CONSTRAINT "ilanlar_gorseller_gorsel_id_medya_id_fk" FOREIGN KEY ("gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ilanlar_gorseller" ADD CONSTRAINT "ilanlar_gorseller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ilanlar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_danisman_id_kullanicilar_id_fk" FOREIGN KEY ("danisman_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_seo_gorsel_id_medya_id_fk" FOREIGN KEY ("seo_gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_kat_plani_id_medya_id_fk" FOREIGN KEY ("kat_plani_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_yetkilendirme_sozlesmesi_id_medya_id_fk" FOREIGN KEY ("yetkilendirme_sozlesmesi_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ilanlar" ADD CONSTRAINT "ilanlar_gosterme_belgesi_id_medya_id_fk" FOREIGN KEY ("gosterme_belgesi_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mahalleler_one_cikan_ozellikler" ADD CONSTRAINT "mahalleler_one_cikan_ozellikler_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."mahalleler"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mahalleler_sik_sorulanlar" ADD CONSTRAINT "mahalleler_sik_sorulanlar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."mahalleler"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mahalleler" ADD CONSTRAINT "mahalleler_kapak_gorseli_id_medya_id_fk" FOREIGN KEY ("kapak_gorseli_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mahalleler" ADD CONSTRAINT "mahalleler_seo_gorsel_id_medya_id_fk" FOREIGN KEY ("seo_gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mahalleler" ADD CONSTRAINT "mahalleler_drone_video_posteri_id_medya_id_fk" FOREIGN KEY ("drone_video_posteri_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "talepler_notlar" ADD CONSTRAINT "talepler_notlar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."talepler"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talepler" ADD CONSTRAINT "talepler_ilgili_ilan_id_ilanlar_id_fk" FOREIGN KEY ("ilgili_ilan_id") REFERENCES "public"."ilanlar"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "talepler" ADD CONSTRAINT "talepler_ilgili_mahalle_id_mahalleler_id_fk" FOREIGN KEY ("ilgili_mahalle_id") REFERENCES "public"."mahalleler"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sayfalar" ADD CONSTRAINT "sayfalar_seo_gorsel_id_medya_id_fk" FOREIGN KEY ("seo_gorsel_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "kurumsal_bilgiler_sosyal_medya" ADD CONSTRAINT "kurumsal_bilgiler_sosyal_medya_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kurumsal_bilgiler"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ilanlar_ozellikler_order_idx" ON "ilanlar_ozellikler" USING btree ("_order");
  CREATE INDEX "ilanlar_ozellikler_parent_id_idx" ON "ilanlar_ozellikler" USING btree ("_parent_id");
  CREATE INDEX "ilanlar_gorseller_order_idx" ON "ilanlar_gorseller" USING btree ("_order");
  CREATE INDEX "ilanlar_gorseller_parent_id_idx" ON "ilanlar_gorseller" USING btree ("_parent_id");
  CREATE INDEX "ilanlar_gorseller_gorsel_idx" ON "ilanlar_gorseller" USING btree ("gorsel_id");
  CREATE INDEX "ilanlar_durum_idx" ON "ilanlar" USING btree ("durum");
  CREATE UNIQUE INDEX "ilanlar_slug_idx" ON "ilanlar" USING btree ("slug");
  CREATE INDEX "ilanlar_danisman_idx" ON "ilanlar" USING btree ("danisman_id");
  CREATE INDEX "ilanlar_gizli_portfoy_idx" ON "ilanlar" USING btree ("gizli_portfoy");
  CREATE INDEX "ilanlar_tip_idx" ON "ilanlar" USING btree ("tip");
  CREATE INDEX "ilanlar_kategori_idx" ON "ilanlar" USING btree ("kategori");
  CREATE INDEX "ilanlar_seo_gorsel_idx" ON "ilanlar" USING btree ("seo_gorsel_id");
  CREATE INDEX "ilanlar_mahalle_idx" ON "ilanlar" USING btree ("mahalle_id");
  CREATE INDEX "ilanlar_eids_durum_idx" ON "ilanlar" USING btree ("eids_durum");
  CREATE INDEX "ilanlar_tasinmaz_no_idx" ON "ilanlar" USING btree ("tasinmaz_no");
  CREATE INDEX "ilanlar_eids_yetki_bitis_idx" ON "ilanlar" USING btree ("eids_yetki_bitis");
  CREATE INDEX "ilanlar_fiyat_idx" ON "ilanlar" USING btree ("fiyat");
  CREATE INDEX "ilanlar_oda_sayisi_idx" ON "ilanlar" USING btree ("oda_sayisi");
  CREATE INDEX "ilanlar_kat_plani_idx" ON "ilanlar" USING btree ("kat_plani_id");
  CREATE INDEX "ilanlar_yetkilendirme_sozlesmesi_idx" ON "ilanlar" USING btree ("yetkilendirme_sozlesmesi_id");
  CREATE INDEX "ilanlar_gosterme_belgesi_idx" ON "ilanlar" USING btree ("gosterme_belgesi_id");
  CREATE INDEX "ilanlar_updated_at_idx" ON "ilanlar" USING btree ("updated_at");
  CREATE INDEX "ilanlar_created_at_idx" ON "ilanlar" USING btree ("created_at");
  CREATE INDEX "mahalleler_one_cikan_ozellikler_order_idx" ON "mahalleler_one_cikan_ozellikler" USING btree ("_order");
  CREATE INDEX "mahalleler_one_cikan_ozellikler_parent_id_idx" ON "mahalleler_one_cikan_ozellikler" USING btree ("_parent_id");
  CREATE INDEX "mahalleler_sik_sorulanlar_order_idx" ON "mahalleler_sik_sorulanlar" USING btree ("_order");
  CREATE INDEX "mahalleler_sik_sorulanlar_parent_id_idx" ON "mahalleler_sik_sorulanlar" USING btree ("_parent_id");
  CREATE INDEX "mahalleler_yayinda_idx" ON "mahalleler" USING btree ("yayinda");
  CREATE UNIQUE INDEX "mahalleler_slug_idx" ON "mahalleler" USING btree ("slug");
  CREATE INDEX "mahalleler_veri_eksik_idx" ON "mahalleler" USING btree ("veri_eksik");
  CREATE INDEX "mahalleler_kapak_gorseli_idx" ON "mahalleler" USING btree ("kapak_gorseli_id");
  CREATE INDEX "mahalleler_seo_gorsel_idx" ON "mahalleler" USING btree ("seo_gorsel_id");
  CREATE INDEX "mahalleler_drone_video_posteri_idx" ON "mahalleler" USING btree ("drone_video_posteri_id");
  CREATE INDEX "mahalleler_updated_at_idx" ON "mahalleler" USING btree ("updated_at");
  CREATE INDEX "mahalleler_created_at_idx" ON "mahalleler" USING btree ("created_at");
  CREATE INDEX "talepler_notlar_order_idx" ON "talepler_notlar" USING btree ("_order");
  CREATE INDEX "talepler_notlar_parent_id_idx" ON "talepler_notlar" USING btree ("_parent_id");
  CREATE INDEX "talepler_durum_idx" ON "talepler" USING btree ("durum");
  CREATE INDEX "talepler_tip_idx" ON "talepler" USING btree ("tip");
  CREATE INDEX "talepler_ilgili_ilan_idx" ON "talepler" USING btree ("ilgili_ilan_id");
  CREATE INDEX "talepler_ilgili_mahalle_idx" ON "talepler" USING btree ("ilgili_mahalle_id");
  CREATE INDEX "talepler_saklama_bitis_idx" ON "talepler" USING btree ("saklama_bitis");
  CREATE INDEX "talepler_updated_at_idx" ON "talepler" USING btree ("updated_at");
  CREATE INDEX "talepler_created_at_idx" ON "talepler" USING btree ("created_at");
  CREATE INDEX "sayfalar_yayinda_idx" ON "sayfalar" USING btree ("yayinda");
  CREATE UNIQUE INDEX "sayfalar_slug_idx" ON "sayfalar" USING btree ("slug");
  CREATE INDEX "sayfalar_seo_gorsel_idx" ON "sayfalar" USING btree ("seo_gorsel_id");
  CREATE INDEX "sayfalar_updated_at_idx" ON "sayfalar" USING btree ("updated_at");
  CREATE INDEX "sayfalar_created_at_idx" ON "sayfalar" USING btree ("created_at");
  CREATE INDEX "medya_updated_at_idx" ON "medya" USING btree ("updated_at");
  CREATE INDEX "medya_created_at_idx" ON "medya" USING btree ("created_at");
  CREATE UNIQUE INDEX "medya_filename_idx" ON "medya" USING btree ("filename");
  CREATE INDEX "medya_sizes_kucuk_sizes_kucuk_filename_idx" ON "medya" USING btree ("sizes_kucuk_filename");
  CREATE INDEX "medya_sizes_orta_sizes_orta_filename_idx" ON "medya" USING btree ("sizes_orta_filename");
  CREATE INDEX "medya_sizes_buyuk_sizes_buyuk_filename_idx" ON "medya" USING btree ("sizes_buyuk_filename");
  CREATE INDEX "medya_sizes_paylasim_sizes_paylasim_filename_idx" ON "medya" USING btree ("sizes_paylasim_filename");
  CREATE INDEX "kurumsal_bilgiler_sosyal_medya_order_idx" ON "kurumsal_bilgiler_sosyal_medya" USING btree ("_order");
  CREATE INDEX "kurumsal_bilgiler_sosyal_medya_parent_id_idx" ON "kurumsal_bilgiler_sosyal_medya" USING btree ("_parent_id");
  ALTER TABLE "kullanicilar" ADD CONSTRAINT "kullanicilar_fotograf_id_medya_id_fk" FOREIGN KEY ("fotograf_id") REFERENCES "public"."medya"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ilanlar_fk" FOREIGN KEY ("ilanlar_id") REFERENCES "public"."ilanlar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mahalleler_fk" FOREIGN KEY ("mahalleler_id") REFERENCES "public"."mahalleler"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_talepler_fk" FOREIGN KEY ("talepler_id") REFERENCES "public"."talepler"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sayfalar_fk" FOREIGN KEY ("sayfalar_id") REFERENCES "public"."sayfalar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_medya_fk" FOREIGN KEY ("medya_id") REFERENCES "public"."medya"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "kullanicilar_fotograf_idx" ON "kullanicilar" USING btree ("fotograf_id");
  CREATE INDEX "payload_locked_documents_rels_ilanlar_id_idx" ON "payload_locked_documents_rels" USING btree ("ilanlar_id");
  CREATE INDEX "payload_locked_documents_rels_mahalleler_id_idx" ON "payload_locked_documents_rels" USING btree ("mahalleler_id");
  CREATE INDEX "payload_locked_documents_rels_talepler_id_idx" ON "payload_locked_documents_rels" USING btree ("talepler_id");
  CREATE INDEX "payload_locked_documents_rels_sayfalar_id_idx" ON "payload_locked_documents_rels" USING btree ("sayfalar_id");
  CREATE INDEX "payload_locked_documents_rels_medya_id_idx" ON "payload_locked_documents_rels" USING btree ("medya_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ilanlar_ozellikler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ilanlar_gorseller" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ilanlar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mahalleler_one_cikan_ozellikler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mahalleler_sik_sorulanlar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "mahalleler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talepler_notlar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talepler" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sayfalar" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "medya" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kurumsal_bilgiler_sosyal_medya" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kurumsal_bilgiler" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ilanlar_ozellikler" CASCADE;
  DROP TABLE "ilanlar_gorseller" CASCADE;
  DROP TABLE "ilanlar" CASCADE;
  DROP TABLE "mahalleler_one_cikan_ozellikler" CASCADE;
  DROP TABLE "mahalleler_sik_sorulanlar" CASCADE;
  DROP TABLE "mahalleler" CASCADE;
  DROP TABLE "talepler_notlar" CASCADE;
  DROP TABLE "talepler" CASCADE;
  DROP TABLE "sayfalar" CASCADE;
  DROP TABLE "medya" CASCADE;
  DROP TABLE "kurumsal_bilgiler_sosyal_medya" CASCADE;
  DROP TABLE "kurumsal_bilgiler" CASCADE;
  ALTER TABLE "kullanicilar" DROP CONSTRAINT "kullanicilar_fotograf_id_medya_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ilanlar_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_mahalleler_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_talepler_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sayfalar_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_medya_fk";
  
  DROP INDEX "kullanicilar_fotograf_idx";
  DROP INDEX "payload_locked_documents_rels_ilanlar_id_idx";
  DROP INDEX "payload_locked_documents_rels_mahalleler_id_idx";
  DROP INDEX "payload_locked_documents_rels_talepler_id_idx";
  DROP INDEX "payload_locked_documents_rels_sayfalar_id_idx";
  DROP INDEX "payload_locked_documents_rels_medya_id_idx";
  ALTER TABLE "kullanicilar" DROP COLUMN "rol";
  ALTER TABLE "kullanicilar" DROP COLUMN "telefon";
  ALTER TABLE "kullanicilar" DROP COLUMN "fotograf_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ilanlar_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "mahalleler_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "talepler_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sayfalar_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "medya_id";
  DROP TYPE "public"."enum_ilanlar_durum";
  DROP TYPE "public"."enum_ilanlar_tip";
  DROP TYPE "public"."enum_ilanlar_kategori";
  DROP TYPE "public"."enum_ilanlar_tapu_durumu";
  DROP TYPE "public"."enum_ilanlar_eids_durum";
  DROP TYPE "public"."enum_ilanlar_para_birimi";
  DROP TYPE "public"."enum_ilanlar_oda_sayisi";
  DROP TYPE "public"."enum_ilanlar_isinma";
  DROP TYPE "public"."enum_ilanlar_kullanim_durumu";
  DROP TYPE "public"."enum_talepler_durum";
  DROP TYPE "public"."enum_talepler_tip";
  DROP TYPE "public"."enum_talepler_kaynak";
  DROP TYPE "public"."enum_kullanicilar_rol";
  DROP TYPE "public"."enum_kurumsal_bilgiler_sosyal_medya_platform";`)
}
