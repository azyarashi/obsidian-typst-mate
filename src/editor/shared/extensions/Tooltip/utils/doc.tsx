import type { Definition, Param, Tooltip } from '@wasm';
import { formatDefinitionValue } from '@wasm-values';

export interface TooltipData {
  markdown: string;
  links: { title: string; url: string }[];
  hasDoc: boolean;
  isFunc: boolean;
  params?: Param[];
}

const separator = '\n\n---\n';

export function createTooltipData(definition?: Definition, tooltip?: Tooltip, sampledValues?: string): TooltipData {
  let markdown = '';
  let hasDoc = false;

  // 1. Definition value
  const value = definition?.value;
  let bottomContent = '';
  if (value && value.type !== 'span') {
    const formatted = formatDefinitionValue(value);
    markdown += formatted.top;
    bottomContent = formatted.bottom || '';
  }

  // 2. Docs (tooltip or definition)
  let rawDocs = '';
  if (tooltip && tooltip.type === 'code') rawDocs = `\`\`\`typ\n${tooltip.value}\n\`\`\``;

  // Fallback to definition docs if tooltip is empty
  const realValue = value && 'value' in value ? (value.value as any) : null;
  if (rawDocs === '' && realValue && 'docs' in realValue && realValue.docs !== '' && realValue.docs !== 'no_doc') {
    rawDocs = realValue.docs;
  }

  if (rawDocs !== '') hasDoc = true;

  // Extract links from rawDocs
  const links: { title: string; url: string }[] = [];
  if (rawDocs !== '') {
    if (markdown !== '') markdown += separator;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    for (const [, title, url] of rawDocs.matchAll(linkRegex)) links.push({ title: title!, url: url! });
    markdown += rawDocs;
  }

  // Append bottom content (parameters etc.)
  if (bottomContent !== '') {
    if (markdown !== '') markdown += separator;
    markdown += bottomContent;
  }

  // 3. Sampled Values
  if (sampledValues) {
    if (markdown !== '') markdown += separator;
    markdown += `## Sampled Values\n`;
    markdown += `\`\`\`typc\n${sampledValues}\n\`\`\``;
  }

  // TODO: example のレンダリング結果を表示するか否か
  markdown = markdown.replaceAll('```example', '```typ').replaceAll('```typ', '```typstmate-typ');

  const isFunc = value?.type === 'func';
  const params = isFunc && realValue && 'params' in realValue ? realValue.params : undefined;

  return {
    markdown,
    links,
    hasDoc,
    isFunc,
    params,
  };
}
