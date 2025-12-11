import { type ChangeSet, Prec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { type Editor, type EditorPosition, MarkdownView, type WorkspaceLeaf } from 'obsidian';

import type { BracketPair } from '@/libs/worker';
import type ObsidianTypstMate from '@/main';
import type InlinePreviewElement from './elements/InlinePreview';
import type SnippetSuggestElement from './elements/SnippetSuggest';
import type SymbolSuggestElement from './elements/SymbolSuggest';
import { buildExtension } from './extensions/build';

import './editor.css';

import SHORTCUTS_DATA from '@/data/shortcuts.json';
import { snippetRegex } from './elements/SnippetSuggest';
import { symbolRegex } from './elements/SymbolSuggest';

const SHORTCUTS_KEYS = Object.keys(SHORTCUTS_DATA);

export class EditorHelper {
  editor?: Editor;
  plugin: ObsidianTypstMate;

  mathObject?: MathObject;
  bracketPairs?: BracketPair[];
  cursorEnclosingBracketPair?: BracketPair;

  private inlinePreviewEl: InlinePreviewElement;
  private snippetSuggestEl: SnippetSuggestElement;
  private symbolSuggestEl: SymbolSuggestElement;

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

    // 拡張機能をセット
    this.plugin.registerEditorExtension(
      EditorView.updateListener.of(async (update) => {
        if (!this.editor) this.editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!this.editor) return;
        const sel = update.state.selection.main;

        // サジェストやプレビューの非表示
        if (update.focusChanged) this.focusChanged(update.view.hasFocus);
        // サジェストの開始, インラインプレビューの更新
        else if (update.docChanged && sel.empty) await this.docChanged(sel.head, update.changes);
        // 親括弧のハイライト, MathObject の更新 & 変更あれば括弧のハイライト, なければインラインプレビュー
        if (update.selectionSet) {
          const result = await this.cursorMoved(sel.head);
          if (result !== null) this.cursorMovedPostProcess(sel.empty, sel.head);
        }
      }),
    );
    this.plugin.registerEditorExtension([
      Prec.high([
        buildExtension(this),
        EditorView.domEventHandlers({
          // インラインプレビューの非表示
          mousedown: (e) => {
            if (this.inlinePreviewEl.style.display !== 'none') this.inlinePreviewEl.onClick(e);
          },
          // Suggest, CURSOR Jump, Tabout, Shortcut
          keydown: (e) => {
            if (this.symbolSuggestEl.style.display !== 'none') this.symbolSuggestEl.onKeyDown(e);
            else if (this.snippetSuggestEl.style.display !== 'none') this.snippetSuggestEl.onKeyDown(e);
            // CURSOR Jump, Tabout, Shortcut
            else this.keyDown(e);
          },
        }),
      ]),
    ]);
  }

  close() {
    this.inlinePreviewEl.close();
    this.symbolSuggestEl.close();
    this.snippetSuggestEl.close();
    this.removeHighlightsFromBracketPairs();
    this.removeHighlightsFromBracketPairEnclosingCursor();
    this.editor?.removeHighlights('typstmate-atmode');
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
    this.editor = leaf?.view.getViewType() === 'markdown' ? (leaf?.view as MarkdownView)?.editor : undefined;
    if (this.editor) this.mathObject = undefined;
    this.close();
  }

  /* doc changed
   */

  private async docChanged(offset: number, changes: ChangeSet): Promise<void> {
    if (!this.isActiveMathExists()) {
      this.mathObject = undefined;
      this.hideAllPopup();
      return;
    }

    const oldLine = this.mathObject?.startPos.line;
    if (this.mathObject && changes.length === 1) {
      changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
        this.mathObject!.content =
          this.mathObject!.content.slice(0, fromA - this.mathObject!.startOffset) +
          inserted.toString() +
          this.mathObject!.content.slice(toA - this.mathObject!.startOffset);
      });
      this.mathObject!.endOffset = this.mathObject!.startOffset + this.mathObject!.content.length;
      this.mathObject!.endPos = this.editor!.offsetToPos(this.mathObject!.endOffset);
    } else this.updateMathObject(offset);
    if (!this.mathObject) return;

    await this.updateBracketPairsInMathObject();
    this.updateHighlightsOnBracketPairs();

    if (this.trySuggest(offset)) {
      this.inlinePreviewEl.close();
      return;
    }
    this.hideAllSuggest();
    if (oldLine === undefined || oldLine === this.mathObject.startPos.line) this.updateInlinePreview();
    else this.inlinePreviewEl.close();
  }

  private updateInlinePreview() {
    if (
      this.mathObject?.kind !== 'inline' ||
      this.symbolSuggestEl.style.display !== 'none' ||
      this.snippetSuggestEl.style.display !== 'none' ||
      !this.plugin.settings.enableInlinePreview ||
      this.mathObject.content.startsWith('\\ref') ||
      this.mathObject.content.startsWith('{} \\ref')
    ) {
      this.inlinePreviewEl.close();
      return;
    }

    const position = this.calculatePopupPosition(this.mathObject!.startPos, this.mathObject!.endPos);
    this.inlinePreviewEl.render(position, this.mathObject!.content);
  }

  private trySuggest(offset: number): boolean {
    if (!this.editor) return false;
    const cursor = this.editor.offsetToPos(offset);
    const line = this.editor.getLine(cursor.line);
    const textBeforeCursor = line.slice(0, cursor.ch);

    // symbol / snippet
    if (textBeforeCursor.endsWith('@') && !textBeforeCursor.startsWith('#import')) {
      this.symbolSuggestEl.close();

      const match = textBeforeCursor.match(snippetRegex);
      if (match) {
        if (match.groups?.query === undefined) return true;

        this.snippetSuggestEl.suggest(match.groups.query, cursor, match.groups.arg);
        return true;
      }

      this.snippetSuggestEl.close();
    } else if (!this.plugin.typstManager.beforeProcessor?.disableSuggest && !textBeforeCursor.endsWith(' ')) {
      this.snippetSuggestEl.close();

      const match = textBeforeCursor.match(symbolRegex);
      if (match) {
        if (match.groups?.symbol === undefined) return true;

        this.symbolSuggestEl.suggest(match.groups.symbol, cursor);
        return true;
      }
    }

    return false;
  }

  /* focus changed
   */

  private focusChanged(hasFocus: boolean) {
    if (hasFocus) return;
    this.close();
  }

  /* key down
   */

  private keyDown(e: KeyboardEvent) {
    if (!this.plugin.settings.disableMacro && !this.mathObject) {
      if (!this.editor) return;
      if (this.beforeChar === 'm' && e.key === 'k') {
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
      } else if (this.beforeChar === 'd' && e.key === 'm') {
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

    switch (e.key) {
      case 'Tab': {
        // TabJump
        this.jumpCursor(e.shiftKey ? 'backward' : 'forward', e.preventDefault.bind(e));
        break;
      }
      default: {
        // Shortcut
        if (!this.plugin.settings.enableShortcutKeys) break;
        if (SHORTCUTS_KEYS.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) this.executeShortcut(e);
        break;
      }
    }
  }

  async jumpCursor(direction: 'backward' | 'forward', preventDefault = () => {}) {
    if (!this.mathObject) return;
    if (!this.editor) return;

    const pos = this.editor.getCursor();
    const offset = this.editor.posToOffset(pos) - this.mathObject.startOffset;

    let startOffset: number;
    let targetContent: string;
    if (direction === 'backward' && !this.plugin.settings.revertTabToDefault) {
      if (offset === 0) {
        const cursorPos = this.editor!.offsetToPos(this.mathObject.startOffset - 2);
        preventDefault();
        this.editor?.setCursor(cursorPos);
        return;
      }
      // 前側
      startOffset = this.mathObject.startOffset;
      targetContent = this.mathObject.content.slice(0, offset);
    } else {
      if (offset === this.mathObject.content.length) {
        const cursorPos = this.editor!.offsetToPos(this.mathObject.endOffset + 2);
        preventDefault();
        this.editor?.setCursor(cursorPos);
        return;
      }
      // 後側
      // ? 括弧の直前に Jump するので +1 が必要
      startOffset = this.mathObject.startOffset + offset + 1;
      targetContent = this.mathObject.content.slice(offset) + 1;
    }

    const cursorIndex = targetContent.indexOf('#CURSOR');
    if (cursorIndex !== -1) {
      // CURSOR Jump
      preventDefault();
      const cursorPos = this.editor!.offsetToPos(startOffset + cursorIndex - 1);
      // ? こうしないとエラーが発生する
      this.editor?.setSelection(cursorPos, {
        line: cursorPos.line,
        ch: cursorPos.ch + 7,
      });
      this.editor?.replaceSelection('');
      return;
    } else if (!this.plugin.settings.revertTabToDefault) {
      // Bracket Jump
      let parenIndex: number, bracketIndex: number, braceIndex: number;

      if (direction === 'backward') {
        parenIndex = targetContent.lastIndexOf('(');
        bracketIndex = targetContent.lastIndexOf('[');
        braceIndex = targetContent.lastIndexOf('{');
      } else {
        parenIndex = targetContent.indexOf(')');
        bracketIndex = targetContent.indexOf(']');
        braceIndex = targetContent.indexOf('}');
        parenIndex = parenIndex === -1 ? Infinity : parenIndex;
        bracketIndex = bracketIndex === -1 ? Infinity : bracketIndex;
        braceIndex = braceIndex === -1 ? Infinity : braceIndex;
      }

      let targetIndex =
        direction === 'backward'
          ? Math.max(parenIndex, bracketIndex, braceIndex)
          : Math.min(parenIndex, bracketIndex, braceIndex);
      targetIndex = targetIndex === Infinity ? -1 : targetIndex;
      if (targetIndex === -1) {
        // Content Jump
        preventDefault();
        const cursorPos =
          direction === 'backward'
            ? this.editor!.offsetToPos(this.mathObject.startOffset)
            : this.editor!.offsetToPos(this.mathObject.endOffset);
        this.editor?.setCursor(cursorPos);
        return;
      }
      preventDefault();
      const cursorPos = this.editor!.offsetToPos(startOffset + targetIndex);

      this.editor?.setCursor(cursorPos);
      return;
    }
  }

  async executeShortcut(e: KeyboardEvent) {
    if (!this.mathObject) return;
    if (!this.editor) return;

    const selection = this.editor.getSelection();
    if (!selection) return;

    e.preventDefault();
    const data = SHORTCUTS_DATA[e.key]!;
    this.editor.replaceSelection(data.content.replaceAll('$1', selection));

    if (!data.offset) return;
    const cursor = this.editor.getCursor();
    this.editor.setCursor({
      line: cursor.line,
      ch: cursor.ch + data.offset,
    });
  }

  /* cursor moved
   */

  private async cursorMoved(offset: number): Promise<null | undefined> {
    if (!this.isActiveMathExists()) {
      this.mathObject = undefined;
      this.close();
      return null;
    }

    if (!this.mathObject) {
      this.hideAllPopup();
      this.updateMathObject(offset);
      if (!this.mathObject) return null;

      await this.updateBracketPairsInMathObject();
      this.updateHighlightsOnBracketPairs();
      return;
    }

    // カーソルが数式の範囲外
    const relativeOffset = offset - this.mathObject.startOffset;
    if (relativeOffset <= 0 || this.mathObject.content.length <= relativeOffset) {
      this.hideAllPopup();
      this.updateMathObject(offset);
      if (!this.mathObject) return null;

      await this.updateBracketPairsInMathObject();
      this.updateHighlightsOnBracketPairs();
      return;
    }
  }

  private cursorMovedPostProcess(isSelEmpty: boolean, offset: number) {
    if (isSelEmpty) {
      this.updateBracketPairEnclosingCursorInMathObject(offset);
      this.updateHighlightsOnBracketPairEnclosingCursor();
    }
    if (this.inlinePreviewEl.style.display === 'none') this.updateInlinePreview();

    let highlighted = false;
    const observer = new MutationObserver(() => {
      if (!this.isActiveMathExists()) return;

      observer.disconnect();
      this.updateHighlightsOnBracketPairs();
      this.updateHighlightsOnBracketPairEnclosingCursor();
      highlighted = true;
    });
    observer.observe(this.editor!.containerEl, {
      childList: true,
      subtree: true,
    });
    setTimeout(() => {
      observer.disconnect();

      if (highlighted) return;
      this.updateHighlightsOnBracketPairs();
      this.updateHighlightsOnBracketPairEnclosingCursor();
    }, 250);
  }

  updateHighlightsOnBracketPairs() {
    if (!this.mathObject) return;
    this.removeHighlightsFromBracketPairs();

    if (!this.bracketPairs) return;

    for (const pair of this.bracketPairs) {
      let { ch: startCh, line: startLine } = pair.open_pos;
      let { ch: endCh, line: endLine } = pair.close_pos;
      if (pair.open_pos.line === 0) startCh += this.mathObject.startPos.ch;
      if (pair.close_pos.line === 0) endCh += this.mathObject.startPos.ch;
      startLine += this.mathObject.startPos.line;
      endLine += this.mathObject.startPos.line;

      this.addHighlightsWithLength(
        1,
        [
          { line: startLine, ch: startCh },
          { line: endLine, ch: endCh },
        ],
        `typstmate-bracket-${pair.kind}`,
        false,
      );
    }
  }

  private removeHighlightsFromBracketPairs() {
    this.editor?.removeHighlights('typstmate-bracket-paren');
    this.editor?.removeHighlights('typstmate-bracket-bracket');
    this.editor?.removeHighlights('typstmate-bracket-brace');
  }

  private async updateBracketPairsInMathObject() {
    if (!this.mathObject) return;
    this.bracketPairs = await this.plugin.typst.findBracketPairs(this.mathObject.content);
  }

  updateHighlightsOnBracketPairEnclosingCursor() {
    if (!this.mathObject) return;
    this.removeHighlightsFromBracketPairEnclosingCursor();

    if (!this.cursorEnclosingBracketPair) return;

    let { ch: startCh, line: startLine } = this.cursorEnclosingBracketPair.open_pos;
    let { ch: endCh, line: endLine } = this.cursorEnclosingBracketPair.close_pos;
    if (this.cursorEnclosingBracketPair.open_pos.line === 0) startCh += this.mathObject.startPos.ch;
    if (this.cursorEnclosingBracketPair.close_pos.line === 0) endCh += this.mathObject.startPos.ch;
    startLine += this.mathObject.startPos.line;
    endLine += this.mathObject.startPos.line;

    this.addHighlightsWithLength(
      1,
      [
        { line: startLine, ch: startCh },
        { line: endLine, ch: endCh },
      ],
      `typstmate-bracket-enclosing-${this.cursorEnclosingBracketPair.kind}`,
      false,
    );
  }

  private removeHighlightsFromBracketPairEnclosingCursor() {
    this.editor?.removeHighlights('typstmate-bracket-enclosing-paren');
    this.editor?.removeHighlights('typstmate-bracket-enclosing-bracket');
    this.editor?.removeHighlights('typstmate-bracket-enclosing-brace');
  }

  updateBracketPairEnclosingCursorInMathObject(offset: number) {
    if (!this.bracketPairs) return;
    if (!this.mathObject) return;
    if (!this.editor) return;

    const relative_offset = offset - this.mathObject.startOffset;
    if (!relative_offset) {
      this.cursorEnclosingBracketPair = undefined;
      return;
    }

    const candidates = this.bracketPairs.filter(
      (pair) => pair.open_offset < relative_offset && relative_offset <= pair.close_offset,
    );
    if (!candidates.length) {
      this.cursorEnclosingBracketPair = undefined;
      return;
    }

    this.cursorEnclosingBracketPair = candidates.reduce((a, b) =>
      a.open_offset - a.close_offset < b.open_offset - b.close_offset ? b : a,
    );
  }

  /* utils
   */

  updateMathObject(offset: number) {
    if (this.isActiveDisplayMathExists())
      this.mathObject = this.extractDisplayMathObjectInsideTwoDollarsOutsideCursor(offset);
    else this.mathObject = this.extractInlineMathObjectInsideDollarOutsideCursor(offset);
  }

  private extractInlineMathObjectInsideDollarOutsideCursor(offset: number): MathObject | undefined {
    const doc = this.editor?.cm.state.doc;
    if (!doc) return;

    const cursor = this.editor!.offsetToPos(offset);
    const lineOnCursor = doc.line(cursor.line + 1).text;

    const lineBeforeCursor = lineOnCursor.slice(0, cursor.ch);
    const lineAfterCursor = lineOnCursor.slice(cursor.ch);
    const dollarIndexBeforeCursor = lineBeforeCursor.lastIndexOf('$');
    const dollarIndexAfterCursor = lineAfterCursor.indexOf('$');

    // カーソルを囲む $ がない場合は return
    if (dollarIndexBeforeCursor === -1 || dollarIndexAfterCursor === -1) return;

    const content = lineOnCursor.slice(dollarIndexBeforeCursor + 1, cursor.ch + dollarIndexAfterCursor);
    const startPos = { line: cursor.line, ch: dollarIndexBeforeCursor + 1 };
    const endPos = { line: cursor.line, ch: cursor.ch + dollarIndexAfterCursor };
    return {
      kind: 'inline',
      content: content,
      startPos: startPos,
      endPos: endPos,
      startOffset: this.editor!.posToOffset(startPos),
      endOffset: this.editor!.posToOffset(endPos),
    };
  }

  private extractDisplayMathObjectInsideTwoDollarsOutsideCursor(offset: number): MathObject | undefined {
    const doc = this.editor?.cm.state.doc;
    if (!doc) return;

    // カーソル前後のドキュメントを取得
    const docBeforeCursor = doc.sliceString(0, offset);
    const docAfterCursor = doc.sliceString(offset);

    // $$ の間にカーソルがある
    if (docBeforeCursor.endsWith('$') && docAfterCursor.startsWith('$')) return;

    const dollarOffsetBeforeCursor = docBeforeCursor.lastIndexOf('$$') + 2; // ? $$ の分
    const dollarOffsetAfterCursor = offset + docAfterCursor.indexOf('$$');

    // カーソルを囲む $$ がない場合は return
    if (dollarOffsetBeforeCursor === -1 + 2 || dollarOffsetAfterCursor === -1) return;

    const content = doc.sliceString(dollarOffsetBeforeCursor, dollarOffsetAfterCursor);
    const startPos = this.editor!.offsetToPos(dollarOffsetBeforeCursor);
    const endPos = this.editor!.offsetToPos(dollarOffsetAfterCursor);
    return {
      kind: 'display',
      content: content,
      startPos: startPos,
      endPos: endPos,
      startOffset: this.editor!.posToOffset(startPos),
      endOffset: this.editor!.posToOffset(endPos),
    };
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

  // ? カーソルが数式内にあるとは限らない
  // ? |$$ でも $!$ でも 単に範囲選択中でも存在する
  isActiveMathExists() {
    return this.editor?.containerEl.querySelector('span.cm-formatting-math');
  }

  // TODO: これは先頭の $$ にしかない. ビューポートから外れると認識されない
  isActiveDisplayMathExists() {
    return (
      this.editor?.containerEl.querySelector('span.cm-formatting-math.cm-math-block') ||
      this.editor?.containerEl.querySelector('span.cm-formatting-math-end')?.textContent === '$$'
    );
  }

  calculatePopupPosition(startPos: EditorPosition, endPos: EditorPosition): PopupPosition {
    if (!this.editor) throw new Error();
    const startCoords = this.editor.coordsAtPos(startPos, false);
    const endCoords = this.editor.coordsAtPos(endPos, false);

    if (!startCoords || !endCoords) throw new Error();

    const x =
      Math.abs(startCoords.top - endCoords.top) > 8
        ? this.editor.coordsAtPos({ line: startPos.line, ch: 0 }, false).left
        : startCoords.left;

    const y = endCoords.bottom + 2;

    return { x, y };
  }

  /* Editor Commands
   * Obsidian LaTeX Suite からの輸入
   */

  boxCurrentEquation(editor: Editor) {
    if (!editor) return;
    const inlineMathObject = this.extractInlineMathObjectInsideDollarOutsideCursor(
      editor.posToOffset(editor.getCursor()),
    );
    if (!inlineMathObject) return;
    this.replaceWithLength(
      `box(${inlineMathObject.content})`,
      inlineMathObject.startPos,
      inlineMathObject.content.length,
    );
  }

  selectCurrentEquation(editor: Editor) {
    if (!editor) return;
    const mathObject =
      this.extractInlineMathObjectInsideDollarOutsideCursor(editor.posToOffset(editor.getCursor())) ??
      this.extractDisplayMathObjectInsideTwoDollarsOutsideCursor(editor.posToOffset(editor.getCursor()));
    if (!mathObject) return;
    editor.setSelection(mathObject.startPos, mathObject.endPos);
  }
}

interface MathObject {
  kind: 'inline' | 'display';

  content: string;
  startPos: EditorPosition; // $ 含まない
  endPos: EditorPosition; // $ 含まない
  startOffset: number;
  endOffset: number;
}

export interface PopupPosition {
  x: number;
  y: number;
}
