import { Menu, Notice } from 'obsidian';

import { DEFAULT_FONT_SIZE } from '@/constants';
import { updateDiagnosticEffect } from '@/editor/shared/extensions/decorations/Diagnostic';
import type { Processor, ProcessorKind } from '@/libs/processor';
import type { Diagnostic, SVGResult } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';

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
    if (this.plugin.editorHelper?.editor)
      try {
        updateDiagnosticEffect(this.plugin.editorHelper.editor.cm, {
          // @ts-expect-error
          diags: result.diags,
          kind: this.kind,
          processor: this.processor,
          offset: this.offset,
          noDiag: this.noDiag,
        });
      } catch {}

    this.plugin.typstManager.beforeKind = this.kind;
  }

  format() {
    let formatted = this.processor.format.replace('{CODE}', this.source);
    formatted = `${this.plugin.typstManager.preamble}\n${formatted}`;
    formatted = this.processor.noPreamble ? formatted : `${this.plugin.settings.preamble}\n${formatted}`;

    return formatted;
  }

  handleError(err: Diagnostic[]) {
    this.isErr = true;

    if (this.plugin.editorHelper?.editor)
      try {
        updateDiagnosticEffect(this.plugin.editorHelper.editor.cm, {
          // @ts-expect-error
          diags: err,
          kind: this.kind,
          processor: this.processor,
          offset: this.offset,
          noDiag: this.noDiag,
        });
      } catch {}

    if (this.plugin.settings.enableMathjaxFallback) {
      this.replaceChildren(
        this.plugin.originalTex2chtml(this.source, {
          display: this.kind !== 'inline',
        }),
      );
    } else {
      this.innerHTML = this.innerHTML.replaceAll('--typst-base-color', '--text-faint');
      this.plugin.typstManager.beforeKind = this.kind;

      // TODO DiagnosticModal
    }
  }

  connectedCallback() {
    this.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.menu.showAtPosition({ x: event.pageX, y: event.pageY });
    });
  }
}
