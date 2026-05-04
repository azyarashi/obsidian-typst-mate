import { addIcon, getIcon } from 'obsidian';
import { type JSX, render } from 'preact';
import { consoleWarn } from '@/utils/notice';

import './icons.css';

/**
 * @see https://docs.obsidian.md/Plugins/User+interface/Icons
 */
const TYPST_SVG_FILL = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path
      d="M12.654 17.846c0 1.114.159 1.861.479 2.242.32.381.9.571 1.743.571.871 0 1.99-.439 3.355-1.318l.872 1.45c-2.557 2.139-4.663 3.209-6.319 3.209-1.656 0-2.963-.396-3.922-1.188-.958-.82-1.438-2.256-1.438-4.306V6.989H5.246L4.897 5.363l2.527-.792V2.418L12.654 0v4.835l5.142-.395-.48 2.857-4.662-.176v10.725z"
      fill="currentColor"
    />
  </svg>
);
const TYPST_SVG_STROKE = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path
      d="M12.6 17.34c0 1.02.14 1.7.44 2.05.3.35.82.52 1.6.52.8 0 1.82-.4 3.07-1.2l.8 1.33c-2.34 1.96-4.27 2.94-5.79 2.94-1.52 0-2.7-.36-3.6-1.09-.87-.75-1.31-2.07-1.31-3.95V7.4h-2.3L5.2 5.9l2.3-.72V3.2L12.6 1v4.44l4.72-.36-.44 2.62-4.28-.16v9.84z"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);
const MARKDOWN_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M19 5a1 1 0 0 1 1 1v8.588l.796-.795a1 1 0 1 1 1.414 1.414l-2.501 2.502a1 1 0 0 1-1.414 0l-2.502-2.502a1 1 0 1 1 1.414-1.414l.793.793V6a1 1 0 0 1 1-1m-6.74.327A1 1 0 0 1 14 6v11a1 1 0 1 1-2 0V8.587l-3.26 3.586a1 1 0 0 1-1.48 0L4 8.587V17a1 1 0 1 1-2 0V6a1 1 0 0 1 1.74-.673L8 10.013z"
    />
  </svg>
);
const TEX_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 512 512">
    <path
      fill="currentColor"
      d="M507.712 311.74q-11.854 0-16.772-2.27c-4.918-2.27-6.599-4.456-9.962-8.827l-62.298-89.284l39.85-57.757q5.045-6.81 13.746-12.358c8.701-5.548 15.343-5.549 28.627-5.549v-8.828h-68.855v8.828q8.323 0 12.989 4.161c4.666 4.161 4.666 5.843 4.666 9.206q0 1.766-.252 3.405c-.252 1.639-.841 2.228-2.018 3.405l-33.293 48.93l-37.832-55.74l-1.135-1.387l-1.135-2.9q0-3.531 4.792-6.305c4.792-2.774 7.567-2.774 13.115-2.774v-8.828H311.74v8.828h4.54q11.603 0 17.403 2.018c5.8 2.018 6.894 3.699 9.08 7.062l53.47 79.952l-46.66 69.108q-3.28 5.044-11.981 11.476c-8.701 6.432-15.932 6.432-30.392 6.432v8.827h16.413c-3.319 17.739-7.947 31.114-13.892 40.103q-10.34 15.637-46.913 15.637h-37.833q-10.089 0-11.728-2.27c-1.639-2.27-1.639-4.456-1.639-8.827v-75.917h24.465q19.925 0 25.474 7.567c5.549 7.567 5.549 13.704 5.549 25.978h6.81v-75.665h-6.81q0 18.412-4.666 25.852c-4.666 7.44-11.896 7.44-26.357 7.44h-24.465v-69.108q0-6.559 1.639-8.827c1.639-2.268 5.002-2.27 11.728-2.27h35.563q33.292 0 42.75 12.863c9.458 12.863 10.635 22.868 12.989 42.877h6.558l-8.827-64.567H184.714l-4.381-62.298H4.538l-4.54 64.567h6.558q3.531-35.058 11.602-45.399c8.071-10.341 18.664-10.341 39.85-10.341h15.386q5.044 0 5.927 3.026c.883 3.026.883 4.708.883 8.071v149.313q0 6.558-3.657 9.962c-3.657 3.404-10.888 3.405-25.348 3.405H37.832v8.827h106.94v-8.827h-9.08q-21.69 0-25.221-3.405c-3.531-3.405-3.531-5.591-3.531-9.962V149.063q0-5.045.504-7.188c.504-2.143 1.597-2.732 3.784-3.91h15.638q31.779 0 39.85 10.341c5.202 6.666 8.907 21.058 11.123 43.129h-21.968v8.827h6.558q16.899 0 19.673 2.522c2.774 2.522 2.774 5.297 2.774 10.845v149.313q0 8.323-2.774 10.846c-2.774 2.523-8.407 2.522-19.673 2.522h-6.558v8.827h164.697l9.763-64.567h48.247v-8.827q-10.089 0-13.998-5.045c-3.909-5.045-3.909-6.137-3.909-8.323q0-1.766.252-3.405c.252-1.639.841-2.228 2.017-3.405l40.103-60.028l44.39 69.107q0 1.514 1.135 1.765l1.135.252q0 3.531-4.666 6.305c-4.666 2.774-7.44 2.774-12.989 2.774v8.827H512v-8.827z"
    />
  </svg>
);
const VIM_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M24 11.986h-.027l-4.318-4.318l4.303-4.414V1.461l-.649-.648h-8.198l-.66.605v1.045L12.015.027V0L12 .014L11.986 0v.027l-1.29 1.291l-.538-.539H2.035l-.638.692v1.885l.616.616h.72v5.31L.027 11.987H0L.014 12L0 12.014h.027l2.706 2.706v6.467l.907.523h2.322l1.857-1.904l4.166 4.166V24l.015-.014l.014.014v-.028l2.51-2.509h.485c.111 0 .211-.07.25-.179l.146-.426a.26.26 0 0 0-.037-.239l1.462-1.462l-.612 1.962a.265.265 0 0 0 .255.344h1.824a.27.27 0 0 0 .243-.163l.165-.394a.27.27 0 0 0-.247-.365h-.075l.84-2.644h1.232l-1.016 3.221a.266.266 0 0 0 .255.344h2.002c.11 0 .207-.066.248-.17l.164-.428a.266.266 0 0 0-.249-.358h-.145l1.131-3.673a.26.26 0 0 0-.039-.24l-.375-.504l-.003-.005a.27.27 0 0 0-.209-.102h-1.436a.27.27 0 0 0-.19.081l-.4.439h-.624l-.042-.046l4.445-4.445H24L23.986 12zM9.838 21.139l1.579-4.509h-.501l.297-.304h1.659l-1.563 4.555h.623l-.079.258zm3.695-7.516l.15.151l-.269.922l-.225.226h-.969l-.181-.181l.311-.871l.288-.247zM5.59 20.829H3.877l-.262-.15V3.091H2.379l-.1-.1V1.815l.143-.154h7.371l.213.214v1.108l-.142.173H8.785v8.688l8.807-8.688h-2.086l-.175-.188V1.805l.121-.111h7.49l.132.133v1.07L12.979 13.25h-.373q-.022-.001-.042.001l-.02.003a.26.26 0 0 0-.119.06l-.343.295l-.004.003a.3.3 0 0 0-.073.111l-.296.83zm14.768-3.952l.474-.519h1.334l.309.415l-1.265 4.107h.493l-.08.209H19.84l1.124-3.564h-2.015l-1.077 3.391h.424l-.073.174h-1.605l1.107-3.548h-2.096l-1.062 3.339h.436l-.072.209H13.27l1.514-4.46h-.586l.091-.271h1.65l.519.537h.906l.491-.554h1.061l.489.535z"
    />
  </svg>
);

const svgContainer = document.createElement('div');

render(TYPST_SVG_FILL, svgContainer);
addIcon('typst-fill', svgContainer.innerHTML);
render(null, svgContainer);

render(TYPST_SVG_STROKE, svgContainer);
addIcon('typst-stroke', svgContainer.innerHTML);
render(null, svgContainer);

render(MARKDOWN_SVG, svgContainer);
addIcon('tm_markdown', svgContainer.innerHTML);
render(null, svgContainer);

render(VIM_SVG, svgContainer);
addIcon('tm_vim', svgContainer.innerHTML);
render(null, svgContainer);

render(TEX_SVG, svgContainer);
addIcon('tm_tex', svgContainer.innerHTML);
render(null, svgContainer);

svgContainer.remove();

const getIconAttributes = (icon: SVGSVGElement) =>
  [...icon.attributes].reduce<Record<string, string>>((attributes, attr) => {
    if (attr.nodeValue !== null) attributes[attr.nodeName] = attr.nodeValue;
    return attributes;
  }, {});

const getIconAsJSX = (iconId: string): JSX.Element => {
  const icon = getIcon(iconId);
  if (!icon) {
    consoleWarn('getIcon failed', iconId);
    return <svg className="svg-icon typstmate-icon-missing" />;
  }

  return <svg {...getIconAttributes(icon)} dangerouslySetInnerHTML={{ __html: icon.innerHTML }} />;
};

export const ICONS = {
  /**
   * - TypstFileView icon
   * - StatusBarItem icon
   */
  TypstFill: TYPST_SVG_FILL,
  TypstStroke: TYPST_SVG_STROKE,
  Markdown: MARKDOWN_SVG,
  TeX: TEX_SVG,
  None: <></>,

  MarkupMode: getIconAsJSX('heading'),
  MathMode: getIconAsJSX('sigma'),
  CodeMode: getIconAsJSX('hash'),
  PlainMode: getIconAsJSX('circle-dashed'),

  // Processor
  ReplaceAll: getIconAsJSX('replace-all'),
  FileX: getIconAsJSX('file-x'),

  // 一般
  Settings: getIconAsJSX('settings'),
  GripHorizontal: getIconAsJSX('grip-horizontal'),
  Trash: getIconAsJSX('trash'),
  MoveHorizontal: getIconAsJSX('move-horizontal'),

  // 拡張機能
  // * Markdown
  /** Codeblock Preview / Inline Preview */
  ScanEye: getIconAsJSX('scan-eye'),
  /** Debugger */
  Bug: getIconAsJSX('bug'),

  // * Typst
  /** Code Jump */
  MoveRight: getIconAsJSX('move-right'),
  /** Error lens */
  TriangleAlert: getIconAsJSX('triangle-alert'),
  /** Indent Rainbow */
  Rainbow: getIconAsJSX('rainbow'),
  /** Vim */
  Vim: VIM_SVG,

  // * Shared
  /** Autocomplete */
  Terminal: getIconAsJSX('terminal'),
  /** Formatter */
  Sticker: getIconAsJSX('sticker'),
  /** Linter */
  ShieldAlert: getIconAsJSX('shield-alert'),
  /** Pair Highlight */
  Braces: getIconAsJSX('braces'),
  /** Preview Jump */
  MoveLeft: getIconAsJSX('move-left'),
  /** Symbol Conceal */
  Pi: getIconAsJSX('pi'),
  /** Syntax Highlight */
  Highlighter: getIconAsJSX('highlighter'),
  /** Tooltip */
  MessageSquare: getIconAsJSX('message-square'),
  /** Typst Mate Actions */
  Zap: getIconAsJSX('zap'),

  Loading: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="typstmate-spinner"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),

  // Status Bar Item
  AlertTriangle: getIconAsJSX('alert-triangle'),
  Cross: getIconAsJSX('cross'),
} as const;
