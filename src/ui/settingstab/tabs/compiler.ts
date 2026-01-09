import { Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';

import { FontList } from '../components/font';
import { PackagesList } from '../components/package';

import './compiler.css';

export function addCompilerTab(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'package' | 'font',
  setActiveTab: (tab: 'package' | 'font') => void,
) {
  addCompilerSettings(plugin, containerEl);
  addSubTabs(plugin, containerEl, activeTab, setActiveTab);
}

function addCompilerSettings(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName('Skip Preparation Waiting')
    .setDesc('Defers initialization at startup (Unstable on mobile). Reduces startup time but delays first render.')
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.skipPreparationWaiting);
      toggle.onChange((value) => {
        plugin.settings.skipPreparationWaiting = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Disable Package Cache')
    .setDesc(
      'Disable caching of imported packages. Useful for low memory environments but requires re-downloading packages.',
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.disablePackageCache);
      toggle.onChange((value) => {
        plugin.settings.disablePackageCache = value;
        plugin.saveSettings();
      });
    });
}

function addSubTabs(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'package' | 'font',
  setActiveTab: (tab: 'package' | 'font') => void,
) {
  const subTabsEl = containerEl.createDiv('typstmate-compiler-tabs');
  const subTabs: { id: 'package' | 'font'; name: string }[] = [
    { id: 'package', name: 'Package' },
    { id: 'font', name: 'Font' },
  ];

  subTabs.forEach((tab) => {
    const tabEl = subTabsEl.createDiv({
      cls: `typstmate-compiler-tab ${activeTab === tab.id ? 'active' : ''}`,
      text: tab.name,
    });
    tabEl.addEventListener('click', () => {
      setActiveTab(tab.id);
    });
  });

  switch (activeTab) {
    case 'package':
      new Setting(containerEl)
        .setName('Package')
        .setDesc(
          'When a package is imported, the cache is used instead of the actual files for faster performance. If you make changes directly, please click the package icon to refresh the cache (plugin reload is required.)',
        )
        .setHeading();
      new PackagesList(plugin, containerEl);
      break;
    case 'font':
      new Setting(containerEl).setName('Font').setHeading();
      new FontList(plugin, containerEl);
      break;
  }
}
