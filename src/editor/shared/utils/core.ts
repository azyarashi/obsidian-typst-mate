import type { EditorView } from '@codemirror/view';
import type { SyntaxKind, SyntaxMode, SyntaxNode } from '@typstmate/typst-syntax';

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
