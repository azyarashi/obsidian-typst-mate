import { useState } from 'preact/hooks';
import { t } from '@/i18n';
import { extensionManager, settingsManager, tmActionsManager } from '@/libs';
import { Setting } from '@/ui/components/obsidian/Setting';

export function ActionSettingsTab() {
  const [useFile, setUseFile] = useState(settingsManager.settings.useTmactionsFile);

  const reloadActions = async () => {
    await tmActionsManager.load();
    extensionManager.reconfigure('typstmate-action');
  };

  return (
    <>
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.actions.useFileName'))
            .setDesc(t('settings.actions.useFileDesc'))
            .addToggle((toggle) =>
              toggle.setValue(useFile).onChange(async (v) => {
                setUseFile(v);
                settingsManager.settings.useTmactionsFile = v;
                await settingsManager.saveSettings();
                await reloadActions();
              }),
            )
        }
      />

      <Setting
        build={(setting) =>
          setting.addButton((button) =>
            button
              .setButtonText(t('settings.actions.reload'))
              .setCta()
              .onClick(async () => {
                await reloadActions();
              }),
          )
        }
      />
    </>
  );
}
