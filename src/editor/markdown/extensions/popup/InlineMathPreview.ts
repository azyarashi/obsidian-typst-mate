import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import { getActiveRegion } from '@/editor/shared/extensions/core/TypstMate';

import './InlineMathPreview.css';
import { calculatePopupPosition } from '@/editor/shared/utils/position';

class InlinePreviewPlugin implements PluginValue {
  container: HTMLElement;

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-inlinemathpreview', 'typstmate-temporary');
    this.container.hide();

    document.body.appendChild(this.container);
  }

  update(update: ViewUpdate) {
    if (!update.docChanged && !update.selectionSet) {
      if (!update.view.hasFocus || !update.state.selection.main.empty) this.hide();
      return;
    }

    const helper = update.state.facet(editorHelperFacet)!;
    if (!helper.plugin.settings.enableInlinePreview) return;

    const region = getActiveRegion(update.view);
    if (!region || region.kind !== 'inline') return this.hide();

    const content = update.state.sliceDoc(region.from + region.skip, region.to);
    if (content.startsWith('\\ref') || content.startsWith('{} \\ref')) {
      this.hide();
      return;
    }

    this.view.requestMeasure({
      read: () => {
        try {
          return calculatePopupPosition(this.view, region.from, region.to);
        } catch {
          return null;
        }
      },
      write: (pos) => {
        if (pos) this.render(pos, content);
        else this.hide();
      },
    });
  }

  render(pos: { x: number; y: number }, content: string) {
    if (!window.MathJax) return;

    const html = window.MathJax.tex2chtml(content, { display: false });
    this.container.replaceChildren(html);

    this.container.style.setProperty('--preview-left', `${pos.x}px`);
    this.container.style.setProperty('--preview-top', `${pos.y}px`);
    this.container.show();
  }

  hide() {
    this.container.hide();
  }

  destroy() {
    this.container.remove();
  }
}

export const inlinePreviewExtension = ViewPlugin.fromClass(InlinePreviewPlugin);
