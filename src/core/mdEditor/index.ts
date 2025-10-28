import type { Extension } from '@codemirror/state';
import { type Editor, type EditorPosition, MarkdownView, type WorkspaceLeaf } from 'obsidian';
import type ObsidianTypstMate from '@/main';
import { buildExtension } from './build';
import type InlinePreviewElement from './elements/InlinePreview';
import type SnippetSuggestElement from './elements/SnippetSuggest';
import type SymbolSuggestElement from './elements/SymbolSuggest';
import type { MathObject } from './extensions/others/math';

export class EditorHelper {
  editor?: Editor;
  plugin: ObsidianTypstMate;

  inlinePreviewEl: InlinePreviewElement;
  snippetSuggestEl: SnippetSuggestElement;
  symbolSuggestEl: SymbolSuggestElement;

  constructor(plugin: ObsidianTypstMate) {
    this.plugin = plugin;

    this.inlinePreviewEl = document.createElement('typstmate-inline-preview') as InlinePreviewElement;
    this.inlinePreviewEl.startup(this.plugin);
    this.snippetSuggestEl = document.createElement('typstmate-snippets') as SnippetSuggestElement;
    this.snippetSuggestEl.startup(this.plugin);
    this.symbolSuggestEl = document.createElement('typstmate-symbols') as SymbolSuggestElement;
    this.symbolSuggestEl.startup(this.plugin);

    this.plugin.app.workspace.containerEl.appendChild(this.inlinePreviewEl);
    this.plugin.app.workspace.containerEl.appendChild(this.snippetSuggestEl);
    this.plugin.app.workspace.containerEl.appendChild(this.symbolSuggestEl);

    const extension = buildExtension(this);
    this.plugin.registerEditorExtension(extension);

    this.editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
  }

  registerExtensions() {
    const extension = buildExtension(this);
    this.plugin.registerEditorExtension(extension);
  }

  close() {
    this.editor?.removeHighlights('typstmate-atmode');
    this.plugin.registerEditorExtension([]);
  }

  onActiveLeafChange(leaf: WorkspaceLeaf | null) {
    this.editor = leaf?.view.getViewType() === 'markdown' ? (leaf?.view as MarkdownView)?.editor : undefined;
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

  calculatePopupPosition(startPos: EditorPosition, endPos: EditorPosition): Position | null {
    if (!this.editor) return null;

    const startCoords = this.editor.coordsAtPos(startPos, false);
    const endCoords = this.editor.coordsAtPos(endPos, false);
    if (!startCoords || !endCoords) return null;

    const x =
      Math.abs(startCoords.top - endCoords.top) > 8
        ? this.editor.coordsAtPos({ line: startPos.line, ch: 0 }, false).left
        : startCoords.left;
    const y = endCoords.bottom;

    return { x, y };
  }

  getMathObject(offset: number): MathObject | null {
    console.log(offset, this.isActiveMathExists(), this.isActiveDisplayMathExists());
    if (!this.isActiveMathExists()) return null;
    if (this.isActiveDisplayMathExists()) return this.extractDisplayMathObjectInsideTwoDollarsOutsideCursor(offset);
    else return this.extractInlineMathObjectInsideDollarOutsideCursor(offset);
  }

  extractInlineMathObjectInsideDollarOutsideCursor = (offset: number): MathObject | null => {
    if (!this.editor) return null;

    const doc = this.editor.cm.state.doc;
    const cursor = this.editor.offsetToPos(offset);
    const lineOnCursor = doc.line(cursor.line + 1).text;

    const lineBeforeCursor = lineOnCursor.slice(0, cursor.ch);
    const lineAfterCursor = lineOnCursor.slice(cursor.ch);
    const dollarIndexBeforeCursor = lineBeforeCursor.lastIndexOf('$');
    const dollarIndexAfterCursor = lineAfterCursor.indexOf('$');

    // カーソルを囲む $ がない場合は return
    if (dollarIndexBeforeCursor === -1 || dollarIndexAfterCursor === -1) return null;

    const content = lineOnCursor.slice(dollarIndexBeforeCursor + 1, cursor.ch + dollarIndexAfterCursor);
    const startPos = { line: cursor.line, ch: dollarIndexBeforeCursor + 1 };
    const endPos = { line: cursor.line, ch: cursor.ch + dollarIndexAfterCursor };

    return {
      kind: 'inline',
      mode: null,
      content: content,
      startPos: startPos,
      endPos: endPos,
      startOffset: this.editor.posToOffset(startPos),
      endOffset: this.editor.posToOffset(endPos),
    };
  };

  extractDisplayMathObjectInsideTwoDollarsOutsideCursor = (offset: number): MathObject | null => {
    if (!this.editor) return null;

    const doc = this.editor.cm.state.doc;

    // カーソル前後のドキュメントを取得
    const docBeforeCursor = doc.sliceString(0, offset);
    const docAfterCursor = doc.sliceString(offset);

    // $$ の間にカーソルがある
    if (docBeforeCursor.endsWith('$') && docAfterCursor.startsWith('$')) return null;

    const dollarOffsetBeforeCursor = docBeforeCursor.lastIndexOf('$$') + 2; // ? $$ の分
    const dollarOffsetAfterCursor = offset + docAfterCursor.indexOf('$$');

    // カーソルを囲む $$ がない場合は return
    if (dollarOffsetBeforeCursor === -1 + 2 || dollarOffsetAfterCursor === -1) return null;

    const content = doc.sliceString(dollarOffsetBeforeCursor, dollarOffsetAfterCursor);
    const startPos = this.editor.offsetToPos(dollarOffsetBeforeCursor);
    const endPos = this.editor.offsetToPos(dollarOffsetAfterCursor);

    return {
      kind: 'display',
      mode: null,
      content: content,
      startPos: startPos,
      endPos: endPos,
      startOffset: this.editor.posToOffset(startPos),
      endOffset: this.editor.posToOffset(endPos),
    };
  };

  // カーソルが数式内にあるとは限らない
  // |$$ でも $!$ でも 単に範囲選択中でも存在する
  isActiveMathExists(): boolean {
    return !!this.editor?.containerEl.querySelector('span.cm-formatting-math');
  }

  // TODO: 両方ともビューポートから外れていると認識されない
  isActiveDisplayMathExists(): boolean {
    return (
      !!this.editor?.containerEl.querySelector('span.cm-formatting-math.cm-math-block') ||
      this.editor?.containerEl.querySelector('span.cm-formatting-math-end')?.textContent === '$$'
    );
  }
}

export interface Position {
  x: number;
  y: number;
}
