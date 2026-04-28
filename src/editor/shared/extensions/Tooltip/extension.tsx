import { type EditorView, hoverTooltip } from '@codemirror/view';
import { render } from 'preact';
import { typstManager } from '@/libs';
import { RenderingEngine } from '@/libs/processor';
import { getActiveRegion } from '../../utils/core';

import './Tooltip.css';

export const hoverExtension = hoverTooltip(async (view: EditorView, pos: number, side: number) => {
  const region = getActiveRegion(view);
  if (!region?.tree) return null;
  if (region.processor && region.processor.renderingEngine === RenderingEngine.MathJax) return null;

  const innerFrom = region.from + region.skip;
  const code = view.state.sliceDoc(innerFrom, region.to);

  const wasmPos = pos - innerFrom;
  if (wasmPos < 0 || code.length < wasmPos) return null;

  try {
    const tooltip = await typstManager.wasm.tooltip(wasmPos, code, side === 1);
    if (!tooltip) return null;

    return {
      pos,
      above: true,
      create(_view) {
        const dom = document.createElement('div');
        dom.className = 'typstmate-tooltip';

        const root = document.createElement('div');
        dom.appendChild(root);

        render(
          <div className="typstmate-tooltip-content">
            {tooltip.type === 'code' ? <pre>{tooltip.value}</pre> : <div>{tooltip.value}</div>}
          </div>,
          root,
        );

        return {
          dom,
          destroy() {
            render(null, root);
          },
        };
      },
    };
  } catch {
    return null;
  }
});
