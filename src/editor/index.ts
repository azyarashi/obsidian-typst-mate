import { Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MarkdownView, type WorkspaceLeaf } from 'obsidian';

import type ObsidianTypstMate from '@/main';
import type { JumpSer } from '../../pkg/typst_wasm';
import type TypstElement from '../ui/elements/Typst';
import type InlinePreviewElement from './markdown/elements/InlinePreview';
import { clearCodeblockPreviewsEffect } from './markdown/extensions/decorations/CodeblockPreview';
import type SnippetSuggestElement from './share/elements/SnippetSuggest';
import type SymbolSuggestElement from './share/elements/SymbolSuggest';
import { shortcutPlugin } from './share/extensions/actions/Shortcut';
import { buildExtension } from './share/extensions/build';
import { type ParsedRegion, type TypstParserPluginValue, typstMatePlugin } from './share/extensions/core/TypstMate';

import './share/css';

export class EditorHelper {
  plugin: ObsidianTypstMate;
  supportedCodeBlockLangs: Set<string>;

  inlinePreviewEl: InlinePreviewElement;
  snippetSuggestEl: SnippetSuggestElement;
  symbolSuggestEl: SymbolSuggestElement;

  beforeChar: string | null = null;
  lastKeyDownTime: number = 0;

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;

    this.inlinePreviewEl = document.createElement('typstmate-inline-preview') as InlinePreviewElement;
    this.snippetSuggestEl = document.createElement('typstmate-snippets') as SnippetSuggestElement;
    this.symbolSuggestEl = document.createElement('typstmate-symbols') as SymbolSuggestElement;
    this.inlinePreviewEl.startup(this.plugin);
    this.snippetSuggestEl.startup(this.plugin);
    this.symbolSuggestEl.startup(this.plugin);
    this.plugin.app.workspace.containerEl.appendChild(this.inlinePreviewEl);
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
          mousedown: (e, view) => {
            view.plugin(shortcutPlugin)?.clearShortcutTimeout();
            this.hideAllSuggest();
            if (this.inlinePreviewEl.style.display !== 'none') this.inlinePreviewEl.onClick(e);
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

  close() {
    this.inlinePreviewEl.close();
    this.symbolSuggestEl.close();
    this.snippetSuggestEl.close();
  }

  hideAllPopup() {
    this.inlinePreviewEl.close();
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
    const region = this.getActiveRegion(view);

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
    const region = this.getActiveRegion(view);
    if (!region) {
      this.close();
      return null;
    }
  }

  getActiveRegion(view: EditorView): ParsedRegion | undefined {
    const pluginVal = view.plugin(typstMatePlugin) as unknown as TypstParserPluginValue | null;
    if (!pluginVal) return undefined;

    const cursor = view.state.selection.main.head;
    return pluginVal.parsedRegions.find((r) => r.from <= cursor && cursor <= r.to);
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
    if (!region || region.kind !== 'inline') return;

    // region includes delimiters sometimes according to logic in TypstMate.ts?
    // Let's check TypstMate.ts "collectRegions" again.
    // It returns regions WITHOUT delimiters usually?
    // wait, TypstMate.ts:
    // rawRegions.push({ skip, from: innerFrom + skip, to: innerTo - skipEnd, ... })
    // It seems it strips delimiters based on "skip".
    // "skip" calculates length of "$", "$$", or "codeblock start".

    // So region.from and region.to are CONTENT range.
    this.replaceWithLength(
      view,
      `box(${view.state.sliceDoc(region.from, region.to)})`,
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

export interface PopupPosition {
  x: number;
  y: number;
}
