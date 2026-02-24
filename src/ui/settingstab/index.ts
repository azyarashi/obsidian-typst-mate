import { type App, Platform, PluginSettingTab } from 'obsidian';

import type ObsidianTypstMate from '@/main';

import { addAdvancedTab, addCompilerTab, addEditorTab, addProcessorTab, addRendererTab } from './tabs';

import './shared.css';

export class SettingTab extends PluginSettingTab {
  override plugin: ObsidianTypstMate;

  constructor(app: App, plugin: ObsidianTypstMate) {
    super(app, plugin);
    this.plugin = plugin;
  }

  activeTab: 'processor' | 'editor' | 'compiler' | 'renderer' | 'advanced' = 'processor';
  activeEditorTab: 'Decoration' | 'Popup' | 'Action' = 'Decoration';
  activeCompilerTab: 'package' | 'font' = 'package';
  activeKindTab: 'inline' | 'display' | 'codeblock' | 'excalidraw' = 'inline';

  display() {
    const { containerEl } = this;
    containerEl.empty();

    const options: { id: SettingTab['activeTab']; name: string }[] = [
      { id: 'processor', name: 'Processor' },
      { id: 'editor', name: 'Editor' },
      { id: 'compiler', name: 'Compiler' },
      { id: 'renderer', name: 'Renderer' },
      { id: 'advanced', name: 'Advanced' },
    ];

    if (Platform.isMobile) {
      const selectEl = containerEl.createEl('select', { cls: 'typstmate-settings-tabs-select' });

      options.forEach((opt) => {
        const option = selectEl.createEl('option', {
          value: opt.id,
          text: opt.name,
        });
        if (this.activeTab === opt.id) option.selected = true;
      });

      selectEl.addEventListener('change', () => {
        this.activeTab = selectEl.value as typeof this.activeTab;
        this.display();
      });
    } else {
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
        addEditorTab(this.plugin, contentEl, this.activeEditorTab, (tab) => {
          this.activeEditorTab = tab;
          this.display();
        });
        break;
      case 'compiler':
        addCompilerTab(this.plugin, contentEl, this.activeCompilerTab, (tab) => {
          this.activeCompilerTab = tab;
          this.display();
        });
        break;
      case 'renderer':
        addRendererTab(this.plugin, contentEl);
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
