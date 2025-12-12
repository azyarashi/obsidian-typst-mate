import { Menu, Notice } from 'obsidian';
import { DEFAULT_FONT_SIZE } from '@/constants';
import { updateDiagnosticEffect } from '@/core/editor/extensions/decorations/diagnostic';
import type { Processor, ProcessorKind } from '@/libs/processor';
import type { Diagnostic, SVGResult } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';
import { DiagnosticModal } from '@/ui/modals/diagnostic';

export default abstract class TypstElement extends HTMLElement {
  kind!: ProcessorKind;
  source!: string;
  processor!: Processor;

  offset!: number;
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
    if (this.plugin.editorHelper.editor)
      // @ts-expect-error
      updateDiagnosticEffect(this.plugin.editorHelper.editor.cm, {
        diags: result.diags,
        kind: this.kind,
        processor: this.processor,
        offset: this.offset,
        noDiag: this.noDiag,
      });

    this.plugin.typstManager.beforeKind = this.kind;
  }

  format() {
    let formatted = this.processor.format.replace('{CODE}', this.source);
    formatted = this.processor.noPreamble ? formatted : `${this.plugin.settings.preamble}\n${formatted}`;

    if (this.kind === 'display' && formatted.includes('<br>')) {
      formatted = formatted.replaceAll('<br>', '\n');
      this.noDiag = true;
    }

    return formatted;
  }

  handleError(err: Diagnostic[]) {
    this.isErr = true;

    if (this.plugin.editorHelper.editor)
      // @ts-expect-error
      updateDiagnosticEffect(this.plugin.editorHelper.editor.cm, {
        diags: err,
        kind: this.kind,
        processor: this.processor,
        offset: this.offset,
        noDiag: this.noDiag,
      });

    if (this.plugin.settings.enableMathjaxFallback) {
      this.replaceChildren(
        this.plugin.originalTex2chtml(this.source, {
          display: this.kind !== 'inline',
        }),
      );
    } else {
      const diagEl = document.createElement('span');
      diagEl.className = 'typstmate-error';

      diagEl.textContent = `${err[0]?.message}${err[0]?.hints.length !== 0 ? ` [${err[0]?.hints.length} hints]` : ''}`;

      if (err[0]?.hints.length !== 0)
        diagEl.addEventListener('click', () => new DiagnosticModal(this.plugin.app, err).open());

      this.plugin.typstManager.beforeKind = this.kind;
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
