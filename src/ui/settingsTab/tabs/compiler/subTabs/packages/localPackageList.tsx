import { Setting } from '@components/obsidian/Setting';
import { Notice, Platform } from 'obsidian';
import { useState } from 'preact/hooks';
import { t } from '@/i18n';
import { fileManager } from '@/libs';
import { features, fs, path } from '@/libs/features';
import type { PackageSpecWithPath } from '@/types/typst';

export function LocalPackageList() {
  if (!Platform.isDesktopApp || !features.node) return null;

  const [localPackages, setLocalPackages] = useState<PackageSpecWithPath[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleList = async () => {
    if (!fs || !path) return;

    const specs: PackageSpecWithPath[] = [];

    for (const p of fileManager.packagesDirPaths) {
      if (!fs.existsSync(p)) continue;

      try {
        const namespaces = fs.readdirSync(p);
        for (const namespace of namespaces) {
          const namespacePath = path.join(p, namespace);
          if (!fs.statSync(namespacePath).isDirectory() || namespace.endsWith('preview')) continue;

          const names = fs.readdirSync(namespacePath);
          for (const name of names) {
            const namePath = path.join(namespacePath, name);
            if (!fs.statSync(namePath).isDirectory()) continue;

            const versions = fs.readdirSync(namePath);
            for (const version of versions) {
              const versionPath = path.join(namePath, version);
              if (!fs.statSync(versionPath).isDirectory()) continue;

              const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
              if (!versionPattern.test(version)) continue;

              specs.push({
                namespace,
                name,
                version,
                path: p,
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to list local packages:', e);
      }
    }
    setLocalPackages(specs);
    setIsLoaded(true);
  };

  return (
    <>
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.compiler.packages.importLocal'))
            .setDesc(t('settings.compiler.packages.importLocalDesc'))
            .addButton((button) => {
              button.setIcon('list-restart');
              button.setTooltip(t('settings.compiler.packages.tooltips.importLocalPackage'));
              button.onClick(handleList);
            });
        }}
      />
      {isLoaded && (
        <div className="typstmate-settings-table">
          {localPackages.map((spec) => (
            <Setting
              key={`${spec.path}/${spec.namespace}/${spec.name}:${spec.version}`}
              build={(setting) => {
                setting.setName(`@${spec.namespace}/${spec.name}:${spec.version}`).addButton((button) => {
                  button.setTooltip(t('settings.compiler.packages.tooltips.importLocalPackage'));
                  button.setIcon('plus');
                  button.onClick(async () => {
                    new Notice('Implementation pending: createCache method missing in libs.');
                  });
                });
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
