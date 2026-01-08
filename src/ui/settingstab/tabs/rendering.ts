import { Setting } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/data/settings';
import type ObsidianTypstMate from '@/main';
import { CustomFragment } from '@/utils/customFragment';

import './rendering.css';

function addPreview(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  const previewContainer = containerEl.createDiv('typstmate-settings-preview');

  new Setting(previewContainer)
    .setName('Preview')
    .setHeading()
    .addDropdown((dropdown) => {
      dropdown.addOption('inline', 'Inline');
      dropdown.addOption('display', 'Display');
      dropdown.addOption('codeblock', 'CodeBlock');
      dropdown.setValue('inline');

      dropdown.onChange((value) => {
        inputEl.empty();
        previewEl.empty();
        renderInput(value, inputEl, previewEl, plugin);
      });
    });

  const inputEl = previewContainer.createDiv('typstmate-settings-preview-input');
  const previewEl = previewContainer.createDiv('typstmate-settings-preview-preview');
  previewEl.setText('Type in the input above to see the preview');

  renderInput('inline', inputEl, previewEl, plugin);
}

function renderInput(type: string, inputEl: HTMLElement, previewEl: HTMLElement, plugin: ObsidianTypstMate) {
  inputEl.empty();
  previewEl.empty();

  // Common logic to setup fields and listener
  let idEl: HTMLInputElement;
  let codeEl: HTMLInputElement | HTMLTextAreaElement;

  const updatePreview = () => {
    const id = idEl.value;
    const code = codeEl.value;
    previewEl.empty();
    if (code) {
      if (type === 'inline') {
        plugin.typstManager.render(`${id ? `${id}:` : ''}${code}`, previewEl, 'inline');
      } else if (type === 'display') {
        plugin.typstManager.render(`${id ? `${id}\n` : ''}${code}\n`, previewEl, 'display');
      } else if (type === 'codeblock') {
        plugin.typstManager.render(code, previewEl, id || '');
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

export function addRenderingTab(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
  new Setting(containerEl)
    .setName('Enable Background Rendering')
    .setDesc(
      new CustomFragment()
        .appendText('The UI will no longer freeze, but ')
        .appendText('it may conflict with plugins related to export or rendering.')
        .appendText(' Disabled automatically when exporting to PDF via Markdown menu.'),
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableBackgroundRendering);
      toggle.onChange((value) => {
        plugin.settings.enableBackgroundRendering = value;
        plugin.saveSettings();
        plugin.reload(true);
      });
    });

  new Setting(containerEl)
    .setName('Use Theme Text Color')
    .setDesc("Uses Obsidian's text color as the base color automatically.")
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.autoBaseColor);
      toggle.onChange((value) => {
        plugin.settings.autoBaseColor = value;
        plugin.applyBaseColor();

        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Base Color')
    .setDesc(
      new CustomFragment()
        .appendText('Replace black in SVGs with another color. Useful for dark themes. Disable ')
        .appendCodeText('Use Theme Text Color')
        .appendText(' to use this.'),
    )
    .addColorPicker((colorPicker) => {
      colorPicker.setValue(plugin.settings.baseColor);
      colorPicker.onChange((value) => {
        plugin.settings.baseColor = value;
        plugin.applyBaseColor();
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Enable MathJax Fallback')
    .setDesc(
      new CustomFragment()
        .appendText('Not recommended. Disables Typst errors/warnings if enabled. ')
        .appendBoldText(''),
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.enableMathjaxFallback);
      toggle.onChange((value) => {
        plugin.settings.enableMathjaxFallback = value;
        plugin.saveSettings();
      });
    });

  new Setting(containerEl)
    .setName('Patch PDF Export')
    .setDesc(
      'Temporarily disable AutoBaseColor and use BaseColor during PDF Export to fix white background issues in dark themes.',
    )
    .addToggle((toggle) => {
      toggle.setValue(plugin.settings.patchPDFExport ?? DEFAULT_SETTINGS.patchPDFExport!);
      toggle.onChange((value) => {
        plugin.settings.patchPDFExport = value;
        plugin.saveSettings();
      });
    });

  addPreview(plugin, containerEl);
}
