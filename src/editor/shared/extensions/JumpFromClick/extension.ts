import { type EditorView, ViewPlugin } from '@codemirror/view';
import { editorHelper } from '@/libs';
import type TypstElement from '@/ui/elements/Typst';
import { getRegionAt, type ParsedRegion } from '../../utils/core';
import { handleTypstMateURI } from './uri';

class JumpFromClickPluginValue {
  constructor(public view: EditorView) {}

  async jumpTo(jump: any, event: MouseEvent, context?: TypstElement) {
    if (jump.type === 'url') {
      const uri = URL.parse(jump.url);
      if (!uri) return;

      const handledUri = handleTypstMateURI(uri, event, context);
      if (handledUri === false) window.open(jump.url);
      else if (handledUri instanceof URL) window.open(handledUri);

      return;
    }

    if (jump.type !== 'file') return;
    if (jump.pos === null || jump.pos === undefined) return;

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
      if (!region) return;

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
  }
}

export const jumpFromClickPlugin = ViewPlugin.fromClass(JumpFromClickPluginValue);
export const jumpFromClickExtension = jumpFromClickPlugin;
