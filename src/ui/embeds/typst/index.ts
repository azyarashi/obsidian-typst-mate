import { Component, type TFile } from 'obsidian';
import type { EmbedComponent } from 'obsidian-typings';
import { appUtils, typstManager } from '@/libs';
import { ctxToNDir } from '@/libs/typstManager';

import './typst-embed.css';

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
      const ndir = ctxToNDir(this.file.path);

      const result = await typstManager.wasm.svgpAsync(ndir, this.file.name, code);

      this.containerEl.empty();

      if (!result?.svgp || result.svgp.length === 0) {
        this.containerEl.setText('No pages rendered.');
        return;
      }

      const wrapper = this.containerEl.createDiv({ cls: 'typstmate-embed-wrapper' });
      for (const svg of result.svgp) {
        const pageContainer = wrapper.createDiv({ cls: 'typstmate-embed-page' });
        pageContainer.innerHTML = svg;
      }
    } catch (err) {
      console.error('[TypstMate] Embed render failed:', err);
      this.containerEl.empty();
      this.containerEl.setText('Failed to render Typst file.');
    } finally {
      this.isLoading = false;
    }
  }
}
