import { Setting } from '@components/obsidian/Setting';
import { useEffect, useState } from 'preact/hooks';
import { t } from '@/i18n';
import { appUtils, fileManager } from '@/libs';
import type { PackageSpec } from '@/types/typst';
import { CachedPackageList } from './cachedPackageList';
import { LocalPackageList } from './localPackageList';

export function PackagesListContainer() {
  const [cachedPackages, setCachedPackages] = useState<PackageSpec[]>([]);

  const loadCachedPackages = async () => {
    try {
      const specs: PackageSpec[] = [];

      const namespaceFolders = (await appUtils.app.vault.adapter.list(fileManager.packagesDirNPath)).folders;
      for (const namespaceFolder of namespaceFolders) {
        const namespace = namespaceFolder.split('/').pop()!;

        const nameFolders = (await appUtils.app.vault.adapter.list(namespaceFolder)).folders;
        for (const nameFolder of nameFolders) {
          const name = nameFolder.split('/').pop()!;

          const versionFolders = (await appUtils.app.vault.adapter.list(nameFolder)).folders;
          for (const versionFolder of versionFolders) {
            const version = versionFolder.split('/').pop()!;

            specs.push({ namespace, name, version });
          }
        }
      }
      setCachedPackages(specs);
    } catch {
      setCachedPackages([]);
    }
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
