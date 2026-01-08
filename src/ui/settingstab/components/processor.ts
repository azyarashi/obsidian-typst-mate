import { ButtonComponent, debounce, Setting } from 'obsidian';

import {
  DefaultNewProcessor,
  type Processor,
  type ProcessorKind,
  type RenderingEngine,
  type Styling,
} from '@/libs/processor';
import type ObsidianTypstMate from '@/main';
import { ProcessorExtModal } from '@/ui/modals/processorExt';

export class ProcessorList {
  plugin: ObsidianTypstMate;
  kind: ProcessorKind;
  simple?: boolean;

  processorsEl: HTMLElement;

  constructor(
    plugin: ObsidianTypstMate,
    kind: ProcessorKind,
    containerEl: HTMLElement,
    summaryText: string,
    simple?: boolean,
  ) {
    this.plugin = plugin;
    this.kind = kind;
    this.simple = simple;

    const setting = new Setting(containerEl).setName(summaryText).setHeading();
    if (!this.simple) {
      setting.addButton((button) => {
        button.setButtonText('New');

        button.onClick(this.newProcessor.bind(this));
      });
    }

    this.processorsEl = containerEl.createEl('div');
    if (!this.plugin.settings.processor[this.kind]) {
      this.plugin.settings.processor[this.kind] = {
        processors: [],
      };
    }

    this.plugin.settings.processor[this.kind]!.processors.forEach(this.addProcessor.bind(this));
    this.numbering();
  }

  newProcessor() {
    this.plugin.settings.processor[this.kind]!.processors.unshift(DefaultNewProcessor[this.kind] as any);
    this.plugin.saveSettings();

    this.addProcessor(DefaultNewProcessor[this.kind]);

    this.processorsEl.insertBefore(this.processorsEl.lastChild!, this.processorsEl.firstChild!);

    this.numbering();
  }

  addProcessor(processor: Processor) {
    const processorEl = this.processorsEl.createDiv('typstmate-settings-processor');

    const setting = new Setting(processorEl);
    if (!this.simple) {
      setting
        .addButton((button) => {
          button.setIcon('pencil');
          button.setTooltip('Open more settings');
          button.onClick(() => {
            new ProcessorExtModal(this.plugin.app, this.plugin, this.kind, processor.id).open();
          });
        })
        .addDropdown((renderingEngineDropdown) => {
          renderingEngineDropdown.addOption('typst-svg', 'Typst SVG');
          renderingEngineDropdown.addOption('mathjax', 'MathJax');

          // @ts-expect-error: 過去バージョンとの互換性を保つため
          if (processor.renderingEngine === 'typst') {
            this.plugin.settings.processor[this.kind]!.processors[Number(processorEl.id)]!.renderingEngine =
              'typst-svg';
            processor.renderingEngine = 'typst-svg';
          }

          renderingEngineDropdown.setValue(processor.renderingEngine);

          renderingEngineDropdown.onChange((renderingEngine) => {
            this.plugin.settings.processor[this.kind]!.processors[Number(processorEl.id)]!.renderingEngine =
              renderingEngine as RenderingEngine;

            this.plugin.saveSettings();
          });
        })
        .addDropdown((stylingDropdown) => {
          switch (this.kind) {
            case 'inline':
              stylingDropdown.addOption('inline', 'inline');
              stylingDropdown.addOption('inline-middle', 'inline-middle');
              break;
            case 'display':
              stylingDropdown.addOption('block', 'block');
              stylingDropdown.addOption('block-center', 'block-center');
              break;
            case 'codeblock':
              stylingDropdown.addOption('block', 'block');
              stylingDropdown.addOption('block-center', 'block-center');
              stylingDropdown.addOption('codeblock', 'codeblock');
              break;
          }
          stylingDropdown.setValue(processor.styling);

          stylingDropdown.onChange((styling) => {
            this.plugin.settings.processor[this.kind]!.processors[Number(processorEl.id)]!.styling = styling as Styling;

            this.plugin.saveSettings();
          });
        });
    }
    setting.addText((idText) => {
      idText.setValue(processor.id);
      idText.setPlaceholder('id');

      idText.onChange(
        debounce(
          async (id) => {
            this.plugin.settings.processor[this.kind]!.processors[Number(processorEl.id)]!.id = id;

            this.plugin.saveSettings();
            await this.plugin.typst.store({
              processors: [
                {
                  kind: this.kind,
                  id: processor.id,
                  format: formatTextEl.value,
                },
              ],
            });
          },
          500,
          true,
        ),
      );
    });

    const processorBottomEl = processorEl.createEl('div');
    processorBottomEl.addClass('typstmate-settings-processor-bottom');

    if (!this.simple) {
      const moveButtonsEl = processorBottomEl.createEl('div');
      moveButtonsEl.addClass('typstmate-settings-processor-move-buttons');

      new ButtonComponent(moveButtonsEl)
        .setButtonText('Move up')
        .setIcon('chevrons-up')
        .onClick(() => this.moveProcessor(Number(processorEl.id), 'up'));
      new ButtonComponent(moveButtonsEl)
        .setButtonText('Move down')
        .setIcon('chevrons-down')
        .onClick(() => this.moveProcessor(Number(processorEl.id), 'down'));
    }

    const formatTextEl = processorBottomEl.createEl('textarea');
    formatTextEl.value = processor.format;
    formatTextEl.placeholder = 'format';

    formatTextEl.addEventListener(
      'input',
      debounce(
        async () => {
          this.plugin.settings.processor[this.kind]!.processors[Number(processorEl.id)]!.format = formatTextEl.value;

          this.plugin.saveSettings();
          await this.plugin.typst.store({
            processors: [
              {
                kind: this.kind,
                id: processor.id,
                format: formatTextEl.value,
              },
            ],
          });
        },
        500,
        true,
      ),
    );

    if (!this.simple) {
      new ButtonComponent(processorBottomEl)
        .setButtonText('Remove')
        .setIcon('trash')
        .onClick(() => this.removeProcessor(Number(processorEl.id)))
        .buttonEl.addClasses(['typstmate-button', 'typstmate-button-danger']);
    }
  }

  removeProcessor(index: number) {
    this.plugin.settings.processor[this.kind]!.processors.splice(index, 1);
    this.plugin.saveSettings();

    this.processorsEl.children.namedItem(index.toString())?.remove();

    this.numbering();
  }

  swapProcessor(index1: number, index2: number) {
    if (
      index1 < 0 ||
      index2 < 0 ||
      index1 >= this.processorsEl.children.length ||
      index2 >= this.processorsEl.children.length ||
      index1 === index2
    ) {
      return;
    }

    const processors = this.plugin.settings.processor[this.kind]!.processors;
    const processor1 = processors[index1]!;
    const processor2 = processors[index2]!;

    this.plugin.settings.processor[this.kind]!.processors[index1] = processor2;
    this.plugin.settings.processor[this.kind]!.processors[index2] = processor1;

    this.plugin.saveSettings();

    const el1 = this.processorsEl.children.namedItem(String(index1))!;
    const el2 = this.processorsEl.children.namedItem(String(index2))!;

    const tmp = document.createElement('div');
    el1.replaceWith(tmp);
    el2.replaceWith(el1);
    tmp.replaceWith(el2);

    this.numbering();
  }

  moveProcessor(index: number, direction: 'up' | 'down') {
    this.swapProcessor(index, index + (direction === 'up' ? -1 : 1));
  }

  numbering() {
    for (let i = 0; i < this.processorsEl.children.length; i++) {
      const child = this.processorsEl.children[i];
      if (!child) continue;

      child.id = i.toString();
    }
  }
}
