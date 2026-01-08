import { debounce, Setting } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

import { ProcessorList } from '../components/processor';

import './processor.css';

export function addProcessorTab(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'inline' | 'display' | 'codeblock' | 'excalidraw',
  setActiveTab: (tab: 'inline' | 'display' | 'codeblock' | 'excalidraw') => void,
) {
  new Setting(containerEl)
    .setName('Processor')
    .setDesc(
      new CustomFragment()
        .appendText(
          'In each mode, the first matching Processor ID from the top will be used. An empty Processor ID means the default and should be placed at the bottom. In the format, ',
        )
        .appendCodeText('{CODE}')
        .appendText(' can be used (only the first occurrence is replaced), and ')
        .appendCodeText('fontsize')
        .appendText(
          ' can be used as an internal length value. In inline mode, separate the id and the code with a colon ',
        )
        .appendCodeText(':')
        .appendText(
          ' in the format. When adding or removing processors for codeblock mode, reload the plugin to apply changes. ',
        )
        .appendBoldText('IDs should not contain any special characters!')
        .appendText(' For more details, see ')
        .appendLinkText(
          'Processor.md',
          'https://github.com/azyarashi/obsidian-typst-mate/blob/main/docs/processor/Processor.md',
        )
        .appendText('.'),
    )
    .setHeading();

  new Setting(containerEl).setName('Preamble').setDesc('Preamble can be turned on or off by toggling each processor.');
  const preambleTextEl = containerEl.createEl('textarea');
  preambleTextEl.addClass('typstmate-form-control');
  preambleTextEl.addClass('typstmate-preamble');
  preambleTextEl.value = plugin.settings.preamble;
  preambleTextEl.placeholder = 'preamble';

  preambleTextEl.addEventListener(
    'input',
    debounce(
      () => {
        plugin.settings.preamble = preambleTextEl.value;

        plugin.saveSettings();
      },
      500,
      true,
    ),
  );

  const subTabsEl = containerEl.createDiv('typstmate-processor-tabs');
  const subTabs: { id: 'inline' | 'display' | 'codeblock' | 'excalidraw'; name: string }[] = [
    { id: 'inline', name: 'Inline' },
    { id: 'display', name: 'Display' },
    { id: 'codeblock', name: 'CodeBlock' },
  ];
  if (plugin.excalidrawPluginInstalled) subTabs.push({ id: 'excalidraw', name: 'Excalidraw' });

  subTabs.forEach((tab) => {
    const tabEl = subTabsEl.createDiv({
      cls: `typstmate-processor-tab ${activeTab === tab.id ? 'active' : ''}`,
      text: tab.name,
    });
    tabEl.addEventListener('click', () => {
      setActiveTab(tab.id);
    });
  });

  switch (activeTab) {
    case 'inline':
      new ProcessorList(plugin, 'inline', containerEl, 'Inline($...$) Processors');
      break;
    case 'display':
      new ProcessorList(plugin, 'display', containerEl, 'Display($$...$$) Processors');
      break;
    case 'codeblock':
      new ProcessorList(plugin, 'codeblock', containerEl, 'CodeBlock(```...```) Processors');
      break;
    case 'excalidraw':
      if (plugin.excalidrawPluginInstalled)
        new ProcessorList(plugin, 'excalidraw', containerEl, 'Excalidraw Processors');
      break;
  }
}
