import { type App, Modal, Setting } from 'obsidian';

import { t } from '@/i18n';
import type { Diagnostic } from '@/libs/worker';

export class DiagnosticModal extends Modal {
  constructor(app: App, diagnosticArray: Diagnostic[]) {
    super(app);

    for (const diagnostic of diagnosticArray) {
      new Setting(this.contentEl).setName(diagnostic.message).setHeading();

      for (const hint of diagnostic.hints)
        new Setting(this.contentEl).setName(t('modals.diagnostic.hintPrefix', { hint }));
    }
  }
}
