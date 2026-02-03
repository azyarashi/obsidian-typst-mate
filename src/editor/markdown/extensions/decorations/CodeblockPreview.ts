import { type Extension, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import type { EditorHelper } from '../../../index';
import { editorHelperFacet } from '../../../shared/extensions/core/Helper';
import { getActiveRegion } from '../../../shared/extensions/core/TypstMate';

import './codeblock-preview.css';

export const clearCodeblockPreviewsEffect = StateEffect.define<void>();
export const setCodeblockPreviewsEffect = StateEffect.define<DecorationSet>();

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

export const codeblockPreviewState = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCodeblockPreviewsEffect)) return effect.value;
      if (effect.is(clearCodeblockPreviewsEffect)) return Decoration.none;
    }
    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class CodeblockPreviewPlugin implements PluginValue {
  lastStateKey: string = '';

  constructor(view: EditorView) {
    this.compute(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet) this.compute(update.view);
  }

  compute(view: EditorView) {
    const helper = view.state.facet(editorHelperFacet);
    if (!helper) return clearCodeblockPreviewsEffect.of();

    const region = getActiveRegion(view);
    if (!region || region.kind !== 'codeblock') return clearCodeblockPreviewsEffect.of();

    let currentKey = '';

    const content = view.state.sliceDoc(region.from, region.to);
    if (content.length > 0) {
      currentKey = `${region.from}:${region.to}:${region.processor.id}:${content.length}`;
    }

    if (currentKey === this.lastStateKey) return clearCodeblockPreviewsEffect.of();
    this.lastStateKey = currentKey;

    let decos = Decoration.none;

    if (content.length > 0) {
      const widget = new CodeBlockPreviewWidget(content, helper, region.processor.id);
      const deco = Decoration.widget({
        widget,
        side: 1,
        block: true,
      });

      const line = view.state.doc.lineAt(region.to + 1);
      decos = Decoration.set([deco.range(line.to)]);
    }

    Promise.resolve().then(() => {
      // Check if view is still alive/valid?
      try {
        view.dispatch({
          effects: setCodeblockPreviewsEffect.of(decos),
        });
      } catch {
        // View might be destroyed
      }
    });
  }
}

export const codeblockPreviewExtension: Extension = [
  codeblockPreviewState,
  ViewPlugin.fromClass(CodeblockPreviewPlugin),
];
