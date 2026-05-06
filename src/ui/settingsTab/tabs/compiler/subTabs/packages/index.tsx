import type { PackageSpec } from '@wasm';
import { useEffect, useState } from 'preact/hooks';
import { t } from '@/i18n';
import { fileManager } from '@/libs';
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
