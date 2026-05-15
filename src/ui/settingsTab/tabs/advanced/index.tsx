import { debounce, Notice } from 'obsidian';
import { useState } from 'preact/hooks';
import { TypstMate } from '@/api';
import { $, appUtils, metadataManager, renderManager, settingsManager } from '@/libs';
import { t, tFragment } from '@/libs/i18n';
import { DEFAULT_SETTINGS } from '@/settings';
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
    const files = await metadataManager.collectTagFiles();
    if ($.wasm) {
      await $.wasm.store({ files });
      new Notice(t('notices.filesUpdated'));
      renderManager.rerenderAll();
    }
  }, 500);

  return (
    <>
      {/* Import Path */}
      <Setting
        build={(setting) => {
          setting
            .setName(t('settings.advanced.resourcesPathName'))
            .setDesc(tFragment('settings.advanced.resourcesPathDesc'))
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
            text: t('settings.advanced.openDetailsName'),
            href: 'https://github.com/azyarashi/obsidian-typst-mate/releases/tag/2.2.28',
          });
          githubLink.target = '_blank';
          githubLink.rel = 'noopener';
        }}
      />

      {/* Apply Processor to MathJax */}
      <Setting
        build={(setting) =>
          setting.setName(t('settings.advanced.applyProcessorToMathJaxName')).addToggle((toggle) =>
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
            .setName(t('settings.advanced.textViewExtensionsName'))
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
          setting.setName(t('settings.advanced.reloadPluginName')).addButton((button) =>
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
