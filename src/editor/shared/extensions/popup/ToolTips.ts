import type { Extension } from '@codemirror/state';
import { hoverTooltip } from '@codemirror/view';
import { Component, MarkdownRenderer } from 'obsidian';
import { editorHelperFacet } from '../core/Helper';
import { typstMateCore } from '../core/TypstMate';

export const toolTipsExtension: Extension = hoverTooltip(async (view, pos, side) => {
  const helper = view.state.facet(editorHelperFacet);
  if (!helper) return null;

  const parserData = view.plugin(typstMateCore);
  if (!parserData) return null;

  const region = parserData.parsedRegions.find((r) => r.from <= pos && pos <= r.to);
  if (!region || !region.processor) return null;

  const { format, noPreamble } = region.processor;
  const relativePos = pos - region.from;
  const typstPos =
    relativePos + (noPreamble ? 0 : helper.plugin.settings.preamble.length + 1) + format.indexOf('{CODE}');

  try {
    const tooltip = await helper.plugin.typst.tooltip(typstPos, side === 1);
    const d = view.state.doc.slice(pos).toString();
    const i = d.indexOf('(');
    const tooltip2 = await helper.plugin.typst.tooltip(typstPos + i + 1, false);

    const result = await helper.plugin.typst.definition(typstPos, side === 1);
    if (!result) return null;
    console.log(result);

    let doc = '';
    switch (result.type) {
      case 'Func': {
        doc = result.value.docs;
        break;
      }
    }
    doc = doc.replaceAll('```example', '```typ');

    const docEl = document.createElement('div');
    await MarkdownRenderer.render(
      helper.plugin.app,
      tooltip2 ? `\`\`\`typc\n${tooltip2}\n\`\`\`` : doc,
      docEl,
      '',
      new Component(),
    );
    for (const button of docEl.findAll('button.copy-code-button')) button.remove();

    return {
      pos,
      above: true,
      create(_view) {
        const dom = document.createElement('div');
        dom.replaceChildren(docEl);
        dom.style.padding = '4px 8px';
        dom.style.backgroundColor = 'var(--background-secondary)';
        dom.style.border = '1px solid var(--background-modifier-border)';
        dom.style.borderRadius = '4px';
        dom.style.fontSize = '12px';
        dom.style.whiteSpace = 'pre-wrap';
        dom.style.maxWidth = '300px';
        return { dom };
      },
    };
  } catch {
    return null;
  }
});
