import { Notice } from 'obsidian';
import { t } from '@/i18n';
import { appUtils, fileManager, typstManager } from '@/libs';
import { features, path, url } from '@/libs/features';
import { Setting } from '@/ui/components/obsidian/Setting';
import { SimpleList } from '@/ui/components/SimpleList';
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

  return (
    <>
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.compiler.fontsImportedFontsName'))
            .setDesc(t('settings.compiler.fontsImportedFontsDesc'));

          if (features.node) {
            setting.addButton((button) => {
              button.setTooltip(t('settings.compiler.fonts.tooltips.openFolder'));
              button.setIcon('folder');
              button.onClick(async () => {
                window.open(url!.pathToFileURL(path!.join(fileManager.baseDirPath, fileManager.fontsDirNPath)).href);
              });
            });
          }
        }}
      />

      <SimpleList
        items={fonts}
        renderItem={(fontPath) => {
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
        }}
      />
    </>
  );
}
