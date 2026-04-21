import { Setting } from '@components/obsidian/Setting';
import { Notice, Platform } from 'obsidian';
import { t } from '@/i18n';
import { appUtils, fileManager, typstManager } from '@/libs';
import { FontModal } from '@/ui/modals/font';

interface LoadedFontListProps {
  fonts: string[];
  onRemove: () => Promise<void>;
}

export function LoadedFontList({ fonts, onRemove }: LoadedFontListProps) {
  const removeFont = async (fontNPath: string) => {
    await appUtils.app.vault.adapter.remove(fontNPath);
    await onRemove();
    new Notice(t('notices.removedSuccessfully'));
  };

  function FontItem({ fontPath }: { fontPath: string }) {
    const basename = fontPath.split('/').pop()!;
    const PSName = basename.split('.').slice(0, -2).join('.');
    const fontId = basename.split('.').at(-2)!;

    return (
      <Setting
        key={fontPath}
        build={(setting) => {
          setting
            .setName(`${PSName} (${fontId})`)
            .addButton((button) => {
              button.setIcon('info');
              button.setTooltip(t('settings.compiler.fonts.tooltips.getInfo'));
              button.onClick(async () => {
                const fontData = await appUtils.app.vault.adapter.readBinary(fontPath);
                const info = await (typstManager.wasm as any).parseFont(fontData);
                new FontModal(appUtils.app, info).open();
              });
            })
            .addButton((button) => {
              button.setIcon('trash');
              button.setTooltip(t('settings.compiler.fonts.tooltips.remove'));
              button.buttonEl.classList.add('typstmate-button', 'typstmate-button-danger');
              button.onClick(() => removeFont(fontPath));
            });
        }}
      />
    );
  }

  return (
    <>
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.compiler.fonts.importedFonts.name'))
            .setDesc(t('settings.compiler.fonts.importedFonts.desc'));

          if (Platform.isDesktopApp) {
            setting.addButton((button) => {
              button.setTooltip(t('settings.compiler.fonts.tooltips.openFolder'));
              button.setIcon('folder');
              button.onClick(async () => {
                window.open(`file://${fileManager.baseDirPath}/${fileManager.fontsDirNPath}`);
              });
            });
          }
        }}
      />

      {0 < fonts.length && (
        <div className="typstmate-settings-table">
          {fonts.map((fontPath) => (
            <FontItem fontPath={fontPath} />
          ))}
        </div>
      )}
    </>
  );
}
