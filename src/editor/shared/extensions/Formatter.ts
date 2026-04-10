import { typstManager } from '@/libs';

export interface FormatterSettings {
  tabSpaces: number;
  maxWidth: number;
  blankLinesUpperBound: number;
  collapseMarkupSpaces: boolean;
  reorderImportItems: boolean;
  wrapText: boolean;
  formatOnSave: boolean;
}

export const typstFormatterPlugin = [];

export async function formatTypst(
  source: string,
  settings: FormatterSettings,
  range?: [number, number],
): Promise<{ content: string; range: [number, number] }> {
  const result = await typstManager.wasm.format(source, {
    tabSpaces: settings.tabSpaces,
    maxWidth: settings.maxWidth,
    blankLinesUpperBound: settings.blankLinesUpperBound,
    collapseMarkupSpaces: settings.collapseMarkupSpaces,
    reorderImportItems: settings.reorderImportItems,
    wrapText: settings.wrapText,
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
