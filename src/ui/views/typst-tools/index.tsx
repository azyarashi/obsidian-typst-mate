import { ButtonComponent, DropdownComponent, ItemView, Platform } from 'obsidian';
import { render } from 'preact';
import { settingsManager } from '@/libs';
import { t } from '@/libs/i18n';
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

  dropdown!: DropdownComponent;
  onChangeHandler!: (tool: Tool) => void;

  private reloadKey: number = 0;

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

      settingsManager.settings.toolsStates.tool = tool;
      settingsManager.saveSettings();
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
    const initialTool = settingsManager.settings.toolsStates.tool || 'converter';
    this.dropdown.setValue(initialTool);
    this.onChangeHandler(initialTool);
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
