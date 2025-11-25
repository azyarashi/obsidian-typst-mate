import { ButtonComponent, DropdownComponent, ItemView, Platform, type WorkspaceLeaf } from 'obsidian';
import { tex2typst, typst2tex } from 'tex2typst';

import { ProcessorList } from '@/core/settings/components/processor';
import type ObsidianTypstMate from '@/main';

import { SnippetView } from './components/snippet';

import './typst-tools.css';

export class TypstToolsView extends ItemView {
  static viewtype = 'typst-tools';

  plugin: ObsidianTypstMate;

  dropdown!: DropdownComponent;
  onChangeHandler!: (value: string) => void;

  constructor(leaf: WorkspaceLeaf, plugin: ObsidianTypstMate) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TypstToolsView.viewtype;
  }

  getDisplayText(): string {
    return 'Typst Tools';
  }

  override getIcon(): string {
    return 'type';
  }

  override async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.className = 'typstmate-leaf';

    // メニュー
    const menuEl = container.createEl('div');
    menuEl.className = 'typstmate-menu';
    this.dropdown = new DropdownComponent(menuEl);
    if (Platform.isDesktop) {
      this.dropdown.addOption('symbols', 'Symbols').addOption('detypify', 'Detypify').addOption('packages', 'Packages');
    }
    this.dropdown
      .addOption('snippets', 'Snippets')
      .addOption('converter', 'Converter')
      .addOption('processors', 'Processors');

    this.onChangeHandler = (value: string) => {
      contentEl.empty();
      switch (value) {
        case 'symbols':
          contentEl.createEl('iframe').src = 'https://typst.app/docs/reference/symbols/sym/';
          break;
        case 'detypify':
          contentEl.createEl('iframe').src = 'https://detypify.quarticcat.com/';
          break;
        case 'packages':
          contentEl.createEl('iframe').src = 'https://typst.app/universe/search/';
          break;
        case 'snippets': {
          new SnippetView(contentEl, this.plugin);
          break;
        }
        case 'converter': {
          const dropdown = new DropdownComponent(contentEl);
          dropdown.addOption('tex2typst', 'tex2typst').addOption('mitex', 'MiTex');

          const updatePreview = () => {
            preview.empty();
            this.plugin.typstManager.render(output.value, preview, 'inline');
          };

          const input = contentEl.createEl('textarea');
          input.placeholder = '(La)Tex';
          input.addClass('typstmate-form-control');
          input.addEventListener('input', async () => {
            try {
              switch (dropdown.getValue()) {
                case 'tex2typst':
                  output.value = tex2typst(input.value);
                  break;
                case 'mitex':
                  output.value = await this.plugin.typst!.mitex(input.value);
                  break;
              }
              updatePreview();
            } catch (error) {
              output.value = String(error);
            }
          });

          const output = contentEl.createEl('textarea');
          output.placeholder = 'Typst';
          output.addClass('typstmate-form-control');
          output.addEventListener('input', async () => {
            try {
              switch (dropdown.getValue()) {
                case 'tex2typst':
                  input.value = typst2tex(output.value);
                  break;
                case 'mitex':
                  return;
              }
              updatePreview();
            } catch (error) {
              input.value = String(error);
            }
          });

          const preview = contentEl.createEl('div');
          preview.addClass('typstmate-settings-preview-preview');

          const button = contentEl.createEl('button');
          button.setText('Copy');
          button.addClass('typstmate-button');
          button.onClickEvent(async () => {
            navigator.clipboard.writeText(`$${output.value}$`);
          });

          break;
        }
        case 'processors':
          new ProcessorList(this.plugin, 'inline', contentEl, 'Inline($...$) Processors', true);
          new ProcessorList(this.plugin, 'display', contentEl, 'Display($$...$$) Processors', true);
          new ProcessorList(this.plugin, 'codeblock', contentEl, 'CodeBlock(```...```) Processors', true);
          if (this.plugin.excalidrawPluginInstalled) {
            new ProcessorList(this.plugin, 'excalidraw', contentEl, 'Excalidraw Processors', true);
          }
          break;
      }
    };
    this.dropdown.onChange(this.onChangeHandler);

    new ButtonComponent(menuEl)
      .setIcon('refresh-ccw')
      .setTooltip('再読み込み')
      .onClick(() => {
        switch (this.dropdown.getValue()) {
          case 'symbols':
            contentEl.createEl('iframe').src = 'https://typst.app/docs/reference/symbols/sym/';
            break;
          case 'packages':
            contentEl.createEl('iframe').src = 'https://typst.app/universe/search/';
            break;
        }
      });

    // content
    const contentEl = container.createEl('div');
    contentEl.className = 'typstmate-content';

    // 初期表示
    this.dropdown.setValue('converter');
    this.onChangeHandler('converter');
  }

  openContent(content: string) {
    this.dropdown.setValue(content);
    this.onChangeHandler(content);
  }
}
