import type { Definition, Param, Tooltip } from '@wasm';
import { formatDefinitionValue } from '@wasm-values';

export interface TooltipData {
  source: string;
  links: { title: string; url: string }[];
  hasDoc: boolean;
  isFunc: boolean;
  params?: Param[];
}

const separator = '\n#line(length: 100%)\n';

export function createTooltipData(definition?: Definition, tooltip?: Tooltip, sampledValues?: string): TooltipData {
  let source = '';
  let hasDoc = false;

  // 1. Definition value
  const value = definition?.value;
  let bottomContent = '';
  if (value && value.type !== 'span') {
    const formatted = formatDefinitionValue(value);
    source += formatted.top;
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

  // Extract links from rawDocs and convert to Typst syntax
  const links: { title: string; url: string }[] = [];
  if (rawDocs !== '') {
    if (source !== '') source += separator;

    // Convert Markdown links [title](url) to Typst #link("url")[title]
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    for (const match of rawDocs.matchAll(linkRegex)) {
      links.push({ title: match[1]!, url: match[2]! });
    }
    rawDocs = rawDocs.replace(linkRegex, '#link("$2")[$1]');

    // Convert Markdown headings to Typst headings
    rawDocs = rawDocs.replace(/^# (.*)$/gm, '= $1');
    rawDocs = rawDocs.replace(/^## (.*)$/gm, '== $1');
    rawDocs = rawDocs.replace(/^### (.*)$/gm, '=== $1');

    source += rawDocs;
  }

  // Append bottom content (parameters etc.)
  if (bottomContent !== '') {
    if (source !== '') source += separator;
    source += bottomContent;
  }

  // 3. Sampled Values
  if (sampledValues) {
    if (source !== '') source += separator;
    source += `== Sampled Values\n`;
    source += `\`\`\`typc\n${sampledValues}\n\`\`\``;
  }

  const isFunc = value?.type === 'func';
  const params = isFunc && realValue && 'params' in realValue ? realValue.params : undefined;

  return {
    source,
    links,
    hasDoc,
    isFunc,
    params,
  };
}
