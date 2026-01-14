import { ButtonComponent, DropdownComponent, ItemView, Platform, type WorkspaceLeaf } from 'obsidian';

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
    return 'typst-stroke';
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
      this.dropdown
        .addOption('symbols', 'Symbols')
        .addOption('detypify', 'Detypify')
        .addOption('packages', 'Packages')
        .addOption('quiver', 'Quiver');
    }
    this.dropdown.addOption('snippets', 'Snippets').addOption('converter', 'Converter');

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
        case 'quiver':
          contentEl.createEl('iframe').src = 'https://q.uiver.app/';
          break;
        case 'snippets': {
          new SnippetView(contentEl, this.plugin);
          break;
        }
        case 'converter': {
          const dropdown = new DropdownComponent(contentEl);
          dropdown
            .addOption('math-eq', 'Math Equation')
            .addOption('markup-doc', 'Markup Document')
            .addOption('cetz-tikz', 'CeTZ/TikZ');

          const updatePreview = () => {
            preview.empty();
            switch (dropdown.getValue()) {
              case 'math-eq':
                this.plugin.typstManager.render(typst.value, preview, 'display');
                break;
              case 'markup-doc':
              case 'cetz-tikz':
                this.plugin.typstManager.render(typst.value, preview, 'typst');
                break;
            }
          };

          const latex = contentEl.createEl('textarea');
          latex.placeholder = 'LaTex';
          latex.addClass('typstmate-form-control');
          latex.addEventListener('input', async () => {
            try {
              switch (dropdown.getValue()) {
                case 'math-eq':
                  typst.value = await this.plugin.typst!.latexeq_to_typm(latex.value);
                  break;
                case 'markup-doc':
                  typst.value = await this.plugin.typst!.latex_to_typst(latex.value);
                  break;
                case 'cetz-tikz':
                  typst.value = await this.plugin.typst!.tikz_to_cetz(latex.value);
                  break;
              }
              updatePreview();
            } catch (error) {
              typst.value = String(error);
            }
          });

          const typst = contentEl.createEl('textarea');
          typst.placeholder = 'Typst';
          typst.addClass('typstmate-form-control');
          typst.addEventListener('input', async () => {
            try {
              switch (dropdown.getValue()) {
                case 'math-eq':
                  latex.value = await this.plugin.typst!.typm_to_latexeq(typst.value);
                  break;
                case 'markup-doc':
                  latex.value = await this.plugin.typst!.typst_to_latex(typst.value);
                  break;
                case 'cetz-tikz':
                  latex.value = await this.plugin.typst!.cetz_to_tikz(typst.value);
                  break;
              }
              updatePreview();
            } catch (error) {
              latex.value = String(error);
            }
          });

          const preview = contentEl.createEl('div');
          preview.addClass('typstmate-settings-preview-preview');

          const button = contentEl.createEl('button');
          button.setText('Copy');
          button.addClass('typstmate-button');
          button.onClickEvent(async () => {
            switch (dropdown.getValue()) {
              case 'math-eq':
                navigator.clipboard.writeText(`$ ${typst.value} $`);
                break;
              case 'markup-doc':
              case 'cetz-tikz':
                navigator.clipboard.writeText(typst.value);
                break;
            }
          });

          break;
        }
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
