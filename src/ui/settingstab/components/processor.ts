import { ButtonComponent, debounce, Notice, Setting, setIcon } from 'obsidian';

import { DEFAULT_SETTINGS } from '@/data/settings';
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

  processorsEl: HTMLElement;
  draggingIndex: number | null = null;

  constructor(plugin: ObsidianTypstMate, kind: ProcessorKind, containerEl: HTMLElement, title: string) {
    this.plugin = plugin;
    this.kind = kind;

    // プロセッサー追加ボタンを追加
    const setting = new Setting(containerEl).setName(title).setHeading();
    setting.addButton((button) => {
      button.setButtonText('New');
      button.onClick(this.newProcessor.bind(this));
    });

    // 各プロセッサーを配置するコンテナを生成
    this.processorsEl = containerEl.createEl('div');
    // プロセッサーの設定がない場合は初期化
    // 空idのものは次の checkProcessorWithEmptyId で自動的に追加される
    if (!this.plugin.settings.processor[this.kind])
      this.plugin.settings.processor[this.kind] = {
        processors: [],
      };

    this.checkProcessorWithEmptyId();

    this.plugin.settings.processor[this.kind].processors.forEach(this.addProcessor.bind(this));
    this.numbering();
  }

  /**
   * 1. 空idのプロセッサーが複数存在する場合, format が一番長いものを残す
   * 2. 空idのプロセッサーを最後に配置
   */
  checkProcessorWithEmptyId() {
    const processors = this.plugin.settings.processor[this.kind].processors;
    const genericProcessors = processors as Processor[];

    const emptyIdProcessors = genericProcessors.filter((p) => p.id === '');
    const otherProcessors = genericProcessors.filter((p) => p.id !== '');

    let targetEmpty: Processor | null = null;
    let hasChanges = false;

    // 複数の空IDのプロセッサーが存在する場合
    if (emptyIdProcessors.length === 1) targetEmpty = emptyIdProcessors[0]!;
    // 複数の空IDのプロセッサーが存在する場合
    else if (1 < emptyIdProcessors.length) {
      // format の長さでソート
      emptyIdProcessors.sort((a, b) => b.format.length - a.format.length);

      targetEmpty = emptyIdProcessors[0]!;
      hasChanges = true;
    }
    // 空IDのプロセッサーが存在しない場合
    else {
      const defaultProcessors = DEFAULT_SETTINGS.processor[this.kind].processors as Processor[];
      if (defaultProcessors) {
        const defaultEmpty = defaultProcessors.find((p) => p.id === '');
        if (defaultEmpty) {
          targetEmpty = JSON.parse(JSON.stringify(defaultEmpty));
          hasChanges = true;
        }
      }
    }

    if (!hasChanges) {
      const currentLast = genericProcessors[genericProcessors.length - 1];
      if (currentLast !== targetEmpty) hasChanges = true;
    }

    // 一番下にあるか確認
    if (targetEmpty) {
      const newOrder = [...otherProcessors, targetEmpty];

      if (hasChanges) {
        (this.plugin.settings.processor[this.kind].processors as any) = newOrder;
        this.plugin.saveSettings();
      }
    }
  }

  newProcessor() {
    this.plugin.settings.processor[this.kind].processors.unshift(DefaultNewProcessor[this.kind] as any);
    this.plugin.saveSettings();

    this.addProcessor(DefaultNewProcessor[this.kind]);
    this.processorsEl.insertBefore(this.processorsEl.lastChild!, this.processorsEl.firstChild!);

    this.numbering();
  }

  addProcessor(processor: Processor) {
    const processorEl = this.processorsEl.createDiv('typstmate-settings-processor');
    processorEl.draggable = processor.id !== '';

    processorEl.addEventListener('dragstart', (e) => {
      if (processorEl.draggable === false) {
        e.preventDefault();
        return;
      }
      this.draggingIndex = Number(processorEl.id);
      e.dataTransfer?.setData('text/plain', String(this.draggingIndex));
      processorEl.addClass('dragging');
    });

    processorEl.addEventListener('dragend', () => {
      processorEl.removeClass('dragging');
      this.draggingIndex = null;
      this.updateDraggability();
    });

    processorEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      processorEl.addClass('drag-over');
    });

    processorEl.addEventListener('dragleave', () => {
      processorEl.removeClass('drag-over');
    });

    processorEl.addEventListener('drop', (e) => {
      e.preventDefault();
      processorEl.removeClass('drag-over');
      const targetIndex = Number(processorEl.id);

      if (this.draggingIndex !== null && this.draggingIndex !== targetIndex)
        this.moveProcessorToIndex(this.draggingIndex, targetIndex);
    });

    const setting = new Setting(processorEl);

    const handleEl = createDiv('typstmate-drag-handle-icon');
    if (processor.id === '') handleEl.hide();

    setIcon(handleEl, 'grip-vertical');

    setting.settingEl.prepend(handleEl);

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
          this.plugin.settings.processor[this.kind].processors[Number(processorEl.id)]!.renderingEngine = 'typst-svg';
          processor.renderingEngine = 'typst-svg';
        }

        renderingEngineDropdown.setValue(processor.renderingEngine);

        renderingEngineDropdown.onChange((renderingEngine) => {
          this.plugin.settings.processor[this.kind].processors[Number(processorEl.id)]!.renderingEngine =
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
          this.plugin.settings.processor[this.kind].processors[Number(processorEl.id)]!.styling = styling as Styling;

          this.plugin.saveSettings();
        });
      });

    setting.addText((idText) => {
      idText.setValue(processor.id);
      idText.setPlaceholder('id');
      if (processor.id === '') {
        idText.setDisabled(true);
        return;
      }

      idText.inputEl.addEventListener('input', () => {
        let val = idText.inputEl.value;
        const clean = val.replace(/[/:\\¥]/g, '');
        if (val !== clean) {
          val = clean;
          idText.inputEl.value = val;
        }

        const currentIndex = Number(processorEl.id);
        const processors = this.plugin.settings.processor[this.kind].processors;
        const isDuplicate = processors.some((p, i) => i !== currentIndex && p.id === val && val !== '');

        if (isDuplicate) idText.inputEl.addClass('typstmate-processor-id-error');
        else idText.inputEl.removeClass('typstmate-processor-id-error');
      });

      idText.onChange(
        debounce(
          async (id) => {
            const cleanId = id.replace(/[/:\\¥]/g, '');
            if (cleanId !== id) idText.setValue(cleanId);

            const currentIndex = Number(processorEl.id);
            const processors = this.plugin.settings.processor[this.kind].processors;

            if (cleanId === '') {
              idText.setValue(processors[currentIndex]!.id);
              return new Notice('ID cannot be empty');
            }

            const isDuplicate = processors.some((p, i) => i !== currentIndex && p.id === cleanId && cleanId !== '');
            if (isDuplicate) return new Notice('ID is duplicate');

            this.plugin.settings.processor[this.kind].processors[Number(processorEl.id)]!.id = cleanId;
            this.updateDraggability();
            this.plugin.saveSettings();
          },
          500,
          true,
        ),
      );
    });

    const processorBottomEl = processorEl.createEl('div');
    processorBottomEl.addClass('typstmate-settings-processor-bottom');

    const formatTextEl = processorBottomEl.createEl('textarea');
    formatTextEl.value = processor.format;
    formatTextEl.placeholder = 'format';

    formatTextEl.addEventListener(
      'input',
      debounce(
        async () => {
          this.plugin.settings.processor[this.kind].processors[Number(processorEl.id)]!.format = formatTextEl.value;

          this.plugin.saveSettings();
        },
        500,
        true,
      ),
    );

    // 削除ボタンを追加
    if (processor.id !== '') {
      new ButtonComponent(processorBottomEl)
        .setButtonText('Remove')
        .setIcon('trash')
        .onClick(() => this.removeProcessor(Number(processorEl.id)))
        .buttonEl.addClasses(['typstmate-button', 'typstmate-button-danger']);
    }
  }

  removeProcessor(index: number) {
    this.plugin.settings.processor[this.kind].processors.splice(index, 1);
    this.plugin.saveSettings();

    this.processorsEl.children.namedItem(index.toString())?.remove();

    this.numbering();
  }

  moveProcessorToIndex(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const processors = this.plugin.settings.processor[this.kind].processors;

    const genericProcessors = processors as Processor[];
    const [moved] = genericProcessors.splice(fromIndex, 1);
    if (moved) genericProcessors.splice(toIndex, 0, moved);

    // DOM の更新
    const fromEl = this.processorsEl.children.namedItem(String(fromIndex));
    const refEl = this.processorsEl.children.namedItem(String(toIndex));

    if (fromEl) {
      if (fromIndex < toIndex) this.processorsEl.insertBefore(fromEl, refEl ? refEl.nextSibling : null);
      else this.processorsEl.insertBefore(fromEl, refEl);
    }

    this.enforceEmptyAtBottom();
    this.numbering();
    this.plugin.saveSettings();
  }

  enforceEmptyAtBottom() {
    const processors = this.plugin.settings.processor[this.kind].processors;
    const genericProcessors = processors as Processor[];

    const emptyIndex = processors.findIndex((p) => p.id === '');
    if (emptyIndex !== -1 && emptyIndex !== processors.length - 1) {
      const [moved] = genericProcessors.splice(emptyIndex, 1);
      if (moved) genericProcessors.push(moved);

      for (let i = 0; i < this.processorsEl.children.length; i++) {
        const el = this.processorsEl.children[i] as HTMLElement;
        const idInput = el.querySelector('input[type="text"]') as HTMLInputElement;
        if (idInput && idInput.value === '') {
          this.processorsEl.appendChild(el);
          break;
        }
      }
    }
    this.updateDraggability();
  }

  updateDraggability() {
    const processors = this.plugin.settings.processor[this.kind].processors;
    for (let i = 0; i < this.processorsEl.children.length; i++) {
      const el = this.processorsEl.children[i] as HTMLElement;
      const processor = processors[i];
      if (processor) {
        const draggable = processor.id !== '';
        el.draggable = draggable;

        const handle = el.querySelector('.typstmate-drag-handle-icon') as HTMLElement;
        if (handle) handle.style.display = draggable ? 'flex' : 'none';
        else if (draggable) {
          const settingEl = el.querySelector('.setting-item');
          if (settingEl) {
            const newHandle = createDiv('typstmate-drag-handle-icon');
            setIcon(newHandle, 'grip-vertical');
            settingEl.prepend(newHandle);
          }
        }
      }
    }
    this.numbering();
  }

  numbering() {
    for (let i = 0; i < this.processorsEl.children.length; i++) {
      const child = this.processorsEl.children[i];
      if (!child) continue;

      child.id = i.toString();
    }
  }
}
