import * as migration_20260803_212313_postgis_ve_ilk_sema from './20260803_212313_postgis_ve_ilk_sema';
import * as migration_20260804_055955_faz1_veri_modeli from './20260804_055955_faz1_veri_modeli';
import * as migration_20260804_071058_faz2_vergi_ve_poi from './20260804_071058_faz2_vergi_ve_poi';

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
    name: '20260804_071058_faz2_vergi_ve_poi'
  },
];
