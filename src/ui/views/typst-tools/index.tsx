import { ButtonComponent, DropdownComponent, ItemView, Platform, type WorkspaceLeaf } from 'obsidian';
import { render } from 'preact';
import { t } from '@/i18n';
import type ObsidianTypstMate from '@/main';
import { Actions } from './tools/Actions';
import { Converter } from './tools/Converter';
import { Detypify } from './tools/Detypify';
import { Packages } from './tools/Packages';
import { Quiver } from './tools/Quiver';
import { Symbols } from './tools/Symbols';

import './typst-tools.css';

export type Tool = 'symbols' | 'detypify' | 'packages' | 'quiver' | 'actions' | 'converter';

export class TypstToolsView extends ItemView {
  static viewtype = 'typst-tools';

  plugin: ObsidianTypstMate;

  dropdown!: DropdownComponent;
  onChangeHandler!: (tool: Tool) => void;

  private reloadKey: number = 0;

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
    this.dropdown.addOption('actions', t('settings.tabs.actions'));
    this.dropdown.addOption('converter', t('views.typstTools.dropdown.converter'));

    // ツール
    const toolEl = container.createEl('div');
    toolEl.className = 'typstmate-tool';

    this.onChangeHandler = (tool: Tool) => {
      render(null, toolEl);

      const key = `${tool}-${this.reloadKey}`;

      switch (tool) {
        case 'symbols':
          render(<Symbols key={key} />, toolEl);
          break;
        case 'detypify':
          render(<Detypify key={key} />, toolEl);
          break;
        case 'packages':
          render(<Packages key={key} />, toolEl);
          break;
        case 'quiver':
          render(<Quiver key={key} />, toolEl);
          break;
        case 'actions':
          render(<Actions key={key} />, toolEl);
          break;
        case 'converter':
          render(<Converter key={key} />, toolEl);
          break;
      }
    };
    this.dropdown.onChange((tool) => this.onChangeHandler(tool as Tool));

    new ButtonComponent(menuEl)
      .setIcon('refresh-ccw')
      .setTooltip(t('views.typstTools.tooltips.reload'))
      .onClick(() => {
        this.reloadKey++;
        this.onChangeHandler(this.dropdown.getValue() as Tool);
      });

    // 初期表示
    this.dropdown.setValue('converter');
    this.onChangeHandler('converter');
  }

  openTool(tool: Tool) {
    this.dropdown.setValue(tool);
    this.onChangeHandler(tool);
  }

  override async onClose(): Promise<void> {
    render(null, this.contentEl);
    await super.onClose();
  }
}
