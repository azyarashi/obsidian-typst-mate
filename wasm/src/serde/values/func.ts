import type { Func, Param } from '@/../pkg/typst_wasm';

export function formatFunc(func: Func): string {
  let markdown = '';
  const tooltipData: Record<string, { types: string; default?: string }> = {};

  const formatParamTypes = (p: Param, index?: number) => {
    const typesStr = p.types.map((t) => t.type).join(' | ');
    const defaultVal = p.default ? ` = ${p.default}` : '';
    const full = `type: ${typesStr}${defaultVal}`;

    // For signature block highlights
    if (index !== undefined && typesStr.length > 50) {
      const key = `[[TM_TP:${index}]]`;
      tooltipData[key] = { types: typesStr, default: p.default ?? undefined };
      return `${key}${defaultVal}`;
    }

    // For detailed parameter sections
    if (typesStr.length > 50) {
      return `<details class="typstmate-details"><summary>type: ...${p.default ? ` = ${p.default}` : ''}</summary>\n\n\`\`\`typc\n${full}\n\`\`\`\n</details>`;
    }
    return `\`\`\`typc\n${full}\n\`\`\``;
  };

  if (func.params) {
    const signatureParams = func.params
      .map((p, i) => {
        let paramStr = `${p.name}: ${formatParamTypes(p, i)}`;
        if (p.variadic) paramStr = `..${paramStr}`;
        return `  ${paramStr}`;
      })
      .join(',\n');
    markdown += `\`\`\`typstmate-typc\n${func.name}(\n${signatureParams}\n)\n\`\`\`\n\n`;
  }

  if (func.docs !== 'no_doc') {
    markdown += `${func.docs}\n\n`;
  }

  const positional = func.params?.filter((p) => p.positional) || [];
  const named = func.params?.filter((p) => p.named) || [];

  if (positional.length > 0) {
    markdown += '# Positional Parameters\n';
    for (const p of positional) {
      markdown += `## ${p.name}\n${formatParamTypes(p)}\n${p.docs}\n\n`;
    }
  }

  if (named.length > 0) {
    markdown += '# Named Parameters\n';
    for (const p of named) {
      markdown += `## ${p.name}\n${formatParamTypes(p)}\n${p.docs}\n\n`;
    }
  }

  if (Object.keys(tooltipData).length > 0) {
    markdown += `\n<!-- TM_TOOLTIP_DATA:${JSON.stringify(tooltipData)} -->\n`;
  }

  return markdown;
}
