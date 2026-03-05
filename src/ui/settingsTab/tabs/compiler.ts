import { Setting } from 'obsidian';

import { t } from '@/i18n';
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
    .setName(t('settings.compiler.skipStartup'))
    .setDesc(t('settings.compiler.skipStartupDesc'))
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.skipPreparationWaiting);
      toggle.onChange((value) => {
        plugin.settings.skipPreparationWaiting = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName(t('settings.compiler.disablePackageCache'))
    .setDesc(t('settings.compiler.disablePackageCacheDesc'))
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
    { id: 'package', name: t('settings.compiler.subTabs.package') },
    { id: 'font', name: t('settings.compiler.subTabs.font') },
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
        .setName(t('settings.compiler.package.heading'))
        .setDesc(t('settings.compiler.package.desc'))
        .setHeading();
      new PackagesList(plugin, containerEl);
      break;
    case 'font':
      new Setting(containerEl).setName(t('settings.compiler.font.heading')).setHeading();
      new FontList(plugin, containerEl);
      break;
  }
}
