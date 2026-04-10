import { SyntaxMode } from '@typstmate/typst-syntax';

import './processor.css';

export enum RenderingEngine {
  TypstSVG = 'typst-svg',
  TypstHTML = 'typst-html',
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
export type Styling = InlineStyling | DisplayStyling | CodeblockStyling;

export interface ProcessorBase<Styling> {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: Styling;
  useReplaceAll?: boolean;
  fitToNoteWidth?: boolean;
  noPreamble?: boolean;
  syntaxMode?: SyntaxMode;
}

export type InlineProcessor = ProcessorBase<InlineStyling>;
export type DisplayProcessor = ProcessorBase<DisplayStyling>;
export type CodeblockProcessor = ProcessorBase<CodeblockStyling>;

export type Processor = InlineProcessor | DisplayProcessor | CodeblockProcessor;

export const ProcessorKindTokens = ['inline', 'display', 'codeblock'] as const;
export type ProcessorKind = (typeof ProcessorKindTokens)[number];

export type ProcessorOfKind<K extends ProcessorKind> = K extends 'inline'
  ? InlineProcessor
  : K extends 'display'
    ? DisplayProcessor
    : K extends 'codeblock'
      ? CodeblockProcessor
      : never;

export const DefaultNewInlineProcessor: InlineProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#set page(margin: (x: 0pt, y: 0.3125em))\n${CODE}$',
  styling: InlineStyling.Inline,
  useReplaceAll: false,
  fitToNoteWidth: false,
  noPreamble: false,
  syntaxMode: SyntaxMode.Math,
};
export const DefaultNewDisplayProcessor: DisplayProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '$ {CODE} $',
  styling: DisplayStyling.BlockCenter,
  useReplaceAll: false,
  fitToNoteWidth: false,
  noPreamble: false,
  syntaxMode: SyntaxMode.Math,
};
export const DefaultNewCodeblockProcessor: CodeblockProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '{CODE}',
  styling: CodeblockStyling.BlockCenter,
  useReplaceAll: false,
  fitToNoteWidth: false,
  noPreamble: false,
  syntaxMode: SyntaxMode.Markup,
};

export const DefaultNewProcessor: Record<ProcessorKind, Processor> = {
  inline: DefaultNewInlineProcessor,
  display: DefaultNewDisplayProcessor,
  codeblock: DefaultNewCodeblockProcessor,
} as const;
