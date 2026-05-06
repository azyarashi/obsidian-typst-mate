import { debounce, Notice } from 'obsidian';
import { useState } from 'preact/hooks';
import { DEFAULT_SETTINGS } from '@/data/settings';
import { appUtils, rendererManager, settingsManager } from '@/libs';
import { t, tFragment } from '@/libs/i18n';
import { Setting } from '@/ui/components/obsidian/Setting';

export function AdvancedTab() {
  const [importPath, setImportPath] = useState(
    settingsManager.settings.resourcesPath ?? DEFAULT_SETTINGS.resourcesPath,
  );
  const [applyProcessorToMathJax, setApplyProcessorToMathJax] = useState(
    settingsManager.settings.applyProcessorToMathJax,
  );

  const debouncedUpdate = debounce(async (path: string) => {
    settingsManager.settings.resourcesPath = path;
    await settingsManager.saveSettings();
    const files = await rendererManager.collectTagFiles();
    await rendererManager.wasm.store({ files });
    new Notice(t('notices.filesUpdated'));
    rendererManager.rerenderAll();
  }, 500);

  return (
    <>
      {/* Import Path */}
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.advanced.importPath.name'))
            .setDesc(tFragment('settings.advanced.importPath.desc'))
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
            text: t('settings.advanced.openDetails.name'),
            href: 'https://github.com/azyarashi/obsidian-typst-mate/releases/tag/2.2.28',
          });
          githubLink.target = '_blank';
          githubLink.rel = 'noopener';
        }}
      />

      {/* Apply Processor to MathJax */}
      <Setting
        build={(setting) =>
          setting.setName(t('settings.advanced.applyProcessorToMathJax.name')).addToggle((toggle) =>
            toggle.setValue(applyProcessorToMathJax).onChange(async (v) => {
              setApplyProcessorToMathJax(v);
              settingsManager.settings.applyProcessorToMathJax = v;
              await settingsManager.saveSettings();
            }),
          )
        }
      />

      {/* Text View Extensions */}
      <Setting
        build={(setting) =>
          setting
            .setName(t('settings.advanced.textViewExtensions.name'))
            .setDesc(t('settings.advanced.textViewExtensions.desc'))
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
          setting.setName(t('settings.advanced.reloadPlugin.name')).addButton((button) =>
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
