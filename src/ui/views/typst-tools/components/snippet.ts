import { ButtonComponent, DropdownComponent, Setting } from 'obsidian';

import { DefaultNewSnippet } from '@/libs/snippet';
import type ObsidianTypstMate from '@/main';

import { CategoryRenameModal } from '../modals/categoryRename';
import { SnippetEditModal } from '../modals/snippetEdit';
import { SnippetExtModal } from '../modals/snippetExt';

export class SnippetView {
  containerEl: HTMLElement;

  currentCategory?: string;

  menuEl: HTMLElement;
  dropdown!: DropdownComponent;

  snippetsEl: HTMLElement;

  plugin: ObsidianTypstMate;

  constructor(containerEl: HTMLElement, plugin: ObsidianTypstMate) {
    this.containerEl = containerEl;

    this.menuEl = containerEl.createEl('div');
    this.menuEl.className = 'typstmate-menu';
    this.plugin = plugin;
    this.buildMenu();

    this.snippetsEl = containerEl.createEl('div');
    this.buildSnippets();
  }

  buildMenu() {
    // カテゴリーの選択
    this.dropdown = new DropdownComponent(this.menuEl);
    const categories = (this.plugin.settings.snippets?.map((snippet) => snippet.category) ?? []).filter(
      (category) => category !== 'Uncategorized',
    );
    this.dropdown.addOption('Uncategorized', 'Uncategorized');
    this.dropdown.addOptions(Object.fromEntries(categories.map((name) => [name, name])));

    this.dropdown.setValue(this.currentCategory ?? 'Uncategorized');
    this.dropdown.onChange((category) => {
      this.currentCategory = category;
      this.buildSnippets();
    });

    // カテゴリー名の変更
    new ButtonComponent(this.menuEl)
      .setIcon('pencil')
      .setTooltip('Rename')
      .onClick(() => {
        new CategoryRenameModal(this.plugin.app, this.plugin, this.currentCategory!, this).open();
      });
  }

  buildSnippets() {
    this.snippetsEl.empty();
    const category = this.dropdown.getValue();

    // スニペットの作成
    new Setting(this.snippetsEl).addButton((button) => {
      button
        .setButtonText('New')
        .setTooltip('New')
        .onClick(() => {
          const defaultSnippet = Object.assign({}, DefaultNewSnippet);
          defaultSnippet.category = this.currentCategory ?? 'Uncategorized';

          this.plugin.settings.snippets?.push(defaultSnippet);
          this.plugin.saveSettings();
          this.buildSnippets();
        });
    });

    this.plugin.settings.snippets?.forEach((snippet, index) => {
      if (snippet.category !== category) return;

      const snippetEl = this.snippetsEl.createEl('div');
      snippetEl.className = 'typstmate-leaf-snippet';

      new Setting(snippetEl)
        // スニペット名
        .addText((text) => {
          text.setPlaceholder('name');
          text.setValue(snippet.name);
          text.onChange((value) => {
            this.plugin.settings.snippets![index]!.name = value;
            this.plugin.saveSettings();
          });
        })
        // 詳細
        .addButton((button) => {
          button
            .setButtonText('Detail')
            .setIcon('pencil')
            .onClick(() => {
              new SnippetExtModal(this.plugin.app, this.plugin, index, this).open();
            });
        })
        // 削除
        .addButton((button) => {
          button
            .setButtonText('Remove')
            .setIcon('trash')
            .onClick(() => {
              this.plugin.settings.snippets?.splice(index, 1);
              this.plugin.saveSettings();
              this.buildSnippets();
            })
            .buttonEl.addClasses(['typstmate-button', 'typstmate-button-danger']);
        });

      // プレビュー
      const preview = snippetEl.createEl('div');
      preview.className = 'typstmate-leaf-snippet-preview';
      const render = (id: string, kind: 'inline' | 'display' | 'codeblock', content: string, script: boolean) => {
        preview.empty();
        if (script) {
          preview.textContent = `${content.slice(0, 50)}...`;
        } else {
          switch (kind) {
            case 'inline':
              content = `${id}${id === '' ? '' : ':'}${content}`;
              break;
            case 'display':
              content = `${id}\n${content}\n`;
              break;
          }
          this.plugin.typstManager.render(content, preview, kind, '/');
        }
      };

      render(snippet.id, snippet.kind, snippet.content, snippet.script);

      preview.onClickEvent(() => {
        new SnippetEditModal(this.plugin.app, this.plugin, index, render).open();
      });
    });
  }
}
