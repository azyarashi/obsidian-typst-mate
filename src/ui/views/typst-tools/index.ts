import { ButtonComponent, DropdownComponent, ItemView, Platform, type WorkspaceLeaf } from 'obsidian';
import { TypstMate } from '@/api';
import { t } from '@/i18n';
import { typstManager } from '@/libs';
import type ObsidianTypstMate from '@/main';

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
    return t('views.typstTools.displayText');
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
        .addOption('symbols', t('views.typstTools.dropdown.symbols'))
        .addOption('detypify', t('views.typstTools.dropdown.detypify'))
        .addOption('packages', t('views.typstTools.dropdown.packages'))
        .addOption('quiver', t('views.typstTools.dropdown.quiver'));
    }
    this.dropdown.addOption('converter', t('views.typstTools.dropdown.converter'));

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
        case 'converter': {
          const dropdown = new DropdownComponent(contentEl);
          dropdown
            .addOption('math-eq', t('views.typstTools.converter.mathEquation'))
            .addOption('markup-doc', t('views.typstTools.converter.markupDocument'))
            .addOption('cetz-tikz', t('views.typstTools.converter.cetzTikz'));

          const updatePreview = () => {
            preview.empty();
            switch (dropdown.getValue()) {
              case 'math-eq':
                typstManager.render(typst.value, preview, 'display', '/');
                break;
              case 'markup-doc':
              case 'cetz-tikz':
                typstManager.render(typst.value, preview, 'typst', '/');
                break;
            }
          };

          const latex = contentEl.createEl('textarea');
          latex.placeholder = t('views.typstTools.converter.latexPlaceholder');
          latex.addClass('typstmate-form-control');
          latex.addEventListener('input', async () => {
            try {
              switch (dropdown.getValue()) {
                case 'math-eq':
                  typst.value = await TypstMate.wasm!.latexeq_to_typm(latex.value);
                  break;
                case 'markup-doc':
                  typst.value = await TypstMate.wasm!.latex_to_typst(latex.value);
                  break;
                case 'cetz-tikz':
                  typst.value = await TypstMate.wasm!.tikz_to_cetz(latex.value);
                  break;
              }
              updatePreview();
            } catch (error) {
              typst.value = String(error);
            }
          });

          const typst = contentEl.createEl('textarea');
          typst.placeholder = t('views.typstTools.converter.typstPlaceholder');
          typst.addClass('typstmate-form-control');
          typst.addEventListener('input', async () => {
            try {
              switch (dropdown.getValue()) {
                case 'math-eq':
                  latex.value = await TypstMate.wasm!.typm_to_latexeq(typst.value);
                  break;
                case 'markup-doc':
                  latex.value = await TypstMate.wasm!.typst_to_latex(typst.value);
                  break;
                case 'cetz-tikz':
                  latex.value = await TypstMate.wasm!.cetz_to_tikz(typst.value);
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
          button.setText(t('views.typstTools.converter.buttons.copy'));
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
      .setTooltip(t('views.typstTools.tooltips.reload'))
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
