export const RenderingEngineTokens = ['typst-svg', 'typst-html', 'mathjax'] as const;
export type RenderingEngine = (typeof RenderingEngineTokens)[number];
export const InlineStylingTokens = ['inline', 'inline-middle'] as const;
export type InlineStyling = (typeof InlineStylingTokens)[number];
export const DisplayStylingTokens = ['block', 'block-center'] as const;
export type DisplayStyling = (typeof DisplayStylingTokens)[number];
export const CodeblockStylingTokens = ['block', 'block-center', 'codeblock'] as const;
export type CodeblockStyling = (typeof CodeblockStylingTokens)[number];
export const ExcalidrawStylingTokens = ['default'] as const;
export type ExcalidrawStyling = (typeof ExcalidrawStylingTokens)[number];
export type Styling = InlineStyling | DisplayStyling | CodeblockStyling | ExcalidrawStyling;

export interface InlineProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: InlineStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export interface DisplayProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: DisplayStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export interface CodeblockProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: CodeblockStyling;
  disableSuggest?: boolean;
  noPreamble?: boolean;
  fitToParentWidth?: boolean;
}
export interface ExcalidrawProcessor {
  id: string;
  renderingEngine: RenderingEngine;
  format: string;
  styling: ExcalidrawStyling;
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
  renderingEngine: 'typst-svg',
  format: '${CODE}$',
  styling: 'inline',
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};
export const DefaultNewDisplayProcessor: DisplayProcessor = {
  id: 'new',
  renderingEngine: 'typst-svg',
  format: '$ {CODE} $',
  styling: 'block-center',
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};
export const DefaultNewCodeblockProcessor: CodeblockProcessor = {
  id: 'new',
  renderingEngine: 'typst-svg',
  format: '{CODE}',
  styling: 'block',
  disableSuggest: false,
  noPreamble: false,
  fitToParentWidth: false,
};
export const DefaultNewExcalidrawProcessor: ExcalidrawProcessor = {
  id: 'new',
  renderingEngine: 'typst-svg',
  format: '#set page(margin: 0.25em)\n${CODE}$',
  styling: 'default',
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
