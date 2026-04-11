import { Setting } from '@components/obsidian/Setting';
import { debounce, Notice, Platform } from 'obsidian';
import { useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { t } from '@/i18n';
import { appUtils, settingsManager, typstManager } from '@/libs';
import { features } from '@/libs/features';

export function AdvancedTab() {
  const [importPath, setImportPath] = useState(settingsManager.settings.importPath ?? DEFAULT_SETTINGS.importPath);
  const [applyProcessorToMathJax, setApplyProcessorToMathJax] = useState(
    settingsManager.settings.applyProcessorToMathJax,
  );

  const debouncedUpdate = debounce(async (path: string) => {
    settingsManager.settings.importPath = path;
    await settingsManager.saveSettings();
    const files = await typstManager.collectTagFiles();
    await typstManager.wasm.store({ files });
    new Notice(t('notices.filesUpdated'));
    typstManager.rerenderAll();
  }, 500);

  return (
    <>
      {/* Features Status */}
      <Setting
        build={(setting) => {
          setting.setName(t('settings.advanced.features')).setDesc(t('settings.advanced.featuresDesc'));
          setting.controlEl.createSpan({
            text: `Node.js: ${features.node ? '✅' : '❌'}`,
            cls: 'setting-item-description',
          });
          setting.controlEl.createSpan({ text: '  ' });
          setting.controlEl.createSpan({
            text: `Watcher: ${features.watcher ? '✅' : '❌'}`,
            cls: 'setting-item-description',
          });
        }}
      />

      {/* Import Path */}
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.advanced.importPath'))
            .setDesc(t('settings.advanced.importPathDesc'))
            .addText((text) =>
              text.setValue(importPath).onChange((val) => {
                setImportPath(val);
                debouncedUpdate(val);
              }),
            );

          // Add GitHub link to name
          const nameEl = setting.nameEl;
          nameEl.createSpan({ text: ' ' });
          const githubLink = nameEl.createEl('a', {
            text: t('settings.advanced.openDetails'),
            href: 'https://github.com/azyarashi/obsidian-typst-mate/releases/tag/2.2.28',
          });
          githubLink.target = '_blank';
          githubLink.rel = 'noopener';
        }}
      />

      {/* Apply Processor to MathJax */}
      <Setting
        build={(setting) =>
          setting.setName(t('settings.advanced.applyProcessorToMathJax')).addToggle((toggle) =>
            toggle.setValue(applyProcessorToMathJax).onChange(async (v) => {
              setApplyProcessorToMathJax(v);
              settingsManager.settings.applyProcessorToMathJax = v;
              await settingsManager.saveSettings();
            }),
          )
        }
      />

      {/* Linux Libc */}
      {Platform.isLinux && (
        <Setting
          build={(setting) =>
            setting
              .setName(t('settings.advanced.linuxLibc'))
              .setDesc(t('settings.advanced.linuxLibcDesc'))
              .addDropdown((dropdown) =>
                dropdown
                  .addOptions({
                    glibc: 'glibc',
                    musl: 'musl',
                  })
                  .setValue(settingsManager.settings.linuxLibc)
                  .onChange(async (v) => {
                    settingsManager.settings.linuxLibc = v as 'glibc' | 'musl';
                    await settingsManager.saveSettings();
                    new Notice(t('notices.pluginReloaded'));
                  }),
              )
          }
        />
      )}

      {/* Watcher Extensions */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.advanced.watcherExtensions'))
            .setDesc(t('settings.advanced.watcherExtensionsDesc'))
            .addText((text) =>
              text.setValue(settingsManager.settings.watcherExtensions.join(', ')).onChange(async (val) => {
                const exts = val
                  .split(',')
                  .map((s) => s.trim().toLowerCase())
                  .filter((s) => s.length > 0);
                settingsManager.settings.watcherExtensions = exts;
                await settingsManager.saveSettings();
              }),
            )
        }
      />

      {/* Text View Extensions */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.advanced.textViewExtensions'))
            .setDesc(t('settings.advanced.textViewExtensionsDesc'))
            .addText((text) =>
              text.setValue(settingsManager.settings.textViewExtensions.join(', ')).onChange(async (val) => {
                const exts = val
                  .split(',')
                  .map((s) => s.trim().toLowerCase())
                  .filter((s) => s.length > 0);
                settingsManager.settings.textViewExtensions = exts;
                await settingsManager.saveSettings();
              }),
            )
        }
      />

      {/* Reload Plugin */}
      <Setting
        build={(setting) =>
          setting.setName(t('settings.advanced.reloadPlugin')).addButton((button) =>
            button.setButtonText(t('settings.advanced.buttons.reloadPlugin')).onClick(async () => {
              await appUtils.reloadPlugin(true);
              new Notice(t('notices.pluginReloaded'));
            }),
          )
        }
      />
    </>
  );
}
