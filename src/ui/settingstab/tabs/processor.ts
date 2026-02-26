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

  addPreview(plugin, containerEl, activeTab === 'excalidraw' ? 'inline' : activeTab);

  const subTabsEl = containerEl.createDiv('typstmate-processor-tabs');
  const subTabs: { id: 'inline' | 'display' | 'codeblock' | 'excalidraw'; name: string }[] = [
    { id: 'inline', name: 'Inline' },
    { id: 'display', name: 'Display' },
    { id: 'codeblock', name: 'CodeBlock' },
  ];
  if (plugin.excalidrawPluginInstalled) subTabs.push({ id: 'excalidraw', name: 'Excalidraw' });

  for (const tab of subTabs) {
    const tabEl = subTabsEl.createDiv({
      cls: `typstmate-processor-tab ${activeTab === tab.id ? 'active' : ''}`,
      text: tab.name,
    });
    tabEl.addEventListener('click', () => {
      setActiveTab(tab.id);
    });
  }

  switch (activeTab) {
    case 'inline':
      new ProcessorList(plugin, 'inline', containerEl, 'Inline Math ($id:...$ / $...$)');
      break;
    case 'display':
      new ProcessorList(plugin, 'display', containerEl, 'Display Math ($$id...$$ / $$...$$)');
      break;
    case 'codeblock':
      new ProcessorList(plugin, 'codeblock', containerEl, 'CodeBlock (```id...``` / ~~~id...~~~)');
      break;
    case 'excalidraw':
      if (plugin.excalidrawPluginInstalled) new ProcessorList(plugin, 'excalidraw', containerEl, 'Excalidraw');
      break;
  }
}

function addPreview(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'inline' | 'display' | 'codeblock',
) {
  const previewContainer = containerEl.createDiv('typstmate-settings-preview');

  new Setting(previewContainer)
    .setName('Preview')
    .setHeading()
    .addDropdown((dropdown) => {
      dropdown.addOption('inline', 'Inline');
      dropdown.addOption('display', 'Display');
      dropdown.addOption('codeblock', 'CodeBlock');
      dropdown.setValue(activeTab);

      dropdown.onChange((value) => {
        inputEl.empty();
        previewEl.empty();
        renderInput(value as 'inline' | 'display' | 'codeblock', inputEl, previewEl, plugin);
      });
    });

  const inputEl = previewContainer.createDiv('typstmate-settings-preview-input');
  const previewEl = previewContainer.createDiv('typstmate-settings-preview-preview');
  previewEl.setText('Type in the input above to see the preview');

  renderInput(activeTab, inputEl, previewEl, plugin);
}

function renderInput(
  type: 'inline' | 'display' | 'codeblock',
  inputEl: HTMLElement,
  previewEl: HTMLElement,
  plugin: ObsidianTypstMate,
) {
  inputEl.empty();
  previewEl.empty();

  let idEl: HTMLInputElement;
  let codeEl: HTMLInputElement | HTMLTextAreaElement;

  const updatePreview = () => {
    const id = idEl.value;
    const code = codeEl.value;
    previewEl.empty();
    if (code) {
      switch (type) {
        case 'inline':
          plugin.typstManager.render(`${id ? `${id}:` : ''}${code}`, previewEl, 'inline', '/');
          break;
        case 'display':
          plugin.typstManager.render(`${id ? `${id}\n` : ''}${code}\n`, previewEl, 'display', '/');
          break;
        case 'codeblock':
          plugin.typstManager.render(code, previewEl, id || '', '/');
          break;
      }
    }
  };

  switch (type) {
    case 'inline': {
      inputEl.createEl('span', { text: '$' });
      idEl = inputEl.createEl('input', {
        type: 'text',
        placeholder: 'id',
        cls: 'typstmate-form-control',
      });
      inputEl.createEl('span', { text: ':' });
      codeEl = inputEl.createEl('input', {
        type: 'text',
        placeholder: 'code',
        cls: 'typstmate-form-control',
      });
      inputEl.createEl('span', { text: '$' });
      break;
    }
    case 'display': {
      inputEl.createEl('span', { text: '$$' });
      idEl = inputEl.createEl('input', {
        type: 'text',
        placeholder: 'id',
        cls: 'typstmate-form-control',
      });
      inputEl.createEl('br');
      codeEl = inputEl.createEl('textarea', {
        placeholder: 'code',
        cls: 'typstmate-form-control',
      });
      inputEl.createEl('br');
      inputEl.createEl('span', { text: '$$' });
      break;
    }
    case 'codeblock': {
      inputEl.createEl('span', { text: '```' });
      idEl = inputEl.createEl('input', {
        type: 'text',
        placeholder: 'id',
        cls: 'typstmate-form-control',
      });
      inputEl.createEl('br');
      codeEl = inputEl.createEl('textarea', {
        placeholder: 'code',
        cls: 'typstmate-form-control',
      });
      inputEl.createEl('br');
      inputEl.createEl('span', { text: '```' });
      break;
    }
    default:
      return;
  }

  idEl!.addEventListener('input', updatePreview);
  codeEl!.addEventListener('input', updatePreview);
}
