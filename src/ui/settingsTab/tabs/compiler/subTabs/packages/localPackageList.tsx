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

    // TODO
    try {
      const results = (
        await Promise.all(
          fileManager.localPackagesDirPaths.map(async (dirPath) => {
            return (await fileManager.collectPackages(dirPath, true)).map((spec) => ({
              ...spec,
              path: dirPath,
            }));
          }),
        )
      ).flat();
      setLocalPackages(results);
    } catch (e) {
      console.error('Failed to list local packages:', e);
    }

    setIsLoaded(true);
  };

  return (
    <>
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.compiler.packages.importLocal.name'))
            .setDesc(t('settings.compiler.packages.importLocal.desc'))
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
