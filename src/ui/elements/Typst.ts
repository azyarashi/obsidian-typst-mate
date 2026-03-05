import { MarkdownView, Menu, Notice } from 'obsidian';

import { DEFAULT_FONT_SIZE } from '@/constants';
import { updateDiagnosticEffect } from '@/editor/shared/extensions/Diagnostic';
import { getActiveRegion } from '@/editor/shared/utils/core';
import { t } from '@/i18n';
import type { Processor, ProcessorKind } from '@/libs/processor';
import { getNoteWidth } from '@/libs/profile';
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
  offset: number = 0;

  plugin!: ObsidianTypstMate;

  isErr = true;

  menu = new Menu().addItem((item) => {
    item.setTitle(t('contextMenu.copyAsScript')).onClick(() => {
      const { formatted } = format(this.plugin, this.source, this.kind, this.processor);
      navigator.clipboard.writeText(
        formatted.replaceAll(
          'fontsize',
          `${(this.plugin.app.vault.config.baseFontSize ?? DEFAULT_FONT_SIZE) / 1.25}pt`,
        ),
      );
      new Notice(t('notices.copiedToClipboard'));
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
          diagnostics: result.diags,
          processor: this.processor,
          noDiag: this.noDiag,
          offset: this.offset,
        });
      }, 0);

    this.plugin.typstManager.beforeKind = this.kind;
  }

  format() {
    const { formatted, offset } = format(this.plugin, this.source, this.kind, this.processor);
    this.offset = offset;

    return formatted;
  }

  handleError(err: Diagnostic[]) {
    this.isErr = true;
    this.plugin.typstManager.beforeKind = this.kind;

    const view = this.plugin.app.workspace.getActiveFileView();
    if (view instanceof MarkdownView)
      setTimeout(() => {
        updateDiagnosticEffect(view.editor.cm, {
          diagnostics: err,
          processor: this.processor,
          noDiag: this.noDiag,
          offset: this.offset,
        });
      }, 0);

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

      diagEl.textContent = `${err[0]?.message}${err[0]?.hints.length !== 0 ? ` ${t('common.hintsCount', { count: err[0]?.hints.length ?? 0 })}` : ''}`;

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

export function format(plugin: ObsidianTypstMate, source: string, kind: ProcessorKind, processor: Processor) {
  let formatted = processor.useReplaceAll
    ? processor.format.replaceAll('{CODE}', source)
    : processor.format.replace('{CODE}', source);
  formatted = `${plugin.typstManager.preamble}\n${formatted}${kind === 'inline' ? '#text(size:0pt)[TypstMate]' : ''}`;
  formatted = processor.noPreamble ? formatted : `${plugin.settings.preamble}\n${formatted}`;

  let offset =
    -processor.format.indexOf('{CODE}') -
    (processor.noPreamble ? 0 : plugin.settings.preamble.length + 1) -
    plugin.typstManager.preamble.length -
    1;

  if (processor.fitToNoteWidth) {
    const width = getNoteWidth(plugin);
    formatted = `#let WIDTH = ${width}\n${formatted}`;
    offset -= 14 + width.length;
  }

  return { formatted, offset };
}
