import { describe, it } from 'bun:test';
import { Glob } from 'bun';

import en from '../../resources/locales/en.json';

export function getKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]))
      keys = keys.concat(getKeys(obj[key], fullKey));
    else keys.push(fullKey);
  }
  return keys;
}

describe('i18n consistency', () => {
  it('should have consistent keys across all locale files', async () => {
    const enKeys = new Set(getKeys(en));
    const glob = new Glob('resources/locales/*.json');
    // biome-ignore lint/correctness/noUnusedVariables: in development
    let hasDiscrepancy = false;

    for await (const file of glob.scan('.')) {
      if (file.endsWith('en.json')) continue;

      const localeData = await Bun.file(file).json();
      const localeKeys = new Set(getKeys(localeData));

      const missingKeys = [...enKeys].filter((key) => !localeKeys.has(key));
      const extraKeys = [...localeKeys].filter((key) => !enKeys.has(key));

      if (0 < missingKeys.length || 0 < extraKeys.length) {
        hasDiscrepancy = true;
        console.error(`\nDiscrepancies found in ${file}:`);

        if (0 < missingKeys.length) {
          console.error('  Missing keys (present in en.json but not in this file):');
          for (const key of missingKeys) console.error(`    - ${key}`);
        }

        if (0 < extraKeys.length) {
          console.error('  Extra keys (not present in en.json):');
          for (const key of extraKeys) console.error(`    - ${key}`);
        }
      }
    }

    // TODO: expect(hasDiscrepancy).toBe(false);
  });
});
