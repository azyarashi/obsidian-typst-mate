import type { PackageSpec } from '@wasm';
import { useEffect, useState } from 'preact/hooks';
import { fileManager } from '@/libs';
import { t } from '@/libs/i18n';
import { Setting } from '@/ui/components/obsidian/Setting';
import { CachedPackageList } from './imported';
import { LocalPackageList } from './local';

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
