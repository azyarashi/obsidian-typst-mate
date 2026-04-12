import type { SyntaxKind, SyntaxMode, SyntaxNode } from '@typstmate/typst-syntax';
import type { EditorView } from '@codemirror/view';
import { collectRegions, markdownCore, parseRegion } from '@/editor/markdown/extensions/MarkdownCore';
import { typstTextCore } from '@/editor/typst/extensions/TypstCore';
import type { Processor, ProcessorKind } from '@/libs/processor';

export interface ParsedRegion {
  skip: number;
  skipEnd: number;
  /** innerFrom = from + skip */
  from: number;
  /** innerTo = to */
  to: number;

  readonly kind: ProcessorKind;
  processor?: Processor;

  /** top level mode */
  mode: SyntaxMode;
  tree?: SyntaxNode;
  activeKind?: SyntaxKind | null;
  activeMode?: SyntaxMode | null;
}

export function getActiveRegion(view: EditorView): ParsedRegion | null {
  const markdownPlugin = view.plugin(markdownCore);
  if (markdownPlugin) return markdownPlugin.activeRegion;

  const typstTextPlugin = view.plugin(typstTextCore);
  if (typstTextPlugin) return typstTextPlugin.activeRegion;

  return null;
}

export function getRegionAt(view: EditorView, cursor: number): ParsedRegion | null {
  const typstTextPlugin = view.plugin(typstTextCore);
  if (typstTextPlugin) return typstTextPlugin.activeRegion;

  const { from, to } = view.viewport;
  const regions = collectRegions(view, from, to);

  const region = regions.find((r) => {
    const delimiterLength = r.kind === 'inline' ? 1 : r.kind === 'display' ? 2 : r.kind === 'codeblock' ? 4 : 0;
    return r.from - delimiterLength - (r.lang?.length ?? 0) <= cursor && cursor <= r.to + delimiterLength;
  });

  return region ? parseRegion(view, region) : null;
}

/** https://github.com/vimeejs/vimee/blob/main/packages/plugin-codemirror/src/cursor.ts */
export function offsetToCursor(content: string, offset: number) {
  let remaining = offset;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (remaining <= line.length) {
      return { line: i, col: remaining };
    }
    remaining -= line.length + 1;
  }
  const lastLine = lines.length - 1;
  const lastLineContent = lines[lastLine];
  return { line: lastLine, col: lastLineContent?.length ?? 0 };
}

export function cursorToOffset(content: string, pos: { line: number; col: number }): number {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < pos.line && i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined) offset += line.length + 1;
  }
  const targetLine = lines[pos.line];
  return offset + Math.min(pos.col, targetLine?.length ?? 0);
}
