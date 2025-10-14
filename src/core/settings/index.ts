import { type App, getIcon, PluginSettingTab } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import { addEditorSettings } from './ui/tabs/editor';
import { addOtherSettings } from './ui/tabs/other';
import { addRenderingSettings } from './ui/tabs/rendering';

import './settings.css';

export class SettingTab extends PluginSettingTab {
  override plugin: ObsidianTypstMate;
  private tabContents: HTMLElement[] = [];

  constructor(app: App, plugin: ObsidianTypstMate) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const tabContainer = containerEl.createDiv('typstmate-settings-tabs');
    const contentContainer = containerEl.createDiv('typstmate-settings-content');

    const tabs = [
      {
        id: 'rendering',
        icon: 'film',
      },
      {
        id: 'editor',
        icon: 'file-heart',
      },
      {
        id: 'other',
        icon: 'settings',
      },
    ];

    const tabButtons = tabs.map((tab) => {
      const button = tabContainer.createEl('button', {
        cls: 'typstmate-tab-button',
      });

      const iconEl = getIcon(tab.icon)!;
      button.appendChild(iconEl);

      button.dataset.tabId = tab.id;
      return button;
    });

    this.tabContents = [];
    const tabContentFunctions: (() => void)[] = [];

    tabs.forEach((tab, index) => {
      const tabContent = contentContainer.createDiv({
        cls: 'typstmate-tab-content',
        attr: { 'data-tab-id': tab.id },
      });
      tabContent.style.display = index === 0 ? 'block' : 'none';

      const createTabContent = () => {
        if (tabContent.children.length === 0) {
          switch (tab.id) {
            case 'rendering':
              addRenderingSettings(this.plugin, tabContent);
              break;
            case 'editor':
              addEditorSettings(this.plugin, tabContent);
              break;
            case 'other':
              addOtherSettings(this.plugin, tabContent);
              break;
          }
        }
      };

      tabContentFunctions.push(createTabContent);
      this.tabContents.push(tabContent);

      if (index === 0) createTabContent();
    });

    tabButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        this.activateTab(index, tabButtons, tabContentFunctions);
      });
    });
  }

  private activateTab(index: number, tabButtons: HTMLButtonElement[], tabContentFunctions: (() => void)[]) {
    // すべてのタブを非アクティブ化
    tabButtons.forEach((btn) => {
      btn.classList.remove('active');
    });

    // すべてのタブコンテンツを非表示
    this.tabContents.forEach((content) => {
      content.style.display = 'none';
    });

    // クリックされたタブをアクティブ化
    tabButtons[index]?.classList.add('active');

    // 対応するタブコンテンツを表示
    if (this.tabContents[index]) {
      this.tabContents[index].style.display = 'block';

      // コンテンツがまだ作成されていない場合は作成
      if (this.tabContents[index].children.length === 0 && tabContentFunctions[index]) {
        tabContentFunctions[index]();
      }
    }
  }
}
