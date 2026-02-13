import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownView, type WorkspaceLeaf } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import type { JumpSer } from '../../pkg/typst_wasm';
import type TypstElement from '../ui/elements/Typst';

import { clearCodeblockPreviewsEffect } from './markdown/extensions/decorations/CodeblockPreview';
import type SnippetSuggestElement from './shared/elements/SnippetSuggest';
import type SymbolSuggestElement from './shared/elements/SymbolSuggest';
import { shortcutPlugin } from './shared/extensions/actions/Shortcut';
import { buildExtension } from './shared/extensions/build';
import { getActiveRegion, type ParsedRegion } from './shared/extensions/core/TypstMate';
import type { PopupPosition } from './shared/utils/position';

import './shared/css';

export class EditorHelper {
  plugin: ObsidianTypstMate;
  supportedCodeBlockLangs: Set<string>;

  // inlinePreviewEl removed - handled by extension
  snippetSuggestEl: SnippetSuggestElement;
  symbolSuggestEl: SymbolSuggestElement;

  beforeChar: string | null = null;
  lastKeyDownTime: number = 0;

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;

    this.snippetSuggestEl = document.createElement('typstmate-snippets') as SnippetSuggestElement;
    this.symbolSuggestEl = document.createElement('typstmate-symbols') as SymbolSuggestElement;

    this.snippetSuggestEl.startup(this.plugin);
    this.symbolSuggestEl.startup(this.plugin);

    this.plugin.app.workspace.containerEl.appendChild(this.snippetSuggestEl);
    this.plugin.app.workspace.containerEl.appendChild(this.symbolSuggestEl);

    this.supportedCodeBlockLangs = new Set(
      (this.plugin.settings.processor.codeblock?.processors ?? []).map((p) => p.id),
    );

    // Set extensions
    this.plugin.registerEditorExtension(
      EditorView.updateListener.of(async (update) => {
        const view = update.view;

        if (update.focusChanged) this.focusChanged(update.view.hasFocus);
        if (update.selectionSet) await this.cursorMoved(view);
      }),
    );

    this.plugin.registerEditorExtension([
      Prec.high([
        buildExtension(this),
        EditorView.domEventHandlers({
          mousedown: (_e, view) => {
            view.plugin(shortcutPlugin)?.clearShortcutTimeout();
            this.hideAllSuggest();
            // InlinePreview mousedown handler removed
          },
          keydown: (e, view) => {
            this.keyDown(e, view);
          },
        }),
      ]),
    ]);

    this.plugin.registerDomEvent(document, 'mousedown', (e) => {
      const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.cm as EditorView | undefined;
      if (!view) return;
      if (!view.dom.contains(e.target as Node)) view.dispatch({ effects: clearCodeblockPreviewsEffect.of() });
    });
  }

  get editor() {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  }

  close() {
    // this.inlinePreviewEl.close(); removed
    this.symbolSuggestEl.close();
    this.snippetSuggestEl.close();
  }

  hideAllPopup() {
    // this.inlinePreviewEl.close(); removed - extension handles its own visibility via focus/selection
    this.hideAllSuggest();
  }

  hideAllSuggest() {
    this.symbolSuggestEl.close();
    this.snippetSuggestEl.close();
  }

  onActiveLeafChange(leaf: WorkspaceLeaf | null) {
    const viewType = leaf?.view.getViewType();
    if (viewType !== 'markdown' && viewType !== 'typst-text') this.close();
  }

  private focusChanged(hasFocus: boolean) {
    if (hasFocus) return;
    this.close();
  }

  private keyDown(e: KeyboardEvent, view: EditorView) {
    const region = getActiveRegion(view);

    if (!this.plugin.settings.disableMacro && !region) {
      if (this.beforeChar === 'm' && e.key === 'k') {
        if (Date.now() - this.lastKeyDownTime > 500) return;
        e.preventDefault();
        const cursor = view.state.selection.main.head;

        view.dispatch({
          changes: { from: cursor - 1, to: cursor, insert: '$$\n\n$$' },
          selection: { anchor: cursor + 2 },
        });

        this.beforeChar = null;
      } else if (this.beforeChar === 'd' && e.key === 'm') {
        if (Date.now() - this.lastKeyDownTime > 500) return;
        e.preventDefault();
        const cursor = view.state.selection.main.head;

        // ${}  {}$
        view.dispatch({
          changes: { from: cursor - 1, to: cursor, insert: '${}  {}$' },
          selection: { anchor: cursor + 2 },
        });

        this.beforeChar = null;
      } else {
        this.beforeChar = e.key;
        this.lastKeyDownTime = Date.now();
      }
      return;
    }
  }

  private async cursorMoved(view: EditorView): Promise<null | undefined> {
    const region = getActiveRegion(view);
    if (!region) {
      this.close();
      return null;
    }
  }

  getActiveRegion(view: EditorView): ParsedRegion | undefined {
    return getActiveRegion(view);
  }

  jumpTo(jump: JumpSer, context: TypstElement | undefined, view: EditorView) {
    if (jump.type === 'file') {
      if (context && view) {
        const domPos = view.posAtDOM(context);

        const { noPreamble, format } = context.processor;
        let offset =
          context.offset +
          (jump.pos ?? 0) -
          (noPreamble ? 0 : this.plugin.settings.preamble.length + 1) -
          format.indexOf('{CODE}');

        const execute = (pos: number) => {
          view.dispatch({
            selection: { anchor: pos, head: pos },
            effects: EditorView.scrollIntoView(pos, { y: 'center' }),
          });
          view.focus();

          setTimeout(() => {
            this.triggerRippleEffect(view, pos);
          }, 50);
        };

        if (context.kind === 'codeblock') {
          const lineObj = view.state.doc.lineAt(domPos);
          // Traverse lines up to find ```
          for (let i = lineObj.number; i > 0; i--) {
            const l = view.state.doc.line(i);
            const text = l.text;
            if (!text.startsWith('```') && !text.startsWith('~~~')) continue;
            if (text === '```' || text === '~~~') continue;

            offset += l.from + 4;
            break;
          }
          execute(offset);
        } else {
          setTimeout(() => {
            const head = view.state.selection.main.head;
            // check if prev char is $
            const prevChar = view.state.sliceDoc(head - 1, head);
            if (prevChar !== '$') offset -= 1;

            execute(offset + head);
          }, 200);
        }
        return;
      }
    } else if (jump.type === 'url') window.open(jump.url);
  }

  triggerRippleEffect(view: EditorView, pos: number) {
    const coords = view.coordsAtPos(pos);
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

  replaceWithLength(view: EditorView, content: string, from: number, length: number): number {
    view.dispatch({
      changes: { from, to: from + length, insert: content },
      selection: { anchor: from + content.length },
    });
    return content.length;
  }

  calculatePopupPosition(view: EditorView, startOffset: number, endOffset: number): PopupPosition {
    const startCoords = view.coordsAtPos(startOffset);
    const endCoords = view.coordsAtPos(endOffset);

    if (!startCoords || !endCoords) throw new Error();

    // Line start coords
    const lineStartCoords = view.coordsAtPos(view.state.doc.lineAt(startOffset).from);

    const x =
      Math.abs(startCoords.top - endCoords.top) > 8
        ? lineStartCoords
          ? lineStartCoords.left
          : startCoords.left
        : startCoords.left;

    const y = endCoords.bottom + 2;

    return { x, y };
  }

  boxCurrentEquation(view: EditorView) {
    const region = this.getActiveRegion(view);
    if (!region || region.kind === 'extended') return;

    this.replaceWithLength(
      view,
      `#box(${view.state.sliceDoc(region.from, region.to)}, stroke: black + 1pt)`,
      region.from,
      region.to - region.from,
    );
  }

  selectCurrentEquation(view: EditorView) {
    const region = this.getActiveRegion(view);
    if (!region) return;

    view.dispatch({
      selection: { anchor: region.from, head: region.to },
    });
  }
}
