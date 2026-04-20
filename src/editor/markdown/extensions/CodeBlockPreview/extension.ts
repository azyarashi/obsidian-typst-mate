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
import { getActiveRegion } from '@/editor/shared/utils/core';
import { appUtils, typstManager } from '@/libs';
import { getNdirAndNPath } from '@/libs/typstManager';

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
    readonly id: string,
    readonly regionFrom: number,
    readonly enabled: boolean,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.addClasses(['typstmate-codeblockpreview', 'typstmate-temporary']);
    container.dataset.regionFrom = this.regionFrom.toString();

    if (!this.enabled) container.style.display = 'none';

    const file = appUtils.app.workspace.getActiveFile();
    const { ndir, npath } = getNdirAndNPath(file);

    typstManager.render(this.code, container, this.id, ndir, npath);

    return container;
  }

  override eq(other: CodeBlockPreviewWidget): boolean {
    return (
      this.code === other.code &&
      this.id === other.id &&
      this.regionFrom === other.regionFrom &&
      this.enabled === other.enabled
    );
  }

  override updateDOM(dom: HTMLElement, _view: EditorView): boolean {
    dom.replaceChildren();

    if (!this.enabled) dom.style.display = 'none';
    else dom.style.display = '';

    const file = appUtils.app.workspace.getActiveFile();
    const { ndir, npath } = getNdirAndNPath(file);

    typstManager.render(this.code, dom, this.id, ndir, npath);

    return true;
  }
}

const codeblockPreviewState = (enabled: boolean) =>
  StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      if (tr.docChanged) decorations = decorations.map(tr.changes);

      for (const effect of tr.effects) {
        if (effect.is(setPreviewEffect)) {
          const widgetData = effect.value;
          if (!widgetData) return Decoration.none;

          const widget = new CodeBlockPreviewWidget(widgetData.code, widgetData.id, widgetData.regionFrom, enabled);

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
    if (update.docChanged || update.selectionSet || update.focusChanged) {
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

    const content = view.state.sliceDoc(region.from + region.skip, region.to);
    const position = view.state.doc.lineAt(region.to + 1).to;

    const newWidgetData: WidgetData = {
      code: content,
      id: region.processor?.id ?? '',
      position,
      regionFrom: region.from + region.skip,
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

export const codeblockPreviewExtension = (enabled: boolean): Extension => [
  codeblockPreviewState(enabled),
  ViewPlugin.fromClass(CodeblockPreviewPlugin),
];
