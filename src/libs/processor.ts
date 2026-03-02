import { SyntaxMode } from '@/utils/crates/typst-syntax';

export enum RenderingEngine {
  TypstSVG = 'typst-svg',
  MathJax = 'mathjax',
}
export enum InlineStyling {
  Inline = 'inline',
  Baseline = 'baseline',
  Middle = 'middle',
}
export enum DisplayStyling {
  Block = 'block',
  BlockCenter = 'block-center',
}
export enum CodeblockStyling {
  Block = 'block',
  BlockCenter = 'block-center',
  Codeblock = 'codeblock',
}
export enum ExcalidrawStyling {
  Default = 'default',
}
export type Styling = InlineStyling | DisplayStyling | CodeblockStyling | ExcalidrawStyling;

export interface InlineProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: InlineStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToNoteWidth?: boolean;
  syntaxMode?: SyntaxMode | null;
  useReplaceAll?: boolean;
}

export interface DisplayProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: DisplayStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToNoteWidth?: boolean;
  syntaxMode?: SyntaxMode | null;
  useReplaceAll?: boolean;
}
export interface CodeblockProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: CodeblockStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToNoteWidth?: boolean;
  syntaxMode?: SyntaxMode | null;
  useReplaceAll?: boolean;
}
export interface ExcalidrawProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: ExcalidrawStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToNoteWidth?: boolean;
  syntaxMode?: SyntaxMode | null;
  useReplaceAll?: boolean;
}
export type Processor = InlineProcessor | DisplayProcessor | CodeblockProcessor | ExcalidrawProcessor;
export type Processors = InlineProcessor[] | DisplayProcessor[] | CodeblockProcessor[] | ExcalidrawProcessor[];

export const ProcessorKindTokens = ['inline', 'display', 'codeblock', 'excalidraw'] as const;
export type ProcessorKind = (typeof ProcessorKindTokens)[number];

export const DefaultNewInlineProcessor: InlineProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#set page(margin: (x: 0pt, y: 0.3125em))\n${CODE}$',
  styling: InlineStyling.Inline,
  disableSuggest: false,
  noPreamble: false,
  fitToNoteWidth: false,
  syntaxMode: SyntaxMode.Math,
  useReplaceAll: false,
};
export const DefaultNewDisplayProcessor: DisplayProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '$ {CODE} $',
  styling: DisplayStyling.BlockCenter,
  disableSuggest: false,
  noPreamble: false,
  fitToNoteWidth: false,
  syntaxMode: SyntaxMode.Math,
  useReplaceAll: false,
};
export const DefaultNewCodeblockProcessor: CodeblockProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#{CODE}',
  styling: CodeblockStyling.BlockCenter,
  disableSuggest: false,
  noPreamble: false,
  fitToNoteWidth: false,
  syntaxMode: SyntaxMode.Markup,
  useReplaceAll: false,
};
export const DefaultNewExcalidrawProcessor: ExcalidrawProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#set page(margin: 0.3125em)\n${CODE}$',
  styling: ExcalidrawStyling.Default,
  disableSuggest: false,
  noPreamble: false,
  fitToNoteWidth: false,
  syntaxMode: SyntaxMode.Markup,
  useReplaceAll: false,
};

export const DefaultNewProcessor: Record<ProcessorKind, Processor> = {
  inline: DefaultNewInlineProcessor,
  display: DefaultNewDisplayProcessor,
  codeblock: DefaultNewCodeblockProcessor,
  excalidraw: DefaultNewExcalidrawProcessor,
} as const;
