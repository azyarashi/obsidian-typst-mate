import { MarkdownView, Menu, Notice } from 'obsidian';

import { DEFAULT_FONT_SIZE } from '@/constants';
import { getActiveRegion } from '@/editor/shared/extensions/core/TypstMate';
import { updateDiagnosticEffect } from '@/editor/shared/extensions/decorations/Diagnostic';
import type { Processor, ProcessorKind } from '@/libs/processor';
import type { Diagnostic, SVGResult } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';
import { DiagnosticModal } from '../modals/diagnostic';

export default abstract class TypstElement extends HTMLElement {
  ndir!: string;
  npath?: string;
  kind!: ProcessorKind;
  source!: string;
  processor!: Processor;

  noDiag!: boolean;

  plugin!: ObsidianTypstMate;

  isErr = true;

  menu = new Menu().addItem((item) => {
    item.setTitle('Copy as script').onClick(() => {
      const code = this.format().replaceAll(
        'fontsize',
        `${(this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE) / 1.25}pt`,
      );
      navigator.clipboard.writeText(code);
      new Notice('Copied to clipboard!');
    });
  });

  abstract render(): Promise<this>;

  postProcess(result: SVGResult) {
    this.isErr = false;

    // ? キャンバスなどで呼ばれたとき用
    const view = this.plugin.app.workspace.getActiveFileView();
    if (view instanceof MarkdownView)
      setTimeout(() => {
        updateDiagnosticEffect(view.editor.cm, {
          // @ts-expect-error
          diags: result.diags,
          processor: this.processor,
          noDiag: this.noDiag,
        });
      }, 0);

    this.plugin.typstManager.beforeKind = this.kind;
  }

  format() {
    let formatted = this.processor.format.replaceAll('{CODE}', this.source);
    formatted = `${this.plugin.typstManager.preamble}\n${formatted}${this.kind === 'inline' ? '#text(size:0pt)[TypstMate]' : ''}`;
    formatted = this.processor.noPreamble ? formatted : `${this.plugin.settings.preamble}\n${formatted}`;

    return formatted;
  }

  handleError(err: Diagnostic[]) {
    this.isErr = true;
    this.plugin.typstManager.beforeKind = this.kind;

    const view = this.plugin.app.workspace.getActiveFileView();
    if (view instanceof MarkdownView)
      updateDiagnosticEffect(view.editor.cm, {
        // @ts-expect-error
        diags: err,
        processor: this.processor,
        noDiag: this.noDiag,
      });

    if (this.plugin.settings.enableMathjaxFallback) {
      this.replaceChildren(
        this.plugin.originalTex2chtml(this.source, {
          display: this.kind !== 'inline',
        }),
      );
    } else {
      if (view instanceof MarkdownView) {
        const region = getActiveRegion(view.editor.cm);
        if (region) {
          this.innerHTML = this.innerHTML.replaceAll('--typst-base-color', '--text-faint');
          return;
        }
      }
      const diagEl = document.createElement('span');
      diagEl.className = 'typstmate-error';

      diagEl.textContent = `${err[0]?.message}${err[0]?.hints.length !== 0 ? ` [${err[0]?.hints.length} hints]` : ''}`;

      if (err[0]?.hints.length !== 0)
        diagEl.addEventListener('click', () => new DiagnosticModal(this.plugin.app, err).open());

      this.replaceChildren(diagEl);
    }
  }

  connectedCallback() {
    this.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.menu.showAtPosition({ x: event.pageX, y: event.pageY });
    });
  }
}
