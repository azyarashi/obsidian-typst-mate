import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Editor, type EditorPosition, type MarkdownView, Notice, type WorkspaceLeaf } from 'obsidian';

import type { Jump } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';
import type TypstElement from '@/ui/elements/Typst';
import { buildExtension as buildMarkdownExtensions } from './markdown/extensions/build';
import { buildExtension as buildSharedExtensions } from './shared/extensions/build';
import { getActiveRegion } from './shared/extensions/core/TypstMate';

import './shared/css';

export class EditorHelper {
  editor?: Editor;
  plugin: ObsidianTypstMate;
  supportedCodeBlockLangs: Set<string>;

  beforeChar: string | null = null;
  lastKeyDownTime: number = 0;

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;

    this.supportedCodeBlockLangs = new Set(
      (this.plugin.settings.processor.codeblock?.processors ?? []).map((p) => p.id),
    );

    // 拡張機能をセット
    this.plugin.registerEditorExtension([
      Prec.high([
        [...buildSharedExtensions(this), ...buildMarkdownExtensions()],
        EditorView.domEventHandlers({
          // CURSOR Jump, Tabout, Shortcut
          keydown: (e) => {
            this.keyDown(e);
          },
        }),
      ]),
    ]);
  }

  onActiveLeafChange(leaf: WorkspaceLeaf | null) {
    this.editor = leaf?.view.getViewType() === 'markdown' ? (leaf?.view as MarkdownView)?.editor : undefined;
  }

  /* key down
   */

  private keyDown(e: KeyboardEvent) {
    if (!this.plugin.settings.disableMacro) {
      if (!this.editor) return;
      if (this.beforeChar === 'd' && e.key === 'm') {
        if (Date.now() - this.lastKeyDownTime > 500) return;
        e.preventDefault();
        const { line, ch } = this.editor.getCursor();
        this.editor.replaceRange(
          '$$\n\n$$',
          {
            line,
            ch: ch - 1,
          },
          { line, ch: ch },
        );

        this.editor?.setCursor({
          line: line + 1,
          ch: 0,
        });
        this.beforeChar = null;
      } else if (this.beforeChar === 'm' && e.key === 'k') {
        if (Date.now() - this.lastKeyDownTime > 500) return;
        e.preventDefault();
        const { line, ch } = this.editor.getCursor();
        this.editor.replaceRange(
          '${}  {}$',
          {
            line,
            ch: ch - 1,
          },
          { line, ch: ch },
        );

        this.editor?.setCursor({
          line: line,
          ch: ch + 2,
        });
        this.beforeChar = null;
      } else {
        this.beforeChar = e.key;
        this.lastKeyDownTime = Date.now();
      }
      return;
    }
  }

  /* utils
   */

  jumpTo(jump: Jump, context?: TypstElement) {
    if (jump.type === 'file') {
      if (context && this.editor) {
        const view = this.editor.cm;
        const domPos = view.posAtDOM(context);

        const { noPreamble, format } = context.processor;
        let offset =
          context.offset +
          (jump.pos ?? 0) -
          (noPreamble ? 0 : this.plugin.settings.preamble.length + 1) -
          format.indexOf('{CODE}');

        const execute = (pos: EditorPosition) => {
          this.editor!.setSelection(pos, pos);
          this.editor!.setCursor(pos);
          this.editor!.scrollIntoView({ from: pos, to: pos }, true);
          this.editor!.focus();

          setTimeout(() => {
            this.triggerRippleEffect(pos);
          }, 50);
        };

        if (context.kind === 'codeblock') {
          const line = this.editor.offsetToPos(domPos).line;
          for (let i = line; i >= 0; i--) {
            const text = this.editor.getLine(i);
            if (!text.startsWith('```') && !text.startsWith('~~~')) continue;
            if (text === '```' || text === '~~~') continue;

            offset += this.editor.posToOffset({ line: i, ch: 0 }) + 4; // ``` と改行
            break;
          }
          const pos = this.editor?.offsetToPos(offset);
          if (!pos) return;

          execute(pos);
        } else {
          setTimeout(() => {
            if (!this.editor) return;
            const head = this.editor.listSelections().at(0)?.head;
            if (!head) return;
            const headOffset = this.editor.posToOffset(head);
            if (this.editor.getRange({ line: head.line, ch: head.ch - 1 }, head).at(0) !== '$') offset -= 1;
            const pos = this.editor.offsetToPos(offset + headOffset);
            if (!pos) return;

            execute(pos);
          }, 200);
        }
        return;
      }
    } else if (jump.type === 'url') window.open(jump.url);
  }

  triggerRippleEffect(pos: EditorPosition) {
    if (!this.editor) return;
    const coords = this.editor.coordsAtPos(pos, false);
    if (!coords) return;

    const ripple = document.createElement('div');
    ripple.className = 'typst-mate-jump-ripple';
    ripple.style.left = `${coords.left}px`;
    ripple.style.top = `${coords.top}px`;
    document.body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 900);
  }

  replaceWithLength(content: string, from: EditorPosition, length: number): number {
    this.editor?.replaceRange(content, from, {
      line: from.line,
      ch: from.ch + length,
    });
    return content.length;
  }

  addHighlightsWithLength(length: number, froms: EditorPosition[], style: string, remove_previous: boolean) {
    this.editor?.addHighlights(
      froms.map((from) => ({
        from,
        to: {
          line: from.line,
          ch: from.ch + length,
        },
      })),
      // @ts-expect-error
      style,
      remove_previous,
    );
  }

  /* Editor Commands
   * Obsidian LaTeX Suite からの輸入
   */

  boxCurrentEquation(view: EditorView) {
    const region = getActiveRegion(view);
    if (!region) return new Notice('There is no active region');

    const content = view.state.sliceDoc(region.from + region.skip, region.to);

    view.dispatch({
      changes: {
        from: region.from + region.skip,
        to: region.to,
        insert: `${region.kind === 'display' ? ' ' : ''}boxed(${content})`,
      },
      selection: {
        anchor: region.from + region.skip + `boxed(${content})`.length,
      },
    });
  }

  selectCurrentEquation(view: EditorView) {
    const region = getActiveRegion(view);
    if (!region) return new Notice('There is no active region');

    view.dispatch({
      selection: { anchor: region.from + region.skip, head: region.to },
    });
  }
}
