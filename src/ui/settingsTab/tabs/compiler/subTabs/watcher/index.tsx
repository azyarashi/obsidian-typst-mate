import { Setting } from '@components/obsidian/Setting';
import { useEffect, useState } from 'preact/hooks';
import { t } from '@/i18n';
import { settingsManager } from '@/libs';
import { features, watcher } from '@/libs/features';

export function WatcherListContainer() {
  const [subscriptionPaths, setSubscriptionPaths] = useState<string[]>([]);

  const updateSubscriptionPaths = () => {
    if (features.watcher) setSubscriptionPaths(watcher!.getSubscriptionPaths());
  };

  useEffect(() => {
    updateSubscriptionPaths();
    // 1秒ごとに更新して最新状態を保つ
    const interval = setInterval(updateSubscriptionPaths, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Setting
        build={(setting) =>
          setting
            .setHeading()
            .setName(t('settings.compiler.watcher.heading'))
            .setDesc(t('settings.compiler.watcher.desc'))
        }
      />

      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.compiler.watcher.enableWatcher.name'))
            .setDesc(t('settings.compiler.watcher.enableWatcher.desc'))
            .addToggle((toggle) =>
              toggle.setValue(settingsManager.settings.enableWatcher).onChange(async (val) => {
                settingsManager.settings.enableWatcher = val;
                await settingsManager.saveSettings();
              }),
            )
        }
      />

      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.compiler.watcher.enablePackageWatch.name'))
            .setDesc(t('settings.compiler.watcher.enablePackageWatch.desc'))
            .addToggle((toggle) =>
              toggle.setValue(settingsManager.settings.enablePackageWatch).onChange(async (val) => {
                settingsManager.settings.enablePackageWatch = val;
                await settingsManager.saveSettings();
              }),
            )
        }
      />

      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.compiler.watcher.watchExtensions.name'))
            .setDesc(t('settings.compiler.watcher.watchExtensions.desc'))
            .addTextArea((text) =>
              text
                .setValue(settingsManager.settings.watchExtensions.join(', '))
                .onChange(async (val) => {
                  const exts = val
                    .split(',')
                    .map((s) => s.trim().toLowerCase())
                    .filter((s) => 0 < s.length);
                  settingsManager.settings.watchExtensions = exts;
                  await settingsManager.saveSettings();
                })
                .inputEl.addClass('typstmate-textarea'),
            )
        }
      />

      {features.watcher && (
        <>
          <Setting
            build={(setting) =>
              setting
                .setName(t('settings.compiler.watcher.activeSubscriptions'))
                .setDesc(`Count: ${subscriptionPaths.length}`)
                .addButton((button) =>
                  button
                    .setButtonText(t('settings.compiler.watcher.unsubscribeAll'))
                    .setWarning()
                    .onClick(async () => {
                      await watcher!.unsubscribeAll();
                      updateSubscriptionPaths();
                    }),
                )
            }
          />

          {subscriptionPaths.map((path) => (
            <Setting
              key={path}
              build={(setting) => {
                setting.setName(path).setClass('typstmate-subscription-item');
                setting.addButton((button) =>
                  button.setIcon('cross').onClick(async () => {
                    await watcher!.unsubscribe(path);
                    updateSubscriptionPaths();
                  }),
                );
              }}
            />
          ))}
        </>
      )}
    </>
  );
}
