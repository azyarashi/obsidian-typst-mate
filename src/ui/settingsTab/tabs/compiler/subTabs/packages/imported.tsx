import { Notice } from 'obsidian';
import type { PackageSpec } from '@/../pkg/typst_wasm';
import { t } from '@/i18n';
import { appUtils, fileManager } from '@/libs';
import { features, path, url } from '@/libs/features';
import { Setting } from '@/ui/components/obsidian/Setting';
import { SimpleList } from '@/ui/components/SimpleList';

interface CachedPackageListProps {
  packages: PackageSpec[];
  onRefresh: () => Promise<void>;
}

export function CachedPackageList({ packages, onRefresh }: CachedPackageListProps) {
  const handleRemove = async (spec: PackageSpec) => {
    const packageNPath = `${fileManager.vaultPackagesDirNPath}/${spec.namespace}/${spec.name}/${spec.version}`;
    try {
      await appUtils.app.vault.adapter.remove(packageNPath);
      await onRefresh();
      new Notice(t('notices.removedSuccessfully'));
    } catch {
      new Notice(t('notices.failedToRemove'));
    }
  };

  return (
    <>
      <Setting
        build={(setting) => {
          setting.setName(t('settings.compiler.packages.importedPackages'));
          if (features.node) {
            setting.addButton((button) => {
              button.setTooltip(t('settings.compiler.packages.tooltips.openFolder'));
              button.setIcon('folder');
              button.onClick(async () => {
                // TODO
                window.open(
                  url!.pathToFileURL(path!.join(fileManager.baseDirPath, fileManager.vaultPackagesDirNPath)).href,
                );
              });
            });
          }
        }}
      />

      <SimpleList
        items={packages}
        renderItem={(spec) => (
          <Setting
            key={`${spec.namespace}/${spec.name}:${spec.version}`}
            build={(setting) => {
              setting.setName(`@${spec.namespace}/${spec.name}:${spec.version}`).addButton((delButton) => {
                delButton.buttonEl.classList.add('typstmate-button', 'typstmate-button-danger');
                delButton.setTooltip(t('settings.compiler.packages.tooltips.remove'));
                delButton.setIcon('trash');
                delButton.onClick(() => handleRemove(spec));
              });
            }}
          />
        )}
      />
    </>
  );
}
