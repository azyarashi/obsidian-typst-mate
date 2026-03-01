export function cssToYamlEntries(css: string): string {
  const extractBlock = (name: 'light' | 'dark') => {
    const re = new RegExp(`body\\.theme-${name}\\s*\\{([\\s\\S]*?)\\}`, 'i');
    const m = css.match(re);
    return m ? m[1] : '';
  };

  const parseVars = (block: string) => {
    const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    const map = new Map<string, string>();
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: *
    while ((m = re.exec(block)) !== null) {
      map.set(m[1], m[2].trim());
    }
    return map;
  };

  const lightBlock = extractBlock('light');
  const darkBlock = extractBlock('dark');
  const lightVars = parseVars(lightBlock);
  const darkVars = parseVars(darkBlock);

  const orderedKeys: string[] = [];
  for (const k of lightVars.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);
  for (const k of darkVars.keys()) if (!orderedKeys.includes(k)) orderedKeys.push(k);

  const humanizeTitle = (id: string) => {
    const prefix = 'typstmate-';
    const core = id.startsWith(prefix) ? id.slice(prefix.length) : id;
    const parts = core
      .split('-')
      .filter(Boolean)
      .map((p) => p.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase()));
    const title = parts.join(' ');
    return title ? `${title} Color` : `${id} Color`;
  };

  const escapeYamlValue = (v: string) => {
    if (/^\s*[\dA-Za-z#(]/.test(v) && !/[:\n]/.test(v)) return v;
    return JSON.stringify(v);
  };

  const lines: string[] = [];
  for (const key of orderedKeys) {
    const light = lightVars.get(key);
    const dark = darkVars.get(key);
    lines.push(`- id: ${key}`);
    lines.push(`  title: ${humanizeTitle(key)}`);
    lines.push(`  type: variable-themed-color`);
    lines.push(`  format: hex`);
    lines.push(`  opacity: true`);
    lines.push(`  default-light: "${escapeYamlValue(light ?? '')}"`);
    lines.push(`  default-dark: "${escapeYamlValue(dark ?? '')}"`);
  }

  return lines.join('\n');
}

const css = await Bun.file('./src/editor/shared/extensions/decorations/Theme.css').text();
console.log(cssToYamlEntries(css));
