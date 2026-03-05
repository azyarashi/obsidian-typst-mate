import { SyntaxMode } from '@typstmate/typst-syntax';
import { type App, Modal, Setting } from 'obsidian';

import { t, tFragment } from '@/i18n';
import type { ProcessorKind } from '@/libs/processor';
import type ObsidianTypstMate from '@/main';

export class ProcessorExtModal extends Modal {
  constructor(app: App, plugin: ObsidianTypstMate, kind: ProcessorKind, id: string) {
    super(app);

    const processor = plugin.settings.processor[kind]?.processors.find((processor) => processor.id === id);
    if (!processor) return;

    new Setting(this.contentEl).setName(processor.id).setHeading();

    // Preamble
    new Setting(this.contentEl).setName(t('modals.processorExt.usePreamble')).addToggle((toggle) => {
      toggle.setValue(!processor.noPreamble);

      toggle.onChange(() => {
        processor.noPreamble = !processor.noPreamble;
        plugin.saveSettings();
      });
    });

    new Setting(this.contentEl).setName(t('modals.processorExt.disableSymbolSuggest')).addToggle((toggle) => {
      toggle.setValue(processor.disableSuggest ?? false);

      toggle.onChange(() => {
        processor.disableSuggest = !processor.disableSuggest;
        plugin.saveSettings();
      });
    });

    if (kind !== 'excalidraw') {
      new Setting(this.contentEl)
        .setName(t('modals.processorExt.fitToNoteWidth'))
        .setDesc(tFragment('modals.processorExt.fitToNoteWidthDesc'))
        .addToggle((toggle) => {
          toggle.setValue(processor.fitToNoteWidth ?? false);

          toggle.onChange(() => {
            processor.fitToNoteWidth = !processor.fitToNoteWidth;
            plugin.saveSettings();
          });
        });
    }

    new Setting(this.contentEl)
      .setName(t('modals.processorExt.syntaxMode'))
      .setDesc(t('modals.processorExt.syntaxModeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('null', t('modals.processorExt.syntaxModeOptions.none'))
          .addOption(SyntaxMode.Markup.toString(), t('modals.processorExt.syntaxModeOptions.markup'))
          .addOption(SyntaxMode.Math.toString(), t('modals.processorExt.syntaxModeOptions.math'))
          .addOption(SyntaxMode.Code.toString(), t('modals.processorExt.syntaxModeOptions.code'));

        let defaultModeValue = 'null';
        if (processor.syntaxMode !== null) {
          defaultModeValue =
            processor.syntaxMode?.toString() ??
            (kind === 'codeblock' ? SyntaxMode.Markup.toString() : SyntaxMode.Math.toString());
        }

        dropdown.setValue(defaultModeValue);
        dropdown.onChange((value) => {
          processor.syntaxMode = value === 'null' ? null : parseInt(value, 10);
          plugin.saveSettings();
        });
      });

    new Setting(this.contentEl).setName(t('modals.processorExt.useReplaceAll')).addToggle((toggle) => {
      toggle.setValue(processor.useReplaceAll ?? false);

      toggle.onChange(() => {
        processor.useReplaceAll = !processor.useReplaceAll;
        plugin.saveSettings();
      });
    });
  }
}
