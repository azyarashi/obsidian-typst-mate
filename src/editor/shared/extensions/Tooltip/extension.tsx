import { isIdent } from '@typstmate/typst-syntax';
import { type EditorView, hoverTooltip } from '@codemirror/view';
import { render } from 'preact';
import { getActiveRegion } from '@/editor';
import { RenderingEngine, rendererManager } from '@/libs';
import { Center, Header, Left, Right } from './components';
import { createTooltipData } from './utils';

import './Tooltip.css';

export const hoverExtension = hoverTooltip(async (view: EditorView, pos: number, side: number) => {
  const region = getActiveRegion(view);
  if (!region?.tree) return null;
  if (region.processor && region.processor.renderingEngine === RenderingEngine.MathJax) return null;

  const innerFrom = region.from + region.skip;
  const code = view.state.sliceDoc(innerFrom, region.to);

  // TODO offset の計算
  const wasmPos = pos - innerFrom;
  if (wasmPos < 0 || code.length < wasmPos) return null;

  try {
    const tooltip = await rendererManager.wasm.tooltip(wasmPos, code, side === 1);
    const definition = await rendererManager.wasm.definition(wasmPos, code, side === 1);
    if (!tooltip && !definition) return null;

    const definitionValue = definition?.value;
    const definitionValueType = definitionValue?.type;

    const value = tooltip?.type === 'code' ? tooltip.value : null;

    let sampledValue: string | undefined;
    // 呼び出し可能な型
    if (definitionValueType === 'func' || definitionValueType === 'type' || value?.startsWith('symbol(')) {
      sampledValue = await getSampledValues(view, pos, code);
    }

    return {
      pos,
      above: true,
      create(_view) {
        const dom = document.createElement('div');
        dom.setAttribute('popover', 'manual');
        dom.className = 'typstmate-tooltip';

        // TODO span 解決
        const title = definitionValueType === 'span' ? 'definition' : definitionValueType;
        const tooltipData = createTooltipData(definition, tooltip, sampledValue);

        render(
          <>
            {title && <Header title={title} />}
            <div className="typstmate-tooltip-container">
              <Left tooltipData={tooltipData} />
              <Center tooltipData={tooltipData} />
              {(tooltipData.hasDoc || tooltipData.isFunc) && <Right tooltipData={tooltipData} />}
            </div>
          </>,
          dom,
        );

        return {
          dom,
          destroy() {
            render(null, dom);
            dom.remove();
          },
        };
      },
    };
  } catch {
    return null;
  }
});

async function getSampledValues(view: EditorView, pos: number, code: string): Promise<string | undefined> {
  const lineAtPos = view.state.doc.lineAt(pos);
  const innerIndex = pos - lineAtPos.from;

  const lineTextAfterPos = lineAtPos.text.slice(innerIndex);
  const parenIndex = lineTextAfterPos.indexOf('(');
  if (parenIndex === -1) return;

  const ident = lineAtPos.text.slice(innerIndex, innerIndex + parenIndex);
  if (!isIdent(ident)) return;

  const tooltip = await rendererManager.wasm.tooltip(pos + parenIndex, code, true);
  if (tooltip?.type !== 'code') return;

  return tooltip.value;
}
