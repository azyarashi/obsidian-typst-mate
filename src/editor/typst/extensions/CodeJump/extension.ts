import { Facet } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { rendererManager } from '@/libs';
import { consoleError } from '@/utils/notice';

export type CodeJumpTarget = {
  jumpToPosition: (position: { page: number; x: number; y: number }) => Promise<void>;
  reveal: () => void;
};

export const codeJumpTargetFacet = Facet.define<CodeJumpTarget, CodeJumpTarget>({
  combine: (values) => values[0]!,
});

class CodeJumpPluginValue {
  constructor(public view: EditorView) {}

  async onMouseDown(event: MouseEvent) {
    if (event.button !== 0 || event.detail !== 2) return;

    const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return;

    const target = this.view.state.facet(codeJumpTargetFacet);
    if (!target) return;

    try {
      const position = (await rendererManager.wasm.jumpFromCursorPAsync(pos))[0];
      if (position && position.type === 'position') {
        await target.jumpToPosition(position);
        target.reveal();
      }
    } catch (e) {
      // TODO
      consoleError('Code jump failed', e);
    }
  }

  destroy() {}
}

const codeJumpPlugin = ViewPlugin.fromClass(CodeJumpPluginValue);

export const codeJumpExtension = [
  codeJumpPlugin,
  EditorView.domEventHandlers({
    mousedown(event, view) {
      view.plugin(codeJumpPlugin)?.onMouseDown(event);
    },
  }),
];
