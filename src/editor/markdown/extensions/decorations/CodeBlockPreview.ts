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
import { ctxToNDir } from '@/libs/typst';

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
    container.addClass('typstmate-codeblockpreview');
    container.dataset.regionFrom = this.regionFrom.toString();

    const file = this.helper.plugin.app.workspace.getActiveFile();
    const ndir = file?.parent ? ctxToNDir(file.path) : '/';
    const npath = file?.path;

    this.helper.plugin.typstManager.render(this.code, container, this.id, ndir, npath);
    return container;
  }

  override eq(other: WidgetType): boolean {
    return (
      other instanceof CodeBlockPreviewWidget &&
      this.code === other.code &&
      this.id === other.id &&
      this.regionFrom === other.regionFrom
    );
  }

  override updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    dom.replaceChildren();

    const file = this.helper.plugin.app.workspace.getActiveFile();
    const ndir = file?.parent ? ctxToNDir(file.path) : '/';
    const npath = file?.path;

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
        const info = effect.value;
        if (!info) return Decoration.none;
        const helper = tr.state.facet(editorHelperFacet);

        const widget = new CodeBlockPreviewWidget(info.code, helper, info.id, info.regionFrom);
        const deco = Decoration.widget({ widget, side: 1, block: true });
        return Decoration.set([deco.range(info.position)]);
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
    if (!update.focusChanged && !update.docChanged && !update.selectionSet) return;

    if (this.updateTimeout !== null) clearTimeout(this.updateTimeout);

    this.updateTimeout = window.setTimeout(() => {
      this.updateTimeout = null;
      this.performUpdate(update.view);
    }, 0);
  }

  destroy() {
    if (this.updateTimeout !== null) clearTimeout(this.updateTimeout);
  }

  private performUpdate(view: EditorView) {
    const region = getActiveRegion(view);
    const shouldShow = view.hasFocus && view.state.selection.main.empty && region?.kind === 'codeblock';

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
    if (
      !this.widgetData ||
      this.widgetData.code !== newWidgetData.code ||
      this.widgetData.id !== newWidgetData.id ||
      this.widgetData.position !== newWidgetData.position ||
      this.widgetData.regionFrom !== newWidgetData.regionFrom
    ) {
      this.widgetData = newWidgetData;
      view.dispatch({ effects: setPreviewEffect.of(newWidgetData) });
    }
  }
}

export const codeblockPreviewExtension: Extension = [
  codeblockPreviewState,
  ViewPlugin.fromClass(CodeblockPreviewPlugin),
];
