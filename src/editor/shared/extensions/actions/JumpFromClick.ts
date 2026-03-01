import { type EditorView, ViewPlugin } from '@codemirror/view';

import type { Jump } from '@/libs/worker';
import type TypstElement from '@/ui/elements/Typst';
import { editorHelperFacet } from '../core/Helper';
import { getRegionAt } from '../core/TypstMate';

class JumpFromClickPluginValue {
  constructor(public view: EditorView) {}

  jumpTo(jump: Jump, context: TypstElement) {
    if (jump.type === 'url') return window.open(jump.url);
    if (jump.type !== 'file') return;
    if (jump.pos === undefined) return;

    const domPos = this.view.posAtDOM(context);
    const previewContainer = context.closest('.typstmate-codeblockpreview') as HTMLElement | null;
    let actualPos = domPos;
    if (previewContainer?.dataset.regionFrom) actualPos = parseInt(previewContainer.dataset.regionFrom, 10);

    const region = getRegionAt(this.view, actualPos);
    if (!region) return;

    const helper = this.view.state.facet(editorHelperFacet);

    const { noPreamble, format } = context.processor;
    const offset =
      region.from -
      format.indexOf('{CODE}') -
      (noPreamble ? 0 : helper.plugin.settings.preamble.length + 1) -
      helper.plugin.typstManager.preamble.length -
      1;

    const expectedPosition = jump.pos + offset;
    const clampedOffset =
      expectedPosition <= region.from ? region.from : region.to <= expectedPosition ? region.to : expectedPosition;

    this.view.dispatch({
      selection: { anchor: clampedOffset, head: clampedOffset },
      scrollIntoView: true,
    });
    this.view.focus();

    if (region.from <= expectedPosition && expectedPosition <= region.to)
      setTimeout(() => helper.triggerRippleEffect(this.view, clampedOffset), 30);
  }
}

export const jumpFromClickPlugin = ViewPlugin.fromClass(JumpFromClickPluginValue);

export const jumpFromClickExtension = jumpFromClickPlugin;
