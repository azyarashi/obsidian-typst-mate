import { type EditorView, ViewPlugin } from '@codemirror/view';

import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';
import type { Jump } from '@/libs/worker';

class JumpFromClickPluginValue {
  constructor(public view: EditorView) {}

  jumpTo(jump: Jump, event: MouseEvent) {
    if (jump.type === 'url') return window.open(jump.url);
    if (jump.type !== 'file') return;
    if (jump.pos === undefined) return;

    const expectedPosition = jump.pos;
    event.preventDefault();

    this.view.focus();
    this.view.dispatch({
      selection: { anchor: expectedPosition, head: expectedPosition },
      scrollIntoView: true,
    });

    const helper = this.view.state.facet(editorHelperFacet);
    requestAnimationFrame(() => {
      helper.triggerRippleEffect(this.view, expectedPosition);
    });
  }
}

export const jumpFromClickPlugin = ViewPlugin.fromClass(JumpFromClickPluginValue);
export const jumpFromClickExtension = jumpFromClickPlugin;
