import { type EditorView, ViewPlugin } from '@codemirror/view';

import type { Jump } from '@/libs/worker';
import type TypstElement from '@/ui/elements/Typst';
import { helperFacet } from '../../shared/extensions/Helper';
import { getRegionAt } from '../../shared/utils/core';

class JumpFromClickPluginValue {
  constructor(public view: EditorView) {}

  jumpTo(jump: Jump, context: TypstElement, event: MouseEvent) {
    if (jump.type === 'url') return window.open(jump.url);
    if (jump.type !== 'file') return;
    if (jump.pos === undefined) return;

    const previewContainer = context.closest('.typstmate-codeblockpreview') as HTMLElement | null;
    const regionFrom = previewContainer?.dataset.regionFrom
      ? parseInt(previewContainer.dataset.regionFrom, 10)
      : this.view.posAtDOM(context);

    const region = getRegionAt(this.view, regionFrom);
    if (!region) return;

    const start = region.from + region.skip;
    const offset = start + context.offset;

    const expectedPosition = jump.pos + offset;
    const clampedOffset =
      expectedPosition <= start ? start : region.to <= expectedPosition ? region.to : expectedPosition;
    event.preventDefault();

    this.view.focus(); // ? コードブロックプレビューが正しく表示される
    this.view.dispatch({
      selection: { anchor: clampedOffset, head: clampedOffset },
      scrollIntoView: true,
    });

    const helper = this.view.state.facet(helperFacet);
    if (region.from < expectedPosition && expectedPosition < region.to)
      requestAnimationFrame(() => {
        helper.triggerRippleEffect(this.view, clampedOffset);
      });
  }
}

export const jumpFromClickPlugin = ViewPlugin.fromClass(JumpFromClickPluginValue);
export const jumpFromClickExtension = jumpFromClickPlugin;
