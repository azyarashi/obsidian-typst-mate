import { type App, Platform, PluginSettingTab } from 'obsidian';

import type ObsidianTypstMate from '@/main';

import { addAdvancedTab } from './tabs/advanced';
import { addCompilerTab } from './tabs/compiler';
import { addEditorTab } from './tabs/editor';
import { addProcessorTab } from './tabs/processor';
import { addRenderingTab } from './tabs/rendering';

import './shared.css';

export class SettingTab extends PluginSettingTab {
  override plugin: ObsidianTypstMate;

  constructor(app: App, plugin: ObsidianTypstMate) {
    super(app, plugin);
    this.plugin = plugin;
  }

  activeTab: 'editor' | 'compiler' | 'rendering' | 'processor' | 'advanced' = 'editor';
  activeCompilerTab: 'package' | 'font' | null = 'package';
  activeKindTab: 'inline' | 'display' | 'codeblock' | 'excalidraw' = 'inline';

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const options: { id: SettingTab['activeTab']; name: string }[] = [
      { id: 'editor', name: 'Editor' },
      { id: 'compiler', name: 'Compiler' },
      { id: 'rendering', name: 'Rendering' },
      { id: 'processor', name: 'Processor' },
      { id: 'advanced', name: 'Advanced' },
    ];

    if (Platform.isMobile) {
      // Smartphone: Dropdown
      const selectEl = containerEl.createEl('select', { cls: 'typstmate-settings-tabs-select' });

      options.forEach((opt) => {
        const option = selectEl.createEl('option', {
          value: opt.id,
          text: opt.name,
        });
        if (this.activeTab === opt.id) {
          option.selected = true;
        }
      });

      selectEl.addEventListener('change', () => {
        this.activeTab = selectEl.value as typeof this.activeTab;
        this.display();
      });
    } else {
      // Desktop: Tabs
      const tabsEl = containerEl.createDiv('typstmate-settings-tabs');

      options.forEach((tab) => {
        const tabEl = tabsEl.createDiv({
          cls: `typstmate-settings-tab ${this.activeTab === tab.id ? 'active' : ''}`,
          text: tab.name,
        });
        tabEl.addEventListener('click', () => {
          this.activeTab = tab.id;
          this.display();
        });
      });
    }

    const contentEl = containerEl.createDiv('typstmate-settings-content');

    switch (this.activeTab) {
      case 'editor':
        addEditorTab(this.plugin, contentEl);
        break;
      case 'compiler':
        addCompilerTab(this.plugin, contentEl, this.activeCompilerTab, (tab) => {
          this.activeCompilerTab = tab;
          this.display();
        });
        break;
      case 'rendering':
        addRenderingTab(this.plugin, contentEl);
        break;
      case 'processor':
        addProcessorTab(this.plugin, contentEl, this.activeKindTab, (tab) => {
          this.activeKindTab = tab;
          this.display();
        });
        break;
      case 'advanced':
        addAdvancedTab(this.plugin, contentEl);
        break;
    }
  }
}
