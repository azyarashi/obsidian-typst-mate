import { type EditorView, ViewPlugin } from '@codemirror/view';
import type { Jump } from '@/../pkg/typst_wasm';
import { editorHelper } from '@/libs';
import type TypstElement from '@/ui/elements/Typst';
import { getRegionAt, type ParsedRegion } from '../../utils/core';
import { handleTypstMateURI } from './uri';

class PreviewJumpPluginValue {
  constructor(public view: EditorView) {}

  async jumpTo(jump: Jump, event: MouseEvent, context?: TypstElement) {
    switch (jump.type) {
      case 'file': {
        if (jump.pos === null || jump.pos === undefined) break;

        let expectedPosition = jump.pos;
        let originalExpectedPosition = jump.pos;
        let region: ParsedRegion | null = null;

        if (context) {
          const previewContainer = (context.closest('.typstmate-codeblockpreview') ||
            context.closest('.typstmate-inlinemathpreview')) as HTMLElement | null;
          const regionFrom = previewContainer?.dataset.regionFrom
            ? parseInt(previewContainer.dataset.regionFrom, 10)
            : this.view.posAtDOM(context);

          region = getRegionAt(this.view, regionFrom);
          if (!region) break;

          const start = region.from + region.skip;
          const offset = start + context.offset;

          originalExpectedPosition = jump.pos + offset;
          expectedPosition =
            originalExpectedPosition <= start
              ? start
              : region.to <= originalExpectedPosition
                ? region.to
                : originalExpectedPosition;
        }

        this.view.focus();
        this.view.dispatch({
          selection: { anchor: expectedPosition, head: expectedPosition },
          scrollIntoView: true,
        });

        const shouldRipple =
          !context || (region && region.from <= originalExpectedPosition && originalExpectedPosition <= region.to);
        if (shouldRipple) {
          requestAnimationFrame(() => {
            editorHelper.triggerRippleEffect(this.view, expectedPosition);
          });
        }

        break;
      }
      case 'url': {
        const uri = URL.parse(jump.url);
        if (!uri) break;

        const handledUri = handleTypstMateURI(uri, event, context);
        if (handledUri === false) window.open(jump.url);
        else if (handledUri instanceof URL) window.open(handledUri);

        break;
      }
      case 'position':
        break;
    }
  }
}

export const previewJumpPlugin = ViewPlugin.fromClass(PreviewJumpPluginValue);
export const previewJumpExtension = previewJumpPlugin;
