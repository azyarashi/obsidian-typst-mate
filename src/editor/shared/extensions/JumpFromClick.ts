import { type EditorView, ViewPlugin } from '@codemirror/view';
import type { Jump } from '@/libs/worker';
import type TypstElement from '@/ui/elements/Typst';
import { getRegionAt, type ParsedRegion } from '../utils/core';
import { helperFacet } from './Helper';

class JumpFromClickPluginValue {
  constructor(public view: EditorView) {}

  jumpTo(jump: Jump, event: MouseEvent, context?: TypstElement) {
    if (jump.type === 'url') return window.open(jump.url);
    if (jump.type !== 'file') return;
    if (jump.pos === undefined) return;

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

    event.preventDefault();

    this.view.focus();
    this.view.dispatch({
      selection: { anchor: expectedPosition, head: expectedPosition },
      scrollIntoView: true,
    });

    const helper = this.view.state.facet(helperFacet);

    const shouldRipple =
      !context || (region && region.from <= originalExpectedPosition && originalExpectedPosition <= region.to);
    if (shouldRipple) {
      requestAnimationFrame(() => {
        helper.triggerRippleEffect(this.view, expectedPosition);
      });
    }
  }
}

export const jumpFromClickPlugin = ViewPlugin.fromClass(JumpFromClickPluginValue);
export const jumpFromClickExtension = jumpFromClickPlugin;
