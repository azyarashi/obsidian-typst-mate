import { Notice, Platform, Setting } from 'obsidian';

import { t } from '@/i18n';
import type ObsidianTypstMate from '@/main';
import { FontModal } from '@/ui/modals/font';
import { hashLike } from '@/utils/hashLike';

export class FontList {
  plugin: ObsidianTypstMate;

  fontDataTableEl?: HTMLElement;
  fontDataCountEl?: HTMLElement;

  importedFontTableEl: HTMLElement;

  constructor(plugin: ObsidianTypstMate, containerEl: HTMLElement) {
    this.plugin = plugin;

    // システムフォント
    if (Platform.isDesktopApp) {
      new Setting(containerEl)
        .setName(t('settings.compiler.font.importFont'))
        .setDesc(t('settings.compiler.font.importFontDesc'))
        .addSearch((search) => {
          search.setPlaceholder(t('settings.compiler.font.filterPlaceholder'));

          search.onChange((value) => {
            this.filterSystemFontList(value.toLowerCase());
          });
        })
        .addButton((button) => {
          button.setIcon('list-restart');
          button.setTooltip(t('settings.compiler.font.tooltips.getFontList'));

          button.onClick(this.displaySystemFontList.bind(this));
        });

      this.fontDataCountEl = containerEl.createDiv();
      this.fontDataCountEl.textContent = t('settings.compiler.font.clickToLoad');

      this.fontDataTableEl = containerEl.createDiv('typstmate-settings-table typstmate-hidden');
    }

    // 読み込み済みフォント
    const settings = new Setting(containerEl)
      .setName(t('settings.compiler.font.importedFonts'))
      .setDesc(t('settings.compiler.font.importedFontsDesc'));
    if (Platform.isDesktopApp) {
      settings.addButton((button) => {
        button.setTooltip(t('settings.compiler.font.tooltips.openFolder'));
        button.setIcon('folder');
        button.onClick(async () => {
          window.open(`file://${this.plugin.baseDirPath}/${this.plugin.fontsDirNPath}`);
        });
      });
    }

    this.importedFontTableEl = containerEl.createDiv('typstmate-settings-table typstmate-hidden');

    this.displayImportedFontList();
  }

  async filterSystemFontList(filter: string) {
    let count = 0;

    const children = this.fontDataTableEl!.children as HTMLCollectionOf<HTMLElement>;
    for (const child of children) {
      const name = child.id ?? '';

      if (name.includes(filter)) {
        child.classList.remove('typstmate-hidden');
        count++;
      } else {
        child.classList.add('typstmate-hidden');
      }
    }

    this.fontDataCountEl!.textContent = t('settings.compiler.font.fontCount', { count });
    if (count === 0) this.fontDataTableEl!.classList.add('typstmate-hidden');
    else this.fontDataTableEl!.classList.remove('typstmate-hidden');
  }

  async displaySystemFontList() {
    this.fontDataTableEl!.empty();

    const fontDataList = (await window.queryLocalFonts?.()) ?? [];
    if (fontDataList.length === 0) return;
    this.fontDataTableEl!.classList.remove('typstmate-hidden');

    this.fontDataCountEl!.textContent = t('settings.compiler.font.fontCount', { count: fontDataList.length });
    for (const fontData of fontDataList) {
      const setting = new Setting(this.fontDataTableEl!);
      setting.settingEl.id = fontData.postscriptName.toLowerCase();

      const fontId = hashLike(fontData.fullName);

      setting
        .setName(`${fontData.fullName} (${fontId})`)
        .addButton((button) => {
          button.setIcon('info');
          button.setTooltip(t('settings.compiler.font.tooltips.getInfo'));

          button.onClick(async () => {
            const info = await this.plugin.typst.parseFont(await (await fontData.blob()).arrayBuffer());

            new FontModal(this.plugin.app, info).open();
          });
        })
        .addButton((button) => {
          button.setTooltip(t('settings.compiler.font.tooltips.importFont'));
          button.setIcon('plus');
          button.onClick(() => this.importFont(fontData));
        });
    }
  }

  addImportedFontSetting(fontPath: string) {
    const basename = fontPath.split('/').pop()!;
    const PSName = basename.split('.').slice(0, -2).join('.');
    const fontId = basename.split('.').at(-2)!;

    const setting = new Setting(this.importedFontTableEl);
    setting.settingEl.id = basename;

    setting
      .setName(`${PSName} (${fontId})`)
      .addButton((button) => {
        button.setIcon('info');
        button.setTooltip(t('settings.compiler.font.tooltips.getInfo'));

        button.onClick(async () => {
          const info = await this.plugin.typst.parseFont(await this.plugin.app.vault.adapter.readBinary(fontPath));

          new FontModal(this.plugin.app, info).open();
        });
      })
      .addButton((button) => {
        button.setIcon('trash');
        button.setTooltip(t('settings.compiler.font.tooltips.remove'));
        button.buttonEl.classList.add('typstmate-button', 'typstmate-button-danger');

        button.onClick(this.removeFont.bind(this, basename));
      });
  }

  async displayImportedFontList() {
    this.importedFontTableEl.empty();

    const fontPaths = (await this.plugin.app.vault.adapter.list(this.plugin.fontsDirNPath)).files.filter((f) =>
      f.endsWith('.font'),
    );

    if (fontPaths.length === 0) {
      this.importedFontTableEl.classList.add('typstmate-hidden');
      return;
    }
    this.importedFontTableEl.classList.remove('typstmate-hidden');

    for (const fontPath of fontPaths) {
      this.addImportedFontSetting(fontPath);
    }
  }

  async importFont(fontData: FontData) {
    const fontId = hashLike(fontData.fullName);
    const basename = `${fontData.postscriptName}.${fontId}.font`;

    if (this.importedFontTableEl.children.namedItem(basename)) {
      new Notice(t('notices.fontAlreadyImported'));
      return;
    }

    const fontArrayBuffer = await (await fontData.blob()).arrayBuffer();

    // フォントの読み込み
    await this.plugin.app.vault.adapter.writeBinary(`${this.plugin.fontsDirNPath}/${basename}`, fontArrayBuffer);
    await this.plugin.typst.store({
      fonts: [fontArrayBuffer],
    });

    // 表示
    this.addImportedFontSetting(`${this.plugin.fontsDirNPath}/${basename}`);

    new Notice(t('notices.importedSuccessfully'));
  }

  async removeFont(basename: string) {
    // フォントの削除
    await this.plugin.app.vault.adapter.remove(`${this.plugin.fontsDirNPath}/${basename}`);

    // 表示
    this.importedFontTableEl.children.namedItem(basename)?.remove();
    if (this.importedFontTableEl.children.length === 0) this.importedFontTableEl.classList.add('typstmate-hidden');

    new Notice(t('notices.removedSuccessfully'));
  }
}

export interface FontData {
  family: string;
  fullName: string;
  postscriptName: string;
  style: string;
  blob: () => Promise<Blob>;
}
