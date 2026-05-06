import { SyntaxMode } from '@typstmate/typst-syntax';
import {
  type CodeblockProcessor,
  CodeblockStyling,
  type DisplayProcessor,
  DisplayStyling,
  type ExcalidrawProcessor,
  type InlineProcessor,
  InlineStyling,
  type ProcessorKind,
  RenderingEngine,
} from '@/libs';
import type { EditorContext, ExtensionSetting, Tag } from '@/libs/extensionManager';
import type { WidthProfile } from '@/libs/rendererManager/utils/profile';
import type { Tab } from '@/ui/settingsTab';
import type { ActionsSubTab } from '@/ui/settingsTab/tabs/actions';
import type { CompilerSubTab } from '@/ui/settingsTab/tabs/compiler';
import type { Tool } from '@/ui/views/typst-tools';
import type { ExportFormat } from '@/utils/export';

/**
 * プラグイン設定
 */
export interface Settings {
  /* プロセッサー */
  preambleSvg: string;
  preambleHtml: string;
  preambleMathJax: string;

  /* Typst Mate アクション */
  tmactionsSource: string;
  useTmactionsFile: boolean;

  /* レンダリング */
  enableBackgroundRendering: boolean; // プラグインのリロードが必要
  patchPDFExport: boolean;
  autoBaseColor: boolean;
  baseColor: string;
  offset: number;
  fitToNoteWidthProfile: string;
  fitToNoteWidthProfiles: WidthProfile[];
  pngPadding: number;

  /* Watcher の設定 */
  enableWatcher: boolean;
  enablePackageWatch: boolean;
  watchExtensions: string[];

  /* 高度な設定 */
  resourcesPath: string;
  localeOverride?: string;
  applyProcessorToMathJax: boolean;
  textViewExtensions: string[];

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
  extensionSettings: Record<EditorContext, Record<string, ExtensionSetting>>;

  /* 内部設定 */
  pluginVersion?: string;
  tmactionsVersion?: string;
  crashCount: number;

  settingsStates: {
    tab: Tab;
    preambleRenderingEngineTab: RenderingEngine;
    processorKindTab: ProcessorKind;
    compilerSubTab: CompilerSubTab;
    actionsSubTab: ActionsSubTab;
    extensionContextTab: EditorContext;
    extensionFilter: {
      query: string;
      tags: Tag[];
    };
  };
  toolsStates: {
    tool: Tool;
  };
  exportStates: {
    format: ExportFormat;
    pdfTagged: boolean;
    pdfStandard: string;
    pngPpi: number;
    htmlExtractBody: boolean;
    svgOverflow: boolean;
  };
  editorStates: Record<string, { cursor: number; expiredOn: number }>;

  snippets: any[];
  preamble: string;
}

export const DEFAULT_SETTINGS: Settings = {
  /* プロセッサー */
  preambleSvg: [
    '#set page(margin: 0pt, width: auto, height: auto)',
    '#set text(size: fontsize)',
    '#show raw: set text(size: 1.25em)',
    '#import typstmate: *',
    '\n',
    '/*',
    '  #import "@preview/mannot:0.3.3": *',
    '  #import "@preview/quick-maths:0.2.1": shorthands',
    '  #show: shorthands.with(',
    '    ($+-$, sym.plus.minus),',
    '    ($|-$, math.tack),',
    '  )',
    ' */',
  ].join('\n'),
  preambleHtml: '',
  preambleMathJax: '',

  /* Typst Mate アクション */
  tmactionsSource: '',
  useTmactionsFile: false,

  /* レンダリング */
  enableBackgroundRendering: true,
  patchPDFExport: false,
  autoBaseColor: true,
  baseColor: '#000000',
  offset: 0.0,
  pngPadding: 0,
  fitToNoteWidthProfile: 'Live',
  fitToNoteWidthProfiles: [
    { name: 'A3', width: '700pt' },
    { name: 'A4', width: '500pt' },
    { name: 'A5', width: '350pt' },
    { name: 'Legal', width: '516pt' },
    { name: 'Letter', width: '516pt' },
    { name: 'Tabloid', width: '690pt' },
  ],

  /* Watcher の設定 */
  enableWatcher: false,
  enablePackageWatch: true,
  // biome-ignore format: 可読性のため
  watchExtensions: ['typ', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf', 'webp', 'wasm', 'tmTheme', 'sublime-color-scheme'],

  /* 高度な設定 */
  resourcesPath: 'typstmate',
  applyProcessorToMathJax: false,
  textViewExtensions: ['html', 'toml', 'js', 'tmTheme', 'sublime-color-scheme'],

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
          useReplaceAll: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
        {
          id: 'tex',
          renderingEngine: RenderingEngine.MathJax,
          format: '',
          styling: InlineStyling.Inline,
          useReplaceAll: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Plain,
        },
        {
          id: 'display',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: (x: 0pt, y: 0.3125em))\n#math.equation($ {CODE} $, block: false)',
          styling: InlineStyling.Inline,
          useReplaceAll: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Math,
        },
        {
          id: '',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: (x: 0pt, y: 0.3125em))\n${CODE}$',
          styling: InlineStyling.Inline,
          useReplaceAll: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Math,
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
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Math,
        },
        {
          id: '',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '$ {CODE} $',
          styling: DisplayStyling.BlockCenter,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Math,
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
          useReplaceAll: false,
          fitToNoteWidth: true,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
        {
          id: 'fletcher',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge\n{CODE}',
          styling: CodeblockStyling.BlockCenter,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
        {
          id: 'lovelace',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#import "@preview/lovelace:0.3.1": *\n#pseudocode-list[\n{CODE}\n]',
          styling: CodeblockStyling.Block,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
        {
          id: 'lilaq',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#import "@preview/lilaq:0.6.0" as lq\n{CODE}',
          styling: CodeblockStyling.BlockCenter,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
      ],
    },
    excalidraw: {
      processors: [],
    },
  },

  /**
   * ! 直接参照せずに Facet を使うこと
   */
  extensionSettings: {
    markdown: {},
    typst: {
      'typst-formatter': {
        // @ts-expect-error
        formatOnSave: true,
      },
    },
  },

  /* 内部設定 */
  crashCount: 0,

  settingsStates: {
    tab: 'processors',
    preambleRenderingEngineTab: RenderingEngine.TypstSVG,
    processorKindTab: 'inline',
    compilerSubTab: 'packages',
    actionsSubTab: 'code',
    extensionContextTab: 'markdown',
    extensionFilter: {
      query: '',
      tags: [],
    },
  },
  toolsStates: {
    tool: 'converter',
  },
  exportStates: {
    format: 'pdf',
    pdfTagged: true,
    pdfStandard: '',
    pngPpi: 288,
    htmlExtractBody: true,
    svgOverflow: true,
  },
  editorStates: { '[tmactions]': { cursor: 0, expiredOn: Infinity } },

  /* 古い設定 */
  snippets: [],
  preamble: '',
};
