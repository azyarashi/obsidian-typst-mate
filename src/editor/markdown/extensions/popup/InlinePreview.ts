import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { editorHelperFacet } from '../../../shared/extensions/core/Helper';
import { getActiveRegion } from '../../../shared/extensions/core/TypstMate';

import '../../../shared/css/inline-preview.css';

class InlinePreviewPlugin implements PluginValue {
  container: HTMLElement;
  visible = false;

  constructor(public view: EditorView) {
    this.container = document.createElement('div');
    this.container.classList.add('typstmate-inline-preview', 'typstmate-temporary');
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
  }

  update(update: ViewUpdate) {
    if (!update.docChanged && !update.selectionSet && !update.focusChanged && !update.viewportChanged) return;

    const helper = update.state.facet(editorHelperFacet);
    if (!helper) return;

    const state = update.state;
    const selection = state.selection.main;

    if (!update.view.hasFocus || !selection.empty) {
      this.close();
      return;
    }

    const region = getActiveRegion(update.view);
    if (!region) return this.close();

    if (
      region &&
      (region.kind === 'inline' || region.kind === 'extended') &&
      helper.plugin.settings.enableInlinePreview &&
      helper.symbolSuggestEl.style.display === 'none' &&
      helper.snippetSuggestEl.style.display === 'none'
    ) {
      const content = state.sliceDoc(region.from, region.to);
      if (content.startsWith('\\ref') || content.startsWith('{} \\ref')) {
        this.close();
        return;
      }

      this.view.requestMeasure({
        read: () => {
          try {
            return helper.calculatePopupPosition(this.view, region.from, region.to);
          } catch {
            return null;
          }
        },
        write: (pos) => {
          if (pos) this.render(pos, content);
          else this.close();
        },
      });
      return;
    }

    this.close();
  }

  render(pos: { x: number; y: number }, content: string) {
    if (!window.MathJax) return;

    const html = window.MathJax.tex2chtml(content, { display: false });
    this.container.replaceChildren(html);

    this.container.style.setProperty('--preview-left', `${pos.x}px`);
    this.container.style.setProperty('--preview-top', `${pos.y}px`);
    this.container.style.display = '';
    this.visible = true;
  }

  close() {
    this.container.style.display = 'none';
    this.visible = false;
  }

  destroy() {
    this.container.remove();
  }
}

export const inlinePreviewExtension = ViewPlugin.fromClass(InlinePreviewPlugin);
