import { Component, type TFile } from 'obsidian';
import type { EmbedComponent } from 'obsidian-typings';
import { appUtils, fileManager, rendererManager } from '@/libs';
import { path } from '@/libs/features';

import './typst-embed.css';
import type { Diagnostic } from '@wasm';
import { t } from '@/libs/i18n';

export class TypstEmbedComponent extends Component implements EmbedComponent {
  private isLoading = false;

  public constructor(
    private readonly containerEl: HTMLElement,
    private readonly file: TFile,
  ) {
    super();
  }

  public loadFile(): void {
    this.loadFileAsync();
  }

  public async loadFileAsync(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const code = await appUtils.app.vault.read(this.file);
      const fullPath = path ? path.join(fileManager.baseDirPath, this.file.path) : this.file.path;

      const result = await rendererManager.wasm.svgpAsync(fullPath, code);

      this.containerEl.empty();

      if (!result?.svgp || result.svgp.length === 0) {
        this.containerEl.setText(t('embeds.typst.noPagesRendered'));
        return;
      }

      const wrapper = this.containerEl.createDiv({ cls: 'typstmate-embed-wrapper' });
      for (const svg of result.svgp) {
        const pageContainer = wrapper.createDiv({ cls: 'typstmate-embed-page' });
        pageContainer.innerHTML = svg;
      }
    } catch (err: unknown) {
      this.containerEl.empty();
      this.containerEl.setText((err as Diagnostic[])?.at(0)?.message!);
    } finally {
      this.isLoading = false;
    }
  }
}
