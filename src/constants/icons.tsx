import { addIcon, getIcon } from 'obsidian';
import { type JSX, render } from 'preact';

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

const typstFill = 'typst-fill';
const typstStroke = 'typst-stroke';

const svgContainer = document.createElement('div');

render(TYPST_SVG_FILL, svgContainer);
addIcon(typstFill, svgContainer.innerHTML);
render(null, svgContainer);

render(TYPST_SVG_STROKE, svgContainer);
addIcon(typstStroke, svgContainer.innerHTML);
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
    console.warn(`Icon ${iconId} not found`);
    return <svg className="svg-icon typstmate-icon-missing" />;
  }

  return <svg {...getIconAttributes(icon)} dangerouslySetInnerHTML={{ __html: icon.innerHTML }} />;
};

export const ICONS = {
  TypstFill: TYPST_SVG_FILL,
  TypstStroke: TYPST_SVG_STROKE,
  Markdown: getIconAsJSX('pen-line'),
  None: <></>,

  // 一般
  Settings: getIconAsJSX('settings'),
  LayoutSidePanel: getIconAsJSX('check'), // TODO
  Check: getIconAsJSX('check'),
  ExpandVertically: getIconAsJSX('expand-vertically'),
  Info: getIconAsJSX('info'),
  Cross: getIconAsJSX('cross'),
  GripHorizontal: getIconAsJSX('grip-horizontal'),
  Trash: getIconAsJSX('trash'),
  Plus: getIconAsJSX('plus'),
  AlignLeft: getIconAsJSX('align-left'),

  // 拡張機能
  /** Codeblock Preview / Inline Preview */
  ScanEye: getIconAsJSX('scan-eye'),
  /** LaTeX Suite Integration */
  CircuitBoard: getIconAsJSX('circuit-board'),
  /** Debugger */
  Bug: getIconAsJSX('bug'),

  /** Autocomplete */
  Terminal: getIconAsJSX('terminal'),
  /** Formatter */
  Sticker: getIconAsJSX('sticker'),

  /** Vim */
  Vim: getIconAsJSX('command'),

  ReplaceAll: getIconAsJSX('replace-all'),
  MoveHorizontal: getIconAsJSX('move-horizontal'),
  FileX: getIconAsJSX('file-x'),
  Heading1: getIconAsJSX('heading-1'),
  SquareFunction: getIconAsJSX('square-function'),
  CircleDashed: getIconAsJSX('circle-dashed'),

  Pencil: getIconAsJSX('pencil-line'),
  Sigma: getIconAsJSX('sigma'),
  Braces: getIconAsJSX('braces'),
  CornerDownRight: getIconAsJSX('corner-down-right'),
  MousePointerClick: getIconAsJSX('mouse-pointer-click'),
  Highlighter: getIconAsJSX('highlighter'),
  ShieldAlert: getIconAsJSX('shield-alert'),
  TextCursorInput: getIconAsJSX('text-cursor-input'),
  MessageSquare: getIconAsJSX('message-square'),

  FileText: getIconAsJSX('file-text'),
  Code: getIconAsJSX('code'),
  Zap: getIconAsJSX('zap'),
  Keyboard: getIconAsJSX('keyboard'),

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

  Activity: getIconAsJSX('activity'),
  AlertTriangle: getIconAsJSX('alert-triangle'),
  Rainbow: getIconAsJSX('rainbow'),
  ExternalLink: getIconAsJSX('external-link'),
  Cpu: getIconAsJSX('cpu'),
} as const;
