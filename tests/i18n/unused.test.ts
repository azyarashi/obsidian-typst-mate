import { describe, expect, it } from 'bun:test';
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

describe('i18n unused keys', () => {
  it('should not have unused translation keys', async () => {
    const allKeys = getKeys(en);

    const glob = new Glob('src/**/*.ts');
    const filePaths: string[] = [];
    for await (const file of glob.scan('.')) filePaths.push(file);

    const contents = await Promise.all(filePaths.map((f) => Bun.file(f).text()));
    const allContent = contents.join('\n');

    const unusedKeys = allKeys.filter((key) => {
      const regex = new RegExp(`['"\`]${key}['"\`]`, 'g');
      return !regex.test(allContent);
    });

    if (0 < unusedKeys.length) {
      console.error(`${unusedKeys.length} unused translation keys found:`);
      for (const key of unusedKeys) console.error(`  - ${key}`);
    }

    expect(unusedKeys).toHaveLength(0);
  });
});
