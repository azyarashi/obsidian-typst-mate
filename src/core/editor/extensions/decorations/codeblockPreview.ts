import { type EditorState, type Range, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import type { EditorHelper } from '../../editor';

import './codeblock-preview.css';

export const clearCodeblockPreviewsEffect = StateEffect.define<void>();

class CodeBlockPreviewWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly helper: EditorHelper,
    readonly id: string,
  ) {
    super();
  }

  toDOM(_view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.addClass('typst-mate-preview');

    this.helper.plugin.typstManager.render(this.code, container, this.id);
    return container;
  }

  override updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    dom.replaceChildren();
    this.helper.plugin.typstManager.render(this.code, dom, this.id);
    return true;
  }

  override eq(other: CodeBlockPreviewWidget): boolean {
    return other.code === this.code && other.id === this.id;
  }
}

function buildDecorations(state: EditorState, helper: EditorHelper): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const doc = state.doc;
  const selection = state.selection.main;

  let inBlock = false;
  let blockContent: string[] = [];
  let blockLang = '';
  let blockStartOffset = 0;

  if (helper.mathObject?.kind === 'codeblock') helper.mathObject = undefined;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const text = line.text;
    const trimmedText = text.trim();

    if (!inBlock) {
      if (!trimmedText.startsWith('```')) continue;

      const lang = trimmedText.slice(3).trim();
      if (!helper.supportedCodeBlockLangs.has(lang)) continue;

      inBlock = true;
      blockLang = lang;
      blockContent = [];
      blockStartOffset = line.from;
    } else {
      if (trimmedText.startsWith('```')) {
        inBlock = false;
        const blockEndOffset = line.to;

        if (blockStartOffset < selection.head && selection.head < blockEndOffset) {
          const code = blockContent.join('\n');

          if (helper.editor) {
            const startHeaderLen = doc.lineAt(blockStartOffset).length + 1;
            const contentStartOffset = blockStartOffset + startHeaderLen;
            const contentEndOffset = line.from;

            helper.mathObject = {
              kind: 'codeblock',
              content: code,
              startPos: helper.editor.offsetToPos(contentStartOffset),
              endPos: helper.editor.offsetToPos(contentEndOffset),
              startOffset: contentStartOffset,
              endOffset: contentEndOffset,
            };
          }

          if (code.length > 0) {
            const widget = new CodeBlockPreviewWidget(code, helper, blockLang);
            const deco = Decoration.widget({
              widget,
              side: 1,
              block: true,
            });
            ranges.push(deco.range(line.to));
          }
        }

        blockContent = [];
      } else blockContent.push(text);
    }
  }

  return Decoration.set(ranges);
}

export const createCodeBlockPreviewExtension = (helper: EditorHelper) =>
  StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, helper);
    },
    update(decorations, tr) {
      for (const effect of tr.effects) {
        if (effect.is(clearCodeblockPreviewsEffect)) {
          if (helper.mathObject?.kind === 'codeblock') helper.mathObject = undefined;
          return Decoration.none;
        }
      }

      if (tr.docChanged || tr.selection) return buildDecorations(tr.state, helper);

      return decorations;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
