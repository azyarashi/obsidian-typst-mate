import { hoverTooltip, type Tooltip } from '@codemirror/view';
import { Component, MarkdownRenderer } from 'obsidian';
import { render } from 'preact';

import { formatDefinition, formatOrigin } from '@/../wasm/src/serde/values';
import { typstManager } from '@/libs';
import { format } from '@/ui/elements/Typst';
import { getRegionAt } from '../utils/core';

import './Tooltip.css';

export const hoverExtension = hoverTooltip(
  async (view, pos, side): Promise<Tooltip | null> => {
    const region = getRegionAt(view, pos);
    if (!region?.tree) return null;

    const innerStart = region.from + region.skip;
    const code = view.state.sliceDoc(innerStart, region.to);
    let formatted = code;
    let offset = 0;

    if (region.processor) {
      const res = format(code, region.kind, region.processor);
      formatted = res.formatted;
      offset = res.offset;
    }

    const typstPos = pos - innerStart - offset;
    const sideAfter = side === 1;

    try {
      const tooltip = await typstManager.wasm.tooltipAsync(typstPos, formatted, sideAfter);
      const definition = await typstManager.wasm.definitionAsync(typstPos, formatted, sideAfter);
      console.log(tooltip, definition);

      const textAfterCursor = view.state.doc.slice(pos).toString();
      const parenOffset = textAfterCursor.indexOf('(');
      let callSignature = '';

      if (parenOffset !== -1 && parenOffset < 20) {
        const sigRes = await typstManager.wasm.tooltipAsync(typstPos + parenOffset + 1, formatted, false);
        if (sigRes?.type === 'code') callSignature = sigRes.value;
      } else if (tooltip?.type === 'code') {
        callSignature = tooltip.value;
      }

      let docs = definition ? formatDefinition(definition) : '';
      if (!docs) {
        switch (tooltip?.type) {
          case 'text':
            if (tooltip.value !== '') docs = `${tooltip.value}`;
            break;
          case 'code':
            if (tooltip.value !== 'none') docs = `\`\`\`typc\n${tooltip.value}\n\`\`\``;
            break;
        }
      }

      if (!docs && !callSignature) return null;

      let markdown = '';
      if (callSignature) {
        markdown += `\`\`\`typc\n${callSignature}\n\`\`\``;
      }
      if (docs) {
        markdown += (markdown ? '\n' : '') + docs;
      }

      markdown = markdown.replace(/<!-- TM_TOOLTIP_DATA:.* -->/, '');
      markdown = markdown.replaceAll('```example', '```typ').replaceAll('```typ', '```typstmate-typ');

      const containerEl = createDiv({ cls: 'typstmate-temporary' });

      const quickEl = createDiv();
      // advancedEl

      const docEl = createDiv();
      await MarkdownRenderer.render(typstManager.plugin.app, markdown.trim(), docEl, '', new Component());
      await processTooltipData(docEl, markdown);

      return {
        pos,
        above: true,
        create() {
          render(
            <>
              <div class="typstmate-hover-tooltip">
                {/* 初めに表示する部分 */}
                <div class="typstmate-hover-tooltip-top">
                  {definition ? <span class="typstmate-hover-tooltip-origin">{formatOrigin(definition)}</span> : null}
                  <div
                    ref={(el: HTMLElement | null) => {
                      if (el && quickEl) {
                        el.empty();
                        el.appendChild(quickEl);
                      }
                    }}
                  />
                </div>

                <div
                  ref={(el: HTMLElement | null) => {
                    if (el && docEl) {
                      el.empty();
                      el.appendChild(docEl);
                    }
                  }}
                />
              </div>

              {/* ちょうど下側に表示 */}
              <div class="typstmate-hover-tooltip-bottom">Go to ...</div>
            </>,
            containerEl,
          );
          return {
            dom: containerEl,
            destroy() {
              render(null, containerEl);
            },
          };
        },
      };
    } catch {
      return null;
    }
  },

  { hideOnChange: 'touch' },
);

async function processTooltipData(docEl: HTMLElement, markdown: string) {
  const dataMatch = markdown.match(/<!-- TM_TOOLTIP_DATA:(.*) -->/);
  if (!dataMatch?.[1]) return;

  try {
    const tooltipData: Record<string, { types: string; default?: string }> = JSON.parse(dataMatch[1]);
    const walker = document.createTreeWalker(docEl, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    const nodesToReplace: { node: Text; key: string }[] = [];

    while (node) {
      const textNode = node as Text;
      for (const key of Object.keys(tooltipData)) {
        if (textNode.textContent?.includes(key)) {
          nodesToReplace.push({ node: textNode, key });
        }
      }
      node = walker.nextNode();
    }

    for (const { node, key } of nodesToReplace) {
      const data = tooltipData[key];
      if (!data) continue;

      const span = docEl.createDiv({ cls: 'typstmate-signature-types' });
      span.textContent = '...';

      const tooltipDiv = span.createDiv({ cls: 'typstmate-signature-tooltip' });
      const detailMarkdown = `\`\`\`typc\ntype: ${data.types}${data.default ? ` = ${data.default}` : ''}\n\`\`\``;
      await MarkdownRenderer.render(typstManager.plugin.app, detailMarkdown, tooltipDiv, '', new Component());

      const parent = node.parentNode;
      if (parent && node.textContent) {
        const parts = node.textContent.split(key);
        const firstPart = document.createTextNode(parts[0] ?? '');
        const secondPart = document.createTextNode(parts[1] ?? '');
        parent.insertBefore(firstPart, node);
        parent.insertBefore(span, node);
        parent.insertBefore(secondPart, node);
        parent.removeChild(node);
      }
    }
  } catch (e) {
    console.error('Failed to process tooltip data', e);
  }
}
