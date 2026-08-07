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
    name: '20260807_112409_bakim_durumu'
  },
];
