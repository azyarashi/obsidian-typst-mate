import type { CodeblockProcessor, DisplayProcessor, ExcalidrawProcessor, InlineProcessor } from '@/libs/processor';
import type { Snippet } from '@/libs/snippet';

/**
 * プラグイン設定
 */
export interface Settings {
  /* エディター */
  // 数学記号の自動表示機能
  concealMathSymbols: boolean;
  enableConcealMathSymbolRevealDelay: boolean;
  mathSymbolRevealDelay: number;
  complementSymbolWithUnicode: boolean;
  disableBracketHighlight: boolean;

  // 振る舞い
  enableInlinePreview: boolean;
  revertTabToDefault: boolean;
  disableMacro: boolean;

  /* レンダリング */
  enableBackgroundRendering: boolean; // プラグインのリロードが必要
  patchPDFExport: boolean;
  autoBaseColor: boolean;
  baseColor: string;

  /* コンパイラ */
  skipPreparationWaiting: boolean;
  disablePackageCache: boolean;
  preamble: string;

  /* 高度な設定 */
  openTypstToolsOnStartup: boolean;
  enableMathjaxFallback: boolean;

  /* その他の設定 */
  processor: {
    inline: {
      processors: InlineProcessor[];
    };
    display: {
      processors: DisplayProcessor[];
    };
    codeblock: {
      processors: CodeblockProcessor[];
    };
    excalidraw: {
      processors: ExcalidrawProcessor[];
    };
  };
  snippets: Snippet[];

  /* 内部設定 */
  crashCount: number; // ? OOM による Boot Loop 回避のため

  // Path to import typst files from
  importPath: string;
}

export const DEFAULT_SETTINGS: Settings = {
  /* エディター */
  concealMathSymbols: true,
  enableConcealMathSymbolRevealDelay: true,
  mathSymbolRevealDelay: 1000,
  complementSymbolWithUnicode: false,
  disableBracketHighlight: false,

  enableInlinePreview: true,
  revertTabToDefault: false,
  disableMacro: false,

  /* レンダリング */
  enableBackgroundRendering: true,
  patchPDFExport: false,
  autoBaseColor: true,
  baseColor: '#000000',

  /* コンパイラ */
  skipPreparationWaiting: false,
  disablePackageCache: false,
  preamble: [
    '#set page(margin: 0pt, width: auto, height: auto)',
    '#show raw: set text(size: 1.25em)',
    '#set text(size: fontsize)',
    '#import "@preview/mannot:0.3.1": *',
    '#import "@preview/quick-maths:0.2.1": shorthands',
    '#show: shorthands.with(',
    '  ($+-$, sym.plus.minus),',
    '  ($|-$, math.tack),',
    ')',
  ].join('\n'),

  /* 高度な設定 */
  openTypstToolsOnStartup: true,
  enableMathjaxFallback: false,

  /* その他の設定 */
  processor: {
    inline: {
      processors: [
        {
          id: 'ce',
          renderingEngine: 'typst-svg',
          format: [
            '#import "@preview/typsium:0.3.1": ce',
            '#show math.equation: set text(font: ("New Computer Modern Math", "Noto Serif CJK SC"))',
            '#ce[{CODE}]',
          ].join('\n'),
          styling: 'inline-middle',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'mid',
          renderingEngine: 'typst-svg',
          format: '$ {CODE} $',
          styling: 'inline-middle',
          noPreamble: true,
          fitToParentWidth: false,
        },
        {
          id: 'tex',
          renderingEngine: 'mathjax',
          format: '',
          styling: 'inline-middle',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: 'typst-svg',
          format: '${CODE}$',
          styling: 'inline-middle',
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
          format: '$ {CODE} $',
          styling: 'block',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: 'typst-svg',
          format: '$ {CODE} $',
          styling: 'block-center',
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    codeblock: {
      processors: [
        {
          id: 'typst',
          renderingEngine: 'typst-svg',
          format: '{CODE}',
          styling: 'block-center',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'fletcher',
          renderingEngine: 'typst-svg',
          format: '#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge\n{CODE}',
          styling: 'block-center',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'lovelace',
          renderingEngine: 'typst-svg',
          format: '#import "@preview/lovelace:0.3.0": *\n#pseudocode-list[\n{CODE}\n]',
          styling: 'block',
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'lilaq',
          renderingEngine: 'typst-svg',
          format: '#import "@preview/lilaq:0.5.0" as lq\n{CODE}',
          styling: 'block-center',
          noPreamble: false,
          fitToParentWidth: false,
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

  /* 内部設定 */
  crashCount: 0,

  importPath: '.typst',
};
