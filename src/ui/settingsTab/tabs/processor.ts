import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { debounce, Setting } from 'obsidian';

import { helperFacet } from '@/editor/shared/extensions/Helper';
import { pairHighlightExtension } from '@/editor/shared/extensions/PairHighlight';
import { typstSyntaxHighlighting } from '@/editor/shared/extensions/SyntaxHighlight';
import { obsidianTheme, typstTheme } from '@/editor/shared/extensions/Theme';
import { typstTextViewTheme } from '@/editor/typst/extensions/Theme';
import { typstTextCore } from '@/editor/typst/extensions/TypstCore';
import { t, tFragment } from '@/i18n';
import type ObsidianTypstMate from '@/main';
import { ProcessorList } from '../components/processor';

import './processor.css';

export function addProcessorTab(
  plugin: ObsidianTypstMate,
  containerEl: HTMLElement,
  activeTab: 'inline' | 'display' | 'codeblock' | 'excalidraw',
  setActiveTab: (tab: 'inline' | 'display' | 'codeblock' | 'excalidraw') => void,
) {
  new Setting(containerEl)
    .setName(t('settings.processor.heading'))
    .setDesc(tFragment('settings.processor.desc'))
    .setHeading();

  new Setting(containerEl).setName(t('settings.processor.preamble')).setDesc(t('settings.processor.preambleDesc'));

  const savePreamble = debounce(
    (newVal: string) => {
      plugin.settings.preamble = newVal;
      plugin.saveSettings();
    },
    100,
    true,
  );

  const startState = EditorState.create({
    doc: plugin.settings.preamble,
    extensions: [
      EditorState.tabSize.of(2),
      helperFacet.of(plugin.editorHelper),
      typstTextCore,
      pairHighlightExtension,
      typstSyntaxHighlighting(),
      lineNumbers(),
      highlightActiveLineGutter(),
      typstTextViewTheme,
      history(),
      keymap.of([...historyKeymap, ...standardKeymap, indentWithTab]),
      EditorView.lineWrapping,
      plugin.settings.useObsidianTheme ? obsidianTheme : typstTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) savePreamble(update.state.doc.toString());
      }),
    ],
  });

  const editorEl = containerEl.createDiv('typstmate-processor-format-editor');
  const placeholder = editorEl.createEl('pre', {
    text: plugin.settings.preamble || ' ',
    cls: 'typstmate-processor-format-placeholder typstmate-preamble',
    title: t('settings.processor.formatPlaceholder'),
  });

  placeholder.addEventListener('click', () => {
    placeholder.remove();
    const view = new EditorView({
      parent: editorEl,
      state: startState,
    });
    view.focus();
  });

  addPreview(plugin, containerEl, activeTab === 'excalidraw' ? 'inline' : activeTab);

  const subTabsEl = containerEl.createDiv('typstmate-processor-tabs');
  const subTabs: { id: 'inline' | 'display' | 'codeblock' | 'excalidraw'; name: string }[] = [
    { id: 'inline', name: t('settings.processor.subTabs.inline') },
    { id: 'display', name: t('settings.processor.subTabs.display') },
    { id: 'codeblock', name: t('settings.processor.subTabs.codeblock') },
  ];
  if (plugin.excalidrawPluginInstalled)
    subTabs.push({ id: 'excalidraw', name: t('settings.processor.subTabs.excalidraw') });

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
      new ProcessorList(plugin, 'inline', containerEl, t('settings.processor.processorTitles.inline'));
      break;
    case 'display':
      new ProcessorList(plugin, 'display', containerEl, t('settings.processor.processorTitles.display'));
      break;
    case 'codeblock':
      new ProcessorList(plugin, 'codeblock', containerEl, t('settings.processor.processorTitles.codeblock'));
      break;
    case 'excalidraw':
      if (plugin.excalidrawPluginInstalled)
        new ProcessorList(plugin, 'excalidraw', containerEl, t('settings.processor.processorTitles.excalidraw'));
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
    .setName(t('settings.processor.preview'))
    .setHeading()
    .addDropdown((dropdown) => {
      dropdown.addOption('inline', t('settings.processor.subTabs.inline'));
      dropdown.addOption('display', t('settings.processor.subTabs.display'));
      dropdown.addOption('codeblock', t('settings.processor.subTabs.codeblock'));
      dropdown.setValue(activeTab);

      dropdown.onChange((value) => {
        inputEl.empty();
        previewEl.empty();
        renderInput(value as 'inline' | 'display' | 'codeblock', inputEl, previewEl, plugin);
      });
    });

  const inputEl = previewContainer.createDiv('typstmate-settings-preview-input');
  const previewEl = previewContainer.createDiv('typstmate-settings-preview-preview');
  previewEl.setText(t('settings.processor.previewPlaceholder'));

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
