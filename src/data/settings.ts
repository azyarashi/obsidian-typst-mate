import {
  type CodeblockProcessor,
  CodeblockStyling,
  type DisplayProcessor,
  DisplayStyling,
  type ExcalidrawProcessor,
  ExcalidrawStyling,
  type InlineProcessor,
  InlineStyling,
  RenderingEngine,
} from '@/libs/processor';
import type { Snippet } from '@/libs/snippet';
import { SyntaxMode } from '@/utils/crates/typst-syntax';

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

  // 表示
  enableInlinePreview: boolean;

  // アクション
  revertTabToDefault: boolean;
  jumpOutsideBracket: boolean;
  preferInlineExitForSingleLineDisplayMath: boolean;
  moveToEndOfMathBlockBeforeExiting: boolean;
  disableMacro: boolean;

  /* レンダリング */
  enableBackgroundRendering: boolean; // プラグインのリロードが必要
  patchPDFExport: boolean;
  autoBaseColor: boolean;
  baseColor: string;
  offset: number;

  /* コンパイラ */
  skipPreparationWaiting: boolean;
  disablePackageCache: boolean;
  preamble: string;

  /* 高度な設定 */
  openTypstToolsOnStartup: boolean;
  enableMathjaxFallback: boolean;
  importPath: string;
  enableDebugger: boolean;

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
}

export const DEFAULT_SETTINGS: Settings = {
  /* エディター */
  concealMathSymbols: true,
  enableConcealMathSymbolRevealDelay: true,
  mathSymbolRevealDelay: 1000,
  complementSymbolWithUnicode: false,
  disableBracketHighlight: false,

  // 表示
  enableInlinePreview: true,

  // アクション
  revertTabToDefault: false,
  jumpOutsideBracket: true,
  preferInlineExitForSingleLineDisplayMath: true,
  moveToEndOfMathBlockBeforeExiting: false,
  disableMacro: false,

  /* レンダリング */
  enableBackgroundRendering: true,
  patchPDFExport: false,
  autoBaseColor: true,
  baseColor: '#000000',
  offset: 0.0,

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
  importPath: '.typst',
  enableDebugger: false,

  /* その他の設定 */
  processor: {
    inline: {
      processors: [
        {
          id: 'ce',
          renderingEngine: RenderingEngine.TypstSVG,
          format: [
            '#import "@preview/typsium:0.3.1": ce',
            '#show math.equation: set text(font: ("New Computer Modern Math", "Noto Serif CJK SC"))',
            '#ce[{CODE}]',
          ].join('\n'),
          styling: InlineStyling.Inline,
          noPreamble: false,
          fitToParentWidth: false,
          syntaxMode: SyntaxMode.Markup,
        },
        {
          id: 'tex',
          renderingEngine: RenderingEngine.MathJax,
          format: '',
          styling: InlineStyling.Inline,
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'display',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: (x: 0pt, y: 0.3125em))\n#math.equation($ {CODE} $, block: false)',
          styling: InlineStyling.Inline,
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: (x: 0pt, y: 0.3125em))\n${CODE}$',
          styling: InlineStyling.Inline,
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    display: {
      processors: [
        {
          id: 'block',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '$ {CODE} $',
          styling: DisplayStyling.Block,
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: '',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '$ {CODE} $',
          styling: DisplayStyling.BlockCenter,
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    codeblock: {
      processors: [
        {
          id: 'typst',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '{CODE}',
          styling: CodeblockStyling.BlockCenter,
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'fletcher',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge\n{CODE}',
          styling: CodeblockStyling.BlockCenter,
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'lovelace',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#import "@preview/lovelace:0.3.0": *\n#pseudocode-list[\n{CODE}\n]',
          styling: CodeblockStyling.Block,
          noPreamble: false,
          fitToParentWidth: false,
        },
        {
          id: 'lilaq',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#import "@preview/lilaq:0.5.0" as lq\n{CODE}',
          styling: CodeblockStyling.BlockCenter,
          noPreamble: false,
          fitToParentWidth: false,
        },
      ],
    },
    excalidraw: {
      processors: [
        {
          id: 'default',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: 0.25em)\n{CODE}$',
          styling: ExcalidrawStyling.Default,
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
};
