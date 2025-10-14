import type { CodeblockProcessor, DisplayProcessor, ExcalidrawProcessor, InlineProcessor } from '@/libs/processor';
import type { Snippet } from '@/libs/snippet';

export interface Settings {
  // Rendering Settings
  enableBackgroundRendering: boolean;
  autoBaseColor: boolean;
  baseColor: string;
  failOnWarning: boolean;
  enableMathjaxFallback: boolean;
  patchPDFExport: boolean;

  // Editor Settings
  // Actions
  enableShortcutKeys: boolean;
  enableTabJump: boolean;
  // Decorations
  enableSyntaxHighlight: boolean;
  enableEnclosingBracketPairHighlight: boolean;
  enableDiagnostic: boolean;
  // Suggests
  enableSnippets: boolean;
  enableAutocomplete: boolean;
  complementSymbolWithUnicode: boolean;
  // Tooltips
  enableInlinePreview: boolean;
  enableDiagnosticTooltip: boolean;

  // Others
  skipPreparationWaiting: boolean;
  disablePackageCache: boolean;

  preamble: string;
  processor: {
    inline?: {
      processors: InlineProcessor[];
    };
    display?: {
      processors: DisplayProcessor[];
    };
    codeblock?: {
      processors: CodeblockProcessor[];
    };
    excalidraw?: {
      processors: ExcalidrawProcessor[];
    };
  };

  snippets: Snippet[];
}

export const DEFAULT_SETTINGS: Settings = {
  enableBackgroundRendering: true,
  autoBaseColor: true,
  failOnWarning: false,
  baseColor: '#000000',
  enableMathjaxFallback: false,
  patchPDFExport: true,
  skipPreparationWaiting: false,
  enableInlinePreview: true,
  disablePackageCache: false,
  complementSymbolWithUnicode: true,

  enableShortcutKeys: true,
  enableTabJump: true,
  enableSyntaxHighlight: true,
  enableEnclosingBracketPairHighlight: true,
  enableDiagnostic: true,
  enableSnippets: true,
  enableAutocomplete: true,
  enableDiagnosticTooltip: true,

  preamble: [
    '#set page(margin: 0pt, width: auto, height: auto)',
    '#show raw: set text(size: 1.25em)',
    '#set text(size: fontsize)',
    '#let scr(it) = text(features: ("ss01",), box($cal(it)$))',
  ].join('\n'),
  processor: {
    inline: {
      processors: [
        {
          id: 'ce',
          renderingEngine: 'typst-svg',
          format: [
            '#import "@preview/typsium:0.3.0": ce',
            '#show math.equation: set text(font: ("New Computer Modern Math", "Noto Serif CJK SC"))',
            '#ce("{CODE}")',
          ].join('\n'),
          styling: 'inline-middle',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'mid',
          renderingEngine: 'typst-svg',
          format: '$\n{CODE}\n$',
          styling: 'inline-middle',
          noPreamble: true,
          fitToParentWidth: false,
        },
        {
          id: 'tex',
          renderingEngine: 'mathjax',
          format: '',
          styling: 'inline',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: 'typst-svg',
          format: '${CODE}$',
          styling: 'inline',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    display: {
      processors: [
        {
          id: 'block',
          renderingEngine: 'typst-svg',
          format: '$\n{CODE}\n$',
          styling: 'block',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: 'typst-svg',
          format: '$\n{CODE}\n$',
          styling: 'block-center',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    codeblock: {
      processors: [
        {
          id: 'typ',
          renderingEngine: 'typst-svg',
          format: '{CODE}',
          styling: 'block',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'typst',
          renderingEngine: 'typst-svg',
          format: '```typst\n{CODE}\n```',
          styling: 'codeblock',
          noPreamble: true,
          fitToParentWidth: true,
        },
      ],
    },
    excalidraw: {
      processors: [
        {
          id: 'default',
          renderingEngine: 'typst-svg',
          format: '#set page(margin: 0.25em)\n{CODE}$',
          styling: 'default',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
  },
  snippets: [
    {
      category: 'Matrix',
      name: 'mat',
      description: 'e.g. mat(3,3)@',
      kind: 'display',
      id: '',
      content:
        'const parts = input.split(",").map(s => s.trim());\n\nconst [x, y] = parts.map(Number)\n\nconst rowText = `${("#CURSOR, ".repeat(x)).slice(0, -2)} ;\\n`;\nconst contentText = `  ${rowText}`.repeat(y);\n\nreturn `mat(\\n${contentText})`;',
      script: true,
    },
    {
      category: 'Matrix',
      name: 'matInline',
      description: 'e.g. mat(3,3)@',
      kind: 'inline',
      id: '',
      content:
        'const parts = input.split(",").map(s => s.trim());\n\nconst [x, y] = parts.map(Number)\n\nconst rowText = `${("#CURSOR, ".repeat(x)).slice(0, -2)} ;`;\nconst contentText = `${rowText}`.repeat(y);\n\nreturn `mat(${contentText})`;',
      script: true,
    },
    {
      category: 'Cases',
      name: 'cases',
      description: '',
      kind: 'display',
      id: '',
      content: 'cases(#CURSOR "if" #CURSOR, #CURSOR "else")',
      script: false,
    },
    {
      category: 'Cases',
      name: 'casesn',
      description: 'e.g. casesn(3)@',
      kind: 'display',
      id: '',
      content:
        'const n = Number(input);\nreturn `cases(\\n${(`  #CURSOR "if" #CURSOR,\\n`).repeat(n-1)}  #CURSOR "else"\\n)`',
      script: true,
    },
  ],
};
