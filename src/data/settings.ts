import { SyntaxMode } from '@typstmate/typst-syntax';
import type { ActionDef } from '@/libs/action';
import type { EditorContext, ExtensionSetting, Tag } from '@/libs/extensionManager';
import {
  type CodeblockProcessor,
  CodeblockStyling,
  type DisplayProcessor,
  DisplayStyling,
  type InlineProcessor,
  InlineStyling,
  type ProcessorKind,
  RenderingEngine,
} from '@/libs/processor';
import type { WidthProfile } from '@/libs/profile';
import type { Tab } from '@/ui/settingsTab';
import type { CompilerSubTab } from '@/ui/settingsTab/tabs/compiler';
import { DEFAULT_ACTIONS } from './actions/';

/**
 * プラグイン設定
 */
export interface Settings {
  preambleSvg: string;
  preambleHtml: string;
  preambleMathJax: string;

  /* レンダリング */
  enableBackgroundRendering: boolean; // プラグインのリロードが必要
  patchPDFExport: boolean;
  autoBaseColor: boolean;
  baseColor: string;
  offset: number;
  fitToNoteWidthProfile: string;
  fitToNoteWidthProfiles: WidthProfile[];

  /* 高度な設定 */
  applyProcessorToMathJax: boolean;
  importPath: string;
  linuxLibc: 'glibc' | 'musl';
  watcherExtensions: string[];
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
  };

  actions: ActionDef[];
  extensionSettings: Record<EditorContext, Record<string, ExtensionSetting>>;

  /* 内部設定 */
  version: string;
  crashCount: number; // ? OOM による Boot Loop 回避のため
  settingsStates: {
    tab: Tab;
    preambleRenderingEngineTab: RenderingEngine;
    processorKindTab: ProcessorKind;
    compilerSubTab: CompilerSubTab;
    extensionFilter: {
      query: string;
      tags: Tag[];
      scopes: EditorContext[];
    };
    actionFilter: {
      query: string;
      triggers: string[];
      actions: string[];
    };
  };

  snippets: any[];
}

export const DEFAULT_SETTINGS: Settings = {
  preambleSvg: [
    '#set page(margin: 0pt, width: auto, height: auto)',
    '#set text(size: fontsize)',
    '#show raw: set text(size: 1.25em)',
    '#import "@preview/mannot:0.3.2": *',
    '#import "@preview/quick-maths:0.2.1": shorthands',
    '#show: shorthands.with(',
    '  ($+-$, sym.plus.minus),',
    '  ($|-$, math.tack),',
    ')',
  ].join('\n'),
  preambleHtml: '',
  preambleMathJax: '',

  /* レンダリング */
  enableBackgroundRendering: true,
  patchPDFExport: false,
  autoBaseColor: true,
  baseColor: '#000000',
  offset: 0.0,
  fitToNoteWidthProfile: 'Live',
  fitToNoteWidthProfiles: [
    { name: 'A3', width: '700pt' },
    { name: 'A4', width: '500pt' },
    { name: 'A5', width: '350pt' },
    { name: 'Legal', width: '516pt' },
    { name: 'Letter', width: '516pt' },
    { name: 'Tabloid', width: '690pt' },
  ],

  /* 高度な設定 */
  applyProcessorToMathJax: false,
  importPath: 'typstmate',
  linuxLibc: 'glibc',
  watcherExtensions: ['typ'],
  textViewExtensions: ['html', 'toml'],

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
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
        {
          id: 'tex',
          renderingEngine: RenderingEngine.MathJax,
          format: '',
          styling: InlineStyling.Inline,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Opaque,
        },
        {
          id: 'display',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: (x: 0pt, y: 0.3125em))\n#math.equation($ {CODE} $, block: false)',
          styling: InlineStyling.Inline,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Math,
        },
        {
          id: '',
          renderingEngine: RenderingEngine.TypstSVG,
          format: '#set page(margin: (x: 0pt, y: 0.3125em))\n${CODE}$',
          styling: InlineStyling.Inline,
          useReplaceAll: false,
          fitToNoteWidth: false,
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
          format: '#import "@preview/lilaq:0.5.0" as lq\n{CODE}',
          styling: CodeblockStyling.BlockCenter,
          useReplaceAll: false,
          fitToNoteWidth: false,
          noPreamble: false,
          syntaxMode: SyntaxMode.Markup,
        },
      ],
    },
  },

  actions: DEFAULT_ACTIONS,
  /**
   * ! 直接参照せずに Facet を使うこと
   */
  extensionSettings: {
    markdown: {},
    typst: {},
  },

  /* 内部設定 */
  crashCount: 0,
  settingsStates: {
    tab: 'processors',
    preambleRenderingEngineTab: RenderingEngine.TypstSVG,
    processorKindTab: 'inline',
    compilerSubTab: 'packages',
    extensionFilter: {
      query: '',
      tags: [],
      scopes: ['markdown', 'typst'],
    },
    actionFilter: {
      query: '',
      triggers: [],
      actions: [],
    },
  },

  version: '3.0.0',

  /* 古い設定 */
  snippets: [],
};
