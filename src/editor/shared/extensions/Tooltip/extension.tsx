import { isIdent } from '@typstmate/typst-syntax';
import { type EditorView, hoverTooltip } from '@codemirror/view';
import { setTooltip } from 'obsidian';
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

  // TODO offset の計算
  const wasmPos = pos - innerFrom; // + offset
  if (wasmPos < 0 || code.length < wasmPos) return null;

  try {
    const tooltip = await typstManager.wasm.tooltip(wasmPos, code, side === 1);
    if (!tooltip) return null;
    const value = tooltip.type === 'code' ? tooltip.value : null;

    // TODO return の取得
    const definition = await typstManager.wasm.definition(wasmPos, code, side === 1);
    const definitionValue = definition?.value;
    const definitionValueType = definitionValue?.type;

    let sampledValue: string | undefined;
    if (definitionValueType === 'func' || definitionValueType === 'type' || value?.startsWith('symbol(')) {
      sampledValue = await getSampledValues(view, pos, code);
    }
    console.log(sampledValue);

    return {
      pos,
      above: true,
      create(_view) {
        const dom = document.createElement('div');
        dom.className = 'typstmate-tooltip';

        const root = document.createElement('div');
        dom.appendChild(root);

        const definitionOrigin = definition?.origin;

        let repr: string | null = null;
        if (definition && definition.value.type !== 'span') repr = definition.value.value.repr;

        render(
          <div className="typstmate-tooltip-content">
            {/* Signature */}
            {definition && `(${definition.value.type}) ${repr ?? ''}`}

            {/* Code, 二行以上の場合 `はじめの数文字...` にして一行に収める, クリックで開閉 */}

            {/* Definition */}
            {definitionOrigin && (
              <div
                ref={(ref) => {
                  if (!ref) return;

                  // TODO: 組み込み、パッケージ定義、ユーザー定義
                  const title = definitionOrigin.type;
                  const description: string | null =
                    definitionOrigin.type === 'Package' ? definitionOrigin.value.name : null;
                  setTooltip(ref, `${title}${description ? `: ${description}` : ''}`);

                  // TODO: jump
                  console.log(definition);
                }}
              >
                {definitionOrigin.type.at(0)}
              </div>
            )}

            {/* Value */}

            {/* Doc */}
            {tooltip.type === 'code' ? <pre>{tooltip.value}</pre> : <div>{tooltip.value}</div>}

            {/* Goto */}
          </div>,
          root,
        );

        return {
          dom,
          destroy() {
            render(null, root);
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

  const tooltip = await typstManager.wasm.tooltip(pos + parenIndex, code, true);
  if (tooltip?.type !== 'code') return;

  return tooltip.value;
}
