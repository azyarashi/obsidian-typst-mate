import { Facet } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { editorHelperFacet } from '@/editor/shared/extensions/core/Helper';

export type JumpToPreviewTarget = {
  jumpToPosition: (position: { page: number; x: number; y: number }) => Promise<void>;
  reveal: () => void;
};

export const jumpToPreviewTargetFacet = Facet.define<JumpToPreviewTarget, JumpToPreviewTarget>({
  combine: (values) => values[0]!,
});

// TODO: Rust 側で実装する
function utf16ToUtf8Offset(text: string, utf16Offset: number): number {
  const segment = text.slice(0, utf16Offset);
  return new TextEncoder().encode(segment).length;
}

class JumpToPreviewPluginValue {
  pressTimer?: ReturnType<typeof setTimeout>;

  constructor(public view: EditorView) {}

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    clearTimeout(this.pressTimer);
    this.pressTimer = setTimeout(() => {
      this.handleLongPress(event);
    }, 500);
  }

  onMouseUp() {
    clearTimeout(this.pressTimer);
  }

  onMouseLeave() {
    clearTimeout(this.pressTimer);
  }

  private async handleLongPress(event: MouseEvent) {
    const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return;

    const helper = this.view.state.facet(editorHelperFacet);
    const target = this.view.state.facet(jumpToPreviewTargetFacet);

    if (!target) return;

    try {
      const utf8Pos = utf16ToUtf8Offset(this.view.state.doc.toString(), pos);

      const positions = await (helper.plugin.typst as any).jumpFromCursorP(utf8Pos);
      if (positions && Array.isArray(positions) && positions.length > 0) {
        await target.jumpToPosition(positions[0]);
        target.reveal();
      }
    } catch (e) {
      console.error('[TypstMate] Jump to preview failed:', e);
    }
  }

  destroy() {
    clearTimeout(this.pressTimer);
  }
}

export const jumpToPreviewPlugin = ViewPlugin.fromClass(JumpToPreviewPluginValue);

export const jumpToPreviewExtension = [
  jumpToPreviewPlugin,
  EditorView.domEventHandlers({
    mousedown(event, view) {
      view.plugin(jumpToPreviewPlugin)?.onMouseDown(event);
    },
    mouseup(_event, view) {
      view.plugin(jumpToPreviewPlugin)?.onMouseUp();
    },
    mouseleave(_event, view) {
      view.plugin(jumpToPreviewPlugin)?.onMouseLeave();
    },
  }),
];
