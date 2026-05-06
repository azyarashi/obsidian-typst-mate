import * as codemirrorCommands from '@codemirror/commands';
import type { TypstMate } from '@/api';

/** 文脈
 * `c` で指定
 */
export const TMActionContexts = [
  'md', // Markdown
  'mjx', // MathJax
  'typ', // Typst
  'typc', // Typst code
  'typm', // Typst math
  'plain', // Typst plain
] as const;
/**
 * - `md`: Markdown
 * - `mjx`: MathJax
 * - `typ`: Typst
 * - `typc`: Typst code
 * - `typm`: Typst math
 * - `plain`: Typst plain
 */
export type TMActionContext = (typeof TMActionContexts)[number];

export const TMActionRestrictions = ['i', 'b', 'I', 'D', 'M', 't', 'H', 'E', 'V'] as const;
/**
 * - `i`: inline math only (`typm`)
 * - `b`: block math only (`typm`)
 * - `I`: inline math only (`mjx`)
 * - `D`: display math only (`mjx`)
 * - `M`: Markdown editor only
 * - `t`: `.typ` editor only
 * - `H`: start of line only
 * - `E`: end of line only
 * - `V`: vim normal mode
 */
export type TMActionRestriction = (typeof TMActionRestrictions)[number];

export const TMActionExtraActions = ['C', 'B', 'l', 's', 'H'] as const;
/**
 * - `C`: show complete
 * - `B`: insert space before
 * - `l`: newline
 * - `s`: next space
 * - `H`: if markup, insert '#' before trigger
 */
export type TMActionExtraAction = (typeof TMActionExtraActions)[number];

export const TMActionPrecedences = [-2, -1, 0, 1, 2] as const;
/**
 * - `lowest`, `low`, `default`, `high`, `highest`
 */
export type TMActionPrecedence = (typeof TMActionPrecedences)[number];

export type TMPriority = number;

// * トリガー

export const TriggerTypes = [
  'hotkey', // キーボードショートカット (`selected`)
  'long-press', // ロングプレス (`selected`)
  'type', // タイピング
  'regex', // 正規表現 (`match`)
  'complete', // 補完の実行を置き換える (`complete`)
  'none', // なにもしない
] as const;
export type TriggerType = (typeof TriggerTypes)[number];

export interface HotkeyTrigger {
  t: 'hotkey';
  v: string;
  p?: TMActionPrecedence;
  mac?: string;
  win?: string;
  linux?: string;
}

export interface LongPressTrigger {
  t: 'long-press';
  v: string;
  p?: TMActionPrecedence;
  mac?: string;
  win?: string;
  linux?: string;
}

export interface TypeTrigger {
  t: 'type';
  v: string;
}

export interface RegexTrigger {
  t: 'regex';
  v: string;
}

export interface CompleteTrigger {
  t: 'complete';
  v: string;
}

export type Trigger = HotkeyTrigger | LongPressTrigger | TypeTrigger | RegexTrigger | CompleteTrigger;

// アクション

export const ActionTypes = ['snippet', 'script', 'commands', 'actions'] as const;
export type ActionType = (typeof ActionTypes)[number];

export interface SnippetAction {
  t: 'snippet';
  v: string;
}

const typstMateCommands = {
  // Tabjump

  // Zoom
  zoom: '',
  minimize: '',
};
export const Commands = {
  ...codemirrorCommands,
  ...typstMateCommands,
};

export type ScriptFn = (
  match: string | RegExpMatchArray | undefined,
  cmds: typeof Commands,
  ctx: typeof TypstMate.ctx,
) => string | boolean;
export interface ScriptAction {
  t: 'script';
  v: ScriptFn;
}

export interface CommandsAction {
  t: 'commands';
  v: string;
}

export interface ActionsAction {
  t: 'actions';
  v: string;
}

export type Action = SnippetAction | ScriptAction | CommandsAction | ActionsAction;

export interface TMActionRaw {
  id?: string;
  /** undefined なら自動的に typm */
  c?: TMActionContext | TMActionContext[];
  r?: TMActionRestriction | TMActionRestriction[];
  e?: TMActionExtraAction | TMActionExtraAction[];

  /** stringの場合, 1文字なら自動的に 'long-press', そうじゃなければ 'type' */
  trigger: Trigger | string;
  /** stringの場合, 自動的に 'snippet' */
  action: Action | string;

  p?: TMPriority;
}

export interface TMAction {
  id: string;
  c: TMActionContext[];
  r?: TMActionRestriction[];
  e?: TMActionExtraAction[];
  trigger: Trigger;
  action: Action;
  p?: TMPriority;
}
