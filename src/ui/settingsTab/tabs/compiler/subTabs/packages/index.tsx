import { Setting } from '@components/obsidian/Setting';
import { useEffect, useState } from 'preact/hooks';
import type { PackageSpec } from '@/../pkg/typst_wasm';
import { t } from '@/i18n';
import { fileManager } from '@/libs';
import { CachedPackageList } from './cachedPackageList';
import { LocalPackageList } from './localPackageList';

export function PackagesListContainer() {
  const [cachedPackages, setCachedPackages] = useState<PackageSpec[]>([]);

  const loadCachedPackages = async () => {
    const specs = await fileManager.collectPackages(fileManager.vaultPackagesDirNPath, false);
    setCachedPackages(specs);
  };

  useEffect(() => {
    loadCachedPackages();
  }, []);

  return (
    <>
      <Setting
        build={(setting) =>
          setting
            .setHeading()
            .setName(t('settings.compiler.packages.heading'))
            .setDesc(t('settings.compiler.packages.desc'))
        }
      />

      <LocalPackageList />
      <CachedPackageList packages={cachedPackages} onRefresh={loadCachedPackages} />
    </>
  );
}
