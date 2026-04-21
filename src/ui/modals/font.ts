import { type App, Modal, Notice, Setting } from 'obsidian';
import type { FontInfo } from '@/../pkg/typst_wasm';
import { type TranslationKey, t } from '@/i18n';

import './font.css';

export class FontModal extends Modal {
  constructor(app: App, fontInfoArray: FontInfo[]) {
    super(app);

    this.modalEl.addClass('typst-mate-font-modal');

    for (const fontInfo of fontInfoArray) {
      new Setting(this.contentEl)
        .setName(fontInfo.family)
        .setHeading()
        .addButton((button) => {
          button.setIcon('copy');
          button.setTooltip(t('modals.font.copyFamilyName'));

          button.onClick(async () => {
            await navigator.clipboard.writeText(fontInfo.family);
            new Notice(t('notices.copied'));
          });
        });

      const addRow = (labelKey: TranslationKey, value: string) => {
        const setting = new Setting(this.contentEl);
        const fullText = t(labelKey, { value });
        const colonIndex = fullText.indexOf(':');

        if (colonIndex !== -1) {
          const label = fullText.substring(0, colonIndex + 1);
          const val = fullText.substring(colonIndex + 1);

          setting.nameEl.empty();
          setting.nameEl.createSpan({ text: label, cls: 'typst-mate-font-modal-label' });
          setting.nameEl.createSpan({ text: val });
        } else {
          setting.setName(fullText);
        }
      };

      addRow('modals.font.labels.style', fontInfo.variant.style);
      addRow('modals.font.labels.weight', fontInfo.variant.weight);
      addRow('modals.font.labels.stretch', fontInfo.variant.stretch);
      addRow('modals.font.labels.flags', fontInfo.flags);
    }
  }
}
