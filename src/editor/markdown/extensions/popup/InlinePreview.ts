import { type EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { editorHelperFacet } from '../core/Helper';
import { typstMatePlugin } from '../core/TypstMate';

export const inlinePreviewExtension = ViewPlugin.fromClass(
  class implements PluginValue {
    constructor(public view: EditorView) {}

    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet && !update.focusChanged) return;

      const helper = update.state.facet(editorHelperFacet);
      if (!helper) return;

      const state = update.state;
      const selection = state.selection.main;

      if (!update.view.hasFocus || !selection.empty) {
        helper.inlinePreviewEl.close();
        return;
      }

      // Performance: Reuse parsed regions from core plugin to avoid redundant parsing
      const parserData = update.view.plugin(typstMatePlugin);
      const region = parserData?.parsedRegions.find((r) => r.from <= selection.head && selection.head <= r.to);

      if (
        region &&
        region.kind === 'inline' &&
        helper.plugin.settings.enableInlinePreview &&
        helper.symbolSuggestEl.style.display === 'none' &&
        helper.snippetSuggestEl.style.display === 'none'
      ) {
        const content = state.sliceDoc(region.from, region.to);
        if (content.startsWith('\\ref') || content.startsWith('{} \\ref')) {
          helper.inlinePreviewEl.close();
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
            if (pos) helper.inlinePreviewEl.render(pos, content);
          },
        });
        return;
      }

      helper.inlinePreviewEl.close();
    }
  },
);
