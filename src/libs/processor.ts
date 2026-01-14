import { SyntaxMode } from '@/utils/rust/crates/typst-synatx';

export enum RenderingEngine {
  TypstSVG = 'typst-svg',
  MathJax = 'mathjax',
}
export enum InlineStyling {
  Inline = 'inline',
  InlineMiddle = 'inline-middle',
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
  mode?: SyntaxMode;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export interface DisplayProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: DisplayStyling;
  mode?: SyntaxMode;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export interface CodeblockProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: CodeblockStyling;
  mode?: SyntaxMode;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export interface ExcalidrawProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: ExcalidrawStyling;
  mode?: SyntaxMode;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export type Processor = InlineProcessor | DisplayProcessor | CodeblockProcessor | ExcalidrawProcessor;
export type Processors = InlineProcessor[] | DisplayProcessor[] | CodeblockProcessor[] | ExcalidrawProcessor[];

export const ProcessorKindTokens = ['inline', 'display', 'codeblock', 'excalidraw'] as const;
export type ProcessorKind = (typeof ProcessorKindTokens)[number];

export const DefaultNewInlineProcessor: InlineProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '${CODE}$',
  styling: InlineStyling.Inline,
  mode: SyntaxMode.Math,
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};
export const DefaultNewDisplayProcessor: DisplayProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '$ {CODE} $',
  styling: DisplayStyling.BlockCenter,
  mode: SyntaxMode.Math,
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};
export const DefaultNewCodeblockProcessor: CodeblockProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '{CODE}',
  styling: CodeblockStyling.BlockCenter,
  mode: SyntaxMode.Markup,
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};
export const DefaultNewExcalidrawProcessor: ExcalidrawProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#set page(margin: 0.25em)\n${CODE}$',
  styling: ExcalidrawStyling.Default,
  mode: SyntaxMode.Math,
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};

export const DefaultNewProcessor: Record<ProcessorKind, Processor> = {
  inline: DefaultNewInlineProcessor,
  display: DefaultNewDisplayProcessor,
  codeblock: DefaultNewCodeblockProcessor,
  excalidraw: DefaultNewExcalidrawProcessor,
} as const;
