import { Setting } from '@components/obsidian/Setting';
import { Notice } from 'obsidian';
import { useState } from 'preact/hooks';
import { t } from '@/i18n';
import { appUtils, fileManager, typstManager } from '@/libs';
import { features } from '@/libs/features';
import type { FontData } from '@/types/global';
import { FontModal } from '@/ui/modals/font';
import { hashLike } from '@/utils/hashLike';

interface SystemFontListProps {
  onImport: () => Promise<void>;
  importedFonts: string[];
}

export function SystemFontList({ onImport, importedFonts }: SystemFontListProps) {
  if (!features.queryLocalFonts) return null;

  const [systemFonts, setSystemFonts] = useState<FontData[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const handleQuery = async () => {
    const fonts = await window.queryLocalFonts!();
    setSystemFonts(fonts);
    setIsLoaded(true);
  };

  const importFont = async (fontData: FontData) => {
    const fontId = hashLike(fontData.fullName);
    const basename = `${fontData.postscriptName}.${fontId}.font`;
    const targetPath = `${fileManager.fontsDirNPath}/${basename}`;

    if (importedFonts.some((f) => f.endsWith(basename))) {
      new Notice(t('notices.fontAlreadyImported'));
      return;
    }

    const fontArrayBuffer = await (await fontData.blob()).arrayBuffer();

    await appUtils.app.vault.adapter.writeBinary(targetPath, fontArrayBuffer);
    await typstManager.wasm.store({
      fonts: [fontArrayBuffer],
    });

    await onImport();
    new Notice(t('notices.importedSuccessfully'));
  };

  const filtered = systemFonts.filter((f) => f.postscriptName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.compiler.fonts.importFont'))
            .setDesc(t('settings.compiler.fonts.importFontDesc'))
            .addSearch((search) => {
              search.setPlaceholder(t('settings.compiler.fonts.filterPlaceholder'));
              search.onChange((value) => setFilter(value));
            })
            .addButton((button) => {
              button.setIcon('list-restart');
              button.setTooltip(t('settings.compiler.fonts.tooltips.getFontList'));
              button.onClick(handleQuery);
            });
        }}
      />

      {!isLoaded ? (
        <div className="setting-item-description">{t('settings.compiler.fonts.clickToLoad')}</div>
      ) : (
        <>
          <div className="setting-item-description">
            {t('settings.compiler.fonts.fontCount', { count: filtered.length })}
          </div>
          <div className="typstmate-settings-table">
            {filtered.map((font) => (
              <Setting
                key={font.postscriptName}
                deps={[font]}
                build={(setting) => {
                  const fontId = hashLike(font.fullName);
                  setting
                    .setName(`${font.fullName} (${fontId})`)
                    .addButton((button) => {
                      button.setIcon('info');
                      button.setTooltip(t('settings.compiler.fonts.tooltips.getInfo'));
                      button.onClick(async () => {
                        const info = await (typstManager.wasm as any).parseFont(
                          await (await font.blob()).arrayBuffer(),
                        );
                        new FontModal(appUtils.app, info).open();
                      });
                    })
                    .addButton((button) => {
                      button.setTooltip(t('settings.compiler.fonts.tooltips.importFont'));
                      button.setIcon('plus');
                      button.onClick(() => importFont(font));
                    });
                }}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
