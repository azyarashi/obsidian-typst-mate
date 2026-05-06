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

export interface ProcessorBase {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  syntaxMode?: SyntaxMode;
}

export interface ProcessorMarkdownBase<S extends Styling> extends ProcessorBase {
  styling: S;
  useReplaceAll?: boolean;
}

export type InlineProcessor = ProcessorMarkdownBase<InlineStyling> & {
  noPreamble?: boolean;
};
export type DisplayProcessor = ProcessorMarkdownBase<DisplayStyling> & {
  fitToNoteWidth?: boolean;
  noPreamble?: boolean;
};
export type CodeblockProcessor = ProcessorMarkdownBase<CodeblockStyling> & {
  fitToNoteWidth?: boolean;
  noPreamble?: boolean;
};
export type ExcalidrawProcessor = ProcessorBase;

export type MathProcessor = InlineProcessor | DisplayProcessor;
export type MarkdownProcessor = InlineProcessor | DisplayProcessor | CodeblockProcessor;
export type Processor = InlineProcessor | DisplayProcessor | CodeblockProcessor | ExcalidrawProcessor;

export const ProcessorKindTokens = ['inline', 'display', 'codeblock', 'excalidraw'] as const;
export type ProcessorKind = (typeof ProcessorKindTokens)[number];

export type ProcessorOfKind<K extends ProcessorKind> = K extends 'inline'
  ? InlineProcessor
  : K extends 'display'
    ? DisplayProcessor
    : K extends 'codeblock'
      ? CodeblockProcessor
      : K extends 'excalidraw'
        ? ExcalidrawProcessor
        : never;

/** Type guard for processors that support 'fitToNoteWidth' */
export type ProcessorWithFit = DisplayProcessor | CodeblockProcessor;
export function hasFitToNoteWidth(kind: ProcessorKind): kind is 'display' | 'codeblock' {
  return kind === 'display' || kind === 'codeblock';
}

/** Type guard for processors that support 'noPreamble' */
export type ProcessorWithPreamble = InlineProcessor | DisplayProcessor | CodeblockProcessor;
export function hasNoPreamble(kind: ProcessorKind): kind is 'inline' | 'display' | 'codeblock' {
  return kind !== 'excalidraw';
}

export const DefaultNewInlineProcessor: InlineProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#set page(margin: (x: 0pt, y: 0.3125em))\n${CODE}$',
  styling: InlineStyling.Inline,
  useReplaceAll: false,
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
export const DefaultNewExcalidrawProcessor: ExcalidrawProcessor = {
  id: 'new',
  renderingEngine: RenderingEngine.TypstSVG,
  format: '#set page(margin: 0.5em)\n${CODE}$',
};

export const DefaultNewProcessor: Record<ProcessorKind, Processor> = {
  inline: DefaultNewInlineProcessor as Processor,
  display: DefaultNewDisplayProcessor as Processor,
  codeblock: DefaultNewCodeblockProcessor as Processor,
  excalidraw: DefaultNewExcalidrawProcessor as Processor,
} as const;
