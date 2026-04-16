import { Setting } from '@components/obsidian/Setting';
import { Notice, Platform } from 'obsidian';
import type { PackageSpec } from '@/../pkg/typst_wasm';
import { t } from '@/i18n';
import { appUtils, fileManager } from '@/libs';

interface CachedPackageListProps {
  packages: PackageSpec[];
  onRefresh: () => Promise<void>;
}

export function CachedPackageList({ packages, onRefresh }: CachedPackageListProps) {
  const handleRemove = async (spec: PackageSpec) => {
    const pkgPath = `${fileManager.vaultPackagesDirNPath}/${spec.namespace}/${spec.name}/${spec.version}`;
    try {
      await appUtils.app.vault.adapter.remove(pkgPath);
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
          setting.setName(t('settings.compiler.packages.cachedPackages'));
          if (Platform.isDesktopApp) {
            setting.addButton((button) => {
              button.setTooltip(t('settings.compiler.packages.tooltips.openFolder'));
              button.setIcon('folder');
              button.onClick(async () => {
                window.open(`file://${fileManager.baseDirPath}/${fileManager.vaultPackagesDirNPath}`);
              });
            });
          }
        }}
      />

      {packages.length > 0 && (
        <div className="typstmate-settings-table">
          {packages.map((spec) => (
            <Setting
              key={`${spec.namespace}/${spec.name}:${spec.version}`}
              build={(setting) => {
                setting
                  .setName(`@${spec.namespace}/${spec.name}:${spec.version}`)
                  .addButton((cacheButton) => {
                    cacheButton.setTooltip(t('settings.compiler.packages.tooltips.cache'));
                    cacheButton.setIcon('package');
                    cacheButton.onClick(async () => {
                      new Notice('Implementation pending: createCache method missing in libs.');
                    });
                  })
                  .addButton((delButton) => {
                    delButton.buttonEl.classList.add('typstmate-button', 'typstmate-button-danger');
                    delButton.setTooltip(t('settings.compiler.packages.tooltips.remove'));
                    delButton.setIcon('trash');
                    delButton.onClick(() => handleRemove(spec));
                  });
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
