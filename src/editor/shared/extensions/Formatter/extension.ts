import { $ } from '@/libs';
import type { FormatterSettings } from './package';

export const typstFormatterPlugin = [];

export async function formatTypst(
  source: string,
  settings: FormatterSettings,
  range?: [number, number],
): Promise<{ content: string; range: [number, number] }> {
  if (!$.wasm) return { content: source, range: range ?? [0, source.length] };
  const result = await $.wasm.format(source, {
    tabSpaces: settings.tabSpaces as number,
    maxWidth: settings.maxWidth as number,
    blankLinesUpperBound: settings.blankLinesUpperBound as number,
    collapseMarkupSpaces: settings.collapseMarkupSpaces as boolean,
    reorderImportItems: settings.reorderImportItems as boolean,
    wrapText: settings.wrapText as boolean,
    range,
  });

  return {
    content: result.content,
    range: result.range,
  };
}

/** TODO: range
  const re = /[ \t]+$/gm;
  function trimTrailingSpaces(source: string): string {
    return source.replace(re, '');
  }
*/
