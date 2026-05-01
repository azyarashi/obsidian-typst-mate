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
          button.setTooltip(t('modals.font.buttons.copyFamilyName'));

          button.onClick(async () => {
            await navigator.clipboard.writeText(fontInfo.family);
            new Notice(t('notices.copied'));
          });
        });

      const addRow = (labelKey: TranslationKey, value: string) => {
        const row = this.contentEl.createDiv({ cls: 'typst-mate-font-info-row' });
        const label = t(labelKey, { value: '' }).trim();
        row.createDiv({ text: label, cls: 'label' });
        row.createDiv({ text: value, cls: 'value' });
      };

      addRow('modals.font.labels.style', fontInfo.variant.style);
      addRow('modals.font.labels.weight', fontInfo.variant.weight);
      addRow('modals.font.labels.stretch', fontInfo.variant.stretch);
      addRow('modals.font.labels.flags', fontInfo.flags);
    }
  }
}
