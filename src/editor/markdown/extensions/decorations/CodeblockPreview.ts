import { type EditorState, type Range, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import type { EditorHelper } from '../../../index';
import { collectRegions } from '../../../shared/extensions/core/TypstMate';

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
  const selection = state.selection.main;

  if (helper.mathObject?.kind === 'codeblock') helper.mathObject = undefined;

  const mockView = { state } as EditorView;
  const regions = collectRegions(mockView, 0, state.doc.length, helper, selection.head);

  for (const region of regions) {
    if (region.kind !== 'codeblock') continue;

    const content = state.sliceDoc(region.from, region.to);

    if (helper.editor) {
      helper.mathObject = {
        kind: 'codeblock',
        content,
        startPos: helper.editor.offsetToPos(region.from),
        endPos: helper.editor.offsetToPos(region.to),
        startOffset: region.from,
        endOffset: region.to,
      };
    }

    if (content.length > 0) {
      if (!region.processor) continue;
      const widget = new CodeBlockPreviewWidget(content, helper, region.processor.id);
      const deco = Decoration.widget({
        widget,
        side: 1,
        block: true,
      });

      const line = state.doc.lineAt(region.to + 1);
      ranges.push(deco.range(line.to));
    }
  }

  return Decoration.set(ranges);
}

import { editorHelperFacet } from '../../../shared/extensions/core/Helper';

export const codeblockPreviewState = StateField.define<DecorationSet>({
  create(state) {
    const helper = state.facet(editorHelperFacet);
    if (!helper) return Decoration.none;
    return buildDecorations(state, helper);
  },
  update(decorations, tr) {
    const helper = tr.state.facet(editorHelperFacet);
    if (!helper) return Decoration.none;

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

export const codeblockPreviewExtension = [codeblockPreviewState];
