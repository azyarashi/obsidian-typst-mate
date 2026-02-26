import { type App, Modal, Notice, Setting } from 'obsidian';

import type ObsidianTypstMate from '@/main';

import './snippet-edit.css';

export class SnippetEditModal extends Modal {
  kind: 'inline' | 'display' | 'codeblock';
  id: string;
  name: string;
  content: string;
  script: boolean;
  previewEl: HTMLDivElement;
  previewContentEl: HTMLDivElement;
  plugin: ObsidianTypstMate;
  render: (id: string, kind: 'inline' | 'display' | 'codeblock', content: string, script: boolean) => void;

  constructor(
    app: App,
    plugin: ObsidianTypstMate,
    index: number,
    render: (id: string, kind: 'inline' | 'display' | 'codeblock', content: string, script: boolean) => void,
  ) {
    super(app);
    const snippet = plugin.settings.snippets![index];

    this.kind = snippet!.kind;
    this.id = snippet!.id;
    this.name = snippet!.name;
    this.content = snippet!.content;
    this.script = snippet!.script;
    this.plugin = plugin;
    this.render = render;

    new Setting(this.contentEl).setName(this.name).setHeading();

    // プロセッサーの種類
    new Setting(this.contentEl).setName('Processor Kind').addDropdown((dropdown) => {
      dropdown.addOption('inline', 'Inline').addOption('display', 'Display').addOption('codeblock', 'CodeBlock');
      dropdown.setValue(this.kind);

      dropdown.onChange((value) => {
        plugin.settings.snippets![index]!.kind = value as 'inline' | 'display' | 'codeblock';
        this.kind = value as 'inline' | 'display' | 'codeblock';
        plugin.saveSettings();
        this.renderPreview();
      });
    });

    // プロセッサーのid
    new Setting(this.contentEl).setName('ID').addDropdown((dropdown) => {
      const ids = plugin.settings.processor[this.kind]?.processors.map((processor) => processor.id) ?? [];
      dropdown.addOptions(Object.fromEntries(ids.map((id) => [id, id])));
      dropdown.setValue(this.id);

      dropdown.onChange((value) => {
        plugin.settings.snippets![index]!.id = value;
        this.id = value;
        plugin.saveSettings();
        this.renderPreview();
      });
    });

    // コード
    new Setting(this.contentEl).addTextArea((area) => {
      area.setValue(this.content);
      area.inputEl.addClass('typstmate-snippet-code');

      area.onChange((value) => {
        plugin.settings.snippets![index]!.content = value;
        this.content = value;
        plugin.saveSettings();
        this.renderPreview();
      });
    });

    // スクリプトのオンオフ
    new Setting(this.contentEl).setName('Script Mode').addToggle((toggle) => {
      toggle.setValue(this.script);

      toggle.onChange((isScript) => {
        plugin.settings.snippets![index]!.script = isScript;
        this.script = isScript;
        plugin.saveSettings();
        this.previewEl.empty();
        if (!isScript) {
          this.previewContentEl = this.previewEl.createEl('div');
          return this.renderPreview();
        }

        const scriptSetting = new Setting(this.previewEl);
        let value = '';
        scriptSetting.addText((text) => {
          text.setValue('');

          text.onChange((value_) => {
            value = value_;
          });
        });
        scriptSetting.addButton((button) => {
          button
            .setButtonText('Preview')
            .setTooltip('Preview')
            .onClick(() => {
              try {
                const content = new Function('input', 'window', this.content)(value, window);
                this.renderPreview(content);
              } catch (e) {
                new Notice(String(e));
              }
            });
        });
        this.previewContentEl = this.previewEl.createEl('div');
      });
    });
    this.previewEl = this.contentEl.createEl('div');
    this.previewEl.className = 'typstmate-leaf-snippetext-preview';
    if (this.script) {
      const scriptSetting = new Setting(this.previewEl);
      let value = '';
      scriptSetting.addText((text) => {
        text.setValue('');

        text.onChange((value_) => {
          value = value_;
        });
      });
      scriptSetting.addButton((button) => {
        button
          .setButtonText('Preview')
          .setTooltip('Preview')
          .onClick(() => {
            try {
              const content = new Function('input', 'window', this.content)(value, window);
              this.renderPreview(content);
            } catch (e) {
              new Notice(String(e));
            }
          });
      });
    }
    this.previewContentEl = this.previewEl.createEl('div');

    this.renderPreview();
  }

  renderPreview(content?: string) {
    if (content ?? !this.script) {
      switch (this.kind) {
        case 'inline':
          content = `${this.id}${this.id === '' ? '' : ':'}${content ?? this.content}`;
          break;
        case 'display':
          content = `${this.id}\n${content ?? this.content}\n`;
          break;
        default:
          content = content ?? this.content;
      }
      this.previewContentEl.empty();
      this.plugin.typstManager.render(content, this.previewContentEl, this.kind, '/');
    }
  }

  override onClose() {
    this.render(this.id, this.kind, this.content, this.script);
  }
}
