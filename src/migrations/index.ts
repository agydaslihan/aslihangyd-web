import * as migration_20260803_212313_postgis_ve_ilk_sema from './20260803_212313_postgis_ve_ilk_sema';
import * as migration_20260804_055955_faz1_veri_modeli from './20260804_055955_faz1_veri_modeli';
import * as migration_20260804_071058_faz2_vergi_ve_poi from './20260804_071058_faz2_vergi_ve_poi';
import * as migration_20260804_074445_faz2b_degerleme from './20260804_074445_faz2b_degerleme';
import * as migration_20260804_080414_faz2c_gozlemler from './20260804_080414_faz2c_gozlemler';
import * as migration_20260804_082730_faz4_yatirim_skoru from './20260804_082730_faz4_yatirim_skoru';
import * as migration_20260804_091230_faz2b_eslestirme_profili from './20260804_091230_faz2b_eslestirme_profili';
import * as migration_20260806_093100_portfoy_bolumleri from './20260806_093100_portfoy_bolumleri';
import * as migration_20260806_094944_faz_d_site_bolumleri from './20260806_094944_faz_d_site_bolumleri';
import * as migration_20260807_112409_bakim_durumu from './20260807_112409_bakim_durumu';
import * as migration_20260808_074503_gorsel_butcesi from './20260808_074503_gorsel_butcesi';
import * as migration_20260812_172431_onay_bekliyor_durumu from './20260812_172431_onay_bekliyor_durumu';
import * as migration_20260812_174328_ai_arama_bolumu from './20260812_174328_ai_arama_bolumu';
import * as migration_20260812_175841_osm_poi_kaynak from './20260812_175841_osm_poi_kaynak';
import * as migration_20260812_203042_poi_eczane_oyun_alani from './20260812_203042_poi_eczane_oyun_alani';
import * as migration_20260813_133647_cephe_yonu from './20260813_133647_cephe_yonu';
import * as migration_20260814_203859_mahalle_yerlesim_ve_sinir_kaynagi from './20260814_203859_mahalle_yerlesim_ve_sinir_kaynagi';
import * as migration_20260814_210730_rayic_google_ve_kullanim_sayaci from './20260814_210730_rayic_google_ve_kullanim_sayaci';

export const migrations = [
  {
    up: migration_20260803_212313_postgis_ve_ilk_sema.up,
    down: migration_20260803_212313_postgis_ve_ilk_sema.down,
    name: '20260803_212313_postgis_ve_ilk_sema',
  },
  {
    up: migration_20260804_055955_faz1_veri_modeli.up,
    down: migration_20260804_055955_faz1_veri_modeli.down,
    name: '20260804_055955_faz1_veri_modeli',
  },
  {
    up: migration_20260804_071058_faz2_vergi_ve_poi.up,
    down: migration_20260804_071058_faz2_vergi_ve_poi.down,
    name: '20260804_071058_faz2_vergi_ve_poi',
  },
  {
    up: migration_20260804_074445_faz2b_degerleme.up,
    down: migration_20260804_074445_faz2b_degerleme.down,
    name: '20260804_074445_faz2b_degerleme',
  },
  {
    up: migration_20260804_080414_faz2c_gozlemler.up,
    down: migration_20260804_080414_faz2c_gozlemler.down,
    name: '20260804_080414_faz2c_gozlemler',
  },
  {
    up: migration_20260804_082730_faz4_yatirim_skoru.up,
    down: migration_20260804_082730_faz4_yatirim_skoru.down,
    name: '20260804_082730_faz4_yatirim_skoru',
  },
  {
    up: migration_20260804_091230_faz2b_eslestirme_profili.up,
    down: migration_20260804_091230_faz2b_eslestirme_profili.down,
    name: '20260804_091230_faz2b_eslestirme_profili',
  },
  {
    up: migration_20260806_093100_portfoy_bolumleri.up,
    down: migration_20260806_093100_portfoy_bolumleri.down,
    name: '20260806_093100_portfoy_bolumleri',
  },
  {
    up: migration_20260806_094944_faz_d_site_bolumleri.up,
    down: migration_20260806_094944_faz_d_site_bolumleri.down,
    name: '20260806_094944_faz_d_site_bolumleri',
  },
  {
    up: migration_20260807_112409_bakim_durumu.up,
    down: migration_20260807_112409_bakim_durumu.down,
    name: '20260807_112409_bakim_durumu',
  },
  {
    up: migration_20260808_074503_gorsel_butcesi.up,
    down: migration_20260808_074503_gorsel_butcesi.down,
    name: '20260808_074503_gorsel_butcesi',
  },
  {
    up: migration_20260812_172431_onay_bekliyor_durumu.up,
    down: migration_20260812_172431_onay_bekliyor_durumu.down,
    name: '20260812_172431_onay_bekliyor_durumu',
  },
  {
    up: migration_20260812_174328_ai_arama_bolumu.up,
    down: migration_20260812_174328_ai_arama_bolumu.down,
    name: '20260812_174328_ai_arama_bolumu',
  },
  {
    up: migration_20260812_175841_osm_poi_kaynak.up,
    down: migration_20260812_175841_osm_poi_kaynak.down,
    name: '20260812_175841_osm_poi_kaynak',
  },
  {
    up: migration_20260812_203042_poi_eczane_oyun_alani.up,
    down: migration_20260812_203042_poi_eczane_oyun_alani.down,
    name: '20260812_203042_poi_eczane_oyun_alani',
  },
  {
    up: migration_20260813_133647_cephe_yonu.up,
    down: migration_20260813_133647_cephe_yonu.down,
    name: '20260813_133647_cephe_yonu',
  },
  {
    up: migration_20260814_203859_mahalle_yerlesim_ve_sinir_kaynagi.up,
    down: migration_20260814_203859_mahalle_yerlesim_ve_sinir_kaynagi.down,
    name: '20260814_203859_mahalle_yerlesim_ve_sinir_kaynagi',
  },
  {
    up: migration_20260814_210730_rayic_google_ve_kullanim_sayaci.up,
    down: migration_20260814_210730_rayic_google_ve_kullanim_sayaci.down,
    name: '20260814_210730_rayic_google_ve_kullanim_sayaci'
  },
];
