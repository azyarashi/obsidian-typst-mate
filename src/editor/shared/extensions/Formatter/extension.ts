import { typstManager } from '@/libs';
import type { FormatterSettings } from './package';

export const typstFormatterPlugin = [];

export async function formatTypst(
  source: string,
  settings: FormatterSettings,
  range?: [number, number],
): Promise<{ content: string; range: [number, number] }> {
  const result = await typstManager.wasm.format(source, {
    tabSpaces: settings.tabSpaces as number,
    maxWidth: settings.maxWidth as number,
    blankLinesUpperBound: settings.blankLinesUpperBound as number,
    collapseMarkupSpaces: settings.collapseMarkupSpaces as boolean,
    reorderImportItems: settings.reorderImportItems as boolean,
    wrapText: settings.wrapText as boolean,
    range,
  });

  return {
    content: result.content
      .split('\n')
      .map((line: string) => line.trimEnd())
      .join('\n'),
    range: result.range,
  };
}
