import * as migration_20260803_212313_postgis_ve_ilk_sema from './20260803_212313_postgis_ve_ilk_sema';

export const migrations = [
  {
    up: migration_20260803_212313_postgis_ve_ilk_sema.up,
    down: migration_20260803_212313_postgis_ve_ilk_sema.down,
    name: '20260803_212313_postgis_ve_ilk_sema'
  },
];
