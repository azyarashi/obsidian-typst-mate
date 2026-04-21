import { Facet } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { typstManager } from '@/libs';

export type JumpToPreviewTarget = {
  jumpToPosition: (position: { page: number; x: number; y: number }) => Promise<void>;
  reveal: () => void;
};

export const jumpToPreviewTargetFacet = Facet.define<JumpToPreviewTarget, JumpToPreviewTarget>({
  combine: (values) => values[0]!,
});

class JumpToPreviewPluginValue {
  constructor(public view: EditorView) {}

  async onMouseDown(event: MouseEvent) {
    if (event.button !== 0 || event.detail !== 2) return;

    const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return;

    const target = this.view.state.facet(jumpToPreviewTargetFacet);
    if (!target) return;

    try {
      const position = (await typstManager.wasm.jumpFromCursorPAsync(pos))[0];
      if (position && position.type === 'position') {
        await target.jumpToPosition(position);
        target.reveal();
      }
    } catch (e) {
      console.error('[TypstMate] Jump to preview failed:', e);
    }
  }

  destroy() {}
}

const jumpToPreviewPlugin = ViewPlugin.fromClass(JumpToPreviewPluginValue);

export const jumpToPreviewExtension = [
  jumpToPreviewPlugin,
  EditorView.domEventHandlers({
    mousedown(event, view) {
      view.plugin(jumpToPreviewPlugin)?.onMouseDown(event);
    },
  }),
];
