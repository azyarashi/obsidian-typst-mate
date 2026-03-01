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

import type { EditorHelper } from '@/editor';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { getActiveRegion } from '@/editor/shared/extensions/core/TypstMate';
import { getNdirAndNPath } from '@/libs/typst';

import './CodeBlockPreview.css';

interface WidgetData {
  code: string;
  id: string;
  position: number;
  regionFrom: number;
}

const setPreviewEffect = StateEffect.define<WidgetData | null>();

class CodeBlockPreviewWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly helper: EditorHelper,
    readonly id: string,
    readonly regionFrom: number,
  ) {
    super();
  }

  toDOM(_view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.addClasses(['typstmate-codeblockpreview', 'typstmate-temporary']);
    container.dataset.regionFrom = this.regionFrom.toString();

    const file = this.helper.plugin.app.workspace.getActiveFile();
    const { ndir, npath } = getNdirAndNPath(file);

    this.helper.plugin.typstManager.render(this.code, container, this.id, ndir, npath);

    return container;
  }

  override eq(other: CodeBlockPreviewWidget): boolean {
    return this.code === other.code && this.id === other.id && this.regionFrom === other.regionFrom;
  }

  override updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    dom.replaceChildren();

    const file = this.helper.plugin.app.workspace.getActiveFile();
    const { ndir, npath } = getNdirAndNPath(file);

    this.helper.plugin.typstManager.render(this.code, dom, this.id, ndir, npath);

    return true;
  }
}

const codeblockPreviewState = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    if (tr.docChanged) decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(setPreviewEffect)) {
        const widgetData = effect.value;
        if (!widgetData) return Decoration.none;

        const helper = tr.state.facet(editorHelperFacet);
        const widget = new CodeBlockPreviewWidget(widgetData.code, helper, widgetData.id, widgetData.regionFrom);

        const deco = Decoration.widget({ widget, side: 1, block: true });
        return Decoration.set([deco.range(widgetData.position)]);
      }
    }

    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class CodeblockPreviewPlugin implements PluginValue {
  private widgetData: WidgetData | null = null;
  private updateTimeout: number | null = null;

  update(update: ViewUpdate) {
    if (!update.view.hasFocus) return;

    if (update.docChanged || update.selectionSet) {
      if (this.updateTimeout !== null) window.cancelAnimationFrame(this.updateTimeout);

      this.updateTimeout = window.requestAnimationFrame(() => {
        this.performUpdate(update.view);
      });
    }
  }

  private performUpdate(view: EditorView) {
    const region = getActiveRegion(view);
    const shouldShow = view.hasFocus && region?.kind === 'codeblock';

    if (!shouldShow) {
      if (this.widgetData) {
        this.widgetData = null;
        view.dispatch({ effects: setPreviewEffect.of(null) });
      }
      return;
    }

    const content = view.state.sliceDoc(region.from, region.to);
    const position = view.state.doc.lineAt(region.to + 1).to;

    const newWidgetData: WidgetData = {
      code: content,
      id: region.processor?.id ?? '',
      position,
      regionFrom: region.from,
    };

    if (this.isChanged(newWidgetData)) {
      this.widgetData = newWidgetData;
      view.dispatch({ effects: setPreviewEffect.of(newWidgetData) });
    }
  }

  private isChanged(next: WidgetData): boolean {
    if (!this.widgetData) return true;
    return (
      this.widgetData.code !== next.code ||
      this.widgetData.id !== next.id ||
      this.widgetData.position !== next.position ||
      this.widgetData.regionFrom !== next.regionFrom
    );
  }

  destroy() {
    if (this.updateTimeout !== null) window.cancelAnimationFrame(this.updateTimeout);
  }
}

export const codeblockPreviewExtension: Extension = [
  // ブロック要素の Widget はレイアウトのために State が必要
  codeblockPreviewState,
  ViewPlugin.fromClass(CodeblockPreviewPlugin),
];
